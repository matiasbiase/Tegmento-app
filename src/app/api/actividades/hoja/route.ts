import { and, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { lineas } from '@/lib/db/schema';
import { guardarAdjunto, fotoMuyGrande } from '@/lib/adjuntos';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { parsearHoja, emparejar, fechasDelMes } from '@/lib/hoja';

// Lee la foto de la hoja del mes pintada a mano y devuelve lo que entendió.
// NO guarda nada: la confirmación es de Matías, porque leer casilleros pintados
// a mano puede fallar y es peor un día inventado que uno que falta.
//
// ⚠️ NO ESTÁ CABLEADO EN LA UI, A PROPÓSITO (23/07/2026).
// El pipeline funciona: lee el mes del encabezado y empareja bien los títulos
// (incluso sin acentos). Lo que NO funciona es lo único que importa, los días:
// Gemma 3 12B no distingue un casillero pintado de uno vacío. Medido contra una
// hoja de prueba con 13 días pintados de 31: devolvió los 31. Se probó también
// recortando fila por fila, agrandando, y con el casillero relleno de negro
// sólido: siempre enumera todas las columnas. En un diagnóstico llegó a describir
// la hoja como "un diagrama de Gantt", o sea que no ve los casilleros.
//
// Para retomarlo hace falta un modelo de visión mejor (o visión determinística
// sobre la geometría de la grilla). Si se prueba otro modelo, alcanza con volver
// a poner el botón de subir en HojaDelMes.tsx.
export async function POST(req: Request) {
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre).' }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const foto = form?.get('foto');
  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ error: 'Falta la foto de la hoja.' }, { status: 400 });
  }
  if (fotoMuyGrande(foto)) {
    return NextResponse.json({ error: 'La foto es demasiado grande (máximo 12 MB).' }, { status: 413 });
  }

  const buffer = Buffer.from(await foto.arrayBuffer());
  const archivo = guardarAdjunto(buffer, 'jpg');

  let crudo = '';
  try {
    crudo = await llamarRol(
      'hoja',
      [{ rol: 'user', contenido: 'Leé esta hoja de seguimiento y devolvé el JSON.', imagenes: [buffer.toString('base64')] }],
      { json: true },
    );
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la hoja. Probá de nuevo.' }, { status: 502 });
  }

  const leida = parsearHoja(crudo);
  if (!leida) {
    return NextResponse.json(
      { error: 'No pude reconocer una hoja de seguimiento en esa foto. Probá con más luz y que entre entera.' },
      { status: 422 },
    );
  }

  const actividades = await db
    .select({ id: lineas.id, titulo: lineas.titulo })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'), eq(lineas.diaria, true)));

  const { encontradas, sinReconocer } = emparejar(leida.filas, actividades);

  // Si no pudo leer el encabezado, se asume el mes actual: es de lejos el caso
  // más probable (sacás la foto de la hoja que estás usando).
  const ahora = new Date();
  const mes = leida.mes ?? `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

  const filas = encontradas.map((e) => ({
    lineaId: e.lineaId,
    titulo: e.titulo,
    fechas: fechasDelMes(mes, e.dias, ahora),
  }));

  return NextResponse.json({
    mes,
    mesLeido: leida.mes != null,
    archivo,
    filas,
    sinReconocer,
  });
}

// Chequeo de sanidad para la UI: qué actividades diarias hay para imprimir.
export async function GET() {
  const actividades = await db
    .select({ id: lineas.id, titulo: lineas.titulo })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), inArray(lineas.estado, ['activa']), eq(lineas.diaria, true)));
  return NextResponse.json({ actividades });
}

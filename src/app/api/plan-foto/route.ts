import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { guardarAdjunto, fotoMuyGrande } from '@/lib/adjuntos';
import { completarOllama, ollamaDisponible } from '@/lib/llm/proveedor';
import { parsearPlan } from '@/lib/plan-alimentacion';

/**
 * LEER LA FOTO DEL PLAN — Y NO GUARDAR NADA.
 *
 * ⚠️⚠️ ESTA RUTA NO ESCRIBE EN NINGUNA TABLA DEL PLAN, A PROPÓSITO. Devuelve lo
 * que entendió el modelo para que él lo revise, y recién `guardarPlan` (server
 * action) lo persiste cuando toca "Guardar este plan".
 *
 * Es la regla que ya rige en todo el chat —la IA propone, la marca se vuelve un
 * botón, la app no guarda hasta que lo tocás— aplicada a la foto. **Un plan mal
 * leído que se guarda solo te hace seguir una dieta que nadie te dio**, y de ahí
 * cuelgan los tildes de cada día y el cruce con el sueño.
 *
 * ⚠️ LA FOTO SÍ SE GUARDA EN DISCO ACÁ, y es la única excepción: la necesita la
 * pantalla de revisión para mostrarla al lado de lo leído. Si él cancela queda un
 * .jpg suelto en `data/adjuntos`, que son kilobytes en su propia máquina —
 * mucho más barato que subirla dos veces.
 *
 * ⚠️ Y ES EL MISMO MECANISMO QUE SE BORRÓ EL 03/08 CON EL TICKET (foto → modelo
 * → datos), lo cual conviene decir de frente. Lo que hacía sobrar al ticket era
 * la FRECUENCIA, no la foto: un ticket es de todos los días, un plan lo recibís
 * cada varios meses y dictarlo hablando no tiene sentido.
 */

const INSTRUCCION = [
  'Mirás la foto de un plan de alimentación que un profesional le dio a una persona.',
  'Devolvés SOLO la lista de comidas, una por renglón, con este formato exacto:',
  'HH:MM | qué se come | detalle',
  'El detalle es opcional; si no hay, dejá solo los dos primeros campos.',
  'Ejemplo:',
  '08:00 | Avena con fruta | 1 taza',
  '13:30 | Proteína + verduras | pollo, pescado o legumbres',
  'No agregues preámbulo, ni títulos, ni comentarios, ni consejos.',
  'Si una comida no tiene horario en el papel, poné el horario habitual de esa comida.',
  'Si la foto no es un plan de alimentación, respondé exactamente: NO_PLAN.',
].join('\n');

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const foto = form?.get('foto');
  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
  }
  if (fotoMuyGrande(foto)) {
    return NextResponse.json({ error: 'La foto es demasiado grande (máximo 12 MB).' }, { status: 413 });
  }
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre). Podés escribir el plan a mano.' }, { status: 503 });
  }

  const buffer = Buffer.from(await foto.arrayBuffer());
  const nombre = guardarAdjunto(buffer, 'jpg');

  const filas = await db.select().from(config).where(eq(config.clave, 'modelo_asistente'));
  const valor = filas[0]?.valor ?? 'ollama:gemma3:12b';
  const modelo = valor.slice(valor.indexOf(':') + 1);

  let crudo = '';
  try {
    crudo = (
      await completarOllama({
        modelo,
        mensajes: [
          { rol: 'system', contenido: INSTRUCCION },
          { rol: 'user', contenido: '¿Qué dice este plan?', imagenes: [buffer.toString('base64')] },
        ],
      })
    ).trim();
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la foto. Podés escribir el plan a mano.' }, { status: 502 });
  }

  if (!crudo || crudo.toUpperCase().includes('NO_PLAN')) {
    return NextResponse.json(
      { error: 'No reconocí un plan de alimentación en la foto. Probá con otra o escribilo a mano.', foto: nombre },
      { status: 422 },
    );
  }

  const comidas = parsearPlan(crudo);
  if (comidas.length === 0) {
    // ⚠️ SE DEVUELVE EL TEXTO CRUDO CUANDO NO SE PUDO PARSEAR. Sin esto, el
    // modelo puede haber leído el plan perfecto y la pantalla diría "no pude
    // leerlo" solo porque no respetó el formato — el falso negativo del feed de
    // YouTube otra vez. Así él ve lo que salió y lo corrige a mano.
    return NextResponse.json(
      { error: 'Leí la foto pero no pude ordenarla en comidas. Está abajo tal como salió, para que la corrijas.', crudo, foto: nombre },
      { status: 422 },
    );
  }

  return NextResponse.json({ comidas, foto: nombre });
}

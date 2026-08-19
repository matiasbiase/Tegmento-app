import { NextResponse } from 'next/server';
import { fotoMuyGrande } from '@/lib/adjuntos';
import { db } from '@/lib/db/client';
import { cuerpo } from '@/lib/db/schema';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { parsearPantalla, resumenPantalla } from '@/lib/pantalla';

// Tiempo en pantalla: el usuario manda una captura de Ajustes → Tiempo en pantalla,
// Gemma extrae total + apps, y se guarda en `cuerpo` (tipo 'pantalla', valor = min
// totales, nota = JSON de apps). Señal más para el Analista (uso vs ánimo/energía).
export async function POST(req: Request) {
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre).' }, { status: 503 });
  }
  const form = await req.formData().catch(() => null);
  const foto = form?.get('foto');
  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json({ error: 'No llegó la captura.' }, { status: 400 });
  }
  if (fotoMuyGrande(foto)) {
    return NextResponse.json({ error: 'La foto es demasiado grande (máximo 12 MB).' }, { status: 413 });
  }

  const imagen = Buffer.from(await foto.arrayBuffer()).toString('base64');
  let crudo = '';
  try {
    crudo = await llamarRol('pantalla', [{ rol: 'user', contenido: 'Extraé el tiempo en pantalla de esta captura.', imagenes: [imagen] }], { json: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la captura. Probá de nuevo.' }, { status: 502 });
  }

  const p = parsearPantalla(crudo);
  if (!p) {
    return NextResponse.json({ error: 'No parece una captura de Tiempo en pantalla. Probá con la de Ajustes.' }, { status: 422 });
  }

  await db.insert(cuerpo).values({
    tipo: 'pantalla',
    valor: p.totalMin,
    calidad: null,
    nota: JSON.stringify(p.apps),
    creado: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, resumen: resumenPantalla(p) });
}

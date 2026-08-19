import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { config, cuerpo, bitacora } from '@/lib/db/schema';
import { guardarAdjunto, fotoMuyGrande } from '@/lib/adjuntos';
import { completarOllama, ollamaDisponible } from '@/lib/llm/proveedor';

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
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre)' }, { status: 503 });
  }

  const buffer = Buffer.from(await foto.arrayBuffer());
  const nombre = guardarAdjunto(buffer, 'jpg');

  const filas = await db.select().from(config).where(eq(config.clave, 'modelo_asistente'));
  const valor = filas[0]?.valor ?? 'ollama:gemma3:12b';
  const modelo = valor.slice(valor.indexOf(':') + 1);

  let descripcion = '';
  try {
    descripcion = (
      await completarOllama({
        modelo,
        mensajes: [
          {
            rol: 'system',
            contenido:
              'Sos un asistente que mira una foto de comida y la describe en UNA frase corta y concreta, en español rioplatense. Ejemplo: "Milanesa con puré y ensalada". Solo la descripción, sin preámbulos, sin comillas. Si no ves comida, respondé exactamente: NO_COMIDA.',
          },
          { rol: 'user', contenido: '¿Qué comida se ve en esta foto?', imagenes: [buffer.toString('base64')] },
        ],
      })
    ).trim();
  } catch {
    return NextResponse.json({ error: 'No se pudo analizar la foto' }, { status: 502 });
  }

  if (!descripcion || descripcion.toUpperCase().includes('NO_COMIDA')) {
    return NextResponse.json({ error: 'No pude reconocer comida en la foto. Probá otra o anotalo a mano.' }, { status: 422 });
  }
  descripcion = descripcion.slice(0, 300);

  const ahora = new Date().toISOString();
  await db.insert(cuerpo).values({ tipo: 'comida', valor: null, calidad: null, nota: descripcion, creado: ahora });
  await db.insert(bitacora).values({ tipo: 'manual', contenido: `Comí: ${descripcion}`, fecha: ahora });

  return NextResponse.json({ descripcion, adjuntoPath: nombre });
}

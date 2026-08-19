import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { fotoMuyGrande } from '@/lib/adjuntos';
import { lupa } from '@/lib/db/schema';
import { leerCuidado } from '@/lib/cuidado';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import type { MensajeLLM } from '@/lib/llm/proveedor';

// Motor de "Contraste": recibe un tema (del chat, modo otracara) o un contenido
// externo (de Polaridad, modo mapa, texto o foto) y devuelve el análisis + el
// grado de cuidado 0-100 con su porqué.
export async function POST(req: Request) {
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre).' }, { status: 503 });
  }

  const ct = req.headers.get('content-type') ?? '';
  let modo: 'otracara' | 'mapa' | 'interpretacion' = 'otracara';
  let contenidoUsuario = '';
  let imagenes: string[] | undefined;
  let entrada = ''; // lo que se analizó (para guardar en el historial de Polaridad)

  if (ct.includes('multipart/form-data')) {
    // Polaridad con foto
    const form = await req.formData().catch(() => null);
    const foto = form?.get('foto');
    if (!(foto instanceof File) || foto.size === 0) {
      return NextResponse.json({ error: 'Falta el contenido a analizar.' }, { status: 400 });
    }
    if (fotoMuyGrande(foto)) {
      return NextResponse.json({ error: 'La foto es demasiado grande (máximo 12 MB).' }, { status: 413 });
    }
    modo = 'mapa';
    entrada = 'Imagen analizada';
    imagenes = [Buffer.from(await foto.arrayBuffer()).toString('base64')];
    contenidoUsuario = 'MODO: mapa\n\nAnalizá el contenido de esta imagen (noticia, tweet, posteo o captura).';
  } else {
    const body = (await req.json().catch(() => ({}))) as {
      modo?: string;
      tema?: string;
      texto?: string;
      contexto?: string;
    };
    modo = body.modo === 'mapa' ? 'mapa' : body.modo === 'interpretacion' ? 'interpretacion' : 'otracara';
    if (modo === 'mapa') {
      const texto = (body.texto ?? '').trim();
      if (!texto) return NextResponse.json({ error: 'Pegá algo para analizar.' }, { status: 400 });
      entrada = texto.slice(0, 160);
      contenidoUsuario = `MODO: mapa\n\nContenido a analizar:\n${texto.slice(0, 4000)}`;
    } else if (modo === 'interpretacion') {
      // Lo personal: algo que pasó con alguien, o un mensaje que va a mandar.
      // Acá no se mide "cuidado" ni se arma un lado contrario: se muestra cómo
      // puede haberle llegado al otro. Era el pedido de Matías, y el motivo por
      // el que 'otracara' no le servía para esto: le hablaba de "la amistad"
      // como concepto en vez de su situación, y contradecirlo cuando venía
      // dolido no ayudaba a nadie.
      const tema = (body.tema ?? body.texto ?? '').trim();
      if (!tema) return NextResponse.json({ error: 'Falta lo que querés mirar.' }, { status: 400 });
      entrada = tema.slice(0, 160);
      contenidoUsuario =
        `MODO: interpretacion\n\nMatías contó esto: "${tema.slice(0, 1500)}"` +
        (body.contexto ? `\n\nContexto reciente de la charla:\n${body.contexto.slice(0, 2000)}` : '');
    } else {
      const tema = (body.tema ?? body.texto ?? '').trim();
      if (!tema) return NextResponse.json({ error: 'Falta el tema.' }, { status: 400 });
      contenidoUsuario =
        `MODO: otracara\n\nMatías planteó: "${tema.slice(0, 1500)}"` +
        (body.contexto ? `\n\nContexto reciente de la charla:\n${body.contexto.slice(0, 2000)}` : '');
    }
  }

  const mensajes: MensajeLLM[] = [{ rol: 'user', contenido: contenidoUsuario, imagenes }];

  let crudo = '';
  try {
    crudo = await llamarRol('contraste', mensajes, { json: true });
  } catch {
    return NextResponse.json({ error: 'No se pudo analizar. Probá de nuevo en un momento.' }, { status: 502 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ error: 'La IA respondió en un formato inesperado. Probá de nuevo.' }, { status: 502 });
  }

  // Saneo del grado de cuidado: la IA a veces manda el número como string, o
  // todavía lo llama "carga" (el nombre viejo). leerCuidado banca las dos formas.
  // En interpretación no hay grado de cuidado: no es un texto que quiera
  // convencer a nadie. Si el modelo lo manda igual, se descarta.
  const cuidado = modo === 'interpretacion' ? 0 : leerCuidado(data);
  if (modo === 'interpretacion') {
    delete data.cuidado;
    delete data.porQue;
  } else {
    data.cuidado = cuidado;
  }
  delete data.carga;
  const salida = { modo, ...data };

  // Queda registrado para volver a verlo: tanto el contenido analizado como lo
  // personal. El historial es de las dos cosas (Matías: "también quiero un
  // historial de cosas que haya visto, porque no está").
  if (modo === 'mapa' || modo === 'interpretacion') {
    try {
      await db.insert(lupa).values({
        entrada: entrada || null,
        carga: cuidado,
        resultado: JSON.stringify(salida),
        creado: new Date().toISOString(),
      });
    } catch {
      // si falla el guardado, igual devolvemos el análisis
    }
  }

  return NextResponse.json(salida);
}

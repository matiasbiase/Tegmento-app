import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { ADJUNTOS_DIR, guardarAdjunto } from '@/lib/adjuntos';
import { limpiarTranscripcion } from '@/lib/transcripcion';

const ejecutar = promisify(execFile);

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'Falta el audio' }, { status: 400 });
  }
  if (audio.size > 25_000_000) {
    return NextResponse.json({ error: 'Audio demasiado grande' }, { status: 413 });
  }
  if (audio.size < 1200) {
    return NextResponse.json({ error: 'La grabación salió muy corta. Mantené apretado y hablá un momento.' }, { status: 400 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  // guardamos el audio crudo tal como lo mandó el teléfono (m4a en iOS, webm en Chrome)
  const extRaw = (audio.name.split('.').pop() ?? 'm4a').toLowerCase().replace(/[^a-z0-9]/g, '') || 'm4a';
  const ext = (['m4a', 'webm', 'ogg', 'mp4', 'wav'].includes(extRaw) ? extRaw : 'm4a') as 'm4a' | 'webm' | 'ogg' | 'mp4' | 'wav';
  const crudoNombre = guardarAdjunto(buffer, ext);
  const crudoPath = path.join(ADJUNTOS_DIR, crudoNombre);
  const wavPath = `${crudoPath.replace(/\.[^.]+$/, '')}-16k.wav`;

  // afconvert (nativo de macOS): convierte CUALQUIER formato a WAV 16 kHz PCM16.
  // Mover la conversión al servidor arregla el audio en Safari/iPhone.
  try {
    await ejecutar('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', crudoPath, wavPath], { timeout: 30_000 });
  } catch (e) {
    const detalle = e instanceof Error ? e.message.slice(0, 160) : 'error';
    return NextResponse.json({ error: `No se pudo procesar el audio (${detalle})` }, { status: 500 });
  }

  try {
    const { stdout } = await ejecutar('python3', [path.join(process.cwd(), 'scripts', 'transcribir.py'), wavPath], {
      timeout: 90_000,
    });
    const { texto } = JSON.parse(stdout) as { texto: string };

    // ⚠️ WHISPER INVENTA SOBRE EL SILENCIO, y hasta hoy eso entraba a la base
    // como algo que dijo Matías. Había un mensaje suyo que decía "¡Suscríbete al
    // canal!" — entrenó con subtítulos de YouTube, así que ante un audio vacío
    // devuelve el cierre de un video en vez de devolver nada.
    //
    // ⚠️ Y NO ES UN MENSAJE FEO NOMÁS: de `chat_mensajes` lo leen el Analista,
    // los patrones y la memoria del bot. Un audio en silencio podía terminar
    // convertido en un "hecho" sobre su vida. Ver `lib/transcripcion.ts`, que
    // explica por qué solo se descarta la transcripción ENTERA y nunca por
    // "contiene".
    const limpio = limpiarTranscripcion(texto);
    if (!limpio) {
      return NextResponse.json(
        { error: 'No se escuchó nada en ese audio. Probá de nuevo.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ texto: limpio, adjuntoPath: crudoNombre });
  } catch (e) {
    const detalle = e instanceof Error ? e.message.slice(0, 160) : 'error';
    return NextResponse.json({ error: `Transcripción falló: ${detalle}` }, { status: 503 });
  }
}

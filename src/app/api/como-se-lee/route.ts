import { NextResponse } from 'next/server';
import { fotoMuyGrande } from '@/lib/adjuntos';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { ubicarMarcas, type MarcaCruda } from '@/lib/como-se-lee';
import type { MensajeLLM } from '@/lib/llm/proveedor';

// Motor de "Cómo se lee": recibe un mensaje (escrito, pegado o una captura) y
// devuelve el mensaje con las frases que podrían leerse distinto, marcadas.
//
// ⚠️ NO GUARDA NADA EN LA BASE, a diferencia de Polaridad. Un mensaje que estás
// por mandar, con lo que te pasa adentro, no tiene por qué quedar en una lista
// de "lo que ya miraste". Si algún día se quiere historial, es una decisión de
// producto y hay que pedírsela a Matías, no darla por hecha.

// El esquema fuerza las CLAVES, no solo que sea JSON: sin esto el modelo devuelve
// un JSON válido con su propia estructura (y a veces en inglés) y el parseo lo
// descarta entero. Misma lección que en el Analista.
const ESQUEMA = {
  type: 'object',
  properties: {
    mensaje: { type: 'string' },
    marcas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          frase: { type: 'string' },
          lectura: { type: 'string' },
        },
        required: ['frase', 'lectura'],
      },
    },
  },
  required: ['mensaje', 'marcas'],
} as const;

export async function POST(req: Request) {
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'La IA está apagada (Ollama no corre).' }, { status: 503 });
  }

  const ct = req.headers.get('content-type') ?? '';
  let contenidoUsuario = '';
  let imagenes: string[] | undefined;
  // El mensaje que escribió Matías, cuando lo tenemos de este lado. Con una
  // captura no lo tenemos: lo transcribe el modelo y sale en su respuesta.
  let mensajeConocido: string | null = null;

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    const foto = form?.get('foto');
    if (!(foto instanceof File) || foto.size === 0) {
      return NextResponse.json({ error: 'Falta la captura.' }, { status: 400 });
    }
    if (fotoMuyGrande(foto)) {
      return NextResponse.json({ error: 'La captura es demasiado grande (máximo 12 MB).' }, { status: 413 });
    }
    imagenes = [Buffer.from(await foto.arrayBuffer()).toString('base64')];
    contenidoUsuario =
      'Esta es una captura de una conversación. Transcribí el mensaje que estamos mirando en "mensaje" y marcá ahí las frases que podrían leerse distinto.';
  } else {
    const body = (await req.json().catch(() => ({}))) as { texto?: string };
    const texto = (body.texto ?? '').trim();
    if (!texto) return NextResponse.json({ error: 'Traé el mensaje que querés mirar.' }, { status: 400 });
    mensajeConocido = texto.slice(0, 4000);
    contenidoUsuario = `Mensaje a mirar:\n${mensajeConocido}`;
  }

  const mensajes: MensajeLLM[] = [{ rol: 'user', contenido: contenidoUsuario, imagenes }];

  let crudo = '';
  try {
    crudo = await llamarRol('comoselee', mensajes, { esquema: ESQUEMA });
  } catch {
    return NextResponse.json({ error: 'No se pudo mirar el mensaje. Probá de nuevo en un momento.' }, { status: 502 });
  }

  let data: { mensaje?: unknown; marcas?: unknown };
  try {
    data = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ error: 'La IA respondió en un formato inesperado. Probá de nuevo.' }, { status: 502 });
  }

  // ⚠️ EL MENSAJE QUE MANDÓ MATÍAS GANA SIEMPRE al que devuelve el modelo. Con
  // texto escrito el prompt le pide que lo copie tal cual, y aun así a veces lo
  // "arregla" (ortografía, puntuación). Si mostráramos su versión, Matías vería
  // subrayado un mensaje que no es el que escribió.
  const mensaje = mensajeConocido ?? String(data.mensaje ?? '').trim();
  if (!mensaje) {
    return NextResponse.json({ error: 'No se pudo leer el mensaje de la captura.' }, { status: 502 });
  }

  const crudas: MarcaCruda[] = Array.isArray(data.marcas)
    ? (data.marcas as Record<string, unknown>[]).map((m) => ({
        frase: String(m?.frase ?? ''),
        lectura: String(m?.lectura ?? ''),
      }))
    : [];

  // Las frases que no están literalmente en el mensaje se descartan acá: no se
  // pueden subrayar, y mostrarlas como texto suelto sería el "veredicto sobre el
  // mensaje entero" que esta pantalla justamente no hace.
  return NextResponse.json({ mensaje, marcas: ubicarMarcas(mensaje, crudas) });
}

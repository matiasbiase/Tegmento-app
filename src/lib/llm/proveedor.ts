export type MensajeLLM = { rol: 'system' | 'user' | 'assistant'; contenido: string; imagenes?: string[] };

const BASE = () => process.env.OLLAMA_URL ?? 'http://localhost:11434';

// Opciones de generación. Ollama, si no le mandás nada, usa los defaults del
// modelo, y ahí estaban dos problemas serios que tardamos en ver:
//
//  - num_ctx: el default de Ollama (4096) es MÁS CHICO que lo que le mandábamos.
//    El Analista arma ~3.500 tokens de datos y el prompt del sistema son ~1.200:
//    el contexto se truncaba y lo primero que se caía eran las instrucciones. Por
//    eso devolvía etiquetas sueltas ("dolor y persistencia") en vez de patrones, y
//    por eso inventaba fechas: no estaba leyendo ni el formato pedido ni los datos
//    enteros. No es que el modelo no supiera: no le llegaba el pedido.
//  - repeat_penalty: sin penalización el modelo entra en bucle. Devolvió
//    "lúgubres lúgubres lúgubres…" cientos de veces hasta cortar el JSON al medio.
const OPCIONES_BASE = {
  repeat_penalty: 1.15,
  temperature: 0.7,
  top_p: 0.9,
};

// Cuánto se queda el modelo cargado en RAM después de contestar.
//
// El default de Ollama son 5 minutos. Con eso, escribís algo, te vas a hacer
// otra cosa y al volver **hay que subir los 7,6 GB del modelo otra vez desde el
// disco**: son varios segundos en el primer mensaje, y se sienten como que la
// app se colgó, no como que está cargando.
//
// 30 minutos cubre el uso real (se entra varias veces en un rato, no una vez por
// hora). El costo es tener esos 7,6 GB ocupados media hora sin usarlos — que en
// esta máquina se puede desde que **todos los roles usan el mismo modelo**
// (29/07): antes, con un 26b y un 4b alternándose, dejarlos residentes no
// entraba en los 24 GB. Si algún día vuelven a convivir dos modelos grandes,
// esto hay que bajarlo.
const KEEP_ALIVE = '30m';

export async function completarOllama(opts: {
  modelo: string;
  mensajes: MensajeLLM[];
  json?: boolean;
  // Esquema JSON (structured outputs de Ollama): fuerza las CLAVES, no solo que
  // sea JSON. Sin esto, con un contexto grande el modelo devolvía un JSON válido
  // pero con su propia estructura (y en inglés), y el parseo lo descartaba. Con
  // el esquema, las claves salen sí o sí.
  esquema?: object;
  /** Ventana de contexto en tokens. Subila cuando el input es grande. */
  contextoTokens?: number;
  /** Tope de tokens generados, para que un bucle no cuelgue la app. */
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(`${BASE()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.modelo,
      messages: opts.mensajes.map((m) => ({ role: m.rol, content: m.contenido, images: m.imagenes })),
      stream: false,
      // ⚠️ SIN RAZONAMIENTO EN VOZ ALTA. Los modelos que lo traen (gemma4 y los
      // que vengan) escriben su deliberación antes de contestar, y Ollama la
      // devuelve aparte: **se paga y se tira**. Medido el 29/07 con gemma4:26b:
      // 1229 tokens y 30 segundos para entregar dos oraciones; con esto en
      // false, 40 tokens y ~1 segundo. La misma respuesta.
      // A los modelos que no razonan (gemma3) este campo no les hace nada, así
      // que va siempre y no según el modelo.
      think: false,
      keep_alive: KEEP_ALIVE,
      format: opts.esquema ?? (opts.json ? 'json' : undefined),
      options: {
        ...OPCIONES_BASE,
        ...(opts.contextoTokens ? { num_ctx: opts.contextoTokens } : {}),
        ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
}

export async function ollamaDisponible(): Promise<boolean> {
  try {
    // 8s, no 1.5s: cuando Ollama está ocupado cargando un modelo grande en RAM,
    // hasta /api/version tarda. Con 1.5s daba false y el Analista abortaba de
    // entrada — por eso los patrones quedaban congelados aunque Ollama corría.
    const res = await fetch(`${BASE()}/api/version`, { signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

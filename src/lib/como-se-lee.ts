/**
 * "Cómo se lee": marcar frases sueltas de un mensaje y decir cómo podrían caer.
 *
 * De dónde salió: ToneMeter (OurFamilyWizard), que le dicen "un corrector
 * ortográfico emocional". Tres decisiones suyas se adoptaron —marca frases y no
 * el mensaje entero, no reescribe, no bloquea ni aprueba— y una se rechazó a
 * propósito: **ellos usan barritas ROJAS de "nivel de tono"**, que es
 * exactamente el veredicto que acá no queremos. Ver
 * `docs/maquetas/2026-07-30-lo-nuevo.md`.
 *
 * ── EL PROBLEMA QUE RESUELVE ESTE ARCHIVO ─────────────────────────────────────
 * La pantalla subraya las frases DENTRO del mensaje, así que el modelo tiene que
 * devolver substrings exactos. El prompt lo pide con todas las letras y el modelo
 * igual parafrasea, arregla la ortografía o se come una coma. Cuando eso pasa, no
 * se puede subrayar nada.
 *
 * Así que la frase se busca acá, con tolerancia creciente, y **lo que no se
 * encuentra se descarta**. Es la misma decisión que ya se tomó con las
 * observaciones del Analista (`observacion-valida.ts`): al modelo no se le pide
 * que se porte bien, se valida la respuesta antes de mostrarla.
 */

export type MarcaCruda = { frase: string; lectura: string };

/** Una marca ya ubicada dentro del mensaje. */
export type Marca = {
  /** 1, 2, 3… en el orden en que aparecen en el mensaje, no en el que vino el JSON. */
  numero: number;
  /** El texto exacto del mensaje que se subraya. */
  frase: string;
  lectura: string;
  desde: number;
  hasta: number;
};

/** Un trozo del mensaje para pintar: con marca (subrayado) o sin ella. */
export type Trozo = { texto: string; marca: number | null };

/** Cuántas marcas se muestran como máximo. Más que esto es subrayar todo. */
export const MAX_MARCAS = 4;

/**
 * Ubica cada frase dentro del mensaje.
 *
 * Tres intentos por frase, de más estricto a menos:
 *   1. tal cual;
 *   2. sin distinguir mayúsculas ni tildes (el modelo "corrige" acentos);
 *   3. con los espacios flexibles (a veces cambia un salto de línea por un
 *      espacio, o mete dos).
 *
 * Las que no aparecen se descartan, y las que se solapan con una ya ubicada
 * también: dos subrayados encimados no se pueden dibujar, y quedarse con la
 * primera es más honesto que partirlas al medio.
 */
export function ubicarMarcas(mensaje: string, crudas: MarcaCruda[]): Marca[] {
  const ubicadas: Omit<Marca, 'numero'>[] = [];

  for (const c of crudas) {
    const frase = c.frase?.trim();
    const lectura = c.lectura?.trim();
    if (!frase || !lectura) continue;

    const pos = buscarFrase(mensaje, frase);
    if (!pos) continue;

    const seSolapa = ubicadas.some((u) => pos.desde < u.hasta && pos.hasta > u.desde);
    if (seSolapa) continue;

    ubicadas.push({
      // El texto que se subraya sale del MENSAJE, no de lo que devolvió el
      // modelo: si el match fue tolerante, lo que se pinta tiene que ser lo que
      // Matías escribió de verdad, letra por letra.
      frase: mensaje.slice(pos.desde, pos.hasta),
      lectura,
      desde: pos.desde,
      hasta: pos.hasta,
    });
  }

  return ubicadas
    .sort((a, b) => a.desde - b.desde)
    .slice(0, MAX_MARCAS)
    .map((u, i) => ({ ...u, numero: i + 1 }));
}

/** Los tres intentos de match. Devuelve el rango en el mensaje ORIGINAL. */
function buscarFrase(mensaje: string, frase: string): { desde: number; hasta: number } | null {
  const exacto = mensaje.indexOf(frase);
  if (exacto !== -1) return { desde: exacto, hasta: exacto + frase.length };

  // Sin mayúsculas ni tildes. Se compara sobre una versión "plana" del mensaje
  // que conserva el largo de cada carácter, así los índices siguen sirviendo
  // para cortar el original.
  const planoMsg = aplanar(mensaje);
  const planoFrase = aplanar(frase);
  const laxo = planoMsg.indexOf(planoFrase);
  if (laxo !== -1) return { desde: laxo, hasta: laxo + planoFrase.length };

  // Espacios flexibles: cualquier corrida de espacios de la frase matchea
  // cualquier corrida de espacios del mensaje (incluidos los saltos de línea).
  const patron = planoFrase
    .split(/\s+/)
    .filter(Boolean)
    .map(escapar)
    .join('\\s+');
  if (!patron) return null;
  const m = new RegExp(patron).exec(planoMsg);
  if (!m) return null;
  return { desde: m.index, hasta: m.index + m[0].length };
}

/**
 * Minúsculas y sin tildes, PERO SIN CAMBIAR EL LARGO.
 *
 * ⚠️ El `NFD` + borrar diacríticos que se usa en otros lados (ver
 * `lib/notas.ts`) acá NO sirve: descompone "á" en dos caracteres y después borra
 * uno, así que el string se acorta y **todos los índices de ahí en adelante
 * quedan corridos**. El subrayado terminaba una letra antes en cada tilde que
 * hubiera antes. Por eso se reemplaza carácter por carácter.
 */
function aplanar(t: string): string {
  return t
    .toLowerCase()
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
}

function escapar(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parte el mensaje en trozos para pintarlo: los que llevan marca y los que no.
 *
 * Se hace acá y no en el componente porque es la parte que se puede equivocar
 * (índices, huecos, el final del texto) y así tiene tests.
 */
export function trozos(mensaje: string, marcas: Marca[]): Trozo[] {
  const salida: Trozo[] = [];
  let cursor = 0;
  for (const m of [...marcas].sort((a, b) => a.desde - b.desde)) {
    if (m.desde > cursor) salida.push({ texto: mensaje.slice(cursor, m.desde), marca: null });
    salida.push({ texto: mensaje.slice(m.desde, m.hasta), marca: m.numero });
    cursor = m.hasta;
  }
  if (cursor < mensaje.length) salida.push({ texto: mensaje.slice(cursor), marca: null });
  return salida.filter((t) => t.texto !== '');
}

/**
 * Los dos tintes con los que se alternan las marcas.
 *
 * ⚠️ EL COLOR SOLO DISTINGUE UNA MARCA DE OTRA: no dice qué tan grave es
 * ninguna. Por eso son dos tonos de la misma temperatura (ámbar y rosa de la
 * paleta) y se van alternando por posición, sin ninguna relación con el
 * contenido. Verde y rojo están PROHIBIDOS acá: el primer mockup tenía un bloque
 * verde de "se entiende igual" y Matías lo cortó justamente por eso.
 */
export const TINTES = [
  { fondo: 'var(--color-oro-tint)', borde: '#d9a055' },
  { fondo: 'var(--color-rosa-tint)', borde: '#d98aa0' },
] as const;

export function tinte(numero: number): (typeof TINTES)[number] {
  return TINTES[(numero - 1) % TINTES.length];
}

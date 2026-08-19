// La IA propone anotar un gasto contado en palabras ("gasté 40 en el súper")
// con la marca [+gasto: descripción | monto | moneda | categoría]. La moneda y
// la categoría son opcionales.
//
// Es lógica pura (regex + parseo del monto) para poder testearla; el botón que
// la muestra vive en ChatUI y el guardado en actions/gastos.
//
// ── ⚠️ LA CATEGORÍA ENTRÓ ACÁ CUANDO SE SACÓ EL TICKET (03/08) ──────────────
//
// Hasta ese día `categoria` la escribía UNA sola cosa: `lib/ticket.ts`, o sea
// la foto. Los gastos contados hablando —el camino natural en una app que es
// un chat— entraban siempre sin clasificar, y por eso el insight de "el 45% fue
// en súper" solo veía una parte de lo que gastabas.
//
// Al sacar el ticket, sin esto la categoría se moría del todo. Con esto queda
// mejor que antes: ahora la tienen TODOS los gastos, no solo los que tenían
// foto.

export const MARCA_GASTO = /\[\+gasto:\s*([^\]\n]+)\]/i;

/**
 * Las categorías que existen, y son las mismas de siempre: salen del prompt del
 * ticket que se acaba de borrar y son las que `FinanzasUI` sabe pintar.
 *
 * ⚠️ NO INVENTAR CATEGORÍAS NUEVAS ACÁ SIN TOCAR `CAT_COLOR` en `FinanzasUI`:
 * una que no esté en ese mapa cae al gris de "otros" y se ve como si no se
 * hubiera clasificado. Hoy `ropa` y `servicios` están en ese caso — venían así
 * del prompt viejo, y se dejan porque el gris es una caída correcta, no un bug.
 */
export const CATEGORIAS = [
  'super',
  'comida',
  'farmacia',
  'transporte',
  'ropa',
  'ocio',
  'servicios',
  'otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type MarcaGasto = {
  descripcion: string | null;
  total: number;
  moneda: string | null;
  categoria: Categoria | null;
};

/** Una categoría conocida, o null. Sin acentos y en minúscula: el modelo escribe
 *  "Súper" tan seguido como "super", y las dos son la misma. */
function normalizarCategoria(s: string): Categoria | null {
  const t = s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return (CATEGORIAS as readonly string[]).includes(t) ? (t as Categoria) : null;
}

/** Convierte "1.234,50" o "1,234.50" o "40" a número. Los feeds y la gente
 *  mezclan el separador decimal; nos quedamos con el último como decimal. */
function parsearMonto(s: string): number | null {
  const limpio = s.replace(/[^\d.,]/g, '');
  if (!limpio) return null;
  // El último separador (. o ,) es el decimal; los otros son de miles.
  const ultimoSep = Math.max(limpio.lastIndexOf(','), limpio.lastIndexOf('.'));
  let n: number;
  if (ultimoSep === -1) {
    n = Number(limpio);
  } else {
    const entero = limpio.slice(0, ultimoSep).replace(/[.,]/g, '');
    const decimal = limpio.slice(ultimoSep + 1);
    n = Number(`${entero}.${decimal}`);
  }
  return Number.isFinite(n) ? n : null;
}

/** Saca la marca de gasto de un mensaje del asistente. Devuelve null si no hay
 *  marca o si el monto no se pudo leer (sin monto, no hay gasto que guardar). */
export function extraerMarcaGasto(texto: string): MarcaGasto | null {
  const m = texto.match(MARCA_GASTO);
  if (!m) return null;
  const partes = m[1].split('|').map((p) => p.trim());
  // Orden esperado: descripción | monto | moneda. Pero si la IA manda solo el
  // monto, o lo pone primero, lo buscamos donde haya un número.
  let total: number | null = null;
  let idxMonto = -1;
  for (let i = 0; i < partes.length; i++) {
    const n = parsearMonto(partes[i]);
    if (n != null && /\d/.test(partes[i])) {
      total = n;
      idxMonto = i;
      break;
    }
  }
  if (total == null) return null;

  const descripcion = partes[0] && idxMonto !== 0 ? partes[0] : null;

  // ⚠️ MONEDA Y CATEGORÍA SE DESAMBIGUAN POR CONTENIDO, NO POR POSICIÓN, y es
  // necesario: la moneda es opcional, así que en `[+gasto: café | 3.50 | comida]`
  // la tercera parte es la CATEGORÍA y no la moneda. Tomarla por posición
  // guardaría "comida" como moneda y el gasto saldría con "comida 3,50".
  // Por eso primero se busca una categoría CONOCIDA; lo que sobra es la moneda.
  let categoria: Categoria | null = null;
  let moneda: string | null = null;
  for (const p of partes.slice(idxMonto + 1)) {
    if (!p || /\d/.test(p)) continue;
    const cat = normalizarCategoria(p);
    if (cat && !categoria) categoria = cat;
    else if (!cat && !moneda) moneda = p;
  }

  return {
    descripcion: descripcion?.slice(0, 120) || null,
    total,
    categoria,
    moneda: moneda?.slice(0, 8) || null,
  };
}

// Convertir un texto largo en un rótulo corto que se pueda leer de un vistazo.
//
// ── Por qué existe (27/07/2026, Matías) ──────────────────────────────────────
// Los chips del home mostraban `contenido.slice(0, 46) + '…'`: la primera frase
// CORTADA AL MEDIO, muchas veces en mitad de una idea. Su queja, textual: "está
// usando la primera frase en vez de hacer como un resumen o un título, no tiene
// ningún sentido".
// Cortar por cantidad de caracteres es lo que rompe: no respeta dónde termina
// una idea. Acá se corta por PUNTUACIÓN — primero donde termina la oración,
// después donde termina la cláusula — y recién si no hay nada de eso, por
// palabra. Un rótulo cortado en un límite real se lee como título; cortado en
// el carácter 46 se lee como un error.
//
// Esto NO es un resumen de verdad: para eso hay que pedirle un título al modelo
// cuando se guarda la observación (necesita una columna nueva). Es la mejora que
// se puede hacer sin tocar la base.

/** Arranques que no aportan nada al rótulo: lo que importa viene después. */
const MULETILLAS = [
  /^not[ée] que\s+/i,
  /^noté\s+/i,
  /^parece que\s+/i,
  /^me parece que\s+/i,
  /^se nota que\s+/i,
  /^da la impresión de que\s+/i,
  /^hay algo que\s+/i,
];

/** Dónde termina una oración. */
const FIN_ORACION = /[.!?…](\s|$)/;
/** Dónde termina una cláusula, si la oración entera no entra. */
const FIN_CLAUSULA = /[,;:—–]|\s+(?:porque|aunque|pero|así que|mientras que)\s+/i;

/**
 * Un rótulo corto a partir de un texto largo.
 *
 * - Saca la muletilla del arranque ("Noté que…").
 * - Corta en el final de oración o de cláusula que entre en `max`.
 * - Si nada entra, corta por palabra y pone puntos suspensivos.
 * - Arranca en mayúscula y no deja puntuación colgando al final.
 */
export function titular(texto: string, max = 84): string {
  let t = texto.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  for (const m of MULETILLAS) t = t.replace(m, '');
  if (!t) return '';

  // ¿Entra entera? Entonces no hay nada que recortar.
  if (t.length <= max) return limpiar(t);

  const oracion = cortarEn(t, FIN_ORACION, max);
  if (oracion) return limpiar(oracion);

  const clausula = cortarEn(t, FIN_CLAUSULA, max);
  // Una cláusula de una o dos palabras no dice nada ("Ojo,"): en ese caso es
  // mejor el corte por palabra, aunque quede con puntos suspensivos.
  if (clausula && clausula.split(' ').length >= 3) return limpiar(clausula);

  return `${limpiar(t.slice(0, max).replace(/\s+\S*$/, ''))}…`;
}

/** El trozo más largo que termina en `corte` sin pasarse de `max`. */
function cortarEn(t: string, corte: RegExp, max: number): string | null {
  const global = new RegExp(corte.source, corte.flags.includes('g') ? corte.flags : `${corte.flags}g`);
  let mejor: string | null = null;
  for (const m of t.matchAll(global)) {
    const fin = m.index ?? 0;
    if (fin === 0) continue;
    if (fin > max) break;
    mejor = t.slice(0, fin);
  }
  return mejor;
}

/** Mayúscula al principio, sin puntuación ni conectores colgando al final. */
function limpiar(t: string): string {
  const s = t
    .trim()
    .replace(/[\s,;:.—–]+$/, '')
    .replace(/\s+(?:y|o|de|que|con|para|en)$/i, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

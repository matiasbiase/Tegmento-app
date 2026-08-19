/**
 * Experimentos: lo que el Analista propone PROBAR unos días, y que Matías
 * aceptó desde Relaciones.
 *
 * La diferencia con una actividad común es que un experimento **se responde y
 * se cierra**: la app vuelve a preguntar cómo fue, y esa respuesta es el dato
 * que confirma o tumba la relación que lo originó. Una actividad, en cambio, se
 * sostiene y no espera veredicto.
 *
 * Se marca en `lineas.notas` y no en una columna nueva: no hace falta filtrar
 * por esto en ninguna consulta, solo leerlo cuando ya tenés la fila.
 *
 * ⚠️ Este módulo existe aparte de `actions/observaciones.ts` porque ese archivo
 * es `'use server'`, y ahí Next solo deja exportar funciones async: una simple
 * constante compartida rompe el build.
 */

export const MARCA_EXPERIMENTO = 'Experimento del Analista';

/** Lo que el modelo suele anteponer aunque el prompt le pida el infinitivo. */
const ARRANQUES = /^(prob[aá](r|te)?|intent[aá](r)?|proponete|animate a)\s+(a\s+|de\s+)?/i;

/**
 * Deja el experimento listo para usarse como TÍTULO de una actividad.
 *
 * Dos cosas, y las dos salieron de verlo fallar de verdad (28/07):
 *  1. **Le saca el "Probá" del principio.** El botón ya dice "+ probar: …", así
 *     que sin esto se lee "probar: Probá programar dos sesiones".
 *  2. **Recorta sin partir palabras.** El corte a 80 caracteres pelado dejaba
 *     cosas como "…dos sesiones esta semana, incluso si estás " colgando.
 */
export function limpiarExperimento(texto: string, max = 72): string {
  let t = texto.trim().replace(ARRANQUES, '');
  // Se comió la mayúscula del verbo al sacar el "Probá": vuelve en minúscula
  // porque va detrás de dos puntos.
  t = t.charAt(0).toLowerCase() + t.slice(1);
  if (t.length > max) t = `${t.slice(0, max).replace(/[\s,;.]+\S*$/, '')}…`;
  return t.trim();
}

/** Arma el texto de `notas` de un experimento que arranca ahora. */
export function notasDeExperimento(ahoraISO: string): string {
  return `${MARCA_EXPERIMENTO} · arrancó ${ahoraISO}`;
}

/**
 * Si la nota es de un experimento, cuántos días lleva. null si no lo es o si la
 * fecha no se puede leer (una nota vieja, escrita a mano, lo que sea).
 */
export function diasDeExperimento(notas: string | null | undefined, ahora: Date = new Date()): number | null {
  if (!notas || !notas.startsWith(MARCA_EXPERIMENTO)) return null;
  const m = notas.match(/arrancó (\S+)/);
  if (!m) return null;
  const inicio = new Date(m[1]);
  if (Number.isNaN(inicio.getTime())) return null;
  return Math.floor((ahora.getTime() - inicio.getTime()) / 86_400_000);
}

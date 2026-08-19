/**
 * LAS TARJETAS DEL BOT QUE DIJISTE "AHORA NO", EN UNA COOKIE.
 *
 * ⚠️ ES UNA COOKIE Y NO `localStorage`, Y ESA ES TODA LA GRACIA (31/07).
 *
 * La primera versión guardaba esto en `localStorage`, y trajo los dos problemas
 * seguidos que reportó Matías:
 *
 * 1. **"Hydration failed".** El server no tiene `localStorage`, así que armaba el
 *    HTML con TODAS las tarjetas mientras el navegador arrancaba ya filtrado. Dos
 *    dibujos distintos para la misma pantalla, y React lo canta.
 * 2. **Las tarjetas aparecían y se iban solas.** Arreglar (1) leyendo después de
 *    montar corrige el error pero deja el parpadeo a la vista: el server las
 *    manda, el navegador las saca un instante después. *"Aparecen pero
 *    desaparecen rápido"*.
 *
 * Los dos salen de lo mismo: **el server decide qué dibujar y no tenía cómo
 * enterarse de lo que descartaste.** Una cookie viaja con el pedido, así que se
 * filtra ANTES de armar el HTML y no queda nada que corregir después.
 *
 * Sigue siendo del navegador y no de la base, que era el criterio original: esto
 * es cómo querés ver la pantalla hoy, no un dato tuyo que quieras conservar.
 *
 * (La clave vieja de `localStorage` era `tegmento:tarjetas-descartadas`. Si
 * quedó escrita en algún navegador ya no la lee nadie.)
 */

/** Sin `:` a propósito: no es un caracter válido en un nombre de cookie. */
export const COOKIE_DESCARTADAS = 'tegmento_tarjetas_descartadas';

/** El día se guarda ADENTRO del valor, no en el vencimiento de la cookie: así
 *  "mañana arranca limpio" es una regla que se lee en el código y no depende de
 *  que el navegador expire algo a la hora justa. */
export function hoyLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Los ids descartados HOY. Cualquier cosa rara —cookie de ayer, JSON roto,
 * alguien editándola a mano— devuelve lista vacía: el peor caso es que te
 * vuelva a aparecer una tarjeta, y eso es mucho mejor que una pantalla en
 * blanco por un campo mal escrito.
 */
export function leerDescartadas(crudo: string | undefined, hoy = hoyLocal()): string[] {
  if (!crudo) return [];
  try {
    const { dia, ids } = JSON.parse(decodeURIComponent(crudo)) as { dia?: string; ids?: unknown };
    if (dia !== hoy || !Array.isArray(ids)) return [];
    return ids.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

/** El valor listo para escribir, sin el nombre ni los atributos. */
export function serializarDescartadas(ids: string[], hoy = hoyLocal()): string {
  return encodeURIComponent(JSON.stringify({ dia: hoy, ids }));
}

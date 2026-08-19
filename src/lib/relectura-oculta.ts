/**
 * LA RELECTURA CERRADA HOY, EN SU PROPIA COOKIE.
 *
 * Mismo mecanismo que `tarjetas-descartadas`: cookie (no `localStorage`) para
 * que el server filtre ANTES de armar el HTML y no haya parpadeo ni error de
 * hidratación. El día va adentro del valor, así "mañana arranca limpio" se lee
 * en el código y no depende de que el navegador expire algo a la hora justa.
 *
 * ⚠️⚠️ ES UNA COOKIE APARTE Y NO UN ID MÁS ADENTRO DE `tegmento_tarjetas_descartadas`,
 * QUE ERA LO OBVIO. Compartirla se rompe solo: `TarjetasBot` arranca con
 * `descartadas = []` —el server ya le filtró la lista— y al descartar escribe
 * `[...descartadas, id]`. O sea que **la primera tarjeta que digas "ahora no"
 * pisa la cookie entera y se lleva puesta la relectura que habías cerrado**, que
 * volvería a aparecer sola en el mismo refresh. Dos cosas que se escriben desde
 * componentes distintos no comparten cookie.
 */

/** Sin `:` a propósito: no es un caracter válido en un nombre de cookie. */
export const COOKIE_RELECTURA = 'tegmento_relectura_oculta';

/**
 * ¿La cerraste hoy? Cualquier cosa rara —cookie de ayer, JSON roto, alguien
 * editándola a mano— devuelve `false`: el peor caso es que te vuelva a aparecer
 * un recuerdo, y eso es mucho mejor que una pantalla en blanco.
 */
export function estaOculta(crudo: string | undefined, hoy: string): boolean {
  if (!crudo) return false;
  try {
    const { dia } = JSON.parse(decodeURIComponent(crudo)) as { dia?: unknown };
    return dia === hoy;
  } catch {
    return false;
  }
}

/** El valor listo para escribir, sin el nombre ni los atributos. */
export function serializarOculta(hoy: string): string {
  return encodeURIComponent(JSON.stringify({ dia: hoy }));
}

/**
 * LO QUE EL ASISTENTE TE OFRECE, EXTRAÍDO DE SU ÚLTIMA RESPUESTA.
 *
 * Pedido de Matías (29/07): *"estos links que te mandan a otros lados podrían
 * estar arriba de la barrita donde se escribe. En vez de que aparezca Ánimo,
 * Sueño y esas cosas, que aparezca lo que te recomienda la app en el momento,
 * y con colorcitos"*.
 *
 * Dos problemas que resuelve de una:
 *  - los chips de arriba del composer eran FIJOS (Ánimo · Sueño · Seguimiento) y
 *    repetían lo que ya está en la barra de abajo y en el menú;
 *  - las sugerencias del asistente aparecían como botones EN EL MEDIO del texto,
 *    cortando la lectura de la respuesta.
 * Ahora el texto se lee entero y lo tocable vive abajo, al alcance del pulgar y
 * pegado a donde vas a escribir la respuesta.
 */

/** El mismo patrón que usa el chat para los links internos. */
const LINK = /\[([^\]]+)\]\((\/[a-zA-Z0-9/_-]*)\)/g;

export type Sugerido = { texto: string; href: string; tint: string; color: string };

/**
 * Color por destino, y NO uno por sugerencia.
 *
 * El color dice de qué se trata, no "acá hay un botón": calma y ánimo son del
 * cuerpo, foco es de hacer, y lo demás es la app mirándote. Si cada chip tuviera
 * su color, el color dejaría de significar algo.
 */
const COLOR_POR_RUTA: { prefijo: string; tint: string; color: string }[] = [
  { prefijo: '/calma', tint: 'var(--color-verde-tint)', color: 'var(--color-verde)' },
  // ⚠️ Acá había una entrada para `/animo`, que se borró el 05/08. No hubo que
  // agregar nada: `/cuerpo` ya estaba en la tabla y con el mismo verde, porque
  // el ánimo siempre fue del cuerpo. Es lo que hizo que mudarlo no cambiara
  // ningún color.
  { prefijo: '/cuerpo', tint: 'var(--color-verde-tint)', color: 'var(--color-verde)' },
  { prefijo: '/foco', tint: 'var(--color-oro-tint)', color: 'var(--color-oro)' },
  { prefijo: '/actividades', tint: 'var(--color-oro-tint)', color: 'var(--color-oro)' },
  { prefijo: '/polaridad', tint: 'var(--color-rosa-tint)', color: 'var(--color-rosa)' },
];
const POR_DEFECTO = { tint: 'var(--color-iris-soft)', color: 'var(--color-iris-deep)' };

/**
 * Saca los links internos del último mensaje del asistente.
 *
 * Solo del ÚLTIMO: si acumulara los de toda la charla, abajo se juntarían diez
 * chips de cosas que ya no vienen al caso. Lo que te ofrece es lo que te acaba
 * de decir.
 */
export function sugeridosDe(texto: string | null | undefined): Sugerido[] {
  if (!texto) return [];
  const out: Sugerido[] = [];
  const vistos = new Set<string>();
  for (const m of texto.matchAll(LINK)) {
    const href = m[2];
    if (vistos.has(href)) continue; // el mismo destino dos veces es un solo chip
    vistos.add(href);
    const c = COLOR_POR_RUTA.find((r) => href.startsWith(r.prefijo)) ?? POR_DEFECTO;
    out.push({ texto: m[1].trim(), href, tint: c.tint, color: c.color });
  }
  // Tres es el techo: son la fila de arriba del teclado, no un menú.
  return out.slice(0, 3);
}

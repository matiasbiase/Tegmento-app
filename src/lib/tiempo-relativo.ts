/**
 * HACE CUÁNTO LLEGÓ ESTE DATO — minutos, horas, días.
 *
 * ⚠️⚠️ NACIÓ DE ENCONTRAR DOS COPIAS QUE REDONDEABAN DISTINTO (11/08). Apareció
 * auditando el pedido de la fecha repetida: `Acciones.tsx` tenía `hace()` y
 * `Noticias.tsx` tenía `haceCuanto()`, las dos haciendo exactamente lo mismo y
 * **discrepando en todo lo que se ve**:
 *
 * | | Acciones | Noticias |
 * |---|---|---|
 * | redondeo | `floor` | `round` |
 * | días | "hace 3 días" | "hace 3 d" |
 * | recién | "recién" | "hace 1 min" |
 * | ayer | "ayer" | "hace 1 d" |
 *
 * O sea que **el mismo instante se contaba de dos maneras en dos pantallas**. No
 * es que una estuviera mal: es que no había una sola. Misma familia que la
 * estandarización de espacios del 07/08.
 *
 * ── ⚠️ LO QUE **NO** SE UNIFICÓ, Y ES A PROPÓSITO ───────────────────────────
 *
 * `haceCuanto` de `lib/relectura.ts` **se queda aparte**, y era la tentación
 * obvia (tiene el mismo nombre). Pero mide otra cosa:
 *
 *  - Esto de acá mide **qué tan fresco es un dato**: minutos a días, exacto,
 *    porque lo que importa es si la cotización es de recién o de ayer.
 *  - Aquello mide **hace cuánto en tu vida**: semanas a meses, y **redondea a
 *    propósito** ("hace un mes", "hace dos meses"). Su propio comentario lo
 *    explica: *"una fecha exacta obliga a calcular; lo que importa es la
 *    distancia"*.
 *
 * **Juntarlas habría sido unificar la forma y romper el sentido.** Dos funciones
 * con el mismo nombre no son necesariamente la misma función.
 */

/** Umbral en minutos por debajo del cual algo es "recién". */
const RECIEN = 2;

/**
 * Hace cuánto llegó esto, o `null` si no hay fecha o es inválida.
 *
 * ⚠️ DEVUELVE `null` Y NO UN TEXTO POR DEFECTO. Cada pantalla dice lo suyo
 * cuando no hay dato: Acciones dice *"sin traer"* (la cotización no se pudo
 * pedir), y una noticia sin fecha simplemente no muestra nada. Meter un default
 * acá adentro obligaría a las dos a compartir una excusa que no comparten.
 *
 * ⚠️ Y `null` TAMBIÉN PARA LAS FECHAS FUTURAS. Un feed con el reloj adelantado
 * daría "hace -3 min", que es peor que no decir nada.
 */
export function haceCuantoLlego(iso: string | null | undefined, ahora: number = Date.now()): string | null {
  if (!iso) return null;

  const ms = ahora - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return null;

  // ⚠️ `floor` y no `round`, en los tres escalones. Con `round`, algo de 90
  // minutos dice "hace 2 h" — o sea **afirma más tiempo del que pasó**. Un dato
  // de frescura tiene que pecar de fresco, nunca al revés: si dice "hace 1 h"
  // cuando pasó una hora y media, el error es aburrido; al revés, te hace
  // desconfiar de un dato que estaba bien.
  const min = Math.floor(ms / 60_000);
  if (min < RECIEN) return 'recién';
  if (min < 60) return `hace ${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;

  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/**
 * LOS ÍTEMS DE UN GASTO: SOLO PARA LEER LO QUE YA ESTÁ GUARDADO.
 *
 * ⚠️⚠️ ESTO ES UN RESTO DEL TICKET, QUE SE SACÓ EL 03/08, Y NADIE ESCRIBE ÍTEMS
 * NUNCA MÁS. Vivía dentro de `lib/ticket.ts` junto con el parseo de la foto;
 * cuando ese archivo se borró, esto se rescató a propósito, porque la columna
 * `gastos.items` NO se borró y todavía tiene datos: al 03/08, 4 de los 8 gastos
 * cargados tienen ítems.
 *
 * ── QUÉ DEPENDE DE ESTO, Y CÓMO VA A ENVEJECER ──────────────────────────────
 *
 * `gastos-salud.ts` calcula qué porcentaje de lo que gastás en comida es
 * ultraprocesado, y sale ÚNICAMENTE de acá (pedido de Matías del 29/07). El
 * Analista además lee los ítems como texto para cruzar compras con ánimo.
 *
 * ⚠️ Las dos cosas van a ir muriéndose solas: el gasto entra ahora por
 * `[+gasto:]`, que guarda en qué, cuánto, la moneda y la categoría — pero NO el
 * detalle línea por línea, porque nadie va a dictar quince productos hablando.
 * En cuanto los ocho gastos viejos queden fuera de la ventana de 30 días del
 * Analista, el porcentaje de ultraprocesados va a ser 0 sobre 0 ítems.
 *
 * **Eso es una decisión pendiente, no un olvido.** Si el dato importa, la salida
 * NO es volver a poner la foto: es que la comida ya se anota por `[+comida:]` y
 * ese es el camino donde el ultraprocesado tiene sentido. Queda anotado en
 * `pedidos-de-matias.md`.
 *
 * Mientras tanto esto se queda: borrar el lector dejaría 4 gastos con datos
 * ilegibles, que es peor que un módulo chico que se apaga despacio y con un
 * cartel puesto.
 */

export type SaludItem = 'sano' | 'chatarra' | null;
export type ItemTicket = { nombre: string; precio: number | null; salud: SaludItem };

function normalizarSalud(v: unknown): SaludItem {
  return v === 'sano' || v === 'chatarra' ? v : null;
}

/** Convierte "23,50", "€ 23.50", "1.234,56" o 23.5 a número. */
export function parsearMonto(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.replace(/[^\d.,-]/g, '').trim();
  if (!s) return null;
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  // El separador decimal es el último que aparece; el otro son miles.
  if (coma > punto) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * Normaliza un ítem crudo leído de `gastos.items`.
 *
 * ⚠️ Acepta DOS formatos y hay que seguir aceptando los dos: el nuevo
 * `{nombre, precio, salud}` y el viejo (un string pelado, o un objeto sin
 * `salud`), que es como quedaron guardados los gastos más antiguos. Nadie va a
 * migrar cuatro filas, y un lector que solo entienda el formato nuevo las
 * dejaría afuera en silencio.
 */
export function normalizarItem(x: unknown): ItemTicket | null {
  if (typeof x === 'string') {
    const nombre = x.trim().slice(0, 80);
    return nombre ? { nombre, precio: null, salud: null } : null;
  }
  if (x && typeof x === 'object' && 'nombre' in x) {
    const o = x as { nombre?: unknown; precio?: unknown; salud?: unknown };
    const nombre = typeof o.nombre === 'string' ? o.nombre.trim().slice(0, 80) : '';
    if (!nombre) return null;
    return { nombre, precio: parsearMonto(o.precio), salud: normalizarSalud(o.salud) };
  }
  return null;
}

// Cuánto de lo que gastás en comida es ultraprocesado, calculado en código.
//
// ── Por qué no se lo pedimos al Analista (29/07, pedido de Matías) ──────────
// El Analista recibe los gastos como texto ("Rewe 23,50 [super] (Cola 1.80,
// Manzanas 2.40, …)") para un período de 30 días, que puede ser fácilmente
// treinta líneas. Pedirle que saque un porcentaje de eso es pedirle que sume
// treinta números de memoria: los modelos de lenguaje son malos para esa
// cuenta puntual, aunque sean buenos para encontrar relaciones. La sumamos acá
// y le pasamos el NÚMERO ya calculado — así lo usa para razonar (cruzarlo con
// ánimo o energía) en vez de tener que inventarlo o acertarlo de casualidad.

import { codigoMoneda } from '@/lib/moneda';
import { normalizarItem, type ItemTicket } from '@/lib/gastos-items';

export type ResumenSaludGastos = {
  sanoTotal: number;
  chatarraTotal: number;
  /** 0-100, redondeado. Sobre lo etiquetado, no sobre el gasto total. */
  pctChatarra: number;
  itemsContados: number;
  moneda: string;
};

function itemsDe(items: string | null): ItemTicket[] {
  if (!items) return [];
  try {
    const arr = JSON.parse(items) as unknown[];
    return arr.map(normalizarItem).filter((x): x is ItemTicket => x != null);
  } catch {
    return [];
  }
}

/** La moneda más repetida entre los gastos: sumar EUR con ARS daría un número
 *  que no significa nada, así que el % sale solo de la moneda dominante y el
 *  resto de los gastos queda afuera de esta cuenta puntual (siguen en Finanzas
 *  igual, esto no los toca). En la práctica casi siempre son todos la misma. */
function monedaDominante(gastos: { moneda: string | null }[]): string {
  const cuenta = new Map<string, number>();
  for (const g of gastos) {
    const c = codigoMoneda(g.moneda) || '(sin moneda)';
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  let mejor = '(sin moneda)';
  let max = 0;
  for (const [c, n] of cuenta) {
    if (n > max) {
      max = n;
      mejor = c;
    }
  }
  return mejor;
}

/**
 * null cuando no hay suficiente para decir algo: con uno o dos ítems
 * etiquetados, un 100% o un 0% no dice nada real, solo parece preciso.
 */
export function resumenSaludGastos(gastos: { items: string | null; moneda: string | null }[]): ResumenSaludGastos | null {
  const moneda = monedaDominante(gastos);
  let sanoTotal = 0;
  let chatarraTotal = 0;
  let itemsContados = 0;

  for (const g of gastos) {
    if ((codigoMoneda(g.moneda) || '(sin moneda)') !== moneda) continue;
    for (const it of itemsDe(g.items)) {
      if (it.precio == null || !it.salud) continue;
      if (it.salud === 'sano') sanoTotal += it.precio;
      else chatarraTotal += it.precio;
      itemsContados++;
    }
  }

  const conocido = sanoTotal + chatarraTotal;
  if (itemsContados < 3 || conocido <= 0) return null;

  return {
    sanoTotal: Math.round(sanoTotal * 100) / 100,
    chatarraTotal: Math.round(chatarraTotal * 100) / 100,
    pctChatarra: Math.round((chatarraTotal / conocido) * 100),
    itemsContados,
    moneda,
  };
}

/** El renglón de texto que se le pasa al Analista como un hecho, no como una
 *  cuenta para que haga. */
export function textoSaludGastos(r: ResumenSaludGastos | null): string | null {
  if (!r) return null;
  const total = Math.round((r.sanoTotal + r.chatarraTotal) * 100) / 100;
  return (
    `De lo que se pudo clasificar en tus tickets (${r.itemsContados} ítems, ${r.moneda} ${total}): ` +
    `${r.pctChatarra}% fue en ultraprocesados (${r.moneda} ${r.chatarraTotal}) y el resto en comida sin procesar.`
  );
}

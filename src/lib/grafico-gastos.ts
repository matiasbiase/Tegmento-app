/**
 * LO QUE GASTASTE, MES A MES.
 *
 * Es el pedido 1.11 del 31/07, que quedó sin hacer cuando se construyó Finanzas
 * el 02/08: *"me gustaría que a medida que vayas agregando seguimientos, vaya
 * viendo gráficos, tipo los gráficos que hay de libido en Cuerpo… que haya uno
 * arriba y que muestre todos los que va siguiendo"*.
 *
 * ⚠️ LA REGLA QUE MANDA ACÁ ES *"no mostrar cosas hechas con pocos datos"*.
 * Un gráfico de un solo mes no es un gráfico: es un número con una barra al
 * lado, y encima sugiere una tendencia que nadie midió. Por eso `hayTendencia`
 * es una decisión explícita y no "dibujá lo que haya".
 */

import { codigoMoneda } from '@/lib/moneda';

export type GastoPunto = {
  /** YYYY-MM-DD (la fecha efectiva, ya resuelta por quien llama). */
  fecha: string;
  total: number | null;
  /** Cruda, como quedó guardada: '€', 'EUR', 'eur'. Se normaliza acá. */
  moneda?: string | null;
};

export type MesGasto = {
  /** YYYY-MM */
  ym: string;
  /** 'ene' … 'dic' */
  etiqueta: string;
  total: number;
  /** Cuántos gastos entraron en ese mes. Sirve para no dibujar meses vacíos
   *  como si fueran meses de cero gasto: no gastar y no anotar son distintos. */
  cuantos: number;
};

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Los últimos `cantidad` meses terminando en el de `hoy`, del más viejo al más nuevo. */
export function ultimosMeses(hoy: Date, cantidad: number): string[] {
  const out: string[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/**
 * Agrupa los gastos por mes.
 *
 * ⚠️ Los gastos sin `total` NO cuentan ni siquiera como uno anotado: un ticket
 * cuyo importe no se pudo leer no dice nada sobre cuánto gastaste ese mes, y
 * contarlo inflaría `cuantos` haciendo parecer que hay más datos de los que hay.
 */
export function gastosPorMes(
  gastos: GastoPunto[],
  hoy: Date,
  cantidad = 6,
  /**
   * ⚠️ SI SE PASA, SOLO CUENTAN LOS GASTOS DE ESA MONEDA. Sin esto la función
   * sumaba euros con pesos sin mirar, y el total del gráfico era un número
   * inventado con cara de dato.
   *
   * No se notaba porque hasta el 03/08 todo lo cargado era en euros — pero en la
   * base convivían `'EUR'` (3) y `'€'` (5), o sea que el problema ya estaba
   * escrito: dos formas de la MISMA moneda que ningún código comparaba. El día
   * que entrara un peso, se sumaba en silencio.
   *
   * Se compara por `codigoMoneda()`, que ya normalizaba esos alias desde el
   * 26/07: `'€'`, `'EUR'` y `'euros'` son el mismo código.
   *
   * ⚠️ Los gastos SIN moneda se cuentan igual. No son de otra moneda: son de
   * una que no se pudo leer, y en una app de una sola moneda descartarlos
   * escondería gasto real. Si algún día hay dos monedas de verdad, esto hay que
   * volver a mirarlo.
   */
  monedaObjetivo?: string | null,
): MesGasto[] {
  const meses = ultimosMeses(hoy, cantidad);
  const acum = new Map<string, { total: number; cuantos: number }>();
  for (const ym of meses) acum.set(ym, { total: 0, cuantos: 0 });

  const codigo = monedaObjetivo ? codigoMoneda(monedaObjetivo) : null;

  for (const g of gastos) {
    if (g.total == null || !Number.isFinite(g.total)) continue;
    if (codigo && g.moneda != null && codigoMoneda(g.moneda) !== codigo) continue;
    const ym = g.fecha.slice(0, 7);
    const celda = acum.get(ym);
    if (!celda) continue; // fuera de la ventana
    celda.total += g.total;
    celda.cuantos += 1;
  }

  return meses.map((ym) => {
    const celda = acum.get(ym)!;
    return {
      ym,
      etiqueta: MES[Number(ym.slice(5, 7)) - 1] ?? '',
      total: celda.total,
      cuantos: celda.cuantos,
    };
  });
}

/**
 * ¿Hay suficiente para dibujar una comparación?
 *
 * Hacen falta DOS meses con datos. Con uno solo la barra no se compara contra
 * nada y el gráfico afirma una forma que no existe.
 */
export function hayTendencia(meses: MesGasto[]): boolean {
  return meses.filter((m) => m.cuantos > 0).length >= 2;
}

/**
 * La diferencia contra el mes anterior, como HECHO y sin adjetivos.
 *
 * ⚠️ DEVUELVE null MÁS SEGUIDO DE LO QUE PARECE, y es a propósito:
 * - Si el mes anterior no tiene nada anotado, no hay contra qué comparar.
 *   "Gastaste 300 más que el mes pasado" cuando el mes pasado no cargaste nada
 *   es un número inventado con cara de dato.
 * - El mes en curso está incompleto por definición: compararlo entero contra uno
 *   cerrado siempre daría "venís gastando menos", que es falso hasta el día 30.
 *   Por eso se compara el ANTERIOR contra el PREANTERIOR, los dos cerrados.
 *
 * No se devuelve texto acá: quien dibuja decide cómo decirlo. Este módulo no
 * opina, igual que `objetivo-plata`.
 */
export function comparacionMesCerrado(
  meses: MesGasto[],
): { etiqueta: string; total: number; anterior: number; diferencia: number } | null {
  if (meses.length < 3) return null;
  const cerrado = meses[meses.length - 2];
  const previo = meses[meses.length - 3];
  if (cerrado.cuantos === 0 || previo.cuantos === 0) return null;
  return {
    etiqueta: cerrado.etiqueta,
    total: cerrado.total,
    anterior: previo.total,
    diferencia: cerrado.total - previo.total,
  };
}

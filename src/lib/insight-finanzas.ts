// Lo que se nota en los gastos del mes, dicho en una línea. Es a propósito SIN IA:
// las cuentas son cuentas, y con tres tickets un modelo inventa. Acá solo se dice
// lo que los números bancan, y si no bancan nada no se dice nada.

import { montoConSimbolo } from '@/lib/moneda';

export type GastoInsight = {
  fecha: string; // YYYY-MM-DD, la fecha efectiva del gasto
  total: number | null;
  moneda: string | null;
  categoria: string | null;
  comercio: string | null;
};

export type Insight = {
  /** Para la key de React y para poder testear cuál salió. */
  tipo: 'comercio' | 'categoria' | 'comparacion';
  texto: string;
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Hacen falta al menos estos tickets en el mes para decir algo. */
const MINIMO_TICKETS = 3;

// Las categorías se guardan como las manda la IA (slug en minúscula). Para leerlas
// en una oración conviene escribirlas bien; si aparece una nueva, va tal cual.
const CATEGORIA: Record<string, string> = {
  super: 'súper',
  comida: 'comida',
  farmacia: 'farmacia',
  transporte: 'transporte',
  ocio: 'ocio',
  otros: 'otras cosas',
};

function nombreCategoria(c: string): string {
  return CATEGORIA[c.toLowerCase()] ?? c;
}

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function suma(gs: GastoInsight[]): number {
  return gs.reduce((s, g) => s + (g.total ?? 0), 0);
}

/** Agrupa por una clave, ignorando los que no la tienen. */
function agrupar(gs: GastoInsight[], clave: (g: GastoInsight) => string | null): Map<string, GastoInsight[]> {
  const m = new Map<string, GastoInsight[]>();
  for (const g of gs) {
    const k = clave(g)?.trim();
    if (!k) continue;
    const lista = m.get(k);
    if (lista) lista.push(g);
    else m.set(k, [g]);
  }
  return m;
}

/** El grupo más pesado en plata, o null si no hay ninguno. */
function elMasPesado(grupos: Map<string, GastoInsight[]>): { clave: string; gastos: GastoInsight[]; total: number } | null {
  let mejor: { clave: string; gastos: GastoInsight[]; total: number } | null = null;
  for (const [clave, gastos] of grupos) {
    const total = suma(gastos);
    if (!mejor || total > mejor.total) mejor = { clave, gastos, total };
  }
  return mejor;
}

/**
 * Lo que se puede decir de los gastos de este mes, de lo más concreto a lo más
 * general. Devuelve como mucho `limite` insights, y lista vacía si no hay datos
 * suficientes: es mejor no decir nada que decir una obviedad.
 */
export function insightsFinanzas(gastos: GastoInsight[], hoy: Date = new Date(), limite = 3): Insight[] {
  const conTotal = gastos.filter((g) => g.total != null && /^\d{4}-\d{2}-\d{2}/.test(g.fecha ?? ''));

  const ymEste = ym(hoy);
  const este = conTotal.filter((g) => g.fecha.slice(0, 7) === ymEste);
  if (este.length < MINIMO_TICKETS) return [];

  const moneda = este.find((g) => g.moneda)?.moneda ?? null;
  const totalMes = suma(este);
  const nombreMes = MESES[hoy.getMonth()];
  const out: Insight[] = [];

  // 1. Un comercio al que volvés. Es lo más concreto que se puede decir.
  const porComercio = elMasPesado(agrupar(este, (g) => g.comercio));
  if (porComercio && porComercio.gastos.length >= 3) {
    out.push({
      tipo: 'comercio',
      texto: `Fuiste ${porComercio.gastos.length} veces a ${porComercio.clave} este mes: ${montoConSimbolo(porComercio.total, moneda)} en total.`,
    });
  }

  // 2. Una categoría que se lleva el mes. Solo si de verdad pesa.
  const porCategoria = elMasPesado(agrupar(este, (g) => g.categoria));
  if (porCategoria && totalMes > 0) {
    const pct = Math.round((porCategoria.total / totalMes) * 100);
    if (pct >= 40 && porCategoria.gastos.length >= 2) {
      out.push({
        tipo: 'categoria',
        texto: `El ${pct}% de lo que gastaste en ${nombreMes} fue en ${nombreCategoria(porCategoria.clave)}: ${montoConSimbolo(porCategoria.total, moneda)}.`,
      });
    }
  }

  // 3. Contra el mes pasado, PERO comparando el mismo tramo: a 23 de julio se
  //    compara con el 1 al 23 de junio, no con junio entero. Si no, todos los
  //    meses arrancarían diciendo que estás gastando menos.
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ymAnterior = ym(anterior);
  const dia = hoy.getDate();
  const mismoTramo = conTotal.filter(
    (g) => g.fecha.slice(0, 7) === ymAnterior && Number(g.fecha.slice(8, 10)) <= dia,
  );
  if (mismoTramo.length >= MINIMO_TICKETS) {
    const totalAntes = suma(mismoTramo);
    const dif = totalMes - totalAntes;
    const pct = totalAntes > 0 ? Math.round((dif / totalAntes) * 100) : 0;
    if (totalAntes > 0 && Math.abs(pct) >= 25) {
      const mesAntes = MESES[anterior.getMonth()];
      out.push({
        tipo: 'comparacion',
        texto:
          dif > 0
            ? `Vas ${montoConSimbolo(dif, moneda)} arriba de lo que llevabas a esta altura de ${mesAntes} (${pct}% más).`
            : `Vas ${montoConSimbolo(-dif, moneda)} abajo de lo que llevabas a esta altura de ${mesAntes} (${Math.abs(pct)}% menos).`,
      });
    }
  }

  return out.slice(0, limite);
}

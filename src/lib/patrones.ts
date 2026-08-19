// Los patrones: cruzar dos áreas y ver si pasa algo, con una regla de evidencia
// que impida decir pavadas.
//
// ── Por qué existe (27/07/2026) ──────────────────────────────────────────────
// Hasta ahora "lo que noté" salía del Analista (el modelo) en texto libre. Eso
// tiene dos problemas: no se puede testear, y no distingue una casualidad de un
// patrón. Acá el cruce se calcula con los datos crudos, con `n` a la vista, y el
// modelo queda para lo que sabe hacer —redactar—, no para contar.
//
// TODO lógica pura, sin base y sin modelo: se le pasan arrays y devuelve
// patrones. Así se puede probar cada regla con datos de mentira.
//
// ⚠️ ESTE ARCHIVO NO ESTÁ CABLEADO A NINGUNA PANTALLA TODAVÍA. Es la mitad de
// abajo de la tarjeta de patrón que quedó en mockup (ver
// `docs/estrategia-y-ux-2026-07-27.md`, punto 3.3). Falta que Matías elija el
// formato de la tarjeta antes de mostrarla.

/** Cuánta evidencia hay atrás. Se dice con palabras: nadie sabe qué es 73%. */
export type Confianza = 'alta' | 'media' | 'baja';

export type Patron = {
  /** Estable entre días: sirve para recordar si ya lo contestó. */
  id: string;
  /** Las dos áreas que se cruzan, para el rótulo y el ícono. */
  cruce: string;
  /** Los datos para redactar la frase. La redacción final es de la pantalla. */
  datos: Record<string, string | number>;
  /** Cuántas veces se cumplió sobre cuántas se pudo mirar. */
  aciertos: number;
  casos: number;
  confianza: Confianza;
  /** Para ordenar: primero lo más sólido. */
  peso: number;
};

/** Con menos de esto no se muestra NADA: tres casos no son un patrón. */
export const CASOS_MINIMOS = 3;
/** Y tiene que cumplirse la mayoría clara de las veces, no la mitad. */
export const PROPORCION_MINIMA = 0.7;

export function confianzaDe(casos: number): Confianza {
  if (casos >= 8) return 'alta';
  if (casos >= 5) return 'media';
  return 'baja';
}

/** El día siguiente a una fecha YYYY-MM-DD. */
function diaSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * La regla común a todos los cruces: se mira una condición y se cuenta cuántas
 * veces vino con el resultado. Devuelve null si no llega al mínimo, así ningún
 * cruce puede saltearse la regla de evidencia por su cuenta.
 */
function evaluar(
  id: string,
  cruce: string,
  casos: { cumple: boolean }[],
  datos: Record<string, string | number> = {},
): Patron | null {
  const total = casos.length;
  if (total < CASOS_MINIMOS) return null;
  const aciertos = casos.filter((c) => c.cumple).length;
  const proporcion = aciertos / total;
  if (proporcion < PROPORCION_MINIMA) return null;
  const confianza = confianzaDe(total);
  return {
    id,
    cruce,
    datos: { ...datos, aciertos, casos: total },
    aciertos,
    casos: total,
    confianza,
    // El peso mezcla cuán seguido pasa con cuánta evidencia hay: un 3 de 3 no
    // puede ganarle a un 9 de 10.
    peso: proporcion * Math.min(total, 12),
  };
}

// ── Los cruces ───────────────────────────────────────────────────────────────

export type DiaSueno = { fecha: string; minutos: number };
/** Ánimo del día: 1 (bajón) a 4 (genial), como `MoodDef.valor`. */
export type DiaAnimoValor = { fecha: string; valor: number };
export type DiaGasto = { fecha: string; total: number };
export type DiaMarca = { fecha: string; titulo: string };

/**
 * Dormir poco × cómo viene el día siguiente.
 * El corte no es fijo: es TU media. Medir contra 6h a alguien que duerme 6h de
 * costumbre no dice nada.
 */
export function suenoCortoBajaAnimo(suenos: DiaSueno[], animos: DiaAnimoValor[]): Patron | null {
  if (suenos.length < CASOS_MINIMOS) return null;
  const media = suenos.reduce((a, s) => a + s.minutos, 0) / suenos.length;
  const corte = media - 45; // tres cuartos de hora menos que lo tuyo
  const porFecha = new Map(animos.map((a) => [a.fecha, a.valor]));
  const mediaAnimo = animos.length ? animos.reduce((a, x) => a + x.valor, 0) / animos.length : 0;

  const casos: { cumple: boolean }[] = [];
  for (const s of suenos) {
    if (s.minutos >= corte) continue;
    const siguiente = porFecha.get(diaSiguiente(s.fecha));
    if (siguiente == null) continue;
    casos.push({ cumple: siguiente < mediaAnimo });
  }
  return evaluar('sueno-animo', 'Sueño · Ánimo', casos, {
    horas: (corte / 60).toFixed(1),
  });
}

/**
 * Días de bajón × cuánto gastaste.
 * Compara contra tu gasto típico, no contra un número inventado.
 */
export function bajonSubeGasto(animos: DiaAnimoValor[], gastos: DiaGasto[]): Patron | null {
  if (gastos.length < CASOS_MINIMOS) return null;
  const porFecha = new Map<string, number>();
  for (const g of gastos) porFecha.set(g.fecha, (porFecha.get(g.fecha) ?? 0) + g.total);
  const valores = [...porFecha.values()];
  const mediaGasto = valores.reduce((a, v) => a + v, 0) / valores.length;

  const casos: { cumple: boolean }[] = [];
  for (const a of animos) {
    if (a.valor > 1) continue; // solo los días de bajón
    const gasto = porFecha.get(a.fecha);
    if (gasto == null) continue;
    casos.push({ cumple: gasto > mediaGasto * 1.4 });
  }
  return evaluar('gasto-animo', 'Plata · Ánimo', casos, { media: Math.round(mediaGasto) });
}

/**
 * Una actividad × cómo cerró el día.
 * Devuelve la más sólida: si hay tres actividades que "mejoran el día", la que
 * tenga más evidencia atrás.
 */
export function actividadLevantaAnimo(marcas: DiaMarca[], animos: DiaAnimoValor[]): Patron | null {
  if (!animos.length) return null;
  const porFecha = new Map(animos.map((a) => [a.fecha, a.valor]));
  const media = animos.reduce((a, x) => a + x.valor, 0) / animos.length;

  const titulos = [...new Set(marcas.map((m) => m.titulo))];
  const encontrados: Patron[] = [];
  for (const titulo of titulos) {
    const casos: { cumple: boolean }[] = [];
    for (const m of marcas.filter((x) => x.titulo === titulo)) {
      const v = porFecha.get(m.fecha);
      if (v == null) continue;
      casos.push({ cumple: v > media });
    }
    const p = evaluar(`actividad-animo:${titulo}`, 'Seguimiento · Ánimo', casos, { titulo });
    if (p) encontrados.push(p);
  }
  return encontrados.sort((a, b) => b.peso - a.peso)[0] ?? null;
}

/** Todos los cruces disponibles, del más sólido al menos. */
export function detectarPatrones(d: {
  suenos: DiaSueno[];
  animos: DiaAnimoValor[];
  gastos: DiaGasto[];
  marcas: DiaMarca[];
}): Patron[] {
  return [
    suenoCortoBajaAnimo(d.suenos, d.animos),
    bajonSubeGasto(d.animos, d.gastos),
    actividadLevantaAnimo(d.marcas, d.animos),
  ]
    .filter((p): p is Patron => p !== null)
    .sort((a, b) => b.peso - a.peso);
}

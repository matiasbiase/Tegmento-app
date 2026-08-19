// Hechos sueltos: cosas puntuales que Matías cuenta en el chat y no tienen un
// lugar fijo en la app (ninguna pantalla pregunta "¿dormiste siesta?"). Se
// extraen UNA VEZ, al archivar la charla completa —no en cada mensaje—, y
// quedan como entradas de bitácora aparte (tipo `detectado`).
//
// ── Por qué (29/07, pedido de Matías) ────────────────────────────────────────
// "no es que lo voy a marcar de vuelta que dormí... que saque cosas de cuando
// en el chat le digo y que las use para razonar". El texto ya llega al
// Analista dentro del resumen de la charla, pero ahí compite por atención con
// todo lo demás que se habló; sacarlo como una entrada propia lo vuelve una
// señal más, igual que el sueño o la comida, sin pedirle un toque más a él.
//
// ⚠️ SIN LISTA FIJA DE CATEGORÍAS: *"no hace falta que cambies todo, que
// mejores la estructura"*. Una lista (`siesta`, `paseo`, …) se queda corta
// apenas mencione algo que no previmos. El modelo devuelve la frase libre; lo
// único fijo es dónde queda guardada.

export const ESQUEMA_HECHOS = {
  type: 'object',
  properties: {
    hechos: { type: 'array', items: { type: 'string' } },
  },
  required: ['hechos'],
};

const MAX_HECHOS = 5;

/** Frases cortas, sin vacías ni repetidas, topeadas: un chat largo no debería
 *  volcar veinte renglones sueltos a la bitácora de una sola vez. */
export function parsearHechos(crudo: string): string[] {
  let j: { hechos?: unknown };
  try {
    j = JSON.parse(crudo) as { hechos?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(j.hechos)) return [];

  const vistos = new Set<string>();
  const limpios: string[] = [];
  for (const h of j.hechos) {
    if (typeof h !== 'string') continue;
    const t = h.trim().slice(0, 200);
    const clave = t.toLowerCase();
    if (!t || vistos.has(clave)) continue;
    vistos.add(clave);
    limpios.push(t);
    if (limpios.length >= MAX_HECHOS) break;
  }
  return limpios;
}

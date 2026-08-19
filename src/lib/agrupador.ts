// La IA propone agrupar mensajes sueltos que ve relacionados (29/07, pedido de
// Matías: además de que VOS puedas elegir y agrupar, "que la IA proponga
// agrupar los que ve relacionados"). Nunca los junta sola: devuelve una
// propuesta, la pantalla la dibuja punteada, y solo se aplica si la aceptás
// (`Cristal` con `propuesta`, en el componente de chat).

export type PropuestaGrupo = { tema: string; mensajeIds: number[] };

export const ESQUEMA_AGRUPADOR = {
  type: 'object',
  properties: {
    grupos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tema: { type: 'string' },
          mensajeIds: { type: 'array', items: { type: 'number' } },
        },
        required: ['tema', 'mensajeIds'],
      },
    },
  },
  required: ['grupos'],
};

/**
 * Parsea la respuesta del rol `agrupador` y la limpia contra la realidad:
 * - Un "grupo" de un solo mensaje no es un grupo, se descarta.
 * - Los `mensajeIds` que el modelo pudo haber inventado (no estaban en lo que
 *   se le mandó) se sacan: agrupar un mensaje que no le mostramos sería
 *   agrupar a ciegas.
 */
export function parsearPropuestaAgrupacion(crudo: string, idsValidos: number[]): PropuestaGrupo[] {
  let j: { grupos?: unknown };
  try {
    j = JSON.parse(crudo) as { grupos?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(j.grupos)) return [];

  const validos = new Set(idsValidos);
  const out: PropuestaGrupo[] = [];
  for (const g of j.grupos) {
    if (!g || typeof g !== 'object') continue;
    const o = g as { tema?: unknown; mensajeIds?: unknown };
    const tema = typeof o.tema === 'string' ? o.tema.trim().slice(0, 30) : '';
    const ids = Array.isArray(o.mensajeIds)
      ? o.mensajeIds.filter((x): x is number => typeof x === 'number' && validos.has(x))
      : [];
    if (!tema || ids.length < 2) continue;
    out.push({ tema, mensajeIds: [...new Set(ids)] });
  }
  return out;
}

// Agrupar mensajes por tema en "cristales": un rectángulo chico que junta
// varios mensajes consecutivos del mismo tema, en vez de mostrarlos como
// burbujas sueltas. Idea de Matías (29/07): *"seleccionás los mensajes, los
// juntás bajo un tema, y quedan como un papelito, cristalizados"*.
//
// Es CONSECUTIVOS y no "todos los del mismo tema": si agrupaste dos mensajes
// de "Mudanza" el lunes y volvés a hablar de mudanza el jueves sin agruparlo,
// son dos cristales separados, cada uno donde pasó — no uno solo que salta en
// el tiempo. El cristal ocupa el lugar del scroll donde esos mensajes ESTÁN,
// no se mueve al principio ni al final.

export type ConTema = { temaId?: number | null };

export type Cluster<T> = { tipo: 'suelto'; item: T } | { tipo: 'cristal'; temaId: number; items: T[] };

export function agruparPorTema<T extends ConTema>(items: T[]): Cluster<T>[] {
  const out: Cluster<T>[] = [];
  for (const item of items) {
    const ultimo = out[out.length - 1];
    if (item.temaId != null && ultimo?.tipo === 'cristal' && ultimo.temaId === item.temaId) {
      ultimo.items.push(item);
    } else if (item.temaId != null) {
      out.push({ tipo: 'cristal', temaId: item.temaId, items: [item] });
    } else {
      out.push({ tipo: 'suelto', item });
    }
  }
  return out;
}

// El color no se elige a mano por tema (sería una pantalla más para algo que
// se mira medio segundo): sale solo de una paleta fija, según el id. Mismo
// tema, mismo color, siempre, sin guardar nada extra.
const PALETA = ['#6c78ee', '#3d9b80', '#c25571', '#b06a1a', '#8a7cf0', '#4a56c8', '#9a6a1e', '#2f7d67'];

export function colorDeTema(temaId: number): string {
  return PALETA[((temaId % PALETA.length) + PALETA.length) % PALETA.length];
}

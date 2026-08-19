/**
 * `[+foco: en qué | minutos]` — que la IA pueda arrancarte una sesión de foco.
 *
 * Pedido 1.9, del 24/07. ⚠️ ESTUVO ANOTADO COMO PENDIENTE DIEZ DÍAS CUANDO LO
 * CARO YA ESTABA HECHO: `components/tools/FocoOverlay.tsx` existe desde el
 * 26/07, con su anillo, sus presets y su cuenta regresiva. Lo único que faltaba
 * era el disparador. Es la novena marca; las otras ocho ya funcionan igual.
 *
 * ── ⚠️ ESTA MARCA NO SE PARECE A LAS OTRAS OCHO, Y CONVIENE SABERLO ──────────
 *
 * Todas las demás GUARDAN algo: un gasto, una comida, un evento, un hecho. Por
 * eso su botón dice "Anotar" y termina en un "listo" verde que confirma que
 * quedó registrado.
 *
 * Esta no guarda nada. Abre una pantalla y arranca un reloj. No hay nada que
 * confirmar después, y por eso su botón dice "Empezar" y no deja rastro: si
 * cerrás el foco, no pasó nada que anotar. Copiar el patrón de "listo" acá
 * sería prometer un registro que no existe.
 *
 * ── EL FORMATO, Y POR QUÉ LOS MINUTOS VAN SEPARADOS ─────────────────────────
 *
 * `[+foco: terminar el capítulo 3]`        → 25 min (el default)
 * `[+foco: escribir el mail | 15]`         → 15 min
 *
 * ⚠️ LOS MINUTOS SOLO SE LEEN DESPUÉS DE UN `|`, nunca buscando un número
 * suelto en el texto. `gastos-marca.ts` sí busca el número donde esté, porque
 * ahí el monto es obligatorio y el modelo desordenaba las partes. Acá los
 * minutos son opcionales, y buscar "el primer número" convertiría
 * "terminar el capítulo 3" en una sesión de tres minutos.
 */

export const MARCA_FOCO = /\[\+foco:\s*([^\]\n]+)\]/i;

/** El default del overlay, y también el preset del medio. */
export const FOCO_MIN_DEFECTO = 25;

// Un minuto es el piso real de una sesión; tres horas, un techo generoso. Fuera
// de eso el modelo se equivocó (segundos en vez de minutos, o una fecha), y
// vale más caer al default que abrir un reloj de 1.500 minutos.
const MIN = 1;
const MAX = 180;

export type MarcaFoco = {
  /** En qué se va a enfocar. Va como título del overlay. */
  que: string;
  minutos: number;
};

/**
 * Lo que hay que enfocar y por cuánto, o `null` si el mensaje no trae la marca.
 *
 * Devuelve `null` también con la marca vacía (`[+foco: ]`): sin un "en qué", el
 * overlay quedaría con el título en blanco y el botón no sabría qué prometer.
 */
export function extraerMarcaFoco(texto: string): MarcaFoco | null {
  const m = texto.match(MARCA_FOCO);
  if (!m) return null;

  const partes = m[1].split('|').map((p) => p.trim());
  const que = partes[0]?.replace(/\s+/g, ' ').slice(0, 80);
  if (!que) return null;

  let minutos = FOCO_MIN_DEFECTO;
  for (const p of partes.slice(1)) {
    const n = Number(p.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n > 0) {
      minutos = Math.round(Math.min(MAX, Math.max(MIN, n)));
      break;
    }
  }

  return { que, minutos };
}

/** El mensaje sin la marca, para mostrarlo y para leerlo en voz alta. */
export function limpiarMarcaFoco(texto: string): string {
  return texto.replace(MARCA_FOCO, '').trim();
}

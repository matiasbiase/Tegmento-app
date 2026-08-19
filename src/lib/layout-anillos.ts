// Cómo querés ver "Hoy": CUÁLES anillos querés, por etiqueta.
// null = todavía no elegiste nada, se muestran todos.
//
// Va a localStorage y no a la base a propósito: es cómo querés ver la pantalla,
// no un dato tuyo, así que no viaja al Analista ni a los backups.
//
// ⚠️ ACÁ HABÍA UN SEGUNDO AJUSTE, `ampliado` (la tarjeta plegada mostraba tres y
// la flecha desplegaba el resto). Se fue el 29/07 con la flecha: eran dos
// controles para lo mismo —uno escondía la mitad de lo que el otro dejaba
// elegir— y encima el escondido no avisaba. Con la ruedita alcanza.
// La clave vieja queda huérfana en el teléfono; no molesta a nadie.

export const CLAVE_ANILLOS_ELEGIDOS = 'tegmento:anillos-elegidos';

/**
 * Anillos que cambiaron de nombre, viejo → nuevo.
 *
 * ⚠️ LA PREFERENCIA SE GUARDA POR ETIQUETA, así que renombrar un anillo lo hace
 * DESAPARECER de la tarjeta sin ningún aviso: el filtro busca "Seguimiento" y en
 * el teléfono está guardado "Actividades". Cada vez que se le cambie el nombre a
 * un anillo, la traducción va acá.
 */
const RENOMBRADOS: Record<string, string> = {
  Actividades: 'Seguimiento', // 26/07/2026
};

/**
 * Anillos que se PARTIERON en varios. Es el mismo problema que `RENOMBRADOS`
 * pero de uno a muchos: si no se traduce, el que lo tenía elegido se queda sin
 * ese anillo y sin entender por qué.
 */
const PARTIDOS: Record<string, string[]> = {
  // 29/07/2026: "Cómo venís" se abrió en dos para poder ver una sin la otra.
  'Cómo venís': ['Energía', 'Libido'],
};

/** null = nunca eligió; el componente muestra todas. */
export function cargarAnillosElegidos(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_ANILLOS_ELEGIDOS);
    if (!crudo) return null;
    const arr = JSON.parse(crudo);
    if (!Array.isArray(arr)) return null;
    const nombres = arr.filter((x): x is string => typeof x === 'string').map((x) => RENOMBRADOS[x] ?? x);
    // Los partidos se expanden, y sin duplicar si ya estaban los dos.
    return [...new Set(nombres.flatMap((n) => PARTIDOS[n] ?? [n]))];
  } catch {
    return null;
  }
}

export function guardarAnillosElegidos(v: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLAVE_ANILLOS_ELEGIDOS, JSON.stringify(v));
}

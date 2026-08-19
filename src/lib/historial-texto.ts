// El deshacer/rehacer de una nota, como dato puro.
//
// Pedido de Matías el 12/08: *"mientras estás trabajando algo, ponele que
// borraste sin querer algo, querés volver para atrás, tiene que estar esa
// opción… una vez que se guardó, se guardó. Te aparecen en gris las flechitas"*.
//
// ⚠️ VIVE ACÁ Y NO EN `EditorNota` POR LA MISMA RAZÓN QUE `lib/objetivos.ts`:
// un historial tiene reglas —dónde corta el futuro, qué pasa al llegar al techo—
// y las reglas metidas en un componente no se pueden probar. El editor se queda
// con lo que sí es suyo: el DOM, el cursor y el guardado.
//
// ⚠️ ES DE LA SESIÓN, NO DE LA NOTA. No hay tabla ni columna: cuando la pantalla
// se desmonta, esto se va con ella. Es exactamente lo que él describió —
// "guardado" para él es haber salido de la nota, no el autoguardado de 900ms que
// corre mientras escribe.

export type Historial = {
  /** Los textos a los que se puede volver, del más viejo al más nuevo. */
  puntos: string[];
  /** En cuál de esos textos estamos parados. */
  posicion: number;
};

/** 60 frases es más de lo que dura una sesión de nota. */
export const MAX_PUNTOS = 60;

export function historialInicial(texto: string): Historial {
  return { puntos: [texto], posicion: 0 };
}

export function textoActual(h: Historial): string {
  return h.puntos[h.posicion];
}

export function puedeAtras(h: Historial): boolean {
  return h.posicion > 0;
}

export function puedeAdelante(h: Historial): boolean {
  return h.posicion < h.puntos.length - 1;
}

/**
 * Deja un punto al que se puede volver. Lo llama el autoguardado, así que hay
 * un punto por pausa de escritura y no uno por tecla: cada paso atrás es "una
 * frase". Deshacer letra por letra es la versión inútil de esta función.
 *
 * ⚠️ ESCRIBIR DESPUÉS DE DESHACER BORRA EL FUTURO, como en cualquier editor: si
 * volviste dos pasos y seguís escribiendo, esos dos pasos dejan de existir. La
 * alternativa —guardar las dos ramas— es un árbol, y nadie lo pidió.
 *
 * ⚠️ Y EL TEXTO REPETIDO NO CUENTA. El autoguardado puede llegar con lo mismo
 * que ya está (escribir una letra y borrarla dentro de la misma pausa), y un
 * punto idéntico al anterior es una flecha que no hace nada visible.
 */
export function marcar(h: Historial, texto: string, max = MAX_PUNTOS): Historial {
  if (texto === textoActual(h)) return h;
  const hasta = h.puntos.slice(0, h.posicion + 1);
  hasta.push(texto);
  // Al llegar al techo se tira lo más viejo. Se pierde poder volver al principio
  // de una sesión larguísima, que es mejor que quedarse sin deshacer lo último.
  const sobra = Math.max(0, hasta.length - max);
  const puntos = sobra ? hasta.slice(sobra) : hasta;
  return { puntos, posicion: puntos.length - 1 };
}

/** Un paso atrás. Si no hay a dónde, devuelve el mismo historial. */
export function atras(h: Historial): Historial {
  return puedeAtras(h) ? { ...h, posicion: h.posicion - 1 } : h;
}

/** Un paso adelante. Si no hay a dónde, devuelve el mismo historial. */
export function adelante(h: Historial): Historial {
  return puedeAdelante(h) ? { ...h, posicion: h.posicion + 1 } : h;
}

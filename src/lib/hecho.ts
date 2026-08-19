// "Hecho": una actividad puntual que ya pasó (una sola vez), tipo "mandé el mail"
// o "empecé la médica". No se sostiene en el tiempo como una actividad en curso;
// queda registrada como HECHA dentro de Actividades y el Analista la usa como
// marcador en la línea de tiempo. Antes esto se llamaba "hito"; se unificó todo
// bajo Actividades (pedido de Matías, 22/07).

// La IA propone marcar algo como hecho con [+hecho: qué pasó] al final del mensaje.
// Mismo patrón que [+actividad:] (en curso) y [+contraste:]: se vuelve un botón.
export const MARCA_HECHO = /\[\+hecho:\s*([^\]\n]+)\]/i;

/** Extrae el título de la marca [+hecho:], o null si no hay. */
export function extraerMarcaHecho(texto: string): string | null {
  const m = texto.match(MARCA_HECHO);
  const titulo = m?.[1]?.trim();
  return titulo ? titulo : null;
}

/** Saca la marca [+hecho:] del texto (para mostrar/leer el mensaje limpio). */
export function limpiarMarcaHecho(texto: string): string {
  return texto.replace(MARCA_HECHO, '').trim();
}

/** Normaliza un título: recorta espacios y lo acota a un largo sano. */
export function normalizarHecho(titulo: string): string {
  return titulo.trim().replace(/\s+/g, ' ').slice(0, 120);
}

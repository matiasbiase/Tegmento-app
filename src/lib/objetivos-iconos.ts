import { CLAVES_ICONO_NOTA } from '@/lib/notas';

/**
 * LOS DIBUJITOS DE UN OBJETIVO: LOS DIEZ DE LAS NOTAS, MÁS LA BANDERA.
 *
 * ⚠️ NO ES UN CATÁLOGO NUEVO, ES EL DE LAS NOTAS CON UNO MÁS, y eso es a
 * propósito: los seis dibujos que la tarjeta de objetivo ya usaba —el avión, el
 * billete, el maletín, el libro, el pulso, la casa— estaban escritos DOS VECES,
 * una en `IconoNota.tsx` y otra adentro de `TarjetaObjetivo.tsx`, con los mismos
 * paths copiados. Por eso el avión roto se veía en los dos lados y había que
 * arreglarlo dos veces. Un concepto, un dibujo.
 *
 * La bandera de meta es la única que suma: es el default de un objetivo (no hay
 * objetivo sin meta) y en una nota no significaría nada.
 */
export const CLAVES_ICONO_OBJETIVO: ReadonlySet<string> = new Set([...CLAVES_ICONO_NOTA, 'meta']);

/**
 * EL DIBUJITO DEDUCIDO DEL TÍTULO — la regla de siempre, ahora afuera del
 * componente.
 *
 * ⚠️ SE SIGUE ADIVINANDO, Y ESO NO CAMBIÓ CON EL SELECTOR (06/08). Un objetivo
 * se crea en un momento de impulso ("quiero ir a Argentina en octubre") y meterle
 * un paso de "elegí un ícono" ahí convierte el impulso en un formulario. El
 * selector es para las veces que la app le erra, no un casillero más para
 * llenar: por eso `objetivos.icono` arranca en null y esto sigue mandando.
 *
 * Si no reconoce nada cae en la bandera de meta, que nunca miente.
 *
 * ⚠️ VIVE ACÁ Y NO EN EL COMPONENTE por la misma razón que el resto de las
 * reglas de objetivos: si decidiera adentro del JSX no se podría testear, y esta
 * cadena de `includes` es exactamente el tipo de cosa que se rompe callada al
 * agregarle una palabra.
 */
export function adivinarIconoObjetivo(titulo: string, area: string | null): string {
  const t = `${titulo} ${area ?? ''}`.toLowerCase();
  const tiene = (...p: string[]) => p.some((x) => t.includes(x));

  // ⚠️ EL ORDEN IMPORTA y es el que ya tenía la tarjeta: "ahorrar para el viaje"
  // cae en viaje, no en plata. Se dibuja a dónde vas, no cómo.
  if (tiene('viaj', 'argentina', 'japon', 'japón', 'vuelo', 'europa')) return 'viaje';
  if (tiene('plata', 'ahorr', 'dinero', 'guardar')) return 'plata';
  if (tiene('trabajo', 'laburo', 'empleo', 'curriculum', 'cv')) return 'trabajo';
  if (tiene('alem', 'idioma', 'ingl', 'estudi', 'examen', 'curso', 'leer')) return 'estudio';
  if (tiene('salud', 'entren', 'gimnas', 'correr', 'deporte', 'boulder', 'escalada', 'cuerpo')) return 'cuerpo';
  if (tiene('mudan', 'casa', 'depart', 'hogar')) return 'casa';
  return 'meta';
}

/**
 * Qué dibujo va, mirando primero lo que elegiste vos.
 *
 * ⚠️ UNA CLAVE GUARDADA QUE YA NO EXISTE NO ROMPE NADA: vuelve a adivinar. Es la
 * misma defensa que tiene `IconoNota` con los emojis viejos, y hace falta porque
 * el catálogo vive en el código y la fila en la base: el día que se saque un
 * ícono del catálogo, los objetivos que lo tenían no se quedan sin marca.
 */
export function iconoDeObjetivo(icono: string | null, titulo: string, area: string | null): string {
  if (icono != null && CLAVES_ICONO_OBJETIVO.has(icono)) return icono;
  return adivinarIconoObjetivo(titulo, area);
}

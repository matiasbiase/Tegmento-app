import type { Temperatura } from '@/lib/objetivos-arranque';

/**
 * El color del puntito de temperatura, en un solo lugar.
 *
 * ⚠️ VIVE ACÁ Y NO ADENTRO DE UN COMPONENTE porque ahora lo usan DOS pantallas
 * —`ArranqueObjetivos` y `TarjetaObjetivo`— y un objetivo caliente tiene que ser
 * del mismo naranja en las dos. Copiarlo era la trampa del 03/08 con el ícono:
 * cuando el mismo dibujo vive en dos archivos, uno se pudre y nadie se entera
 * hasta que se ven juntos.
 *
 * ⚠️ Y EL PUNTITO NUNCA VA SOLO: va al lado de la palabra
 * (`temperaturaEnPalabras`), no en lugar de ella. Un color solo no se lee — hay
 * que saber de antemano qué significa cada uno, y eso es un manual, no una
 * interfaz. Vale también para quien no distingue estos cuatro colores.
 */
export const COLOR_TEMPERATURA: Record<Temperatura, string> = {
  caliente: 'bg-[#e8734a]',
  activo: 'bg-[#4a56c8]',
  templado: 'bg-[#b9a06a]',
  frío: 'bg-[#9aa2c4]',
};

import { AREAS_GUIA } from '@/lib/rueda-vida';

// El color y el tinte de cada área de la rueda, para las etiquetas de colores.
// Se derivan del color propio del área (AREAS_GUIA): un texto legible sobre un
// fondo suave del mismo tono. Así Descubrir, Noticias y la rueda hablan el mismo
// idioma de color.

export type TintArea = { color: string; tint: string };

// Tintes suaves por área (mismo tono que el color del área, muy aclarado).
const TINTS: Record<string, TintArea> = {
  'Salud mental': { color: '#5f51a6', tint: '#efecfb' },
  'Salud física': { color: '#2f8168', tint: '#e3f1ec' },
  'Vida social': { color: '#4a6bb0', tint: '#e8eefa' },
  'Ocio y tiempo libre': { color: '#5f7536', tint: '#eef3e2' },
  'Negocios y carrera': { color: '#4a56c8', tint: '#eaebfc' },
  'Finanzas': { color: '#a6631a', tint: '#faf0dd' },
  'Crecimiento personal': { color: '#b0603d', tint: '#fbeee6' },
  'Contexto': { color: '#bb4266', tint: '#fbe7ec' },
};

const NEUTRO: TintArea = { color: '#8a8aa0', tint: '#eef0f4' };

export function tintArea(area: string | null | undefined): TintArea {
  if (!area) return NEUTRO;
  return TINTS[area] ?? NEUTRO;
}

/** El color base del área (para puntos, bordes), desde AREAS_GUIA. */
export function colorArea(area: string | null | undefined): string {
  return AREAS_GUIA.find((a) => a.nombre === area)?.color ?? NEUTRO.color;
}

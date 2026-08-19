// El día como unidad: junta TODO lo que registraste un día (ánimo, sueño, comida,
// gastos, actividades hechas, eventos y notas) para pintar el calendario con vida
// y para el balance que se ve al tocar una casilla.

import { moodCercano, valorMood, type MoodKey } from '@/lib/animo';

export type DetalleDia = {
  animo: { estado: string; nota: string | null; hora: string }[];
  sueno: { hs: number; calidad: string | null } | null;
  comidas: { nota: string; hora: string }[];
  gastos: { comercio: string | null; total: number | null; moneda: string | null }[];
  hechas: string[];
  eventos: { titulo: string; hora: string | null }[];
  notas: { texto: string; hora: string }[]; // lo que escribiste vos (bitácora manual)
  charlas: { texto: string; hora: string }[]; // resúmenes de las charlas de ese día
  fotos: { path: string; hora: string }[]; // fotos que subiste ese día, para volver a verlas
};

// Las categorías que se muestran como puntitos en la casilla, en orden fijo.
export type Categoria = 'animo' | 'sueno' | 'comida' | 'gasto' | 'actividad' | 'evento' | 'nota' | 'foto';

export const COLOR_CATEGORIA: Record<Categoria, string> = {
  animo: '#6c78ee', // se pisa con el color del mood cuando hay
  sueno: '#8a7cf0',
  comida: '#c25571',
  gasto: '#4a56c8',
  actividad: '#3d9b80',
  evento: '#b06a1a',
  nota: '#9999ad',
  foto: '#7b5cd6',
};

const ORDEN: Categoria[] = ['animo', 'sueno', 'comida', 'gasto', 'actividad', 'evento', 'foto', 'nota'];

/** Clave YYYY-MM-DD del día local (no UTC: importa el día en que vos lo viviste). */
export function claveDiaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mood dominante de un día: el promedio de los check-ins generales, al más cercano. */
export function moodDominante(estados: string[]): MoodKey | null {
  const valores = estados.map(valorMood).filter((v): v is number => v != null);
  if (valores.length === 0) return null;
  const prom = valores.reduce((s, v) => s + v, 0) / valores.length;
  return moodCercano(prom).key;
}

/** Qué categorías tienen algo ese día, en orden fijo (para los puntitos). */
export function categoriasDia(d: DetalleDia): Categoria[] {
  const presente: Record<Categoria, boolean> = {
    animo: d.animo.length > 0,
    sueno: d.sueno != null,
    comida: d.comidas.length > 0,
    gasto: d.gastos.length > 0,
    actividad: d.hechas.length > 0,
    evento: d.eventos.length > 0,
    foto: d.fotos.length > 0,
    nota: d.notas.length > 0 || d.charlas.length > 0,
  };
  return ORDEN.filter((c) => presente[c]);
}

export function diaVacio(): DetalleDia {
  return { animo: [], sueno: null, comidas: [], gastos: [], hechas: [], eventos: [], notas: [], charlas: [], fotos: [] };
}

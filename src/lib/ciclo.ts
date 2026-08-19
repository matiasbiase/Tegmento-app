// Ciclo menstrual: a partir de las fechas de inicio (y fin, si se marcó) estima el
// largo del ciclo, la fase actual y el próximo período. Es una ESTIMACIÓN, no un
// método anticonceptivo: la app lo presenta siempre como aproximado.

import { ymd } from '@/lib/marcas';

export type Periodo = { inicio: string; fin: string | null };
export type Fase = 'menstrual' | 'folicular' | 'ovulacion' | 'lutea';

export type EstadoCiclo = {
  diaCiclo: number;
  fase: Fase;
  enPeriodo: boolean;
  proximoInicio: string; // YYYY-MM-DD estimado
  ovulacionEstim: string; // YYYY-MM-DD estimado
  largoCiclo: number;
};

const DIA_MS = 86_400_000;
const LARGO_DEFAULT = 28;
const DIAS_PERIODO_DEFAULT = 5; // si no se marcó fin

function fecha(ymd: string): Date {
  return new Date(`${ymd}T12:00`);
}

function sumarDias(base: string, dias: number): string {
  return ymd(new Date(fecha(base).getTime() + dias * DIA_MS));
}

function diasEntre(a: string, b: string): number {
  return Math.round((fecha(b).getTime() - fecha(a).getTime()) / DIA_MS);
}

function ordenados(periodos: Periodo[]): Periodo[] {
  return [...periodos].sort((x, y) => (x.inicio < y.inicio ? -1 : 1));
}

/** Largo promedio del ciclo (días entre inicios consecutivos), clampeado 21..40. */
export function largoPromedioCiclo(periodos: Periodo[]): number {
  const ps = ordenados(periodos);
  if (ps.length < 2) return LARGO_DEFAULT;
  const difs: number[] = [];
  for (let i = 1; i < ps.length; i++) difs.push(diasEntre(ps[i - 1].inicio, ps[i].inicio));
  const prom = Math.round(difs.reduce((s, x) => s + x, 0) / difs.length);
  return Math.max(21, Math.min(40, prom));
}

/** La fase para un día del ciclo (1..largo), con el fin real del período si lo hay. */
function faseDeDia(dia: number, largo: number, largoPeriodo: number): Fase {
  const ovu = largo - 14; // la fase lútea es ~constante de 14 días
  if (dia <= largoPeriodo) return 'menstrual';
  if (dia >= ovu && dia <= ovu + 1) return 'ovulacion';
  if (dia < ovu) return 'folicular';
  return 'lutea';
}

/** Estado actual del ciclo, o null si nunca registró un período. */
export function estadoCiclo(periodos: Periodo[], hoy: Date = new Date()): EstadoCiclo | null {
  const ps = ordenados(periodos);
  if (ps.length === 0) return null;
  const ultimo = ps[ps.length - 1];
  const largo = largoPromedioCiclo(ps);
  const hoyY = ymd(hoy);
  const diaCiclo = diasEntre(ultimo.inicio, hoyY) + 1;
  const largoPeriodo = ultimo.fin ? diasEntre(ultimo.inicio, ultimo.fin) + 1 : DIAS_PERIODO_DEFAULT;
  const enPeriodo = ultimo.fin ? hoyY >= ultimo.inicio && hoyY <= ultimo.fin : diaCiclo >= 1 && diaCiclo <= largoPeriodo;

  return {
    diaCiclo: Math.max(1, diaCiclo),
    fase: faseDeDia(Math.max(1, diaCiclo), largo, largoPeriodo),
    enPeriodo,
    proximoInicio: sumarDias(ultimo.inicio, largo),
    ovulacionEstim: sumarDias(ultimo.inicio, largo - 14),
    largoCiclo: largo,
  };
}

/** La fase de una fecha cualquiera según el período que la contiene/precede. */
export function faseDeFecha(periodos: Periodo[], fechaYmd: string, largo: number): Fase | null {
  const ps = ordenados(periodos);
  let base: Periodo | null = null;
  for (const p of ps) if (p.inicio <= fechaYmd) base = p;
  if (!base) return null;
  const dia = diasEntre(base.inicio, fechaYmd) + 1;
  const largoPeriodo = base.fin ? diasEntre(base.inicio, base.fin) + 1 : DIAS_PERIODO_DEFAULT;
  return faseDeDia(dia, largo, largoPeriodo);
}

export type MarcaCiclo = 'periodo' | 'pred' | 'ovulacion';

/** Mapa ymd → marca para pintar el calendario: días reales de período, y la
 *  predicción (próximos períodos + ovulación) hasta la fecha `hasta`. */
export function marcasCiclo(
  periodos: Periodo[],
  desde: string,
  hasta: string,
  largo: number,
): Record<string, MarcaCiclo> {
  const out: Record<string, MarcaCiclo> = {};
  const ps = ordenados(periodos);
  if (ps.length === 0) return out;

  // días reales de período (inicio..fin, o inicio..+5 si sigue abierto y no es futuro)
  for (const p of ps) {
    const fin = p.fin ?? sumarDias(p.inicio, DIAS_PERIODO_DEFAULT - 1);
    for (let f = p.inicio; f <= fin; f = sumarDias(f, 1)) {
      if (f >= desde && f <= hasta) out[f] = 'periodo';
    }
  }

  // predicción hacia adelante desde el último inicio
  const ultimo = ps[ps.length - 1].inicio;
  for (let k = 1; k <= 12; k++) {
    const inicio = sumarDias(ultimo, largo * k);
    if (inicio > hasta) break;
    const ovu = sumarDias(ultimo, largo * k - 14);
    if (ovu >= desde && ovu <= hasta && !out[ovu]) out[ovu] = 'ovulacion';
    for (let dd = 0; dd < DIAS_PERIODO_DEFAULT; dd++) {
      const f = sumarDias(inicio, dd);
      if (f >= desde && f <= hasta && !out[f]) out[f] = 'pred';
    }
  }
  return out;
}

export const NOMBRE_FASE: Record<Fase, string> = {
  menstrual: 'Menstrual',
  folicular: 'Folicular',
  ovulacion: 'Ovulación',
  lutea: 'Lútea',
};

export const COLOR_FASE: Record<Fase, string> = {
  menstrual: '#d1567a',
  folicular: '#3d9b80',
  ovulacion: '#6c78ee',
  lutea: '#8a7cf0',
};

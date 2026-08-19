export type RegAnimo = { estado: string; creado: string };
export type DiaAnimo = { dia: string; valor: number | null };

const VALOR: Record<string, number> = { bien: 1, masomenos: 0, mal: -1 };

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// Ánimo general del día (rediseño) — 4 niveles tipo "State of Mind".
// La escala monotónica de hue va de verde (genial) a ámbar (bajón).
// ============================================================

export type MoodKey = 'genial' | 'bien' | 'neutral' | 'bajon';

export type MoodDef = {
  key: MoodKey;
  label: string;
  valor: number; // 1..4
  h: number; // hue oklch
  c: number; // chroma oklch (neutral es casi gris)
  l: number; // lightness oklch del tono vivo
  color: string; // vivo: rellenos, anillos, caritas. NO sirve para texto chico.
  deep: string; // el mismo hue oscurecido: texto sobre blanco, con contraste AA
  tint: string;
  soft: string;
};

// Coral · verde claro · gris azulado · turquesa. Decisión de Matías (26/07):
// genial pasó de verde a TURQUESA y bien de lima a VERDE CLARO — el lima a esta
// altura salía mostaza y no pegaba con nada.
//
// ⚠️ La lightness va POR HUE, no fija. Con un mismo L el amarillo y el verde se
// ven mucho más oscuros que el turquesa o el coral: por eso antes "bien" salía
// sucio. Estos valores están elegidos para que los cuatro pesen igual en pantalla.
//
// Y por eso hay DOS tonos: `color` es el vivo (relleno) y `deep` es el que va
// como texto. El vivo de "bien" sobre blanco da ~2:1 — ilegible. `deep` da AA.
const MOODS_BASE: { key: MoodKey; label: string; valor: number; h: number; c: number; l: number }[] = [
  { key: 'genial', label: 'Genial', valor: 4, h: 195, c: 0.13, l: 0.72 },
  { key: 'bien', label: 'Bien', valor: 3, h: 150, c: 0.15, l: 0.77 },
  { key: 'neutral', label: 'Neutral', valor: 2, h: 250, c: 0.035, l: 0.62 },
  { key: 'bajon', label: 'Bajón', valor: 1, h: 25, c: 0.14, l: 0.635 },
];

export const MOODS: MoodDef[] = MOODS_BASE.map((m) => ({
  ...m,
  color: `oklch(${m.l} ${m.c} ${m.h})`,
  deep: `oklch(0.47 ${m.c < 0.05 ? 0.03 : m.c * 0.92} ${m.h})`,
  tint: `oklch(0.965 ${m.c < 0.05 ? 0.012 : 0.03} ${m.h})`,
  soft: `oklch(0.92 ${m.c < 0.05 ? 0.03 : 0.06} ${m.h})`,
}));

export const FACTORES_ANIMO = ['Salud', 'Familia', 'Pareja', 'Trabajo', 'Estudios', 'Dinero', 'Amigos', 'Descanso', 'Identidad'];
export const PALABRAS_ANIMO = ['Tranquilo', 'Contento', 'Aliviado', 'Motivado', 'Cansado', 'Estresado', 'Ansioso', 'Frustrado', 'Bajón'];

export function moodDe(key: string | null | undefined): MoodDef | null {
  return MOODS.find((m) => m.key === key) ?? null;
}

export function valorMood(key: string): number | null {
  return moodDe(key)?.valor ?? null;
}

/** Mood cuyo valor está más cerca de un promedio (1..4). */
export function moodCercano(promedio: number): MoodDef {
  return MOODS.reduce((mejor, m) => (Math.abs(m.valor - promedio) < Math.abs(mejor.valor - promedio) ? m : mejor), MOODS[1]);
}

export type PuntoAnimo = { dia: string; inicial: string; valor: number | null; esHoy: boolean };

const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Serie de los últimos `n` días (default 7) usando el ánimo general (valores 1..4). */
export function serieAnimo(registros: RegAnimo[], hoy = new Date(), n = 7): PuntoAnimo[] {
  const claveHoy = diaLocal(hoy);
  const puntos: PuntoAnimo[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const clave = diaLocal(d);
    const delDia = registros
      .map((r) => ({ v: valorMood(r.estado), c: diaLocal(new Date(r.creado)) }))
      .filter((r) => r.c === clave && r.v != null);
    const valor = delDia.length ? delDia.reduce((s, r) => s + (r.v as number), 0) / delDia.length : null;
    puntos.push({ dia: clave, inicial: INICIAL_DIA[d.getDay()], valor, esHoy: clave === claveHoy });
  }
  return puntos;
}

// ============================================================
// Series agregadas por semana y por mes, para el switcher del gráfico.
// ============================================================

export type PuntoPeriodo = { clave: string; etiqueta: string; valor: number | null; esActual: boolean };

function lunesDe(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7; // 0 = lunes
  r.setDate(r.getDate() - dow);
  return r;
}

/** Serie de las últimas `n` semanas (termina en la actual). Valor = promedio 1..4. */
export function serieSemanas(registros: RegAnimo[], hoy = new Date(), n = 8): PuntoPeriodo[] {
  const regs = registros
    .map((r) => ({ v: valorMood(r.estado), t: new Date(r.creado).getTime() }))
    .filter((r) => r.v != null);
  const puntos: PuntoPeriodo[] = [];
  const lunesActual = lunesDe(hoy);
  for (let i = n - 1; i >= 0; i--) {
    const ini = new Date(lunesActual);
    ini.setDate(ini.getDate() - i * 7);
    const fin = new Date(ini);
    fin.setDate(fin.getDate() + 7);
    const delPeriodo = regs.filter((r) => r.t >= ini.getTime() && r.t < fin.getTime());
    const valor = delPeriodo.length ? delPeriodo.reduce((s, r) => s + (r.v as number), 0) / delPeriodo.length : null;
    puntos.push({
      clave: diaLocal(ini),
      etiqueta: `${ini.getDate()}/${ini.getMonth() + 1}`,
      valor,
      esActual: i === 0,
    });
  }
  return puntos;
}

const MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Serie de los últimos `n` meses (termina en el actual). Valor = promedio 1..4. */
export function serieMeses(registros: RegAnimo[], hoy = new Date(), n = 6): PuntoPeriodo[] {
  const regs = registros
    .map((r) => ({ v: valorMood(r.estado), d: new Date(r.creado) }))
    .filter((r) => r.v != null);
  const puntos: PuntoPeriodo[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ref = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const delPeriodo = regs.filter((r) => r.d.getFullYear() === ref.getFullYear() && r.d.getMonth() === ref.getMonth());
    const valor = delPeriodo.length ? delPeriodo.reduce((s, r) => s + (r.v as number), 0) / delPeriodo.length : null;
    puntos.push({
      clave: `${ref.getFullYear()}-${ref.getMonth() + 1}`,
      etiqueta: MES_CORTO[ref.getMonth()],
      valor,
      esActual: i === 0,
    });
  }
  return puntos;
}

export type ResumenAnimo = {
  promedio: number | null;
  etiqueta: string;
  promedioPrev: number | null;
  delta: number | null;
};

/** Promedio de esta semana (7 días) vs. la previa, para el badge de tendencia. */
export function resumenAnimo(registros: RegAnimo[], hoy = new Date()): ResumenAnimo {
  const estaSemana = serieAnimo(registros, hoy, 7).map((p) => p.valor).filter((v): v is number => v != null);
  const semanaPrevia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
  const previa = serieAnimo(registros, semanaPrevia, 7).map((p) => p.valor).filter((v): v is number => v != null);
  const prom = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const promedio = prom(estaSemana);
  const promedioPrev = prom(previa);
  return {
    promedio,
    etiqueta: promedio != null ? moodCercano(promedio).label : '—',
    promedioPrev,
    delta: promedio != null && promedioPrev != null ? promedio - promedioPrev : null,
  };
}

// Serie de los últimos 7 días (de hace 6 a hoy). Valor = promedio de los
// estados de ese día (-1..1), o null si no hubo registros.
export function serie7dias(registros: RegAnimo[], hoy = new Date()): DiaAnimo[] {
  const dias: DiaAnimo[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const clave = diaLocal(d);
    const delDia = registros.filter((r) => diaLocal(new Date(r.creado)) === clave && r.estado in VALOR);
    const valor = delDia.length
      ? delDia.reduce((s, r) => s + VALOR[r.estado], 0) / delDia.length
      : null;
    dias.push({ dia: clave, valor });
  }
  return dias;
}

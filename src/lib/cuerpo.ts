// Cuánto querés dormir por defecto, en minutos. Es contra esto que se llena el
// anillo de Sueño si todavía no elegiste tu meta en Perfil.
export const META_SUENIO_DEFECTO = 480; // 8h

export type RegistroSueno = { valor: number | null; calidad: string | null; creado: string };
export type PuntoSueno = { dia: string; inicial: string; horas: number | null; esHoy: boolean };

const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Serie de horas de sueño de los últimos `n` días (promedio si hubo varios). */
export function serieSueno(registros: RegistroSueno[], hoy = new Date(), n = 7): PuntoSueno[] {
  const claveHoy = diaLocal(hoy);
  const puntos: PuntoSueno[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const clave = diaLocal(d);
    const delDia = registros
      .filter((r) => r.valor != null && diaLocal(new Date(r.creado)) === clave)
      .map((r) => r.valor as number);
    const horas = delDia.length ? delDia.reduce((s, v) => s + v, 0) / delDia.length / 60 : null;
    puntos.push({ dia: clave, inicial: INICIAL_DIA[d.getDay()], horas: horas != null ? Math.round(horas * 10) / 10 : null, esHoy: clave === claveHoy });
  }
  return puntos;
}

/** Promedio de horas de la última semana registrada. */
export function promedioSueno(puntos: PuntoSueno[]): number | null {
  const vals = puntos.map((p) => p.horas).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

export type RegistroSenal = { valor: number | null; creado: string };
export type PuntoSenal = { dia: string; inicial: string; valor: number | null; esHoy: boolean };

/** Serie de una señal de autoobservación (energía o libido, 1 a 5) de los
 *  últimos `n` días. Si hubo varias cargas en un día, promedia. Es lo que
 *  convierte energía/libido de un número suelto en algo que se mira en el
 *  tiempo — que era el punto: cargar sin devolver nada se sentía inútil. */
export function serieSenal(registros: RegistroSenal[], hoy = new Date(), n = 14): PuntoSenal[] {
  const claveHoy = diaLocal(hoy);
  const puntos: PuntoSenal[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const clave = diaLocal(d);
    const delDia = registros
      .filter((r) => r.valor != null && diaLocal(new Date(r.creado)) === clave)
      .map((r) => r.valor as number);
    const valor = delDia.length ? delDia.reduce((s, v) => s + v, 0) / delDia.length : null;
    puntos.push({
      dia: clave,
      inicial: INICIAL_DIA[d.getDay()],
      valor: valor != null ? Math.round(valor * 10) / 10 : null,
      esHoy: clave === claveHoy,
    });
  }
  return puntos;
}

/**
 * ENERGÍA Y LIBIDO SE MUESTRAN COMO ALTO / MEDIO / BAJO, no como "4/5"
 * (29/07, pedido de Matías).
 *
 * Se siguen GUARDANDO del 1 al 5 —el gráfico de catorce días necesita los pasos
 * intermedios— pero un número con denominador se lee como una medición, y esto
 * es una autoobservación: nadie sabe si su energía fue un 4 o un 3, sabe si
 * anduvo alto o bajo. El dato fino queda para la curva; el rótulo, para el ojo.
 */
export function nivelSenal(valor: number | null | undefined): 'Bajo' | 'Medio' | 'Alto' | null {
  if (valor == null || !Number.isFinite(valor)) return null;
  if (valor <= 2) return 'Bajo';
  if (valor <= 3) return 'Medio';
  return 'Alto';
}

/** Promedio de una serie de señales (o null si no hay datos). */
export function promedioSenal(puntos: PuntoSenal[]): number | null {
  const vals = puntos.map((p) => p.valor).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

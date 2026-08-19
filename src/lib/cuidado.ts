// El veredicto de Polaridad. Antes el medidor decía qué tan polarizada estaba la
// nota, que es un dato sobre el texto; ahora dice cuánto cuidado hay que tener al
// leerla, que es lo único que el lector puede hacer con esa información.
//
// El número sigue siendo 0-100 (así queda compatible con lo ya guardado), pero se
// lee como grado de cuidado: cuanto más arriba, más armado está para convencer.

export type NivelCuidado = 'bajo' | 'medio' | 'alto';

export type Cuidado = {
  nivel: NivelCuidado;
  /** El veredicto en dos palabras, para el encabezado del medidor. */
  titulo: string;
  /** Qué hacer con eso. Genérico del nivel; el "por qué" puntual lo pone la IA. */
  consejo: string;
  color: string;
};

const VERDE = '#3d9b80';
const ORO = '#c79238';
const ROSA = '#c25571';

const NIVELES: Record<NivelCuidado, Omit<Cuidado, 'nivel'>> = {
  bajo: {
    titulo: 'Cuidado bajo',
    consejo: 'Está planteado con matices. Igual, fijate qué deja afuera.',
    color: VERDE,
  },
  medio: {
    titulo: 'Cuidado medio',
    consejo: 'Tiene partes cargadas. Contrastá antes de darlo por hecho.',
    color: ORO,
  },
  alto: {
    titulo: 'Cuidado alto',
    consejo: 'Está armado para convencerte más que para informarte. No lo compartas sin chequear.',
    color: ROSA,
  },
};

/** Convierte el 0-100 en el nivel de cuidado, con su consejo y su color. */
export function nivelCuidado(valor: number): Cuidado {
  const n = Math.max(0, Math.min(100, Number.isFinite(valor) ? valor : 50));
  const nivel: NivelCuidado = n <= 33 ? 'bajo' : n <= 66 ? 'medio' : 'alto';
  return { nivel, ...NIVELES[nivel] };
}

/**
 * Saca el grado de cuidado de una respuesta de la IA. Acepta `cuidado` (lo nuevo)
 * y `carga` (lo que quedó guardado de cuando el medidor era de polarización): la
 * escala es la misma, así que los análisis viejos se siguen viendo bien.
 */
export function leerCuidado(datos: { cuidado?: unknown; carga?: unknown }): number {
  for (const v of [datos.cuidado, datos.carga]) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return 50;
}

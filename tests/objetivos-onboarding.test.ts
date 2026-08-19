import { describe, it, expect } from 'vitest';
import {
  DIAS_HABITO,
  SEMANAS_HABITO,
  fechaLimitePorDefecto,
  TIPOS_OBJETIVO,
  areasParaElegir,
  llegoLaRueda,
  progresoHabito,
  propuestaDeRueda,
  semanasSostenidas,
} from '@/lib/objetivos-onboarding';

describe('propuestaDeRueda', () => {
  it('propone el salto más chico que se nota', () => {
    expect(propuestaDeRueda({ nombre: 'Salud física', scoreActual: 2 })).toEqual({
      titulo: 'Subir de 2 a 3 en Salud física',
      desde: 2,
      hasta: 3,
    });
  });

  // ⚠️ En 5 no hay "subir uno". Proponerlo sería pedirle que mejore algo que él
  // mismo marcó como pleno.
  it('no propone nada en un área que ya está en 5', () => {
    expect(propuestaDeRueda({ nombre: 'Ocio', scoreActual: 5 })).toBeNull();
  });

  it('no propone nada si el área nunca se puntuó', () => {
    expect(propuestaDeRueda({ nombre: 'Ocio', scoreActual: null })).toBeNull();
  });
});

describe('areasParaElegir', () => {
  const a = (nombre: string, scoreActual: number | null, foco = false) => ({ nombre, scoreActual, foco });

  // ⚠️⚠️ Manda el foco, NO el puntaje más bajo: son dos preguntas distintas. La
  // rueda pregunta cómo estás, el foco pregunta qué te importa ahora.
  it('el foco va antes que un puntaje más bajo', () => {
    const orden = areasParaElegir([a('Contexto', 1), a('Carrera', 4, true)]).map((x) => x.nombre);
    expect(orden).toEqual(['Carrera', 'Contexto']);
  });

  it('entre dos del mismo interés, ordena por puntaje', () => {
    const orden = areasParaElegir([a('Ocio', 4, true), a('Salud', 2, true)]).map((x) => x.nombre);
    expect(orden).toEqual(['Salud', 'Ocio']);
  });

  it('las que no tienen propuesta caen al final, aunque estén en foco', () => {
    const orden = areasParaElegir([a('Plena', 5, true), a('Floja', 3)]).map((x) => x.nombre);
    expect(orden).toEqual(['Floja', 'Plena']);
  });

  it('no toca el array que le pasan', () => {
    const original = [a('Contexto', 1), a('Carrera', 4, true)];
    areasParaElegir(original);
    expect(original.map((x) => x.nombre)).toEqual(['Contexto', 'Carrera']);
  });
});

describe('semanasSostenidas', () => {
  // Semanas de lunes. 2026-08-03 es lunes; 2026-08-06 (jueves) cae en esa semana.
  it('cuenta semanas seguidas para atrás', () => {
    const fechas = ['2026-08-04', '2026-07-29', '2026-07-21'];
    expect(semanasSostenidas(fechas, '2026-08-06')).toBe(3);
  });

  it('una semana con varias marcas cuenta una sola vez', () => {
    const fechas = ['2026-08-03', '2026-08-04', '2026-08-05'];
    expect(semanasSostenidas(fechas, '2026-08-06')).toBe(1);
  });

  it('un hueco corta la cuenta', () => {
    // Falta la semana del 27/07: la cuenta se detiene ahí.
    const fechas = ['2026-08-04', '2026-07-21', '2026-07-14'];
    expect(semanasSostenidas(fechas, '2026-08-06')).toBe(1);
  });

  // ⚠️ Es lunes a la mañana y hace semanas que lo sostenés: sin esta excepción
  // la tarjeta diría 0 hasta que marques, o sea que castiga por la hora del día.
  it('la semana en curso vacía no rompe la racha', () => {
    const fechas = ['2026-07-29', '2026-07-22'];
    expect(semanasSostenidas(fechas, '2026-08-06')).toBe(2);
  });

  it('pero una semana pasada vacía sí la rompe', () => {
    const fechas = ['2026-07-22'];
    expect(semanasSostenidas(fechas, '2026-08-06')).toBe(0);
  });

  it('sin marcas es cero', () => {
    expect(semanasSostenidas([], '2026-08-06')).toBe(0);
  });

  // El domingo pertenece a la semana que arrancó el lunes anterior, no a la
  // siguiente: es el error clásico de `getDay()` con 0 = domingo.
  it('el domingo cae en la semana del lunes anterior', () => {
    expect(semanasSostenidas(['2026-08-09'], '2026-08-09')).toBe(1);
    expect(semanasSostenidas(['2026-08-09'], '2026-08-10')).toBe(1);
  });
});

describe('progresoHabito', () => {
  it('dice cuánto falta', () => {
    expect(progresoHabito(['2026-08-04'], '2026-08-06')).toEqual({
      semanas: 1,
      falta: SEMANAS_HABITO - 1,
      llego: false,
    });
  });

  it('llega al sostenerlo las semanas pedidas', () => {
    const fechas = Array.from({ length: SEMANAS_HABITO }, (_, i) => {
      const d = new Date('2026-08-04T00:00:00');
      d.setDate(d.getDate() - i * 7);
      return d.toISOString().slice(0, 10);
    });
    expect(progresoHabito(fechas, '2026-08-06').llego).toBe(true);
  });
});

describe('llegoLaRueda', () => {
  it('llega cuando el área alcanzó el puntaje pedido', () => {
    expect(llegoLaRueda({ scoreHasta: 3 }, 3)).toBe(true);
    expect(llegoLaRueda({ scoreHasta: 3 }, 4)).toBe(true);
    expect(llegoLaRueda({ scoreHasta: 3 }, 2)).toBe(false);
  });

  it('sin datos no inventa un veredicto', () => {
    expect(llegoLaRueda({ scoreHasta: null }, 5)).toBe(false);
    expect(llegoLaRueda({ scoreHasta: 3 }, null)).toBe(false);
  });
});

describe('fechaLimitePorDefecto', () => {
  // ⚠️ 60 días es de Matías: "el hábito tarda sesenta días en generarse", y de
  // ahí sale la fecha que se pone sola cuando no ponés ninguna.
  it('pone 60 días desde la fecha que le des', () => {
    expect(fechaLimitePorDefecto('2026-08-06')).toBe('2026-10-05');
    expect(DIAS_HABITO).toBe(60);
  });

  it('cruza fin de mes y fin de año sin romperse', () => {
    expect(fechaLimitePorDefecto('2026-12-31')).toBe('2027-03-01');
    expect(fechaLimitePorDefecto('2026-01-31')).toBe('2026-04-01');
  });

  it('acepta otro plazo si se lo pedís', () => {
    expect(fechaLimitePorDefecto('2026-08-06', 1)).toBe('2026-08-07');
  });

  // ⚠️ Las semanas del hábito se DERIVAN de los 60 días, no se escriben aparte:
  // dos números sueltos para la misma idea se despegan en el primer retoque.
  it('las semanas del hábito salen de los días', () => {
    expect(SEMANAS_HABITO).toBe(Math.floor(DIAS_HABITO / 7));
  });
});

describe('TIPOS_OBJETIVO', () => {
  // ⚠️ Este test existe por un bug real: `TIPOS_OBJETIVO` arma su texto con
  // `SEMANAS_HABITO`, y con el `const` declarado más abajo el módulo compilaba y
  // explotaba al importarse.
  it('se puede importar y trae los tres tipos con su texto armado', () => {
    expect(TIPOS_OBJETIVO.map((t) => t.tipo)).toEqual(['rueda', 'llegar', 'habito']);
    expect(TIPOS_OBJETIVO[2].cierra).toContain(String(DIAS_HABITO));
  });
});

import { describe, expect, it } from 'vitest';
import {
  comparacionMesCerrado,
  gastosPorMes,
  hayTendencia,
  ultimosMeses,
} from '@/lib/grafico-gastos';

// 15 de agosto de 2026. Mes en curso: ago.
const HOY = new Date(2026, 7, 15);

describe('ultimosMeses', () => {
  it('devuelve la ventana terminando en el mes de hoy, del más viejo al más nuevo', () => {
    expect(ultimosMeses(HOY, 3)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('cruza el año hacia atrás sin romperse', () => {
    expect(ultimosMeses(new Date(2026, 1, 3), 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('gastosPorMes', () => {
  it('suma por mes y cuenta cuántos entraron', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 40 },
        { fecha: '2026-08-09', total: 60 },
        { fecha: '2026-07-20', total: 25 },
      ],
      HOY,
      3,
    );
    expect(meses.map((m) => [m.etiqueta, m.total, m.cuantos])).toEqual([
      ['jun', 0, 0],
      ['jul', 25, 1],
      ['ago', 100, 2],
    ]);
  });

  it('ignora los gastos fuera de la ventana', () => {
    const meses = gastosPorMes([{ fecha: '2025-01-05', total: 999 }], HOY, 3);
    expect(meses.every((m) => m.cuantos === 0)).toBe(true);
  });

  // Un ticket cuyo importe no se pudo leer no dice nada sobre cuánto gastaste:
  // contarlo haría parecer que hay más datos de los que hay.
  it('no cuenta los gastos sin total', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-08-02', total: null },
        { fecha: '2026-08-03', total: 10 },
      ],
      HOY,
      2,
    );
    expect(meses[1]).toMatchObject({ total: 10, cuantos: 1 });
  });
});

describe('hayTendencia', () => {
  it('con un solo mes cargado no alcanza', () => {
    const meses = gastosPorMes([{ fecha: '2026-08-02', total: 40 }], HOY, 3);
    expect(hayTendencia(meses)).toBe(false);
  });

  it('con dos meses cargados sí', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 40 },
        { fecha: '2026-07-02', total: 30 },
      ],
      HOY,
      3,
    );
    expect(hayTendencia(meses)).toBe(true);
  });
});

describe('comparacionMesCerrado', () => {
  // El mes en curso está incompleto: compararlo daría "venís gastando menos"
  // todos los meses hasta el día 30.
  it('compara los dos meses CERRADOS, no el que está corriendo', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 5 }, // en curso, se ignora
        { fecha: '2026-07-10', total: 120 },
        { fecha: '2026-06-10', total: 100 },
      ],
      HOY,
      3,
    );
    expect(comparacionMesCerrado(meses)).toEqual({
      etiqueta: 'jul',
      total: 120,
      anterior: 100,
      diferencia: 20,
    });
  });

  it('se calla si el mes previo no tiene nada anotado', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 5 },
        { fecha: '2026-07-10', total: 120 },
      ],
      HOY,
      3,
    );
    expect(comparacionMesCerrado(meses)).toBeNull();
  });

  it('se calla si la ventana es demasiado corta', () => {
    const meses = gastosPorMes([{ fecha: '2026-08-02', total: 5 }], HOY, 2);
    expect(comparacionMesCerrado(meses)).toBeNull();
  });

  it('una baja da diferencia negativa, sin adjetivos', () => {
    const meses = gastosPorMes(
      [
        { fecha: '2026-07-10', total: 80 },
        { fecha: '2026-06-10', total: 100 },
      ],
      HOY,
      3,
    );
    expect(comparacionMesCerrado(meses)?.diferencia).toBe(-20);
  });
});

// El filtro de moneda, agregado el 03/08. Antes `gastosPorMes` sumaba sin mirar
// la moneda: en la base convivían 'EUR' y '€' (la misma), y el día que entrara
// un peso se sumaba a los euros en silencio.
describe('gastosPorMes · la moneda', () => {
  const hoy = new Date('2026-08-15T12:00:00');

  it('⚠️ no suma pesos con euros', () => {
    const m = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 10, moneda: '€' },
        { fecha: '2026-08-03', total: 5000, moneda: 'ARS' },
      ],
      hoy,
      6,
      '€',
    );
    const ago = m[m.length - 1];
    expect(ago.total).toBe(10);
    expect(ago.cuantos).toBe(1); // el peso no cuenta ni como anotado
  });

  it("'€' y 'EUR' son la misma moneda", () => {
    // Las dos formas conviven en la base real. Compararlas como texto crudo
    // habría descartado la mitad de los gastos de Matías.
    const m = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 10, moneda: '€' },
        { fecha: '2026-08-03', total: 15, moneda: 'EUR' },
        { fecha: '2026-08-04', total: 5, moneda: 'euros' },
      ],
      hoy,
      6,
      'EUR',
    );
    expect(m[m.length - 1].total).toBe(30);
  });

  it('⚠️ los gastos sin moneda se cuentan igual', () => {
    // No son de otra moneda: son de una que no se pudo leer. Descartarlos
    // escondería gasto real en una app de una sola moneda.
    const m = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 10, moneda: '€' },
        { fecha: '2026-08-03', total: 7, moneda: null },
      ],
      hoy,
      6,
      '€',
    );
    expect(m[m.length - 1].total).toBe(17);
  });

  it('sin moneda objetivo se comporta como antes', () => {
    const m = gastosPorMes(
      [
        { fecha: '2026-08-02', total: 10, moneda: '€' },
        { fecha: '2026-08-03', total: 5000, moneda: 'ARS' },
      ],
      hoy,
      6,
    );
    expect(m[m.length - 1].total).toBe(5010);
  });
});

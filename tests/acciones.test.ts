import { describe, it, expect } from 'vitest';
import {
  cantidadTotal,
  cartera,
  contraUltimaCompra,
  invertido,
  porCompra,
  promedio,
  resultado,
  ultimaCompra,
  valorHoy,
  type Compra,
} from '@/lib/acciones';

const c = (cantidad: number, precio: number, fecha = '2026-05-12'): Compra => ({ cantidad, precio, fecha });

// El caso de la maqueta: 5 a 172,40 el 12/05 y 3 a 193,20 el 28/07.
const APPLE = [c(5, 172.4, '2026-05-12'), c(3, 193.2, '2026-07-28')];

describe('lo que pusiste', () => {
  it('suma las cantidades', () => {
    expect(cantidadTotal(APPLE)).toBe(8);
  });

  it('suma la plata puesta, cantidad por precio', () => {
    expect(invertido(APPLE)).toBeCloseTo(5 * 172.4 + 3 * 193.2, 2);
  });

  it('ignora las compras rotas en vez de propagar NaN', () => {
    const rotas = [c(5, 172.4), { cantidad: Number.NaN, precio: 10, fecha: '2026-06-01' }, c(0, 50)];
    expect(cantidadTotal(rotas)).toBe(5);
    expect(invertido(rotas)).toBeCloseTo(862, 2);
  });
});

describe('promedio', () => {
  it('pondera por cantidad, no promedia los precios', () => {
    // ⚠️ El promedio simple de 172,40 y 193,20 es 182,80 — y sería mentira:
    // compraste más caras las pocas. El ponderado da 180,20, que es la plata
    // real dividida por las acciones reales.
    expect(promedio(APPLE)).toBeCloseTo(180.2, 2);
  });

  it('el caso extremo que hace obvia la diferencia', () => {
    // 100 a 10 y 1 a 200: el promedio simple daría 105, un precio al que nunca
    // compraste nada.
    expect(promedio([c(100, 10), c(1, 200)])).toBeCloseTo(11.88, 2);
  });

  it('sin compras no hay promedio, y no es cero', () => {
    expect(promedio([])).toBeNull();
  });
});

describe('resultado', () => {
  it('la ganancia total, en plata y en porcentaje', () => {
    const r = resultado(APPLE, 194.1);
    expect(r?.euros).toBeCloseTo(8 * 194.1 - 1441.6, 2);
    expect(r?.pct).toBeCloseTo(7.72, 1);
  });

  it('la pérdida sale negativa, sin adornos', () => {
    const r = resultado([c(1, 720)], 645.5);
    expect(r?.euros).toBeCloseTo(-74.5, 2);
    expect(r?.pct).toBeCloseTo(-10.35, 1);
  });

  it('⚠️ sin precio de hoy devuelve null, NO cero', () => {
    // Un 0 en pantalla se lee como "no ganaste ni perdiste", que es una
    // afirmación. La verdad es que no se sabe.
    expect(resultado(APPLE, null)).toBeNull();
    expect(valorHoy(APPLE, null)).toBeNull();
  });

  it('sin compras tampoco afirma nada', () => {
    expect(resultado([], 194.1)).toBeNull();
  });
});

describe('porCompra', () => {
  it('da la ganancia de cada compra por separado', () => {
    const filas = porCompra(APPLE, 194.1);
    expect(filas).toHaveLength(2);
    expect(filas[0].euros).toBeCloseTo(5 * (194.1 - 172.4), 2);
    expect(filas[1].euros).toBeCloseTo(3 * (194.1 - 193.2), 2);
  });

  it('las ordena de la más vieja a la más nueva aunque lleguen al revés', () => {
    const filas = porCompra([c(3, 193.2, '2026-07-28'), c(5, 172.4, '2026-05-12')], 194.1);
    expect(filas.map((f) => f.fecha)).toEqual(['2026-05-12', '2026-07-28']);
  });

  it('una en ganancia y otra en pérdida se ven a la vez', () => {
    const filas = porCompra([c(1, 100, '2026-01-01'), c(1, 300, '2026-02-01')], 200);
    expect(filas[0].pct).toBeCloseTo(100, 2);
    expect(filas[1].pct).toBeCloseTo(-33.33, 1);
  });

  it('sin precio no inventa filas', () => {
    expect(porCompra(APPLE, null)).toEqual([]);
  });
});

describe('contra la última compra — la pregunta que hizo Matías', () => {
  it('mira la última por FECHA, no la última cargada', () => {
    expect(ultimaCompra(APPLE)?.precio).toBe(193.2);
    // Cargadas al revés: sigue ganando la del 28/07.
    expect(ultimaCompra([c(3, 193.2, '2026-07-28'), c(5, 172.4, '2026-05-12')])?.precio).toBe(193.2);
  });

  it('“¿está más alto o más bajo que la vez pasada?”', () => {
    expect(contraUltimaCompra(APPLE, 194.1)).toBeCloseTo(0.47, 1);
  });

  it('⚠️ puede estar arriba del promedio y abajo de la última compra', () => {
    // Este es el motivo de que las dos comparaciones existan: una NO se deduce
    // de la otra, y mostrar solo el promedio dejaba su pregunta sin contestar.
    const compras = [c(10, 100, '2026-01-01'), c(1, 200, '2026-07-01')];
    expect(promedio(compras)).toBeCloseTo(109.09, 2);
    expect(resultado(compras, 150)?.euros).toBeGreaterThan(0); // arriba del promedio
    expect(contraUltimaCompra(compras, 150)).toBeCloseTo(-25, 2); // abajo de la última
  });

  it('sin precio o sin compras, null', () => {
    expect(contraUltimaCompra(APPLE, null)).toBeNull();
    expect(contraUltimaCompra([], 194.1)).toBeNull();
    expect(ultimaCompra([])).toBeNull();
  });
});

describe('cartera', () => {
  const papeles = [
    { simbolo: 'AAPL', nombre: 'Apple', precio: 194.1, compras: APPLE },
    { simbolo: 'ASML', nombre: 'ASML', precio: 645.5, compras: [c(1, 720, '2026-03-01')] },
  ];

  it('suma lo que valen y lo que pusiste', () => {
    const t = cartera(papeles);
    expect(t.valor).toBeCloseTo(8 * 194.1 + 645.5, 2);
    expect(t.puesto).toBeCloseTo(1441.6 + 720, 2);
    expect(t.euros).toBeCloseTo(t.valor - t.puesto, 2);
  });

  it('⚠️ el papel sin precio queda AFUERA y se cuenta aparte', () => {
    // Valuarlo al costo diría "con este no ganaste ni perdiste", que es
    // inventado. Dejarlo afuera y avisarlo es lo único cierto.
    const conHueco = [...papeles, { simbolo: 'IBE', nombre: 'Iberdrola', precio: null, compras: [c(40, 11.9)] }];
    const t = cartera(conHueco);
    expect(t.sinPrecio).toBe(1);
    expect(t.puesto).toBeCloseTo(cartera(papeles).puesto, 2);
  });

  it('una cartera vacía no afirma nada', () => {
    const t = cartera([]);
    expect(t.valor).toBe(0);
    expect(t.pct).toBe(0);
    expect(t.sinPrecio).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { haceCuantoLlego } from '@/lib/tiempo-relativo';

const AHORA = Date.parse('2026-08-11T12:00:00Z');
const haceMin = (m: number) => new Date(AHORA - m * 60_000).toISOString();

describe('haceCuantoLlego · los escalones', () => {
  it('recién, abajo de dos minutos', () => {
    expect(haceCuantoLlego(haceMin(0), AHORA)).toBe('recién');
    expect(haceCuantoLlego(haceMin(1), AHORA)).toBe('recién');
  });

  it('minutos', () => {
    expect(haceCuantoLlego(haceMin(2), AHORA)).toBe('hace 2 min');
    expect(haceCuantoLlego(haceMin(59), AHORA)).toBe('hace 59 min');
  });

  it('horas', () => {
    expect(haceCuantoLlego(haceMin(60), AHORA)).toBe('hace 1 h');
    expect(haceCuantoLlego(haceMin(60 * 23), AHORA)).toBe('hace 23 h');
  });

  it('ayer, y después días', () => {
    expect(haceCuantoLlego(haceMin(60 * 24), AHORA)).toBe('ayer');
    expect(haceCuantoLlego(haceMin(60 * 24 * 3), AHORA)).toBe('hace 3 días');
  });
});

describe('haceCuantoLlego · ⚠️ redondea para abajo, siempre', () => {
  it('90 minutos son "hace 1 h", no "hace 2 h"', () => {
    // Con `round` diría 2 h: **afirmaría más tiempo del que pasó**. Un dato de
    // frescura tiene que pecar de fresco — al revés te hace desconfiar de algo
    // que estaba bien. Es la diferencia que había entre las dos copias viejas.
    expect(haceCuantoLlego(haceMin(90), AHORA)).toBe('hace 1 h');
  });

  it('47 horas son "ayer", no "hace 2 días"', () => {
    expect(haceCuantoLlego(haceMin(60 * 47), AHORA)).toBe('ayer');
  });
});

describe('haceCuantoLlego · cuando no hay nada que decir', () => {
  it('sin fecha, null', () => {
    expect(haceCuantoLlego(null, AHORA)).toBeNull();
    expect(haceCuantoLlego(undefined, AHORA)).toBeNull();
    expect(haceCuantoLlego('', AHORA)).toBeNull();
  });

  it('fecha ilegible, null', () => {
    expect(haceCuantoLlego('mañana a la tarde', AHORA)).toBeNull();
  });

  it('⚠️ fecha futura, null — nunca "hace -3 min"', () => {
    // Pasa de verdad: un feed con el reloj adelantado.
    expect(haceCuantoLlego(haceMin(-30), AHORA)).toBeNull();
  });

  it('⚠️ devuelve null y no un texto por defecto', () => {
    // Cada pantalla dice lo suyo: Acciones "sin traer", una noticia sin fecha no
    // muestra nada. Un default acá las obligaría a compartir una excusa que no
    // comparten.
    expect(haceCuantoLlego(null, AHORA)).toBeNull();
  });
});

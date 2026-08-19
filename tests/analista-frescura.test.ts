import { describe, it, expect } from 'vitest';
import { necesitaAnalisis } from '@/lib/analista-frescura';

const hoy = new Date('2026-07-22T12:00:00');
const dias = (n: number) => new Date(hoy.getTime() - n * 86_400_000).toISOString();

describe('necesitaAnalisis', () => {
  it('no corre si no hay ninguna señal', () => {
    expect(necesitaAnalisis(null, null, hoy)).toBe(false);
    expect(necesitaAnalisis(dias(10), null, hoy)).toBe(false);
  });

  it('corre si hay datos y nunca se analizó', () => {
    expect(necesitaAnalisis(null, dias(1), hoy)).toBe(true);
  });

  it('no corre si no hubo señales nuevas desde el último análisis', () => {
    // última señal (hace 6 días) es anterior al último análisis (hace 5)
    expect(necesitaAnalisis(dias(5), dias(6), hoy)).toBe(false);
  });

  it('no corre si hay datos nuevos pero el análisis es reciente', () => {
    // señal nueva hoy, pero el análisis fue hace 1 día (< 2, el default)
    expect(necesitaAnalisis(dias(1), dias(0), hoy)).toBe(false);
  });

  it('corre si hay datos nuevos y el análisis ya tiene minDias', () => {
    // señal nueva hoy, análisis hace 3 días (>= 2, el default)
    expect(necesitaAnalisis(dias(3), dias(0), hoy)).toBe(true);
  });

  it('respeta un minDias custom', () => {
    expect(necesitaAnalisis(dias(3), dias(0), hoy, 2)).toBe(true);
    expect(necesitaAnalisis(dias(3), dias(0), hoy, 7)).toBe(false);
  });
});

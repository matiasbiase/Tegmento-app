import { describe, it, expect } from 'vitest';
import { serieSenal, promedioSenal, nivelSenal } from '@/lib/cuerpo';

const HOY = new Date(2026, 6, 24); // 24 jul 2026

function iso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m, d, h).toISOString();
}

describe('serieSenal', () => {
  it('arma una serie del largo pedido, terminando hoy', () => {
    const s = serieSenal([], HOY, 14);
    expect(s).toHaveLength(14);
    expect(s[13].esHoy).toBe(true);
    expect(s[13].dia).toBe('2026-07-24');
  });

  it('ubica el valor en el día correcto', () => {
    const s = serieSenal([{ valor: 4, creado: iso(2026, 6, 24) }], HOY, 14);
    expect(s[13].valor).toBe(4);
    expect(s[12].valor).toBeNull();
  });

  it('promedia si hubo varias cargas el mismo día', () => {
    const s = serieSenal(
      [
        { valor: 2, creado: iso(2026, 6, 24, 9) },
        { valor: 4, creado: iso(2026, 6, 24, 20) },
      ],
      HOY,
      14,
    );
    expect(s[13].valor).toBe(3);
  });

  it('ignora valores nulos', () => {
    const s = serieSenal([{ valor: null, creado: iso(2026, 6, 24) }], HOY, 14);
    expect(s[13].valor).toBeNull();
  });

  it('promedioSenal saca el promedio de lo que hay', () => {
    const s = serieSenal(
      [
        { valor: 2, creado: iso(2026, 6, 23) },
        { valor: 4, creado: iso(2026, 6, 24) },
      ],
      HOY,
      14,
    );
    expect(promedioSenal(s)).toBe(3);
  });

  it('promedioSenal es null sin datos', () => {
    expect(promedioSenal(serieSenal([], HOY, 14))).toBeNull();
  });
});

describe('nivelSenal', () => {
  it('parte el 1-5 en bajo, medio y alto', () => {
    expect(nivelSenal(1)).toBe('Bajo');
    expect(nivelSenal(2)).toBe('Bajo');
    expect(nivelSenal(3)).toBe('Medio');
    expect(nivelSenal(4)).toBe('Alto');
    expect(nivelSenal(5)).toBe('Alto');
  });

  it('sin dato no inventa un nivel', () => {
    expect(nivelSenal(null)).toBeNull();
    expect(nivelSenal(undefined)).toBeNull();
    expect(nivelSenal(NaN)).toBeNull();
  });

  it('aguanta el promedio con decimales que devuelve serieSenal', () => {
    // 2.5 es el promedio de dos cargas del mismo día (2 y 3). Los cortes son
    // "hasta 2" y "hasta 3", así que cualquier cosa por encima de 2 ya sale de
    // bajo: media pila no es poca pila.
    expect(nivelSenal(2.1)).toBe('Medio');
    expect(nivelSenal(2.5)).toBe('Medio');
    expect(nivelSenal(3.4)).toBe('Alto');
  });
});

import { describe, expect, it } from 'vitest';
import { mapaSemanas } from '@/lib/marcas';

// Miércoles 15 de julio de 2026 (mes 6 = julio).
const MIERCOLES = new Date(2026, 6, 15, 10, 0, 0);

describe('mapaSemanas', () => {
  it('devuelve semanas completas de 7 días', () => {
    const m = mapaSemanas(MIERCOLES, 5);
    expect(m).toHaveLength(5);
    for (const semana of m) expect(semana).toHaveLength(7);
  });

  it('cada fila arranca en domingo y termina en sábado', () => {
    for (const semana of mapaSemanas(MIERCOLES, 4)) {
      expect(new Date(`${semana[0].fecha}T12:00:00`).getDay()).toBe(0);
      expect(new Date(`${semana[6].fecha}T12:00:00`).getDay()).toBe(6);
    }
  });

  it('la última fila contiene hoy', () => {
    const m = mapaSemanas(MIERCOLES, 5);
    expect(m[m.length - 1].some((d) => d.esHoy)).toBe(true);
    expect(m[m.length - 1].filter((d) => d.esHoy)).toHaveLength(1);
  });

  // Lo que importa: los días que no pasaron no son "no lo hiciste".
  it('marca como futuro solo lo que viene después de hoy', () => {
    const m = mapaSemanas(MIERCOLES, 3).flat();
    const futuros = m.filter((d) => d.futuro);
    // miércoles → quedan jueves, viernes y sábado de esta semana
    expect(futuros).toHaveLength(3);
    for (const f of futuros) expect(f.fecha > '2026-07-15').toBe(true);
  });

  it('solo hoy y ayer son editables', () => {
    const editables = mapaSemanas(MIERCOLES, 4).flat().filter((d) => d.editable);
    expect(editables.map((d) => d.fecha)).toEqual(['2026-07-14', '2026-07-15']);
  });

  it('no repite ni saltea días', () => {
    const fechas = mapaSemanas(MIERCOLES, 5).flat().map((d) => d.fecha);
    expect(new Set(fechas).size).toBe(35);
    expect([...fechas].sort()).toEqual(fechas);
  });
});

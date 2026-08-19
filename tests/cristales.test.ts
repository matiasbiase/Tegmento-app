import { describe, it, expect } from 'vitest';
import { agruparPorTema, colorDeTema } from '@/lib/cristales';

describe('agruparPorTema', () => {
  it('junta consecutivos del mismo tema en un cristal', () => {
    const r = agruparPorTema([
      { id: 1, temaId: null },
      { id: 2, temaId: 5 },
      { id: 3, temaId: 5 },
      { id: 4, temaId: null },
    ]);
    expect(r).toEqual([
      { tipo: 'suelto', item: { id: 1, temaId: null } },
      { tipo: 'cristal', temaId: 5, items: [{ id: 2, temaId: 5 }, { id: 3, temaId: 5 }] },
      { tipo: 'suelto', item: { id: 4, temaId: null } },
    ]);
  });

  it('el mismo tema separado por un mensaje suelto NO se junta: son dos cristales', () => {
    const r = agruparPorTema([
      { id: 1, temaId: 5 },
      { id: 2, temaId: null },
      { id: 3, temaId: 5 },
    ]);
    expect(r).toEqual([
      { tipo: 'cristal', temaId: 5, items: [{ id: 1, temaId: 5 }] },
      { tipo: 'suelto', item: { id: 2, temaId: null } },
      { tipo: 'cristal', temaId: 5, items: [{ id: 3, temaId: 5 }] },
    ]);
  });

  it('temas distintos consecutivos no se mezclan', () => {
    const r = agruparPorTema([
      { id: 1, temaId: 5 },
      { id: 2, temaId: 6 },
    ]);
    expect(r).toEqual([
      { tipo: 'cristal', temaId: 5, items: [{ id: 1, temaId: 5 }] },
      { tipo: 'cristal', temaId: 6, items: [{ id: 2, temaId: 6 }] },
    ]);
  });

  it('sin ningún tema, todo queda suelto', () => {
    const r = agruparPorTema([{ id: 1, temaId: null }, { id: 2, temaId: undefined }]);
    expect(r.every((c) => c.tipo === 'suelto')).toBe(true);
  });

  it('lista vacía da lista vacía', () => {
    expect(agruparPorTema([])).toEqual([]);
  });
});

describe('colorDeTema', () => {
  it('el mismo id siempre da el mismo color', () => {
    expect(colorDeTema(5)).toBe(colorDeTema(5));
  });
  it('siempre devuelve un color de la paleta (nunca vacío)', () => {
    for (let id = 0; id < 20; id++) expect(colorDeTema(id)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

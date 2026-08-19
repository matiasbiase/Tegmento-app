import { describe, it, expect } from 'vitest';
import { ACTIVIDADES, rankear, type Sugerencia } from '@/lib/descubrir';

const muestra: Sugerencia[] = [
  { id: 'a', titulo: 'Correr', detalle: '', areas: ['Salud física'] },
  { id: 'b', titulo: 'Meditar', detalle: '', areas: ['Salud mental'] },
  { id: 'c', titulo: 'Ahorrar', detalle: '', areas: ['Finanzas'] },
];

describe('rankear', () => {
  it('pone primero las que tocan un área de foco', () => {
    const r = rankear(muestra, { foco: ['Finanzas'] });
    expect(r[0].id).toBe('c');
  });
  it('esconde lo que ya tengo, comparando sin acentos ni mayúsculas', () => {
    const r = rankear(muestra, { yaTengo: ['  CORRER '] });
    expect(r.map((s) => s.id)).not.toContain('a');
    expect(r).toHaveLength(2);
  });
  it('sin foco ni duplicados, devuelve todo', () => {
    expect(rankear(muestra)).toHaveLength(3);
  });
  it('es estable con la misma semilla', () => {
    const a = rankear(muestra, { semilla: 5 }).map((s) => s.id);
    const b = rankear(muestra, { semilla: 5 }).map((s) => s.id);
    expect(a).toEqual(b);
  });
  it('las de foco van antes que las de fuera de foco, siempre', () => {
    const r = rankear(muestra, { foco: ['Salud mental'], semilla: 42 });
    expect(r[0].id).toBe('b');
  });
});

describe('catálogo', () => {
  it('los ids son únicos', () => {
    const ids = ACTIVIDADES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('toda sugerencia tiene al menos un área', () => {
    for (const s of ACTIVIDADES) expect(s.areas.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { componerPersonalidad, NIVELES_DEFAULT, type Niveles } from '@/lib/personalidad';

const base: Niveles = { calidez: 3, franqueza: 3, humor: 3, exigencia: 3, extension: 3 };

describe('componerPersonalidad', () => {
  it('omite los rasgos en el medio (3) para no diluir', () => {
    // todo en 3 salvo franqueza al máximo: solo debe hablar de franqueza
    const txt = componerPersonalidad({ ...base, franqueza: 5 });
    expect(txt).toMatch(/franco|sin filtro|de frente/i);
    expect(txt).not.toMatch(/humor|cálido|coach/i);
    expect(txt.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(1);
  });

  it('da órdenes imperativas, no descripciones', () => {
    const txt = componerPersonalidad({ ...base, extension: 1 });
    expect(txt).toMatch(/órdenes|respetalas/i);
    expect(txt).toMatch(/corto|al hueso|grano/i);
  });

  it('franqueza y largo, los que pesan en "más directa", cambian el texto', () => {
    const directa = componerPersonalidad({ ...base, franqueza: 5, extension: 1 });
    const suave = componerPersonalidad({ ...base, franqueza: 1, extension: 5 });
    expect(directa).not.toBe(suave);
    expect(directa).toMatch(/sin vueltas|de frente|sin filtro/i);
    expect(suave).toMatch(/diplomático|desarrollá/i);
  });

  it('con todo neutro devuelve algo, no vacío', () => {
    expect(componerPersonalidad(base).length).toBeGreaterThan(0);
  });

  it('los niveles por defecto producen varias directivas', () => {
    const txt = componerPersonalidad(NIVELES_DEFAULT);
    expect(txt.split('\n').filter((l) => l.startsWith('- ')).length).toBeGreaterThanOrEqual(2);
  });
});

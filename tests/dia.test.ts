import { describe, expect, it } from 'vitest';
import { claveDiaLocal, moodDominante, categoriasDia, type DetalleDia } from '@/lib/dia';

describe('claveDiaLocal', () => {
  it('YYYY-MM-DD en horario local', () => {
    expect(claveDiaLocal(new Date(2026, 6, 22, 15, 30))).toBe('2026-07-22');
    expect(claveDiaLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('moodDominante', () => {
  it('el mood promedio del día, redondeado al más cercano', () => {
    expect(moodDominante(['genial', 'genial'])).toBe('genial');
    expect(moodDominante(['genial', 'bajon'])).toBe('bien'); // (4+1)/2 = 2.5, empate 2/3 resuelto a 'bien'
    expect(moodDominante(['bajon', 'bajon', 'neutral'])).toBe('bajon'); // (1+1+2)/3 ≈ 1.33 → bajón
  });
  it('null si no hubo ánimo', () => {
    expect(moodDominante([])).toBeNull();
  });
  it('ignora estados desconocidos', () => {
    expect(moodDominante(['bien', 'xxx'])).toBe('bien');
  });
});

describe('categoriasDia', () => {
  const vacio: DetalleDia = {
    animo: [], sueno: null, comidas: [], gastos: [], hechas: [], eventos: [], notas: [], charlas: [], fotos: [],
  };
  it('marca las categorías presentes, en orden fijo', () => {
    const d: DetalleDia = {
      ...vacio,
      animo: [{ estado: 'bien', nota: null, hora: '10:00' }],
      gastos: [{ comercio: 'Aldi', total: 15, moneda: '€' }],
      comidas: [{ nota: 'café', hora: '08:00' }],
    };
    expect(categoriasDia(d)).toEqual(['animo', 'comida', 'gasto']);
  });
  it('las fotos del día cuentan como categoría', () => {
    const d: DetalleDia = { ...vacio, fotos: [{ path: 'x.jpg', hora: '12:00' }] };
    expect(categoriasDia(d)).toEqual(['foto']);
  });
  it('día sin nada → sin categorías', () => {
    expect(categoriasDia(vacio)).toEqual([]);
  });
});

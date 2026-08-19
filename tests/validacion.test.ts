import { describe, it, expect } from 'vitest';
import { validarScores } from '@/lib/validacion';

describe('validarScores', () => {
  it('acepta scores 1-5', () => {
    expect(validarScores([{ areaId: 1, score: 3 }])).toBeNull();
  });
  it('rechaza fuera de rango, no enteros y lista vacía', () => {
    expect(validarScores([{ areaId: 1, score: 0 }])).not.toBeNull();
    expect(validarScores([{ areaId: 1, score: 6 }])).not.toBeNull();
    expect(validarScores([{ areaId: 1, score: 2.5 }])).not.toBeNull();
    expect(validarScores([])).not.toBeNull();
  });
});

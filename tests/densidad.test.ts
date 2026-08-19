import { describe, expect, it } from 'vitest';
import { calcularDensidad, instruccionSegunDensidad } from '@/lib/densidad';

describe('calcularDensidad', () => {
  it('las primeras semanas es arranque', () => {
    expect(calcularDensidad(0)).toBe('arranque');
    expect(calcularDensidad(9)).toBe('arranque');
  });

  // El caso real de Matías el 29/07: 12 días con ánimo registrado.
  it('con unos días ya es formandose', () => {
    expect(calcularDensidad(10)).toBe('formandose');
    expect(calcularDensidad(12)).toBe('formandose');
    expect(calcularDensidad(29)).toBe('formandose');
  });

  it('con un mes largo ya hay historia', () => {
    expect(calcularDensidad(30)).toBe('con-historia');
    expect(calcularDensidad(120)).toBe('con-historia');
  });
});

describe('instruccionSegunDensidad', () => {
  it('al arranque prohíbe afirmar relaciones', () => {
    const t = instruccionSegunDensidad('arranque', 4);
    expect(t).toMatch(/NO afirmes/i);
    expect(t).toMatch(/probar/i);
  });

  it('en el medio pide que sea pregunta', () => {
    expect(instruccionSegunDensidad('formandose', 12)).toMatch(/como pregunta/i);
  });

  it('con historia habilita decirlo derecho', () => {
    const t = instruccionSegunDensidad('con-historia', 60);
    expect(t).toMatch(/derecho|seguridad/i);
  });

  // El número entra en el texto: el modelo tiene que saber sobre cuánto habla.
  it('siempre dice cuántos días hay', () => {
    for (const d of ['arranque', 'formandose', 'con-historia'] as const) {
      expect(instruccionSegunDensidad(d, 17)).toContain('17');
    }
  });
});

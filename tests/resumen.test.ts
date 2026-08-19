import { describe, expect, it } from 'vitest';
import { claveSemana, fallbackResumen, promptResumen, type DatosResumen } from '@/lib/resumen';

describe('claveSemana', () => {
  it('semana ISO con lunes como arranque', () => {
    expect(claveSemana(new Date(2026, 6, 22))).toBe('2026-W30'); // miércoles 22/07/2026
    expect(claveSemana(new Date(2026, 6, 20))).toBe('2026-W30'); // lunes de esa semana
    expect(claveSemana(new Date(2026, 6, 19))).toBe('2026-W29'); // domingo anterior
  });

  it('bordes de año', () => {
    expect(claveSemana(new Date(2026, 0, 1))).toBe('2026-W01'); // jueves 1/1/2026
    expect(claveSemana(new Date(2027, 0, 1))).toBe('2026-W53'); // viernes 1/1/2027 sigue en la última de 2026
  });
});

const base: DatosResumen = {
  nombre: 'Matías',
  animo: [
    { dia: '2026-07-21', estado: 'bien', nota: 'Fui a boulder' },
    { dia: '2026-07-22', estado: 'genial', nota: null },
  ],
  suenoNoches: 2,
  suenoPromedioHs: 9,
  comidas: 5,
  gastosTotal: 46.8,
  gastosMoneda: '€',
  gastosTickets: 2,
  hechas: ['mandé el mail a la médica'],
  eventosProximos: [{ titulo: 'Asado en lo de Lena', cuando: '2026-07-25' }],
  entradas: 4,
};

describe('fallbackResumen', () => {
  it('arma una lectura con lo que hay, sin IA', () => {
    const t = fallbackResumen(base);
    expect(t).toContain('Matías');
    expect(t).toContain('9');
    expect(t).toContain('mandé el mail a la médica');
  });

  it('nunca queda vacío aunque no haya datos', () => {
    const t = fallbackResumen({
      nombre: 'Matías',
      animo: [],
      suenoNoches: 0,
      suenoPromedioHs: null,
      comidas: 0,
      gastosTotal: null,
      gastosMoneda: null,
      gastosTickets: 0,
      hechas: [],
      eventosProximos: [],
      entradas: 0,
    });
    expect(t.length).toBeGreaterThan(20);
  });
});

describe('promptResumen', () => {
  it('incluye las señales de la semana', () => {
    const p = promptResumen(base);
    expect(p).toContain('boulder');
    expect(p).toContain('46,8');
    expect(p).toContain('Asado en lo de Lena');
  });
});

import { describe, expect, it } from 'vitest';
import {
  largoPromedioCiclo,
  estadoCiclo,
  faseDeFecha,
  marcasCiclo,
  type Periodo,
} from '@/lib/ciclo';

const d = (s: string) => new Date(`${s}T12:00`);

describe('largoPromedioCiclo', () => {
  it('promedia los días entre inicios', () => {
    const ps: Periodo[] = [
      { inicio: '2026-05-01', fin: '2026-05-05' },
      { inicio: '2026-05-29', fin: '2026-06-02' }, // 28
      { inicio: '2026-06-26', fin: null }, // 28
    ];
    expect(largoPromedioCiclo(ps)).toBe(28);
  });
  it('default 28 con menos de 2 períodos', () => {
    expect(largoPromedioCiclo([{ inicio: '2026-06-26', fin: null }])).toBe(28);
    expect(largoPromedioCiclo([])).toBe(28);
  });
  it('clampa a un rango sano', () => {
    const ps: Periodo[] = [
      { inicio: '2026-01-01', fin: null },
      { inicio: '2026-04-01', fin: null }, // 90 días → clamp 40
    ];
    expect(largoPromedioCiclo(ps)).toBe(40);
  });
});

describe('estadoCiclo', () => {
  const ps: Periodo[] = [
    { inicio: '2026-06-01', fin: '2026-06-05' },
    { inicio: '2026-06-29', fin: null },
  ];
  it('día 1 = el inicio del último período', () => {
    const e = estadoCiclo(ps, d('2026-06-29'))!;
    expect(e.diaCiclo).toBe(1);
    expect(e.fase).toBe('menstrual');
    expect(e.enPeriodo).toBe(true);
  });
  it('fase folicular tras el período', () => {
    const e = estadoCiclo(ps, d('2026-07-08'))!; // día 10
    expect(e.diaCiclo).toBe(10);
    expect(e.fase).toBe('folicular');
  });
  it('fase lútea después de la ovulación', () => {
    const e = estadoCiclo(ps, d('2026-07-20'))!; // día 22, ovulación ~día 14
    expect(e.fase).toBe('lutea');
  });
  it('estima el próximo inicio y la ovulación', () => {
    const e = estadoCiclo(ps, d('2026-06-29'))!;
    expect(e.proximoInicio).toBe('2026-07-27'); // 29/06 + 28
    expect(e.ovulacionEstim).toBe('2026-07-13'); // 29/06 + (28-14)
  });
  it('null sin períodos', () => {
    expect(estadoCiclo([], d('2026-06-29'))).toBeNull();
  });
});

describe('faseDeFecha', () => {
  const ps: Periodo[] = [{ inicio: '2026-06-01', fin: '2026-06-05' }];
  it('marca los días del período como menstrual', () => {
    expect(faseDeFecha(ps, '2026-06-03', 28)).toBe('menstrual');
  });
  it('null si la fecha es anterior a todo período', () => {
    expect(faseDeFecha(ps, '2026-05-01', 28)).toBeNull();
  });
});

describe('marcasCiclo', () => {
  const ps: Periodo[] = [{ inicio: '2026-06-29', fin: '2026-07-03' }];
  it('marca los días reales del período', () => {
    const m = marcasCiclo(ps, '2026-06-28', '2026-07-31', 28);
    expect(m['2026-06-29']).toBe('periodo');
    expect(m['2026-07-03']).toBe('periodo');
    expect(m['2026-07-04']).toBeUndefined();
  });
  it('predice el próximo período y la ovulación', () => {
    const m = marcasCiclo(ps, '2026-06-28', '2026-08-15', 28);
    expect(m['2026-07-27']).toBe('pred'); // 29/06 + 28
    expect(m['2026-07-13']).toBe('ovulacion'); // 29/06 + 14
  });
});

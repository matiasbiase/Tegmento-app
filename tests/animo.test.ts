import { describe, it, expect } from 'vitest';
import { serie7dias, type RegAnimo } from '@/lib/animo';

const hoy = new Date('2026-06-12T15:00:00');

describe('serie7dias', () => {
  it('devuelve 7 días terminando en hoy', () => {
    const s = serie7dias([], hoy);
    expect(s).toHaveLength(7);
    expect(s[6].dia).toBe('2026-06-12');
    expect(s[0].dia).toBe('2026-06-06');
  });

  it('días sin registro quedan en null', () => {
    const s = serie7dias([], hoy);
    expect(s.every((d) => d.valor === null)).toBe(true);
  });

  it('promedia los estados del día (bien=1, masomenos=0, mal=-1)', () => {
    const regs: RegAnimo[] = [
      { estado: 'bien', creado: '2026-06-12T09:00:00' },
      { estado: 'mal', creado: '2026-06-12T20:00:00' },
    ];
    const s = serie7dias(regs, hoy);
    expect(s[6].valor).toBe(0); // (1 + -1)/2
  });

  it('un solo registro mal da -1', () => {
    const s = serie7dias([{ estado: 'mal', creado: '2026-06-11T10:00:00' }], hoy);
    expect(s[5].valor).toBe(-1);
  });

  it('ignora registros fuera de la ventana de 7 días', () => {
    const s = serie7dias([{ estado: 'bien', creado: '2026-06-01T10:00:00' }], hoy);
    expect(s.every((d) => d.valor === null)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { insightsFinanzas, type GastoInsight } from '@/lib/insight-finanzas';

const HOY = new Date(2026, 6, 23); // 23 de julio de 2026

function g(fecha: string, total: number, categoria: string | null = null, comercio: string | null = null): GastoInsight {
  return { fecha, total, moneda: 'EUR', categoria, comercio };
}

describe('insightsFinanzas', () => {
  it('con menos de 3 tickets en el mes no dice nada', () => {
    const gs = [g('2026-07-02', 10), g('2026-07-05', 20)];
    expect(insightsFinanzas(gs, HOY)).toEqual([]);
  });

  it('ignora los gastos sin total y con fecha rota', () => {
    const gs: GastoInsight[] = [
      { fecha: '2026-07-02', total: null, moneda: 'EUR', categoria: null, comercio: null },
      { fecha: 'sin fecha', total: 50, moneda: 'EUR', categoria: null, comercio: null },
      g('2026-07-05', 20),
    ];
    expect(insightsFinanzas(gs, HOY)).toEqual([]);
  });

  it('avisa del comercio al que volvés', () => {
    const gs = [
      g('2026-07-02', 10, 'super', 'Rewe'),
      g('2026-07-09', 20, 'super', 'Rewe'),
      g('2026-07-16', 30, 'super', 'Rewe'),
    ];
    const r = insightsFinanzas(gs, HOY);
    expect(r[0].tipo).toBe('comercio');
    expect(r[0].texto).toBe('Fuiste 3 veces a Rewe este mes: €60,00 en total.');
  });

  it('no habla de comercio si fuiste menos de 3 veces', () => {
    const gs = [g('2026-07-02', 10, null, 'Rewe'), g('2026-07-09', 20, null, 'Aldi'), g('2026-07-16', 30, null, 'Lidl')];
    expect(insightsFinanzas(gs, HOY).some((i) => i.tipo === 'comercio')).toBe(false);
  });

  it('marca la categoría que se lleva el mes', () => {
    const gs = [g('2026-07-02', 60, 'super'), g('2026-07-09', 20, 'super'), g('2026-07-16', 20, 'ocio')];
    const r = insightsFinanzas(gs, HOY);
    const cat = r.find((i) => i.tipo === 'categoria');
    expect(cat?.texto).toBe('El 80% de lo que gastaste en julio fue en súper: €80,00.');
  });

  it('una categoría que no conoce va tal cual', () => {
    const gs = [g('2026-07-02', 60, 'peluqueria'), g('2026-07-09', 20, 'peluqueria'), g('2026-07-16', 20, 'ocio')];
    const cat = insightsFinanzas(gs, HOY).find((i) => i.tipo === 'categoria');
    expect(cat?.texto).toContain('fue en peluqueria');
  });

  it('no marca categoría si ninguna llega al 40%', () => {
    const gs = [g('2026-07-02', 35, 'super'), g('2026-07-09', 35, 'ocio'), g('2026-07-16', 30, 'transporte')];
    expect(insightsFinanzas(gs, HOY).some((i) => i.tipo === 'categoria')).toBe(false);
  });

  it('compara contra el MISMO TRAMO del mes pasado, no contra el mes entero', () => {
    const gs = [
      // julio hasta el 23: 200
      g('2026-07-02', 100, 'super'), g('2026-07-09', 50, 'ocio'), g('2026-07-16', 50, 'transporte'),
      // junio del 1 al 23: 100. Lo del 28 de junio NO cuenta.
      g('2026-06-02', 40, 'super'), g('2026-06-09', 30, 'ocio'), g('2026-06-16', 30, 'transporte'),
      g('2026-06-28', 500, 'ocio'),
    ];
    const r = insightsFinanzas(gs, HOY, 3);
    const comp = r.find((i) => i.tipo === 'comparacion');
    // 200 vs 100 = 100 más (100%). Si contara junio entero (600) diría que va abajo.
    expect(comp?.texto).toBe('Vas €100,00 arriba de lo que llevabas a esta altura de junio (100% más).');
  });

  it('también avisa cuando vas gastando menos', () => {
    const gs = [
      g('2026-07-02', 20, 'super'), g('2026-07-09', 20, 'ocio'), g('2026-07-16', 10, 'transporte'),
      g('2026-06-02', 40, 'super'), g('2026-06-09', 30, 'ocio'), g('2026-06-16', 30, 'transporte'),
    ];
    const comp = insightsFinanzas(gs, HOY, 3).find((i) => i.tipo === 'comparacion');
    expect(comp?.texto).toBe('Vas €50,00 abajo de lo que llevabas a esta altura de junio (50% menos).');
  });

  it('no compara si la diferencia es chica', () => {
    const gs = [
      g('2026-07-02', 40, 'super'), g('2026-07-09', 30, 'ocio'), g('2026-07-16', 35, 'transporte'),
      g('2026-06-02', 40, 'super'), g('2026-06-09', 30, 'ocio'), g('2026-06-16', 30, 'transporte'),
    ];
    expect(insightsFinanzas(gs, HOY, 3).some((i) => i.tipo === 'comparacion')).toBe(false);
  });

  it('no compara si el mes pasado casi no hay datos', () => {
    const gs = [
      g('2026-07-02', 100, 'super'), g('2026-07-09', 50, 'ocio'), g('2026-07-16', 50, 'transporte'),
      g('2026-06-02', 10, 'super'),
    ];
    expect(insightsFinanzas(gs, HOY, 3).some((i) => i.tipo === 'comparacion')).toBe(false);
  });

  it('respeta el límite', () => {
    const gs = [
      g('2026-07-02', 100, 'super', 'Rewe'), g('2026-07-09', 50, 'super', 'Rewe'), g('2026-07-16', 50, 'super', 'Rewe'),
      g('2026-06-02', 20, 'super'), g('2026-06-09', 20, 'super'), g('2026-06-16', 20, 'super'),
    ];
    expect(insightsFinanzas(gs, HOY, 3)).toHaveLength(3);
    expect(insightsFinanzas(gs, HOY, 2)).toHaveLength(2);
  });

  it('usa el símbolo aunque el ticket haya guardado el código', () => {
    const gs: GastoInsight[] = [
      { fecha: '2026-07-02', total: 10, moneda: 'EUR', categoria: 'super', comercio: 'Rewe' },
      { fecha: '2026-07-09', total: 20, moneda: 'EUR', categoria: 'super', comercio: 'Rewe' },
      { fecha: '2026-07-16', total: 30, moneda: 'EUR', categoria: 'super', comercio: 'Rewe' },
    ];
    expect(insightsFinanzas(gs, HOY)[0].texto).toContain('€60,00');
  });
});

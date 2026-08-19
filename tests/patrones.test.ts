import { describe, it, expect } from 'vitest';
import {
  CASOS_MINIMOS,
  actividadLevantaAnimo,
  bajonSubeGasto,
  confianzaDe,
  detectarPatrones,
  suenoCortoBajaAnimo,
} from '@/lib/patrones';

describe('confianzaDe', () => {
  it('sube con la cantidad de casos', () => {
    expect(confianzaDe(3)).toBe('baja');
    expect(confianzaDe(5)).toBe('media');
    expect(confianzaDe(9)).toBe('alta');
  });
});

describe('suenoCortoBajaAnimo', () => {
  // Duerme ~8h de costumbre; los días de 5h el día siguiente cae.
  const suenos = [
    { fecha: '2026-07-01', minutos: 300 },
    { fecha: '2026-07-03', minutos: 300 },
    { fecha: '2026-07-05', minutos: 300 },
    { fecha: '2026-07-07', minutos: 480 },
    { fecha: '2026-07-09', minutos: 500 },
    { fecha: '2026-07-11', minutos: 490 },
  ];
  const animos = [
    { fecha: '2026-07-02', valor: 1 },
    { fecha: '2026-07-04', valor: 1 },
    { fecha: '2026-07-06', valor: 2 },
    { fecha: '2026-07-08', valor: 4 },
    { fecha: '2026-07-10', valor: 4 },
    { fecha: '2026-07-12', valor: 4 },
  ];

  it('lo encuentra cuando el día de después cae', () => {
    const p = suenoCortoBajaAnimo(suenos, animos);
    expect(p).not.toBeNull();
    expect(p!.cruce).toBe('Sueño · Ánimo');
    expect(p!.aciertos).toBe(3);
    expect(p!.casos).toBe(3);
    expect(p!.confianza).toBe('baja'); // 3 casos: se muestra, pero con pinzas
  });

  it('no dice nada si el ánimo del día siguiente no cae', () => {
    const parejo = animos.map((a) => ({ ...a, valor: 3 }));
    expect(suenoCortoBajaAnimo(suenos, parejo)).toBeNull();
  });

  it('no dice nada con menos casos que el mínimo', () => {
    expect(suenoCortoBajaAnimo(suenos.slice(0, CASOS_MINIMOS - 1), animos)).toBeNull();
  });

  it('mide contra TU media, no contra un número fijo', () => {
    // Duerme 5h siempre: 5h no es "dormir poco" para esta persona.
    const corto = suenos.map((s) => ({ ...s, minutos: 300 }));
    expect(suenoCortoBajaAnimo(corto, animos)).toBeNull();
  });
});

describe('bajonSubeGasto', () => {
  it('encuentra el gasto alto en los días de bajón', () => {
    const animos = [
      { fecha: '2026-07-01', valor: 1 },
      { fecha: '2026-07-05', valor: 1 },
      { fecha: '2026-07-09', valor: 1 },
      { fecha: '2026-07-11', valor: 4 },
    ];
    const gastos = [
      { fecha: '2026-07-01', total: 40 },
      { fecha: '2026-07-05', total: 38 },
      { fecha: '2026-07-09', total: 45 },
      { fecha: '2026-07-11', total: 8 },
      { fecha: '2026-07-12', total: 7 },
      { fecha: '2026-07-13', total: 9 },
    ];
    const p = bajonSubeGasto(animos, gastos);
    expect(p).not.toBeNull();
    expect(p!.casos).toBe(3);
    expect(p!.aciertos).toBe(3);
  });

  it('no inventa nada si gastás parecido siempre', () => {
    const animos = [
      { fecha: '2026-07-01', valor: 1 },
      { fecha: '2026-07-02', valor: 1 },
      { fecha: '2026-07-03', valor: 1 },
    ];
    const gastos = [
      { fecha: '2026-07-01', total: 10 },
      { fecha: '2026-07-02', total: 11 },
      { fecha: '2026-07-03', total: 9 },
    ];
    expect(bajonSubeGasto(animos, gastos)).toBeNull();
  });
});

describe('actividadLevantaAnimo', () => {
  const animos = [
    { fecha: '2026-07-01', valor: 4 },
    { fecha: '2026-07-03', valor: 4 },
    { fecha: '2026-07-05', valor: 4 },
    { fecha: '2026-07-02', valor: 1 },
    { fecha: '2026-07-04', valor: 1 },
    { fecha: '2026-07-06', valor: 1 },
  ];

  it('devuelve la actividad que coincide con los días buenos', () => {
    const marcas = [
      { fecha: '2026-07-01', titulo: 'Bouldering' },
      { fecha: '2026-07-03', titulo: 'Bouldering' },
      { fecha: '2026-07-05', titulo: 'Bouldering' },
    ];
    const p = actividadLevantaAnimo(marcas, animos);
    expect(p).not.toBeNull();
    expect(p!.datos.titulo).toBe('Bouldering');
  });

  it('se queda con la que tiene más evidencia atrás', () => {
    const marcas = [
      { fecha: '2026-07-01', titulo: 'Bouldering' },
      { fecha: '2026-07-03', titulo: 'Bouldering' },
      { fecha: '2026-07-05', titulo: 'Bouldering' },
      { fecha: '2026-07-01', titulo: 'Alemán' },
      { fecha: '2026-07-03', titulo: 'Alemán' },
    ];
    const p = actividadLevantaAnimo(marcas, animos);
    expect(p!.datos.titulo).toBe('Bouldering'); // Alemán tiene 2: ni se evalúa
  });

  it('ignora la actividad que no mueve la aguja', () => {
    const marcas = [
      { fecha: '2026-07-02', titulo: 'Trámites' },
      { fecha: '2026-07-04', titulo: 'Trámites' },
      { fecha: '2026-07-06', titulo: 'Trámites' },
    ];
    expect(actividadLevantaAnimo(marcas, animos)).toBeNull();
  });
});

describe('detectarPatrones', () => {
  it('sin datos no devuelve nada (y no explota)', () => {
    expect(detectarPatrones({ suenos: [], animos: [], gastos: [], marcas: [] })).toEqual([]);
  });

  it('ordena del más sólido al menos', () => {
    const patrones = detectarPatrones({
      suenos: [
        { fecha: '2026-07-01', minutos: 300 },
        { fecha: '2026-07-03', minutos: 300 },
        { fecha: '2026-07-05', minutos: 300 },
        { fecha: '2026-07-07', minutos: 500 },
        { fecha: '2026-07-09', minutos: 500 },
      ],
      animos: [
        { fecha: '2026-07-02', valor: 1 },
        { fecha: '2026-07-04', valor: 1 },
        { fecha: '2026-07-06', valor: 1 },
        { fecha: '2026-07-08', valor: 4 },
        { fecha: '2026-07-10', valor: 4 },
      ],
      gastos: [],
      marcas: [],
    });
    expect(patrones.length).toBeGreaterThan(0);
    for (let i = 1; i < patrones.length; i++) {
      expect(patrones[i - 1].peso).toBeGreaterThanOrEqual(patrones[i].peso);
    }
  });
});

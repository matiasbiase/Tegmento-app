import { describe, it, expect } from 'vitest';
import { parsearHoja, normalizarMes, normalizar, emparejar, fechasDelMes } from '@/lib/hoja';

const HOY = new Date(2026, 6, 23); // 23 de julio de 2026

describe('normalizar', () => {
  it('saca acentos, signos y mayúsculas', () => {
    expect(normalizar('Alemán TODOS los días')).toBe('aleman todos los dias');
    expect(normalizar('  Meditar  10 min.  ')).toBe('meditar 10 min');
  });
});

describe('normalizarMes', () => {
  it('lee el mes escrito', () => {
    expect(normalizarMes('Julio 2026')).toBe('2026-07');
    expect(normalizarMes('julio de 2026')).toBe('2026-07');
    expect(normalizarMes('DICIEMBRE 2025')).toBe('2025-12');
  });
  it('lee el mes en ISO', () => {
    expect(normalizarMes('2026-07')).toBe('2026-07');
    expect(normalizarMes('2026-7')).toBe('2026-07');
  });
  it('null si no se entiende', () => {
    expect(normalizarMes('el mes pasado')).toBeNull();
    expect(normalizarMes(null)).toBeNull();
    expect(normalizarMes('2026-13')).toBeNull();
  });
});

describe('parsearHoja', () => {
  it('parsea una hoja normal', () => {
    const r = parsearHoja(JSON.stringify({
      mes: 'Julio 2026',
      actividades: [{ titulo: 'Alemán', dias: [1, 2, 5] }, { titulo: 'Correr', dias: [3] }],
    }));
    expect(r?.mes).toBe('2026-07');
    expect(r?.filas).toEqual([
      { titulo: 'Alemán', dias: [1, 2, 5] },
      { titulo: 'Correr', dias: [3] },
    ]);
  });
  it('ordena y saca días repetidos o imposibles', () => {
    const r = parsearHoja(JSON.stringify({ mes: '2026-07', actividades: [{ titulo: 'X', dias: [5, 1, 5, 40, 0, -3] }] }));
    expect(r?.filas[0].dias).toEqual([1, 5]);
  });
  it('banca que los días vengan como strings', () => {
    const r = parsearHoja(JSON.stringify({ mes: '2026-07', actividades: [{ titulo: 'X', dias: ['3', '7'] }] }));
    expect(r?.filas[0].dias).toEqual([3, 7]);
  });
  it('una fila sin días es válida (esa actividad no se pintó)', () => {
    const r = parsearHoja(JSON.stringify({ mes: '2026-07', actividades: [{ titulo: 'X', dias: [] }] }));
    expect(r?.filas[0].dias).toEqual([]);
  });
  it('null si no es una hoja', () => {
    expect(parsearHoja(JSON.stringify({ esHoja: false }))).toBeNull();
  });
  it('null si el JSON está roto o vacío', () => {
    expect(parsearHoja('no soy json')).toBeNull();
    expect(parsearHoja(JSON.stringify({ actividades: [] }))).toBeNull();
  });
  it('sin mes legible, mes null (lo resuelve quien llama)', () => {
    const r = parsearHoja(JSON.stringify({ actividades: [{ titulo: 'X', dias: [1] }] }));
    expect(r?.mes).toBeNull();
  });
});

describe('emparejar', () => {
  const actividades = [
    { id: 1, titulo: 'Alemán todos los días' },
    { id: 2, titulo: 'Empezar a jugar al fútbol' },
    { id: 3, titulo: 'Meditar 10 min' },
  ];

  it('empareja exacto', () => {
    const r = emparejar([{ titulo: 'Meditar 10 min', dias: [4] }], actividades);
    expect(r.encontradas).toEqual([{ lineaId: 3, titulo: 'Meditar 10 min', dias: [4] }]);
    expect(r.sinReconocer).toEqual([]);
  });
  it('empareja aunque la foto se coma acentos y mayúsculas', () => {
    const r = emparejar([{ titulo: 'ALEMAN TODOS LOS DIAS', dias: [1] }], actividades);
    expect(r.encontradas[0].lineaId).toBe(1);
  });
  it('empareja por parcial cuando el papel dice menos', () => {
    const r = emparejar([{ titulo: 'Alemán', dias: [1, 2] }], actividades);
    expect(r.encontradas[0].lineaId).toBe(1);
  });
  it('no inventa: lo que no reconoce lo devuelve aparte', () => {
    const r = emparejar([{ titulo: 'Tocar la guitarra', dias: [1] }], actividades);
    expect(r.encontradas).toEqual([]);
    expect(r.sinReconocer).toEqual(['Tocar la guitarra']);
  });
  it('no usa dos veces la misma actividad', () => {
    const r = emparejar(
      [{ titulo: 'Alemán', dias: [1] }, { titulo: 'Alemán todos los días', dias: [2] }],
      actividades,
    );
    expect(r.encontradas).toHaveLength(1);
    expect(r.sinReconocer).toEqual(['Alemán todos los días']);
  });
});

describe('fechasDelMes', () => {
  it('arma las fechas del mes', () => {
    expect(fechasDelMes('2026-07', [1, 15], HOY)).toEqual(['2026-07-01', '2026-07-15']);
  });
  it('descarta días que no existen en ese mes', () => {
    expect(fechasDelMes('2026-02', [28, 30, 31], new Date(2026, 2, 5))).toEqual(['2026-02-28']);
  });
  it('descarta días que todavía no pasaron', () => {
    // Hoy es 23 de julio: el 24 no se pudo haber pintado en papel.
    expect(fechasDelMes('2026-07', [22, 23, 24, 31], HOY)).toEqual(['2026-07-22', '2026-07-23']);
  });
  it('un mes entero pasado entra completo', () => {
    expect(fechasDelMes('2026-06', [1, 30], HOY)).toEqual(['2026-06-01', '2026-06-30']);
  });
  it('mes con formato inválido, lista vacía', () => {
    expect(fechasDelMes('julio', [1], HOY)).toEqual([]);
  });
});

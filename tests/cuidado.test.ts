import { describe, it, expect } from 'vitest';
import { nivelCuidado, leerCuidado } from '@/lib/cuidado';

describe('nivelCuidado', () => {
  it('corta en tres niveles', () => {
    expect(nivelCuidado(0).nivel).toBe('bajo');
    expect(nivelCuidado(33).nivel).toBe('bajo');
    expect(nivelCuidado(34).nivel).toBe('medio');
    expect(nivelCuidado(66).nivel).toBe('medio');
    expect(nivelCuidado(67).nivel).toBe('alto');
    expect(nivelCuidado(100).nivel).toBe('alto');
  });
  it('cada nivel trae título, consejo y color', () => {
    const n = nivelCuidado(80);
    expect(n.titulo).toBe('Cuidado alto');
    expect(n.consejo.length).toBeGreaterThan(10);
    expect(n.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('clampea fuera de rango', () => {
    expect(nivelCuidado(-20).nivel).toBe('bajo');
    expect(nivelCuidado(500).nivel).toBe('alto');
  });
  it('un valor roto cae al medio, no explota', () => {
    expect(nivelCuidado(NaN).nivel).toBe('medio');
  });
});

describe('leerCuidado', () => {
  it('toma el campo nuevo', () => {
    expect(leerCuidado({ cuidado: 72 })).toBe(72);
  });
  it('acepta el nombre viejo de los análisis guardados', () => {
    expect(leerCuidado({ carga: 20 })).toBe(20);
  });
  it('el nuevo le gana al viejo si vienen los dos', () => {
    expect(leerCuidado({ cuidado: 80, carga: 10 })).toBe(80);
  });
  it('banca que la IA lo mande como string', () => {
    expect(leerCuidado({ cuidado: '45' })).toBe(45);
    expect(leerCuidado({ cuidado: 45.6 })).toBe(46);
  });
  it('clampea y redondea', () => {
    expect(leerCuidado({ cuidado: 140 })).toBe(100);
    expect(leerCuidado({ cuidado: -5 })).toBe(0);
  });
  it('sin nada usable, 50', () => {
    expect(leerCuidado({})).toBe(50);
    expect(leerCuidado({ cuidado: 'muy alto' })).toBe(50);
  });
});

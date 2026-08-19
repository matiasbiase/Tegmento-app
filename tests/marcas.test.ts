import { describe, it, expect } from 'vitest';
import { ymd, grillaDias, grillaMes, progresoMeta, puedeMarcar, racha, tocaHoy, vecesEsteDia } from '@/lib/marcas';

const HOY = new Date(2026, 6, 23); // jueves 23 de julio de 2026

describe('ymd', () => {
  it('formatea en local, sin correrse por zona horaria', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(ymd(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('grillaDias', () => {
  it('da 7 días terminando en hoy, del más viejo al más nuevo', () => {
    const g = grillaDias(HOY);
    expect(g).toHaveLength(7);
    expect(g[0].fecha).toBe('2026-07-17');
    expect(g[6].fecha).toBe('2026-07-23');
  });
  it('marca cuál es hoy', () => {
    const g = grillaDias(HOY);
    expect(g.filter((d) => d.esHoy)).toHaveLength(1);
    expect(g[6].esHoy).toBe(true);
  });
  it('solo hoy y ayer son editables', () => {
    const g = grillaDias(HOY);
    expect(g.filter((d) => d.editable).map((d) => d.fecha)).toEqual(['2026-07-22', '2026-07-23']);
  });
  it('cruza el fin de mes sin romperse', () => {
    const g = grillaDias(new Date(2026, 7, 2)); // 2 de agosto
    expect(g[0].fecha).toBe('2026-07-27');
    expect(g[6].fecha).toBe('2026-08-02');
  });
});

describe('grillaMes', () => {
  it('da el mes entero', () => {
    const g = grillaMes('2026-07', HOY);
    expect(g).toHaveLength(31);
    expect(g[0].fecha).toBe('2026-07-01');
    expect(g[30].fecha).toBe('2026-07-31');
  });
  it('sabe cuántos días tiene febrero, también bisiesto', () => {
    expect(grillaMes('2026-02', new Date(2026, 2, 5))).toHaveLength(28);
    expect(grillaMes('2028-02', new Date(2028, 2, 5))).toHaveLength(29);
  });
  it('acá sí se puede transcribir todo el mes pasado, no solo hoy y ayer', () => {
    const g = grillaMes('2026-06', HOY);
    expect(g.every((d) => d.editable)).toBe(true);
  });
  it('el futuro sigue bloqueado', () => {
    const g = grillaMes('2026-07', HOY);
    expect(g.find((d) => d.dia === 23)?.editable).toBe(true);
    expect(g.find((d) => d.dia === 24)?.editable).toBe(false);
    expect(g.find((d) => d.dia === 31)?.editable).toBe(false);
  });
  it('marca hoy', () => {
    expect(grillaMes('2026-07', HOY).filter((d) => d.esHoy)).toHaveLength(1);
  });
  it('mes inválido, lista vacía', () => {
    expect(grillaMes('2026-13', HOY)).toEqual([]);
    expect(grillaMes('julio', HOY)).toEqual([]);
  });
});

describe('puedeMarcar', () => {
  it('hoy y ayer sí', () => {
    expect(puedeMarcar('2026-07-23', HOY)).toBe(true);
    expect(puedeMarcar('2026-07-22', HOY)).toBe(true);
  });
  it('anteayer no', () => {
    expect(puedeMarcar('2026-07-21', HOY)).toBe(false);
  });
  it('el futuro nunca', () => {
    expect(puedeMarcar('2026-07-24', HOY)).toBe(false);
  });
});

describe('racha', () => {
  it('cuenta los días seguidos terminando hoy', () => {
    expect(racha(['2026-07-21', '2026-07-22', '2026-07-23'], HOY)).toBe(3);
  });
  it('si hoy no está marcado todavía, arranca desde ayer', () => {
    // A la mañana, antes de hacer la actividad, la racha no se rompe.
    expect(racha(['2026-07-20', '2026-07-21', '2026-07-22'], HOY)).toBe(3);
  });
  it('se corta en el primer día sin marcar', () => {
    expect(racha(['2026-07-19', '2026-07-21', '2026-07-22', '2026-07-23'], HOY)).toBe(3);
  });
  it('un solo día no es racha', () => {
    expect(racha(['2026-07-23'], HOY)).toBe(0);
    expect(racha(['2026-07-22'], HOY)).toBe(0);
  });
  it('sin nada marcado, 0', () => {
    expect(racha([], HOY)).toBe(0);
  });
  it('si cortaste hace tres días, no hay racha', () => {
    expect(racha(['2026-07-17', '2026-07-18', '2026-07-19'], HOY)).toBe(0);
  });
  it('acepta un Set', () => {
    expect(racha(new Set(['2026-07-22', '2026-07-23']), HOY)).toBe(2);
  });
});

describe('progresoMeta', () => {
  it('compara contra la meta que se puso, no contra los 7 días', () => {
    const p = progresoMeta(2, 2);
    expect(p.cumplida).toBe(true);
    expect(p.faltan).toBe(0);
    expect(p.meta).toBe(2);
  });

  it('cuenta lo que falta cuando todavía no llegó', () => {
    const p = progresoMeta(1, 3);
    expect(p.cumplida).toBe(false);
    expect(p.faltan).toBe(2);
  });

  it('pasarse de la meta no es un error: sigue cumplida y no falta nada', () => {
    const p = progresoMeta(5, 3);
    expect(p.cumplida).toBe(true);
    expect(p.faltan).toBe(0);
  });

  it('acota metas imposibles al rango de la semana', () => {
    expect(progresoMeta(0, 0).meta).toBe(1);
    expect(progresoMeta(0, 99).meta).toBe(7);
  });
});

describe('tocaHoy', () => {
  // HOY es jueves 23/07/2026. Los jueves anteriores: 16, 09, 02.
  it('con dos jueves anteriores, hoy toca', () => {
    expect(tocaHoy(['2026-07-16', '2026-07-09'], HOY)).toBe(true);
  });

  it('un solo jueves es casualidad, no patrón', () => {
    expect(tocaHoy(['2026-07-16'], HOY)).toBe(false);
  });

  it('no cuenta los otros días de la semana', () => {
    expect(tocaHoy(['2026-07-20', '2026-07-21', '2026-07-22'], HOY)).toBe(false);
  });

  it('la marca de hoy no cuenta como antecedente', () => {
    expect(tocaHoy(['2026-07-23', '2026-07-16'], HOY)).toBe(false);
  });

  it('cuenta cuántas veces cayó en este día', () => {
    expect(vecesEsteDia(['2026-07-16', '2026-07-09', '2026-07-20'], HOY)).toBe(2);
  });
});

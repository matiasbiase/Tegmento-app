import { describe, it, expect } from 'vitest';
import {
  cruceConSueno,
  cumplidasEn,
  normalizarHora,
  parsearPlan,
  seguisteElPlan,
  semanaDelPlan,
  type DiaDelPlan,
} from '@/lib/plan-alimentacion';

describe('normalizarHora', () => {
  it('rellena la hora con cero', () => {
    expect(normalizarHora('8:00')).toBe('08:00');
    expect(normalizarHora('13:30')).toBe('13:30');
  });

  it('acepta el punto, que es como lo escribe medio mundo', () => {
    expect(normalizarHora('20.30')).toBe('20:30');
  });

  it('rechaza lo que no es una hora', () => {
    expect(normalizarHora('25:00')).toBeNull();
    expect(normalizarHora('08:99')).toBeNull();
    expect(normalizarHora('avena')).toBeNull();
  });
});

describe('parsearPlan — el formato que se le pide', () => {
  it('lee el formato con barras', () => {
    const plan = parsearPlan(
      ['08:00 | Avena con fruta | 1 taza', '11:00 | Yogur y nueces', '13:30 | Proteína + verduras | pollo, pescado o legumbres'].join('\n'),
    );
    expect(plan).toHaveLength(3);
    expect(plan[0]).toEqual({ hora: '08:00', que: 'Avena con fruta', detalle: '1 taza' });
    expect(plan[1].detalle).toBeNull();
    expect(plan[2].detalle).toBe('pollo, pescado o legumbres');
  });

  it('ordena por hora aunque el modelo las devuelva desordenadas', () => {
    const plan = parsearPlan('20:30 | Cena liviana\n08:00 | Avena');
    expect(plan.map((c) => c.hora)).toEqual(['08:00', '20:30']);
  });
});

describe('parsearPlan — ⚠️ el parser tiene que ser FLOJO', () => {
  // El motivo está en el docstring: un parser estricto devuelve cero comidas
  // SIN ERROR, y eso se confunde con "no se pudo leer el plan".

  it('aguanta el guión que el modelo mete solo', () => {
    const plan = parsearPlan('08:00 - Avena con fruta');
    expect(plan).toEqual([{ hora: '08:00', que: 'Avena con fruta', detalle: null }]);
  });

  it('aguanta los dos puntos y las viñetas', () => {
    const plan = parsearPlan('- 11:00: Yogur y nueces\n• 17:00 — Fruta');
    expect(plan.map((c) => c.que)).toEqual(['Yogur y nueces', 'Fruta']);
  });

  it('saca el detalle del paréntesis', () => {
    const plan = parsearPlan('08:00 - Avena con fruta (1 taza)');
    expect(plan[0]).toEqual({ hora: '08:00', que: 'Avena con fruta', detalle: '1 taza' });
  });

  it('descarta el preámbulo sin descartar el plan', () => {
    const plan = parsearPlan('Claro, este es el plan que leí:\n\n08:00 | Avena\n20:30 | Cena liviana');
    expect(plan).toHaveLength(2);
  });

  it('⚠️ no inventa: un renglón sin hora no entra', () => {
    expect(parsearPlan('Tomar mucha agua durante el día')).toEqual([]);
    expect(parsearPlan('08:00 | ')).toEqual([]);
  });

  it('un texto vacío da una lista vacía, no explota', () => {
    expect(parsearPlan('')).toEqual([]);
    expect(parsearPlan('   \n  \n')).toEqual([]);
  });
});

describe('cumplidas y la semana', () => {
  const ids = [1, 2, 3, 4, 5];
  const marcas = [
    { comidaId: 1, fecha: '2026-08-04' },
    { comidaId: 2, fecha: '2026-08-04' },
    { comidaId: 1, fecha: '2026-08-03' },
  ];

  it('cuenta solo las de ese día', () => {
    expect(cumplidasEn(ids, marcas, '2026-08-04')).toBe(2);
    expect(cumplidasEn(ids, marcas, '2026-08-03')).toBe(1);
    expect(cumplidasEn(ids, marcas, '2026-08-02')).toBe(0);
  });

  it('una marca de una comida que ya no está en el plan no suma', () => {
    expect(cumplidasEn([3, 4], marcas, '2026-08-04')).toBe(0);
  });

  it('la semana son siete días, del más viejo a hoy, con hoy marcado', () => {
    const dias = semanaDelPlan(ids, marcas, new Date(2026, 7, 4), 7);
    expect(dias).toHaveLength(7);
    expect(dias[6].fecha).toBe('2026-08-04');
    expect(dias[6].esHoy).toBe(true);
    expect(dias[6].cumplidas).toBe(2);
    expect(dias[5].cumplidas).toBe(1);
    expect(dias[0].esHoy).toBe(false);
  });
});

describe('seguisteElPlan', () => {
  const dia = (cumplidas: number, total = 5): DiaDelPlan => ({
    fecha: '2026-08-04', inicial: 'M', cumplidas, total, esHoy: false,
  });

  it('la mitad alcanza', () => {
    expect(seguisteElPlan(dia(3))).toBe(true);
    expect(seguisteElPlan(dia(2))).toBe(false);
  });

  it('un plan sin comidas no se sigue ni se deja de seguir', () => {
    expect(seguisteElPlan(dia(0, 0))).toBe(false);
  });
});

describe('cruceConSueno — ⚠️ el que se calla cuando no sabe', () => {
  const dia = (fecha: string, cumplidas: number): DiaDelPlan => ({
    fecha, inicial: 'M', cumplidas, total: 4, esHoy: false,
  });

  // Ocho días: cuatro siguiendo el plan, cuatro no.
  const dias = [
    dia('2026-07-28', 4), dia('2026-07-29', 4), dia('2026-07-30', 3), dia('2026-07-31', 4),
    dia('2026-08-01', 0), dia('2026-08-02', 1), dia('2026-08-03', 0), dia('2026-08-04', 1),
  ];
  const sueno = [
    { fecha: '2026-07-28', minutos: 460 }, { fecha: '2026-07-29', minutos: 470 },
    { fecha: '2026-07-30', minutos: 450 }, { fecha: '2026-07-31', minutos: 460 },
    { fecha: '2026-08-01', minutos: 420 }, { fecha: '2026-08-02', minutos: 410 },
    { fecha: '2026-08-03', minutos: 425 }, { fecha: '2026-08-04', minutos: 425 },
  ];

  it('da la diferencia de promedios, en minutos', () => {
    const c = cruceConSueno(dias, sueno);
    expect(c?.minutos).toBe(40);
    expect(c?.diasConPlan).toBe(4);
    expect(c?.diasSinPlan).toBe(4);
  });

  it('⚠️ con pocos días de un lado se calla, no baja el umbral', () => {
    // Tres siguiendo el plan y cinco no: una noche mala movería el promedio
    // cuarenta minutos y la app afirmaría una anécdota.
    const pocos = [...dias.slice(0, 3), dia('2026-07-31', 0), ...dias.slice(4)];
    expect(cruceConSueno(pocos, sueno)).toBeNull();
  });

  it('los días sin sueño cargado no cuentan de ningún lado', () => {
    expect(cruceConSueno(dias, sueno.slice(0, 5))).toBeNull();
  });

  it('sin datos no afirma nada', () => {
    expect(cruceConSueno([], [])).toBeNull();
  });

  it('la diferencia puede ser negativa, y se informa igual', () => {
    const alReves = sueno.map((s) => ({ ...s, minutos: 900 - s.minutos }));
    expect(cruceConSueno(dias, alReves)?.minutos).toBe(-40);
  });
});

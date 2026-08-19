import { describe, it, expect } from 'vitest';
import { extraerMarcaPlan, limpiarMarcaPlan, PLAN_DIAS_DEFECTO } from '@/lib/plan-marca';

const HOY = new Date(2026, 7, 11); // 11/08/2026, local
const en = (dias: number) => {
  const d = new Date(2026, 7, 11 + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('extraerMarcaPlan · lo básico', () => {
  it('sin marca, null', () => {
    expect(extraerMarcaPlan('quiero volver a entrenar', HOY)).toBeNull();
  });

  it('⚠️ con la marca vacía también null: un objetivo sin título no tiene qué decir', () => {
    expect(extraerMarcaPlan('[+plan: ]', HOY)).toBeNull();
  });

  it('solo el qué: pone la fecha por defecto y ninguna actividad', () => {
    expect(extraerMarcaPlan('[+plan: volver a entrenar]', HOY)).toEqual({
      que: 'volver a entrenar',
      fecha: en(PLAN_DIAS_DEFECTO),
      actividades: [],
      area: null,
    });
  });

  it('la saca del texto para mostrarlo', () => {
    expect(limpiarMarcaPlan('Listo, te lo anoto. [+plan: leer más]')).toBe('Listo, te lo anoto.');
  });
});

describe('extraerMarcaPlan · la fecha', () => {
  it('respeta la que viene', () => {
    expect(extraerMarcaPlan('[+plan: entrenar | 2026-10-15]', HOY)?.fecha).toBe('2026-10-15');
  });

  it('⚠️ una fecha PASADA cae al default: un objetivo no puede nacer vencido', () => {
    // Si no, la tarjeta lo mostraría en rojo el primer día — la app retándote
    // por algo que acabás de crear.
    expect(extraerMarcaPlan('[+plan: entrenar | 2026-01-01]', HOY)?.fecha).toBe(en(PLAN_DIAS_DEFECTO));
  });

  it('una fecha absurda (el modelo erró el año) cae al default', () => {
    expect(extraerMarcaPlan('[+plan: entrenar | 2099-01-01]', HOY)?.fecha).toBe(en(PLAN_DIAS_DEFECTO));
  });

  it('hoy es una fecha válida', () => {
    expect(extraerMarcaPlan(`[+plan: entrenar | ${en(0)}]`, HOY)?.fecha).toBe(en(0));
  });

  it('algo que no es una fecha no se toma como fecha', () => {
    const r = extraerMarcaPlan('[+plan: entrenar | el mes que viene]', HOY);
    expect(r?.fecha).toBe(en(PLAN_DIAS_DEFECTO));
    // y no se pierde: cae como actividad, que es donde el modelo la puso
    expect(r?.actividades).toEqual(['el mes que viene']);
  });
});

describe('extraerMarcaPlan · las actividades', () => {
  it('las separa por coma', () => {
    expect(extraerMarcaPlan('[+plan: entrenar | 2026-10-15 | Bouldern, Correr]', HOY)?.actividades).toEqual([
      'Bouldern',
      'Correr',
    ]);
  });

  it('sin fecha pero con actividades, con el hueco del medio vacío', () => {
    const r = extraerMarcaPlan('[+plan: entrenar | | Bouldern]', HOY);
    expect(r?.fecha).toBe(en(PLAN_DIAS_DEFECTO));
    expect(r?.actividades).toEqual(['Bouldern']);
  });

  it('⚠️ aguanta que el modelo mande fecha y actividades al revés', () => {
    // La fecha se reconoce por su FORMA, no por su posición. Con tres campos,
    // desordenarlos es el error más probable.
    const r = extraerMarcaPlan('[+plan: entrenar | Bouldern, Correr | 2026-10-15]', HOY);
    expect(r?.fecha).toBe('2026-10-15');
    expect(r?.actividades).toEqual(['Bouldern', 'Correr']);
  });

  it('no repite la misma actividad, aunque cambie la capitalización', () => {
    expect(extraerMarcaPlan('[+plan: x | | Bouldern, bouldern, Correr]', HOY)?.actividades).toEqual([
      'Bouldern',
      'Correr',
    ]);
  });

  it('⚠️ corta en 4: más que eso no es un objetivo, es una lista', () => {
    const r = extraerMarcaPlan('[+plan: x | | a, b, c, d, e, f]', HOY);
    expect(r?.actividades).toHaveLength(4);
  });

  it('ignora los vacíos que deja una coma de más', () => {
    expect(extraerMarcaPlan('[+plan: x | | Bouldern, , Correr]', HOY)?.actividades).toEqual(['Bouldern', 'Correr']);
  });
});

describe('extraerMarcaPlan · el área', () => {
  it('sin área, null — y es una respuesta válida', () => {
    // Matías pidió que #plan pregunte el área CON la opción de ninguna: hay
    // cosas que uno se propone y no entran en la rueda.
    expect(extraerMarcaPlan('[+plan: entrenar]', HOY)?.area).toBeNull();
  });

  it('la lee del segmento marcado', () => {
    expect(extraerMarcaPlan('[+plan: entrenar | | | area: Salud física]', HOY)?.area).toBe('Salud física');
  });

  it('aguanta acento, mayúsculas y espacios raros', () => {
    expect(extraerMarcaPlan('[+plan: x | | | Área :  Vida social ]', HOY)?.area).toBe('Vida social');
  });

  it('⚠️ el área NO se cuela entre las actividades', () => {
    // Es la razón de que lleve prefijo: un nombre de área y uno de actividad son
    // los dos texto libre, y adivinar mal inventaría una actividad "Finanzas".
    const r = extraerMarcaPlan('[+plan: x | | Bouldern, Correr | area: Salud física]', HOY);
    expect(r?.actividades).toEqual(['Bouldern', 'Correr']);
    expect(r?.area).toBe('Salud física');
  });

  it('funciona en cualquier posición, como la fecha', () => {
    const r = extraerMarcaPlan('[+plan: x | area: Finanzas | 2026-10-15 | Ahorrar]', HOY);
    expect(r?.area).toBe('Finanzas');
    expect(r?.fecha).toBe('2026-10-15');
    expect(r?.actividades).toEqual(['Ahorrar']);
  });

  it('"area:" vacío es lo mismo que no ponerlo', () => {
    expect(extraerMarcaPlan('[+plan: x | | | area: ]', HOY)?.area).toBeNull();
  });
});

describe('extraerMarcaPlan · higiene del texto', () => {
  it('normaliza los espacios y recorta un título larguísimo', () => {
    const largo = 'a'.repeat(200);
    const r = extraerMarcaPlan(`[+plan:   volver   a  entrenar ${largo}]`, HOY);
    expect(r!.que.startsWith('volver a entrenar')).toBe(true);
    expect(r!.que.length).toBeLessThanOrEqual(90);
  });

  it('la encuentra en el medio de un mensaje', () => {
    const r = extraerMarcaPlan('Dale, te lo dejo anotado.\n[+plan: leer más | | Leer]\n¿Te sirve así?', HOY);
    expect(r?.que).toBe('leer más');
    expect(r?.actividades).toEqual(['Leer']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cuentaParaPatron,
  episodiosQueYaAlcanzan,
  esVigente,
  MINIMO_PARA_PATRON,
  mismoHecho,
  paraElChat,
  similitud,
  trasVeredicto,
  type Hecho,
} from '@/lib/cerebro-hechos';

function hecho(p: Partial<Hecho> = {}): Hecho {
  return {
    id: 1,
    tipo: 'episodio',
    contenido: 'algo',
    porque: null,
    areaId: null,
    estado: 'no_confirmado',
    origen: 'chat',
    cuando: '2026-08-13',
    vence: null,
    saleDe: [],
    ...p,
  };
}

describe('vigencia', () => {
  it('sin vencimiento, vale siempre', () => {
    expect(esVigente({ vence: null }, '2030-01-01')).toBe(true);
  });

  it('vencido deja de valer', () => {
    expect(esVigente({ vence: '2026-08-01' }, '2026-08-13')).toBe(false);
    expect(esVigente({ vence: '2026-09-01' }, '2026-08-13')).toBe(true);
  });
});

describe('qué episodio cuenta para armar un patrón', () => {
  it('⚠️ sin el "por qué" NO cuenta, aunque el dato esté', () => {
    // Es la regla que obliga al bot a preguntar: una coincidencia registrada
    // sin explicación no puede convertirse en un patrón.
    expect(cuentaParaPatron(hecho({ porque: null }))).toBe(false);
    expect(cuentaParaPatron(hecho({ porque: '   ' }))).toBe(false);
    expect(cuentaParaPatron(hecho({ porque: 'hablaron del trabajo' }))).toBe(true);
  });

  it('lo descartado no cuenta ni con explicación', () => {
    expect(cuentaParaPatron(hecho({ porque: 'algo', estado: 'descartado' }))).toBe(false);
  });

  it('un patrón no cuenta como episodio de otro patrón', () => {
    expect(cuentaParaPatron(hecho({ tipo: 'patron', porque: 'algo' }))).toBe(false);
  });
});

describe('cuándo nace un patrón', () => {
  const conPorque = (id: number) => hecho({ id, porque: 'hablaron del trabajo' });

  it('con menos de tres, no nace', () => {
    expect(episodiosQueYaAlcanzan([conPorque(1), conPorque(2)])).toEqual([]);
    expect(MINIMO_PARA_PATRON).toBe(3);
  });

  it('con tres, nace y devuelve de cuáles salió', () => {
    const r = episodiosQueYaAlcanzan([conPorque(1), conPorque(2), conPorque(3)]);
    expect(r.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('tres episodios SIN explicación no alcanzan', () => {
    const sin = [hecho({ id: 1 }), hecho({ id: 2 }), hecho({ id: 3 })];
    expect(episodiosQueYaAlcanzan(sin)).toEqual([]);
  });
});

describe('qué le llega al bot en cada charla', () => {
  const ahora = '2026-08-13';

  it('⚠️ lo que él confirmó va PRIMERO, antes que lo que dedujo la app', () => {
    const deducido = hecho({ id: 1, tipo: 'patron', estado: 'no_confirmado' });
    const confirmado = hecho({ id: 2, tipo: 'patron', estado: 'confirmado' });
    expect(paraElChat([deducido, confirmado], ahora).map((h) => h.id)).toEqual([2, 1]);
  });

  it('⚠️ lo descartado NO vuelve nunca, aunque el modelo insista', () => {
    const no = hecho({ id: 1, estado: 'descartado', contenido: 'te enojás cuando entrenás poco' });
    expect(paraElChat([no], ahora)).toEqual([]);
  });

  it('lo vencido tampoco entra', () => {
    expect(paraElChat([hecho({ vence: '2026-08-01' })], ahora)).toEqual([]);
  });

  it('dentro del mismo estado, los patrones antes que los episodios', () => {
    const ep = hecho({ id: 1, tipo: 'episodio', estado: 'confirmado' });
    const pat = hecho({ id: 2, tipo: 'patron', estado: 'confirmado' });
    expect(paraElChat([ep, pat], ahora).map((h) => h.id)).toEqual([2, 1]);
  });

  it('a igual peso, lo más nuevo primero', () => {
    const viejo = hecho({ id: 1, tipo: 'patron', estado: 'confirmado', cuando: '2026-07-01' });
    const nuevo = hecho({ id: 2, tipo: 'patron', estado: 'confirmado', cuando: '2026-08-10' });
    expect(paraElChat([viejo, nuevo], ahora).map((h) => h.id)).toEqual([2, 1]);
  });

  it('respeta el tope, para no comerse el contexto del modelo', () => {
    const muchos = Array.from({ length: 30 }, (_, i) => hecho({ id: i }));
    expect(paraElChat(muchos, ahora, 12)).toHaveLength(12);
  });
});

describe('no duplicar el mismo hecho', () => {
  it('ignora mayúsculas, tildes y puntuación', () => {
    expect(mismoHecho('Dormís mal los domingos.', 'dormis mal los domingos')).toBe(true);
  });

  it('⚠️⚠️ el caso real del 13/08: el modelo reformuló y se coló un duplicado', () => {
    // Dos corridas seguidas del Analista escribieron esto. Comparando exacto
    // pasaban como hechos distintos, y cada lunes habría agregado una versión
    // nueva de la misma idea.
    const a = 'Los días en los que te rodeás de gente o compartís actividades sociales, tu ánimo suele estar entre bien y genial.';
    const b = 'Los días en que te rodeás de gente o compartís actividades sociales, tu ánimo suele estar entre bien y genial.';
    expect(mismoHecho(a, b)).toBe(true);
  });

  it('⚠️ pero NO junta dos que comparten casi todas las palabras y dicen cosas distintas', () => {
    expect(mismoHecho('dormís mal los domingos', 'dormís mal los lunes')).toBe(false);
    expect(mismoHecho('tu ánimo sube cuando ves amigos', 'tu ánimo baja cuando ves amigos')).toBe(false);
  });

  it('la similitud va de 0 a 1 y no revienta con vacíos', () => {
    expect(similitud('hola mundo', 'hola mundo')).toBe(1);
    expect(similitud('', 'algo')).toBe(0);
    expect(similitud('nada que ver', 'otra cosa distinta')).toBeLessThan(0.3);
  });
});

describe('el veredicto de él', () => {
  it('⚠️ confirmar limpia el vencimiento: deja de ser una deducción con fecha', () => {
    const r = trasVeredicto(hecho({ vence: '2026-09-01' }), 'confirmado');
    expect(r.estado).toBe('confirmado');
    expect(r.vence).toBeNull();
  });

  it('descartar no borra: saber que NO le pasa es información', () => {
    const r = trasVeredicto(hecho(), 'descartado');
    expect(r.estado).toBe('descartado');
    expect(r.contenido).toBe('algo');
  });
});

import { describe, it, expect } from 'vitest';
import {
  ID_MANANA,
  ID_NOCHE,
  avisoDe,
  avisosDelRitual,
  comoTexto,
  debeAvisar,
  desdeTexto,
  horaValida,
  idsACancelar,
  leerRitual,
  RITUAL_APAGADO,
  type EstadoRitual,
} from '@/lib/ritual';

const PRENDIDO: EstadoRitual = {
  activo: true,
  manana: { hora: 8, minuto: 30 },
  noche: { hora: 22, minuto: 0 },
};

const NADA = { sueno: false, animo: false };
const TODO = { sueno: true, animo: true };

describe('leerRitual — ⚠️ ante la duda, apagado', () => {
  it('lee lo guardado', () => {
    expect(leerRitual(JSON.stringify(PRENDIDO))).toEqual(PRENDIDO);
  });

  it('sin nada guardado, apagado', () => {
    expect(leerRitual(null)).toEqual(RITUAL_APAGADO);
    expect(leerRitual('')).toEqual(RITUAL_APAGADO);
  });

  it('con un JSON roto, apagado — nunca avisar de más', () => {
    expect(leerRitual('{no es json')).toEqual(RITUAL_APAGADO);
  });

  it('`activo` tiene que ser true de verdad, no algo que parezca', () => {
    expect(leerRitual('{"activo":"si"}').activo).toBe(false);
    expect(leerRitual('{"activo":1}').activo).toBe(false);
  });

  it('una hora rota vuelve al default en vez de romper el aviso', () => {
    const r = leerRitual('{"activo":true,"manana":{"hora":99,"minuto":0}}');
    expect(r.manana).toEqual({ hora: 8, minuto: 30 });
    expect(r.activo).toBe(true);
  });
});

describe('horaValida', () => {
  it('acepta las horas del día', () => {
    expect(horaValida({ hora: 0, minuto: 0 })).toBe(true);
    expect(horaValida({ hora: 23, minuto: 59 })).toBe(true);
  });

  it('rechaza lo que no es una hora', () => {
    expect(horaValida({ hora: 24, minuto: 0 })).toBe(false);
    expect(horaValida({ hora: -1, minuto: 0 })).toBe(false);
    expect(horaValida({ hora: 8, minuto: 60 })).toBe(false);
    expect(horaValida({ hora: 8.5, minuto: 0 })).toBe(false);
    expect(horaValida(null)).toBe(false);
    expect(horaValida('22:00')).toBe(false);
  });
});

describe('debeAvisar — no avisar de lo que ya hiciste', () => {
  it('con el día vacío, avisan los dos', () => {
    expect(debeAvisar('manana', NADA)).toBe(true);
    expect(debeAvisar('noche', NADA)).toBe(true);
  });

  it('⚠️ con el sueño ya marcado, la de la mañana no va', () => {
    // Un recordatorio para algo que ya hiciste enseña a ignorar los
    // recordatorios, y de eso no se vuelve.
    expect(debeAvisar('manana', { sueno: true, animo: false })).toBe(false);
    expect(debeAvisar('noche', { sueno: true, animo: false })).toBe(true);
  });

  it('cada momento mira SU dato, no el del otro', () => {
    expect(debeAvisar('noche', { sueno: false, animo: true })).toBe(false);
    expect(debeAvisar('manana', { sueno: false, animo: true })).toBe(true);
  });
});

describe('avisosDelRitual', () => {
  it('apagado no programa nada, aunque falte todo', () => {
    expect(avisosDelRitual(RITUAL_APAGADO, NADA)).toEqual([]);
  });

  it('prendido y con el día vacío, los dos avisos', () => {
    const avisos = avisosDelRitual(PRENDIDO, NADA);
    expect(avisos.map((a) => a.id)).toEqual([ID_MANANA, ID_NOCHE]);
    expect(avisos[0].hora).toEqual({ hora: 8, minuto: 30 });
    expect(avisos[1].hora).toEqual({ hora: 22, minuto: 0 });
  });

  it('con todo cargado no queda ninguno', () => {
    expect(avisosDelRitual(PRENDIDO, TODO)).toEqual([]);
  });

  it('usa las horas que él eligió, no las de fábrica', () => {
    const mio = { ...PRENDIDO, manana: { hora: 6, minuto: 15 }, noche: { hora: 23, minuto: 45 } };
    const avisos = avisosDelRitual(mio, NADA);
    expect(avisos[0].hora).toEqual({ hora: 6, minuto: 15 });
    expect(avisos[1].hora).toEqual({ hora: 23, minuto: 45 });
  });
});

describe('idsACancelar — ⚠️ lo que NO se programa hay que cancelarlo', () => {
  // Sin esto, el aviso salteado sigue encolado de la vez anterior y se dispara
  // igual. Es el bug clásico de los recordatorios: el que hace que la gente los
  // apague para siempre.

  it('con los dos programados, no se cancela nada', () => {
    expect(idsACancelar(avisosDelRitual(PRENDIDO, NADA))).toEqual([]);
  });

  it('si la mañana se saltea, su id se cancela', () => {
    const avisos = avisosDelRitual(PRENDIDO, { sueno: true, animo: false });
    expect(idsACancelar(avisos)).toEqual([ID_MANANA]);
  });

  it('con el ritual apagado se cancelan los dos', () => {
    expect(idsACancelar(avisosDelRitual(RITUAL_APAGADO, NADA))).toEqual([ID_MANANA, ID_NOCHE]);
  });
});

describe('el texto — ⚠️ no afirma nada sobre tu día', () => {
  // Una notificación se programa por adelantado: cuando se escribe no se sabe
  // qué vas a haber cargado. Decir "te falta el ánimo" y que resulte que lo
  // cargaste es la app mintiendo en la pantalla de bloqueo.

  it('ninguno de los dos textos dice qué te falta ni cuánto hace', () => {
    for (const m of ['manana', 'noche'] as const) {
      const a = avisoDe(m, { hora: 9, minuto: 0 });
      const texto = `${a.titulo} ${a.cuerpo}`.toLowerCase();
      expect(texto).not.toMatch(/te falta|no cargaste|hace \d+ d[íi]a|racha|llev[áa]s/);
      expect(a.titulo.length).toBeGreaterThan(0);
      expect(a.cuerpo.length).toBeGreaterThan(0);
    }
  });

  it('los ids son fijos, para que iOS reemplace en vez de encolar', () => {
    expect(avisoDe('manana', { hora: 1, minuto: 0 }).id).toBe(ID_MANANA);
    expect(avisoDe('noche', { hora: 1, minuto: 0 }).id).toBe(ID_NOCHE);
    expect(ID_MANANA).not.toBe(ID_NOCHE);
  });
});

describe('comoTexto y desdeTexto', () => {
  it('van y vuelven', () => {
    expect(comoTexto({ hora: 8, minuto: 30 })).toBe('08:30');
    expect(comoTexto({ hora: 22, minuto: 0 })).toBe('22:00');
    expect(desdeTexto('08:30')).toEqual({ hora: 8, minuto: 30 });
    expect(desdeTexto('8:30')).toEqual({ hora: 8, minuto: 30 });
  });

  it('lo que no es una hora devuelve null', () => {
    expect(desdeTexto('25:00')).toBeNull();
    expect(desdeTexto('mañana')).toBeNull();
    expect(desdeTexto('')).toBeNull();
  });
});

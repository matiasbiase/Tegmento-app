import { describe, expect, it } from 'vitest';
import { lecturasCerebro, type DatosCerebro } from '@/lib/cerebro';

const VACIO: DatosCerebro = { suenos: [], checkins: [], diasMarcados: 0 };

const checkin = (estado: string, factores: string[] = [], palabras: string[] = []) => ({
  estado,
  factores,
  palabras,
});

describe('lecturasCerebro', () => {
  it('sin datos no inventa nada', () => {
    expect(lecturasCerebro(VACIO)).toEqual([]);
  });

  // Lo importante de este archivo: el umbral existe para no afirmar de más.
  it('no habla de cortisol con dos noches cortas', () => {
    const r = lecturasCerebro({ ...VACIO, suenos: [300, 320, 480, 500] });
    expect(r).toEqual([]);
  });

  it('habla de cortisol con tres noches cortas, y cuenta solo las cargadas', () => {
    const r = lecturasCerebro({ ...VACIO, suenos: [300, 320, 340, 480, null, null] });
    expect(r).toHaveLength(1);
    expect(r[0].sustancia).toBe('Cortisol');
    // 4 noches cargadas, no 6: las que no anotó no cuentan como nada.
    expect(r[0].dato).toContain('3 de las últimas 4');
  });

  it('6 horas justas no es noche corta', () => {
    const r = lecturasCerebro({ ...VACIO, suenos: [360, 360, 360] });
    expect(r).toEqual([]);
  });

  it('si no hay sueño cargado, el cortisol puede salir por las palabras', () => {
    const r = lecturasCerebro({
      ...VACIO,
      checkins: [checkin('bajon', [], ['Estresado']), checkin('neutral', [], ['Ansioso']), checkin('bajon', [], ['Estresado'])],
    });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('cortisol-palabras');
  });

  it('nunca saca las dos lecturas de cortisol juntas: es el mismo tema', () => {
    const r = lecturasCerebro({
      suenos: [300, 300, 300],
      checkins: [checkin('bajon', [], ['Estresado']), checkin('bajon', [], ['Ansioso']), checkin('bajon', [], ['Estresado'])],
      diasMarcados: 0,
    });
    expect(r.filter((l) => l.sustancia === 'Cortisol')).toHaveLength(1);
    expect(r[0].id).toBe('cortisol-sueno');
  });

  it('la oxitocina pide que los días con gente hayan sido buenos', () => {
    // Dos días con amigos pero marcados como bajón: no hay patrón que contar.
    const malos = lecturasCerebro({
      ...VACIO,
      checkins: [checkin('bajon', ['Amigos']), checkin('bajon', ['Familia'])],
    });
    expect(malos).toEqual([]);

    const buenos = lecturasCerebro({
      ...VACIO,
      checkins: [checkin('bien', ['Amigos']), checkin('genial', ['Familia', 'Trabajo'])],
    });
    expect(buenos).toHaveLength(1);
    expect(buenos[0].sustancia).toBe('Oxitocina');
  });

  it('un factor no social no dispara oxitocina', () => {
    const r = lecturasCerebro({
      ...VACIO,
      checkins: [checkin('bien', ['Trabajo']), checkin('genial', ['Dinero'])],
    });
    expect(r).toEqual([]);
  });

  it('la dopamina sale con 4 días marcados, no con 3', () => {
    expect(lecturasCerebro({ ...VACIO, diasMarcados: 3 })).toEqual([]);
    const r = lecturasCerebro({ ...VACIO, diasMarcados: 4 });
    expect(r).toHaveLength(1);
    expect(r[0].sustancia).toBe('Dopamina');
  });

  it('ninguna lectura muestra un nivel ni un número de hormona', () => {
    const r = lecturasCerebro({
      suenos: [300, 300, 300],
      checkins: [checkin('bien', ['Amigos']), checkin('genial', ['Pareja'])],
      diasMarcados: 6,
    });
    expect(r).toHaveLength(3);
    for (const l of r) {
      // El "suele" es siempre condicional y nunca afirma una medición.
      expect(l.suele).toMatch(/suele[nu]?\b/);
      expect(l.suele).not.toMatch(/\b(alto|bajo|medio)\b.*\b(nivel|niveles)\b/i);
      expect(l.suele).not.toMatch(/\d+\s*(%|ng|mg|pg)/);
    }
  });
});

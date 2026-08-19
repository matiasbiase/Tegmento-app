import { describe, it, expect } from 'vitest';
import { armarDisparadores, type DatosDisparadores } from '@/lib/disparadores';

const VACIO: DatosDisparadores = {
  patronesConfirmados: [],
  actividades: [],
  factoresRecientes: [],
  diasSinSueno: null,
};

describe('armarDisparadores', () => {
  it('sin datos no inventa nada: la página completa con las de siempre', () => {
    expect(armarDisparadores(VACIO)).toEqual([]);
  });

  it('lo primero es un patrón que él mismo confirmó', () => {
    const d = armarDisparadores({
      ...VACIO,
      patronesConfirmados: ['Los días que vas a boulder tu ánimo aparece mejor'],
    });
    expect(d[0].texto).toContain('confirmaste');
    expect(d[0].prompt).toContain('boulder');
  });

  it('pregunta por la meta solo si arrancó y le falta', () => {
    const arrancada = armarDisparadores({
      ...VACIO,
      actividades: [{ titulo: 'Bouldern', meta: 3, hechos: 1 }],
    });
    expect(arrancada[0].texto).toBe('Te faltan 2 de 3 de bouldern');

    // Ya la cumplió: no hay nada que preguntar.
    const cumplida = armarDisparadores({ ...VACIO, actividades: [{ titulo: 'Bouldern', meta: 3, hechos: 3 }] });
    expect(cumplida).toEqual([]);

    // En cero: preguntar sonaría a reproche.
    const enCero = armarDisparadores({ ...VACIO, actividades: [{ titulo: 'Bouldern', meta: 3, hechos: 0 }] });
    expect(enCero).toEqual([]);
  });

  it('usa la concordancia bien cuando falta uno solo', () => {
    const d = armarDisparadores({ ...VACIO, actividades: [{ titulo: 'Fútbol', meta: 2, hechos: 1 }] });
    expect(d[0].texto).toBe('Te falta 1 de 2 de fútbol');
  });

  it('nombra el factor que se repite en el ánimo', () => {
    const d = armarDisparadores({
      ...VACIO,
      factoresRecientes: ['Dinero', 'Identidad', 'Dinero', 'Familia'],
    });
    expect(d[0].texto).toBe('Dinero viene apareciendo seguido');
  });

  it('un factor que apareció una sola vez no es un patrón', () => {
    expect(armarDisparadores({ ...VACIO, factoresRecientes: ['Dinero'] })).toEqual([]);
  });

  it('avisa el hueco de sueño recién a los 3 días, y sin culpa', () => {
    expect(armarDisparadores({ ...VACIO, diasSinSueno: 2 })).toEqual([]);
    const d = armarDisparadores({ ...VACIO, diasSinSueno: 4 });
    expect(d[0].texto).toBe('Hace 4 días que no anotás cómo dormís');
  });

  it('recorta el patrón largo sin cortar una palabra al medio', () => {
    const largo = 'Las semanas en las que registrás muchos gastos seguidos coinciden con un ánimo bastante más apagado';
    const d = armarDisparadores({ ...VACIO, patronesConfirmados: [largo] });
    expect(d[0].texto.length).toBeLessThanOrEqual(48);
    expect(d[0].texto.endsWith('…')).toBe(true);
    // el prompt sí lleva la frase entera
    expect(d[0].prompt).toContain(largo);
  });
});

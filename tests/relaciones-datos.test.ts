import { describe, expect, it } from 'vitest';
import {
  animoVersusFactores,
  esBuenDia,
  NOCHE_CORTA_MIN,
  suenoVersusAnimo,
  type CheckinAnimo,
  type Noche,
} from '@/lib/relaciones-datos';

const corta = (dia: string): Noche => ({ dia, minutos: NOCHE_CORTA_MIN - 60 });
const larga = (dia: string): Noche => ({ dia, minutos: NOCHE_CORTA_MIN + 120 });
const animo = (dia: string, estado: string, factores: string[] = []): CheckinAnimo => ({ dia, estado, factores });

describe('qué cuenta como buen día', () => {
  it('genial y bien sí; neutral y bajón no', () => {
    expect(esBuenDia('genial')).toBe(true);
    expect(esBuenDia('bien')).toBe(true);
    expect(esBuenDia('neutral')).toBe(false);
    expect(esBuenDia('bajon')).toBe(false);
  });

  it('un estado desconocido no rompe', () => {
    expect(esBuenDia('cualquiera')).toBe(false);
  });
});

describe('sueño → ánimo', () => {
  it('⚠️ pasa el filtro de sesgos, porque se registran en momentos distintos', () => {
    // Es la diferencia con los factores del check-in: acá el orden temporal es
    // real y no declarado, así que el cruce puede sostener algo.
    const noches = [corta('01'), corta('02'), corta('03'), larga('04'), larga('05'), larga('06'), larga('07')];
    const checkins = [
      animo('01', 'bajon'),
      animo('02', 'bajon'),
      animo('03', 'bien'),
      animo('04', 'bien'),
      animo('05', 'genial'),
      animo('06', 'bien'),
      animo('07', 'neutral'),
    ];
    const r = suenoVersusAnimo(noches, checkins);
    expect(r).not.toBeNull();
    expect(r!.casos).toBe(3);
    expect(r!.texto).toContain('3 noches');
    expect(r!.texto).toContain('2 días');
  });

  it('sin ánimo ese día, la noche no cuenta', () => {
    const r = suenoVersusAnimo([corta('01'), corta('02'), corta('03')], []);
    expect(r).toBeNull();
  });

  it('con pocas noches cortas devuelve null, no una frase floja', () => {
    const noches = [corta('01'), larga('02'), larga('03'), larga('04')];
    const checkins = [animo('01', 'bajon'), animo('02', 'bien'), animo('03', 'bien'), animo('04', 'genial')];
    expect(suenoVersusAnimo(noches, checkins)).toBeNull();
  });

  it('⚠️ si TODAS las noches cortas dieron mal, se rechaza igual: el 100% no existe', () => {
    const noches = [corta('01'), corta('02'), corta('03'), larga('04'), larga('05'), larga('06'), larga('07')];
    const checkins = [
      animo('01', 'bajon'),
      animo('02', 'bajon'),
      animo('03', 'bajon'),
      animo('04', 'bien'),
      animo('05', 'bien'),
      animo('06', 'genial'),
      animo('07', 'bien'),
    ];
    expect(suenoVersusAnimo(noches, checkins)).toBeNull();
  });
});

describe('ánimo × factores', () => {
  it('⚠️⚠️ los rechaza TODOS, porque el factor y el ánimo se eligen juntos', () => {
    // Este es el resultado esperado con los datos de hoy, y el test existe para
    // fijarlo: el día que los factores se registren aparte del ánimo, este test
    // va a fallar — y esa falla va a ser la buena noticia.
    const checkins = [
      animo('01', 'bien', ['Amigos']),
      animo('02', 'bien', ['Amigos']),
      animo('03', 'genial', ['Amigos']),
      animo('04', 'bajon', ['Trabajo']),
      animo('05', 'neutral', ['Trabajo']),
      animo('06', 'bien', ['Familia']),
    ];
    const { relaciones, rechazados } = animoVersusFactores(checkins);
    expect(relaciones).toEqual([]);
    expect(rechazados.every((r) => r.motivo === 'mismo-acto')).toBe(true);
  });

  it('devuelve el motivo de cada rechazo, para poder decírselo', () => {
    const { rechazados } = animoVersusFactores([animo('01', 'bien', ['Amigos'])]);
    expect(rechazados).toEqual([{ etiqueta: 'Amigos', motivo: 'mismo-acto' }]);
  });

  it('sin factores marcados no inventa nada', () => {
    const { relaciones, rechazados } = animoVersusFactores([animo('01', 'bien'), animo('02', 'bajon')]);
    expect(relaciones).toEqual([]);
    expect(rechazados).toEqual([]);
  });
});

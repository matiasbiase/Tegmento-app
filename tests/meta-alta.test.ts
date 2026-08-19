import { describe, it, expect } from 'vitest';
import { fraseMetaAlta, metaDemasiadoAlta, semanasDe } from '@/lib/meta-alta';

const sem = (...n: number[]) => n.map((hechos) => ({ hechos }));

describe('metaDemasiadoAlta — cuándo SÍ', () => {
  it('el caso de Matías: se puso 7 y viene haciendo 3', () => {
    const m = metaDemasiadoAlta(7, sem(3, 2, 3));
    expect(m).toEqual({ sugerida: 3, tipico: 3 });
  });

  it('propone lo que YA hace, no un número inventado', () => {
    // Proponer "bajala a 5" cuando hace 2 sería repetir el mismo error más chico.
    expect(metaDemasiadoAlta(7, sem(2, 2, 1))?.sugerida).toBe(2);
  });

  it('una semana buena suelta no le gana a la mediana', () => {
    // Con promedio, un 5 suelto subiría el número (2,3) y la meta nueva
    // volvería a nacer incumplida. Con mediana queda en lo que hace de verdad.
    // (Una semana COMPLETA es otra cosa y la corta antes: ver el test de abajo.)
    expect(metaDemasiadoAlta(7, sem(1, 5, 1))?.sugerida).toBe(1);
  });

  it('mira solo las tres últimas semanas cerradas', () => {
    // Las viejas cuentan cómo venía, no cómo viene.
    expect(metaDemasiadoAlta(7, sem(7, 7, 7, 2, 2, 2))?.sugerida).toBe(2);
  });
});

describe('metaDemasiadoAlta — cuándo se calla, que es casi siempre', () => {
  it('⚠️ con una sola semana mala no dice nada', () => {
    // Una semana floja le pasa a cualquiera: ofrecer bajar la meta ahí es leer
    // un resfrío como una tendencia.
    expect(metaDemasiadoAlta(7, sem(2))).toBeNull();
    expect(metaDemasiadoAlta(7, sem(2, 1))).toBeNull();
  });

  it('⚠️ si no hizo NADA, el problema no es el número', () => {
    // Cero de siete no es una meta alta: es algo que no arrancó o que ya no va.
    expect(metaDemasiadoAlta(7, sem(0, 0, 0))).toBeNull();
  });

  it('⚠️ si está cerca, no hay nada que corregir', () => {
    // 5 de 7 no está mal calibrada, le faltó poco.
    expect(metaDemasiadoAlta(7, sem(5, 5, 5))).toBeNull();
    expect(metaDemasiadoAlta(3, sem(2, 2, 2))).toBeNull();
  });

  it('⚠️ si alguna semana la cumplió entera, la meta es alcanzable', () => {
    // Lo probó él: bajarla sería sacarle algo que ya logró.
    expect(metaDemasiadoAlta(7, sem(7, 2, 2))).toBeNull();
  });

  it('sin meta puesta no hay nada que bajar', () => {
    expect(metaDemasiadoAlta(null, sem(1, 1, 1))).toBeNull();
  });

  it('una meta de 1 no se puede bajar', () => {
    expect(metaDemasiadoAlta(1, sem(0, 0, 0))).toBeNull();
  });
});

describe('cómo se lo dice', () => {
  const frase = fraseMetaAlta('leer', 7, { sugerida: 3, tipico: 3 });

  it('⚠️ no reta, no aconseja y no exclama', () => {
    // Misma regla que gobierna Objetivos entero.
    expect(frase).not.toMatch(/deberías|tenés que|no aflojes|dale|mal|fracas|[!¡]/i);
  });

  it('⚠️ no dice "solo hiciste": lo que hizo se cuenta, no se descuenta', () => {
    expect(frase).not.toMatch(/\bsolo\b|\bapenas\b|\bnada más\b/i);
  });

  it('ofrece en vez de mandar, y deja la puerta de volver a subirla', () => {
    expect(frase).toContain('¿La bajamos a 3');
    expect(frase).toMatch(/después la subimos/i);
  });
});

describe('semanasDe', () => {
  // Jueves 30/07/2026. El lunes de esta semana es el 27/07.
  const jueves = new Date('2026-07-30T12:00:00');

  it('⚠️ la semana EN CURSO no cuenta', () => {
    // Un miércoles llevás 1 de 7 y eso no dice nada: te faltan cuatro días. Si
    // entrara, la app ofrecería bajar la meta todos los lunes.
    const s = semanasDe(['2026-07-28', '2026-07-29', '2026-07-30'], jueves);
    expect(s.every((x) => x.hechos === 0)).toBe(true);
  });

  it('cuenta las tres cerradas, de la más vieja a la más nueva', () => {
    const s = semanasDe(
      [
        '2026-07-07', // semana del 06/07 → la más vieja
        '2026-07-14', '2026-07-15', // semana del 13/07
        '2026-07-20', '2026-07-21', '2026-07-22', // semana del 20/07
      ],
      jueves,
    );
    expect(s.map((x) => x.hechos)).toEqual([1, 2, 3]);
  });

  it('las semanas arrancan el lunes, como la grilla de Seguimiento', () => {
    // Domingo 26/07 es la última de la semana del 20/07, no de la del 27.
    expect(semanasDe(['2026-07-26'], jueves).map((x) => x.hechos)).toEqual([0, 0, 1]);
  });
});

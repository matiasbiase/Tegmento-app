import { describe, it, expect } from 'vitest';
import { titular } from '@/lib/titulos';

describe('titular', () => {
  it('deja pasar lo que ya es corto', () => {
    expect(titular('Dormís peor los domingos')).toBe('Dormís peor los domingos');
  });

  it('corta donde termina la oración, no en el carácter 46', () => {
    const t = titular(
      'Dormís peor los domingos. Aparece varias veces en los últimos registros y coincide con el trabajo del lunes.',
    );
    expect(t).toBe('Dormís peor los domingos');
    expect(t).not.toContain('…');
  });

  it('si la oración no entra, corta en la cláusula', () => {
    expect(
      titular('Cuando entrenás a la mañana, el resto del día aparece con mejor ánimo en tus registros', 40),
    ).toBe('Cuando entrenás a la mañana');
  });

  it('saca la muletilla del arranque', () => {
    expect(titular('Noté que el café tarde te corta el sueño')).toBe('El café tarde te corta el sueño');
  });

  it('nunca corta una palabra al medio', () => {
    const t = titular('Palabras larguísimas encadenadas sin ninguna puntuación que ayude a cortar bien', 30);
    expect(t.endsWith('…')).toBe(true);
    expect(t.replace('…', '').split(' ').every((p) => p.length > 0)).toBe(true);
    expect('Palabras larguísimas encadenadas sin ninguna puntuación'.startsWith(t.replace('…', ''))).toBe(true);
  });

  it('no deja coma ni conector colgando', () => {
    expect(titular('Te cuesta arrancar, sobre todo los lunes a la mañana con poco sueño', 24)).toBe(
      'Te cuesta arrancar',
    );
  });

  it('descarta una cláusula demasiado corta y corta por palabra', () => {
    // "Ojo, " son dos palabras: no sirve como rótulo.
    const t = titular('Ojo, esto viene repitiéndose desde hace bastante tiempo en tus registros diarios', 34);
    expect(t.startsWith('Ojo, esto viene')).toBe(true);
  });

  it('con texto vacío devuelve vacío', () => {
    expect(titular('   ')).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { esAlucinacion, limpiarTranscripcion } from '@/lib/transcripcion';

describe('lo que Whisper inventa sobre el silencio', () => {
  it('la que apareció de verdad en la base de Matías', () => {
    expect(esAlucinacion('¡Suscríbete al canal!')).toBe(true);
  });

  it('las variantes de mayúsculas, tildes y signos son la misma', () => {
    expect(esAlucinacion('Suscribete al canal')).toBe(true);
    expect(esAlucinacion('SUSCRÍBETE AL CANAL')).toBe(true);
    expect(esAlucinacion('  ¡Suscríbete al canal!  ')).toBe(true);
  });

  it('los otros artefactos conocidos', () => {
    expect(esAlucinacion('Subtítulos realizados por la comunidad de Amara.org')).toBe(true);
    expect(esAlucinacion('Gracias por ver el video')).toBe(true);
    expect(esAlucinacion('Más información en www.mooji.org')).toBe(true);
  });

  it('un audio mudo no dice nada', () => {
    expect(esAlucinacion('')).toBe(true);
    expect(esAlucinacion('   ')).toBe(true);
    expect(esAlucinacion('...')).toBe(true);
    expect(esAlucinacion('. . .')).toBe(true);
  });
});

describe('⚠️⚠️ lo que NO se toca — la regla que hace esto seguro', () => {
  // Solo se descarta cuando la transcripción ENTERA es el artefacto. Borrar algo
  // que sí dijo es mucho peor que dejar pasar una frase rara: lo primero le saca
  // un dato de su vida sin avisar, lo segundo se ve y se borra a mano.

  it('un mensaje real que CONTIENE la frase se conserva entero', () => {
    const real = 'Estuve viendo un video de finanzas y al final decía suscríbete al canal, me dio gracia';
    expect(esAlucinacion(real)).toBe(false);
    expect(limpiarTranscripcion(real)).toBe(real);
  });

  it('los mensajes reales de Matías, tal cual están en la base', () => {
    for (const m of [
      'Como va',
      'Ayer me junte con amigos',
      'Perdimos la copa, pero a pesar de eso sigo contento',
      'Quiero cargar un ticket de compra',
      'Creo que dormi bien, me desperte a las 7.30 pero me volvi a dormir',
    ]) {
      expect(esAlucinacion(m)).toBe(false);
    }
  });

  it('⚠️ "gracias" solo NO se filtra: es algo que una persona dice', () => {
    // Aparece en las listas de artefactos que andan dando vueltas, y por eso
    // está deliberadamente afuera. Preferimos dejar pasar una.
    expect(esAlucinacion('Gracias')).toBe(false);
    expect(esAlucinacion('gracias!')).toBe(false);
  });

  it('un mensaje cortito de una palabra se conserva', () => {
    expect(esAlucinacion('Bien')).toBe(false);
    expect(esAlucinacion('Cansado')).toBe(false);
  });
});

describe('el loop — cuando Whisper se traba', () => {
  it('la misma palabra ocho veces no es una persona hablando', () => {
    expect(esAlucinacion('gracias gracias gracias gracias gracias gracias gracias gracias')).toBe(true);
  });

  it('⚠️ pero tres repeticiones sí son una persona', () => {
    expect(esAlucinacion('no, no, no')).toBe(false);
    expect(esAlucinacion('sí sí sí claro')).toBe(false);
  });

  it('una frase larga y variada nunca cae en el detector', () => {
    const largo =
      'Hoy me levanté temprano, desayuné con calma y salí a correr un rato por el parque antes de arrancar a trabajar';
    expect(esAlucinacion(largo)).toBe(false);
  });

  it('una frase larga con repetición natural no cae', () => {
    // "que" y "de" se repiten en cualquier texto español largo, pero hay muchas
    // palabras distintas: la razón palabras/distintas queda baja.
    const natural = 'Le dije que de todo lo que hablamos lo que más me sirvió fue lo de que tengo que descansar más';
    expect(esAlucinacion(natural)).toBe(false);
  });
});

describe('limpiarTranscripcion', () => {
  it('devuelve vacío para lo inventado', () => {
    expect(limpiarTranscripcion('¡Suscríbete al canal!')).toBe('');
  });

  it('devuelve el texto recortado para lo real', () => {
    expect(limpiarTranscripcion('  Ayer me junté con amigos  ')).toBe('Ayer me junté con amigos');
  });
});

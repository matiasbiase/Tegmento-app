import { describe, expect, it } from 'vitest';
import { textoAprendido, TITULO_APRENDIZAJES } from '@/lib/aprendizajes';

/**
 * ⚠️⚠️ ESTE ARCHIVO TENÍA 11 TESTS Y AHORA TIENE 4, Y ES UNA BUENA NOTICIA.
 *
 * Los que se fueron probaban `patronesParaElCerebro`, la función que elegía qué
 * le llegaba al bot **filtrando por la confianza que el modelo se ponía a sí
 * mismo**. Tres de ellos fijaban el sesgo a propósito, con esta nota escrita el
 * 13/08 a la mañana: *"el día que se arregle, esos tres tienen que fallar"*.
 *
 * 👉 No fallaron: **se borraron con la función.** El arreglo no fue cambiarle el
 * criterio a ese camino, fue que el camino dejara de existir. Los patrones ahora
 * viven en `hechos` con su estado, y sus reglas se prueban en
 * `cerebro-hechos.test.ts` y `sesgos.test.ts`.
 *
 * Se deja escrito acá porque **un archivo de tests que adelgaza suele ser una
 * regresión**, y en este caso es lo contrario.
 */
describe('el texto que el asistente lee en cada charla', () => {
  it('dice el hilo central del período', () => {
    const t = textoAprendido('venís cansado por el estudio');
    expect(t).toContain('Hilo central del período: venís cansado por el estudio');
  });

  it('⚠️ y NO enumera los patrones: eso ahora viaja por `hechos`, con estado', () => {
    // Antes pegaba acá los cuatro patrones que pasaban el filtro de confianza.
    // Dejarlos sería mandarlos dos veces al chat, y esta copia es justo la que
    // no tiene estado — reintroduciría el bug al lado del arreglo.
    const t = textoAprendido('venís cansado', ['dormís poco', 'entrenás de noche']);
    expect(t).not.toContain('Patrones');
    expect(t).not.toContain('dormís poco');
  });

  it('el segundo argumento se ignora, y por eso es opcional', () => {
    expect(textoAprendido('algo')).toBe(textoAprendido('algo', ['lo que sea']));
  });

  it('el título es fijo: la entrada se reemplaza, no se duplica', () => {
    expect(TITULO_APRENDIZAJES).toBe('Lo que Tegmento aprendió');
  });
});

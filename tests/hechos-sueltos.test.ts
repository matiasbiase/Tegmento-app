import { describe, it, expect } from 'vitest';
import { parsearHechos } from '@/lib/hechos-sueltos';

describe('parsearHechos', () => {
  it('devuelve los hechos del array', () => {
    expect(parsearHechos('{"hechos": ["durmió una siesta", "salió a caminar"]}')).toEqual([
      'durmió una siesta',
      'salió a caminar',
    ]);
  });

  it('array vacío cuando no hay hechos', () => {
    expect(parsearHechos('{"hechos": []}')).toEqual([]);
  });

  it('JSON roto no rompe, devuelve vacío', () => {
    expect(parsearHechos('no soy json')).toEqual([]);
  });

  it('sin la clave hechos, o con otro tipo, devuelve vacío', () => {
    expect(parsearHechos('{}')).toEqual([]);
    expect(parsearHechos('{"hechos": "durmió"}')).toEqual([]);
  });

  it('saca vacíos, repetidos (sin importar mayúsculas) y topea en 5', () => {
    const r = parsearHechos(
      JSON.stringify({
        hechos: ['durmió una siesta', '  ', 'Durmió una siesta', 'a', 'b', 'c', 'd', 'e'],
      }),
    );
    expect(r).toEqual(['durmió una siesta', 'a', 'b', 'c', 'd']);
  });

  it('ignora elementos que no son string', () => {
    expect(parsearHechos('{"hechos": [1, null, "durmió una siesta"]}')).toEqual(['durmió una siesta']);
  });
});

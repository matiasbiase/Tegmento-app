import { describe, expect, it } from 'vitest';
import {
  adelante,
  atras,
  historialInicial,
  marcar,
  puedeAdelante,
  puedeAtras,
  textoActual,
} from '@/lib/historial-texto';

describe('historial de una nota', () => {
  it('arranca sin nada que deshacer ni que rehacer', () => {
    const h = historialInicial('hola');
    expect(textoActual(h)).toBe('hola');
    expect(puedeAtras(h)).toBe(false);
    expect(puedeAdelante(h)).toBe(false);
  });

  it('después de un punto se puede volver, y volviendo se puede rehacer', () => {
    let h = marcar(historialInicial('hola'), 'hola mundo');
    expect(puedeAtras(h)).toBe(true);
    expect(puedeAdelante(h)).toBe(false);

    h = atras(h);
    expect(textoActual(h)).toBe('hola');
    expect(puedeAtras(h)).toBe(false);
    expect(puedeAdelante(h)).toBe(true);

    h = adelante(h);
    expect(textoActual(h)).toBe('hola mundo');
  });

  it('recupera lo borrado sin querer, que es el pedido textual', () => {
    let h = historialInicial('');
    h = marcar(h, 'una idea larga que no quiero perder');
    h = marcar(h, ''); // lo borró todo de un manotazo
    expect(textoActual(h)).toBe('');
    expect(textoActual(atras(h))).toBe('una idea larga que no quiero perder');
  });

  it('el texto repetido no deja un punto nuevo', () => {
    const h = marcar(historialInicial('hola'), 'hola');
    expect(h.puntos).toHaveLength(1);
    expect(puedeAtras(h)).toBe(false);
  });

  it('escribir después de deshacer borra el futuro', () => {
    let h = historialInicial('a');
    h = marcar(h, 'ab');
    h = marcar(h, 'abc');
    h = atras(atras(h));
    expect(textoActual(h)).toBe('a');

    h = marcar(h, 'az');
    expect(puedeAdelante(h)).toBe(false);
    expect(h.puntos).toEqual(['a', 'az']);
  });

  it('al llegar al techo tira lo más viejo y conserva lo último', () => {
    let h = historialInicial('0');
    for (let i = 1; i <= 5; i++) h = marcar(h, String(i), 3);
    expect(h.puntos).toEqual(['3', '4', '5']);
    expect(textoActual(h)).toBe('5');
    expect(puedeAtras(h)).toBe(true);
    expect(puedeAdelante(h)).toBe(false);
  });

  it('no se sale de los bordes', () => {
    const h = historialInicial('solo');
    expect(atras(h)).toBe(h);
    expect(adelante(h)).toBe(h);
  });
});

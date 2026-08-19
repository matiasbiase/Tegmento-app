import { describe, it, expect } from 'vitest';
import { COOKIE_RELECTURA, estaOculta, serializarOculta } from '@/lib/relectura-oculta';

const hoy = '2026-08-09';
const ayer = '2026-08-08';

describe('relectura-oculta', () => {
  it('sin cookie la tarjeta se ve', () => {
    expect(estaOculta(undefined, hoy)).toBe(false);
  });

  it('lo que se escribe hoy se lee como cerrado hoy', () => {
    expect(estaOculta(serializarOculta(hoy), hoy)).toBe(true);
  });

  // ⚠️ LA REGLA ENTERA: cerrar es "hoy no", no "nunca más". El día va adentro
  // del valor justamente para que esto se pueda leer en el código.
  it('la de ayer no esconde nada: mañana arranca limpio', () => {
    expect(estaOculta(serializarOculta(ayer), hoy)).toBe(false);
  });

  // Cualquier cosa rara cae del lado de mostrar: que te vuelva a aparecer un
  // recuerdo es mucho mejor que una pantalla rota.
  it('una cookie rota no rompe la pantalla', () => {
    expect(estaOculta('no-es-json', hoy)).toBe(false);
    expect(estaOculta(encodeURIComponent('{"dia":123}'), hoy)).toBe(false);
    expect(estaOculta(encodeURIComponent('{}'), hoy)).toBe(false);
    expect(estaOculta('', hoy)).toBe(false);
  });

  it('el nombre no lleva ":", que no es válido en una cookie', () => {
    expect(COOKIE_RELECTURA).not.toContain(':');
  });
});

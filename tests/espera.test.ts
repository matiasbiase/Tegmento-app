import { describe, it, expect } from 'vitest';
import { textoEspera } from '@/lib/espera';

describe('textoEspera', () => {
  it('arranca acompañando', () => {
    expect(textoEspera(0)).toBe('Pensando…');
    expect(textoEspera(6)).toBe('Pensando…');
  });
  it('a los 7 segundos avisa que sigue', () => {
    expect(textoEspera(7)).toBe('Dame un segundo más…');
    expect(textoEspera(15)).toBe('Dame un segundo más…');
  });
  it('a los 16 explica POR QUÉ tarda', () => {
    expect(textoEspera(16)).toContain('corre acá en tu Mac');
    expect(textoEspera(34)).toContain('corre acá en tu Mac');
  });
  it('pasados 35 pide aguantar', () => {
    expect(textoEspera(35)).toBe('Ya casi, no cierres la app');
    expect(textoEspera(600)).toBe('Ya casi, no cierres la app');
  });
  it('nunca queda vacío, ni con valores raros', () => {
    expect(textoEspera(-5)).toBe('Pensando…');
    expect(textoEspera(NaN)).toBe('Pensando…');
  });
});

import { describe, expect, it } from 'vitest';
import { parsearPantalla, resumenPantalla } from '@/lib/pantalla';

describe('parsearPantalla', () => {
  it('parsea total y apps de un screenshot de Tiempo en pantalla', () => {
    const p = parsearPantalla(
      JSON.stringify({ totalMin: 372, apps: [{ nombre: 'Instagram', min: 95 }, { nombre: 'WhatsApp', min: 60 }] }),
    );
    expect(p).toEqual({ totalMin: 372, apps: [{ nombre: 'Instagram', min: 95 }, { nombre: 'WhatsApp', min: 60 }] });
  });

  it('acepta "6 h 12 min" como total en texto', () => {
    const p = parsearPantalla(JSON.stringify({ total: '6 h 12 min', apps: [] }));
    expect(p?.totalMin).toBe(372);
  });

  it('devuelve null si no hay nada aprovechable', () => {
    expect(parsearPantalla(JSON.stringify({ esPantalla: false }))).toBeNull();
    expect(parsearPantalla('no soy json')).toBeNull();
  });
});

describe('resumenPantalla', () => {
  it('arma un resumen corto', () => {
    expect(resumenPantalla({ totalMin: 372, apps: [{ nombre: 'Instagram', min: 95 }] })).toBe('6 h 12 min · Instagram lo más usado');
  });
  it('sin apps solo el total', () => {
    expect(resumenPantalla({ totalMin: 60, apps: [] })).toBe('1 h');
  });
});

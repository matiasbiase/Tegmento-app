import { describe, it, expect } from 'vitest';
import { simboloMoneda, codigoMoneda, montoConSimbolo, montoConCodigo } from '@/lib/moneda';

describe('simboloMoneda', () => {
  it('unifica todo lo que sea euro en €', () => {
    expect(simboloMoneda('EUR')).toBe('€');
    expect(simboloMoneda('eur')).toBe('€');
    expect(simboloMoneda('€')).toBe('€');
    expect(simboloMoneda(' Euros ')).toBe('€');
  });
  it('conoce otras monedas', () => {
    expect(simboloMoneda('ARS')).toBe('$');
    expect(simboloMoneda('USD')).toBe('US$');
  });
  it('si no la conoce devuelve el crudo', () => {
    expect(simboloMoneda('CHF')).toBe('CHF');
  });
  it('sin moneda, string vacío', () => {
    expect(simboloMoneda(null)).toBe('');
    expect(simboloMoneda('  ')).toBe('');
  });
});

describe('codigoMoneda', () => {
  it('unifica todo lo que sea euro en EUR', () => {
    expect(codigoMoneda('€')).toBe('EUR');
    expect(codigoMoneda('eur')).toBe('EUR');
  });
  it('si no la conoce devuelve el crudo', () => {
    expect(codigoMoneda('CHF')).toBe('CHF');
  });
});

describe('montoConSimbolo', () => {
  it('pega el símbolo al número, venga como venga la moneda', () => {
    expect(montoConSimbolo(23.5, 'EUR')).toBe('€23,50');
    expect(montoConSimbolo(23.5, '€')).toBe('€23,50');
  });
  it('miles con formato local', () => {
    expect(montoConSimbolo(1234.5, 'EUR')).toBe('€1.234,50');
  });
  it('deja espacio si el prefijo tiene letras', () => {
    expect(montoConSimbolo(10, 'CHF')).toBe('CHF 10,00');
    expect(montoConSimbolo(10, 'USD')).toBe('US$ 10,00');
  });
  it('sin moneda, solo el número', () => {
    expect(montoConSimbolo(10, null)).toBe('10,00');
  });
  it('sin total, string vacío', () => {
    expect(montoConSimbolo(null, 'EUR')).toBe('');
  });
});

describe('montoConCodigo', () => {
  it('usa el código con espacio', () => {
    expect(montoConCodigo(128.4, '€')).toBe('EUR 128,40');
    expect(montoConCodigo(128.4, 'EUR')).toBe('EUR 128,40');
  });
  it('sin moneda, solo el número', () => {
    expect(montoConCodigo(128.4, '')).toBe('128,40');
  });
});

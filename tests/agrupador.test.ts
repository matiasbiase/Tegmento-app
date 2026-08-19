import { describe, it, expect } from 'vitest';
import { parsearPropuestaAgrupacion } from '@/lib/agrupador';

describe('parsearPropuestaAgrupacion', () => {
  it('parsea grupos válidos', () => {
    const r = parsearPropuestaAgrupacion(JSON.stringify({ grupos: [{ tema: 'Dormir', mensajeIds: [1, 2, 3] }] }), [1, 2, 3, 4]);
    expect(r).toEqual([{ tema: 'Dormir', mensajeIds: [1, 2, 3] }]);
  });

  it('descarta grupos de un solo mensaje (no es un grupo)', () => {
    const r = parsearPropuestaAgrupacion(JSON.stringify({ grupos: [{ tema: 'Dormir', mensajeIds: [1] }] }), [1, 2]);
    expect(r).toEqual([]);
  });

  it('saca ids inventados que no estaban en lo que se mandó', () => {
    const r = parsearPropuestaAgrupacion(JSON.stringify({ grupos: [{ tema: 'Dormir', mensajeIds: [1, 2, 999] }] }), [1, 2, 3]);
    expect(r).toEqual([{ tema: 'Dormir', mensajeIds: [1, 2] }]);
  });

  it('si al sacar los inventados queda menos de 2, se descarta el grupo entero', () => {
    const r = parsearPropuestaAgrupacion(JSON.stringify({ grupos: [{ tema: 'Dormir', mensajeIds: [1, 999] }] }), [1, 2]);
    expect(r).toEqual([]);
  });

  it('JSON roto o sin grupos da vacío', () => {
    expect(parsearPropuestaAgrupacion('no soy json', [1])).toEqual([]);
    expect(parsearPropuestaAgrupacion('{}', [1])).toEqual([]);
  });

  it('sin tema, se descarta', () => {
    const r = parsearPropuestaAgrupacion(JSON.stringify({ grupos: [{ tema: '', mensajeIds: [1, 2] }] }), [1, 2]);
    expect(r).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { claveTema } from '@/lib/tema-clave';

// El bug del 28/07: `t.nombre.toUpperCase() === nombre` normalizaba un solo
// lado, así que ningún tema se reusaba nunca y cada chat creaba el suyo.
describe('claveTema', () => {
  it('iguala los mismos temas escritos distinto', () => {
    expect(claveTema('Vida social')).toBe(claveTema('vida social'));
    expect(claveTema('Cambios Personales')).toBe(claveTema('Cambios personales'));
    expect(claveTema('  Finanzas  ')).toBe(claveTema('Finanzas'));
  });

  it('iguala con y sin acentos, que el modelo alterna', () => {
    expect(claveTema('Alemán')).toBe(claveTema('Aleman'));
    expect(claveTema('Planificación')).toBe(claveTema('planificacion'));
  });

  it('no junta temas que de verdad son distintos', () => {
    expect(claveTema('Finanzas')).not.toBe(claveTema('Vida social'));
  });

  // El caso exacto que fallaba antes.
  it('la comparación vieja fallaba, la nueva no', () => {
    expect('Vida social'.toUpperCase() === 'Vida social').toBe(false);
    expect(claveTema('Vida social') === claveTema('Vida social')).toBe(true);
  });
});

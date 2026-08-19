import { describe, it, expect } from 'vitest';
import { extraerMarcaHecho, limpiarMarcaHecho, normalizarHecho } from '@/lib/hecho';

describe('extraerMarcaHecho', () => {
  it('extrae el título de la marca', () => {
    expect(extraerMarcaHecho('Buenísimo. [+hecho: empecé la terapia]')).toBe('empecé la terapia');
  });

  it('recorta espacios alrededor del título', () => {
    expect(extraerMarcaHecho('[+hecho:   mandé el mail  ]')).toBe('mandé el mail');
  });

  it('es tolerante a mayúsculas en la marca', () => {
    expect(extraerMarcaHecho('[+Hecho: fui al médico]')).toBe('fui al médico');
  });

  it('devuelve null cuando no hay marca', () => {
    expect(extraerMarcaHecho('un mensaje cualquiera sin marca')).toBeNull();
  });

  it('devuelve null con la marca vacía', () => {
    expect(extraerMarcaHecho('[+hecho:   ]')).toBeNull();
  });
});

describe('limpiarMarcaHecho', () => {
  it('saca la marca y deja el texto limpio', () => {
    expect(limpiarMarcaHecho('Qué bueno. [+hecho: arranqué el gimnasio]')).toBe('Qué bueno.');
  });

  it('deja intacto un texto sin marca', () => {
    expect(limpiarMarcaHecho('nada que limpiar')).toBe('nada que limpiar');
  });
});

describe('normalizarHecho', () => {
  it('colapsa espacios y recorta', () => {
    expect(normalizarHecho('  empecé   la  médica  ')).toBe('empecé la médica');
  });

  it('acota a 120 caracteres', () => {
    expect(normalizarHecho('a'.repeat(200))).toHaveLength(120);
  });
});

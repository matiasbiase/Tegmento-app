import { describe, it, expect } from 'vitest';
import { CLAVES_ICONO_OBJETIVO, adivinarIconoObjetivo, iconoDeObjetivo } from '@/lib/objetivos-iconos';

describe('adivinarIconoObjetivo', () => {
  it('saca el dibujo del título', () => {
    expect(adivinarIconoObjetivo('Viaje Argentina Octubre', null)).toBe('viaje');
    expect(adivinarIconoObjetivo('Juntar plata', null)).toBe('plata');
    expect(adivinarIconoObjetivo('Buscar trabajo', null)).toBe('trabajo');
    expect(adivinarIconoObjetivo('Alemán B2', null)).toBe('estudio');
    expect(adivinarIconoObjetivo('Volver a entrenar', null)).toBe('cuerpo');
    expect(adivinarIconoObjetivo('Mudanza', null)).toBe('casa');
  });

  it('también mira el área, no solo el título', () => {
    expect(adivinarIconoObjetivo('El B2', 'estudio')).toBe('estudio');
  });

  // ⚠️ EL ORDEN DE LA CADENA ES PARTE DE LA REGLA, no un detalle de escritura:
  // "ahorrar para el viaje" tiene las dos palabras y tiene que caer en viaje. Se
  // dibuja a dónde vas, no cómo. Si alguien reordena los `if`, esto se cae.
  it('cuando dice las dos cosas, gana el destino', () => {
    expect(adivinarIconoObjetivo('Ahorrar para el viaje a Japón', null)).toBe('viaje');
  });

  it('lo que no reconoce cae en la bandera de meta', () => {
    expect(adivinarIconoObjetivo('Terminar la novela', null)).toBe('meta');
    expect(adivinarIconoObjetivo('', null)).toBe('meta');
  });

  it('todo lo que adivina existe en el catálogo', () => {
    const titulos = ['Viaje a Japón', 'Juntar plata', 'Buscar laburo', 'Curso de alemán', 'Correr 10k', 'Mudanza', 'xyz'];
    for (const t of titulos) {
      expect(CLAVES_ICONO_OBJETIVO.has(adivinarIconoObjetivo(t, null))).toBe(true);
    }
  });
});

describe('iconoDeObjetivo', () => {
  it('lo elegido a mano le gana a lo adivinado', () => {
    expect(iconoDeObjetivo('casa', 'Viaje Argentina Octubre', null)).toBe('casa');
  });

  it('null quiere decir "adivinalo", no "sin ícono"', () => {
    expect(iconoDeObjetivo(null, 'Viaje Argentina Octubre', null)).toBe('viaje');
  });

  // ⚠️ Una clave guardada que ya no está en el catálogo NO deja el objetivo sin
  // marca: vuelve a adivinar. Hace falta porque el catálogo vive en el código y
  // la fila en la base, así que sacar un ícono del catálogo no puede romper a
  // los objetivos que lo tenían elegido.
  it('una clave que ya no existe vuelve a adivinar', () => {
    expect(iconoDeObjetivo('emoji-viejo', 'Viaje Argentina Octubre', null)).toBe('viaje');
    expect(iconoDeObjetivo('🎯', 'Terminar la novela', null)).toBe('meta');
  });
});

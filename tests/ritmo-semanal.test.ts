import { describe, it, expect } from 'vitest';
import { diasQueSoles, fraseDeRitmo } from '@/lib/ritmo-semanal';

// Agosto 2026: el 4 es martes, el 6 jueves, el 11 martes, el 13 jueves.
const MAR = ['2026-08-04', '2026-08-11', '2026-08-18'];
const JUE = ['2026-08-06', '2026-08-13'];

describe('diasQueSoles', () => {
  it('sin marcas, sin patrón', () => {
    expect(diasQueSoles([])).toEqual([]);
  });

  it('⚠️ una sola vez NO es un patrón: un martes no es "los martes"', () => {
    expect(diasQueSoles(['2026-08-04'])).toEqual([]);
  });

  it('dos veces el mismo día ya es patrón', () => {
    expect(diasQueSoles(['2026-08-04', '2026-08-11'])).toEqual(['martes']);
  });

  it('⚠️ los devuelve en orden de la semana, no por frecuencia', () => {
    // Martes tiene 3 y jueves 2; aun así martes va primero porque va primero en
    // la semana. "Martes y jueves" se lee como ritmo; al revés, como lista.
    expect(diasQueSoles([...JUE, ...MAR])).toEqual(['martes', 'jueves']);
  });

  it('el domingo va último, no primero', () => {
    const dom = ['2026-08-02', '2026-08-09'];
    const lun = ['2026-08-03', '2026-08-10'];
    expect(diasQueSoles([...dom, ...lun])).toEqual(['lunes', 'domingo']);
  });

  it('ignora fechas rotas sin explotar', () => {
    expect(diasQueSoles(['no-es-fecha', '2026-08-04', '2026-08-11'])).toEqual(['martes']);
  });

  it('se le puede subir el piso', () => {
    expect(diasQueSoles(MAR, 4)).toEqual([]);
    expect(diasQueSoles(MAR, 3)).toEqual(['martes']);
  });
});

describe('fraseDeRitmo', () => {
  it('⚠️ sin patrón devuelve null, no una frase vacía', () => {
    // Así quien arma el contexto decide si escribe "(sin patrón)" o nada. Una
    // función que devuelve "" obliga a chequear el string, y ese chequeo se
    // olvida.
    expect(fraseDeRitmo('Leer', ['2026-08-04'])).toBeNull();
  });

  it('un solo día', () => {
    expect(fraseDeRitmo('Bouldern', ['2026-08-07', '2026-08-14'])).toBe('Bouldern: suele caer los viernes');
  });

  it('dos días, con "y"', () => {
    expect(fraseDeRitmo('Entrenar', [...MAR, ...JUE])).toBe('Entrenar: suele caer los martes y jueves');
  });

  it('tres días, con comas y "y" al final', () => {
    const mie = ['2026-08-05', '2026-08-12'];
    expect(fraseDeRitmo('Alemán', [...MAR, ...mie, ...JUE])).toBe(
      'Alemán: suele caer los martes, miércoles y jueves',
    );
  });
});

describe('⚠️ el caso real de hoy', () => {
  it('con una sola marca —que es lo que tiene casi todo— no afirma nada', () => {
    // Medido el 11/08: de nueve actividades activas, solo Bouldern pasa de tres
    // marcas. Que esto devuelva null es lo correcto: sin patrón, el bot
    // pregunta en vez de inventar un día.
    expect(fraseDeRitmo('Leer', ['2026-07-28'])).toBeNull();
    expect(fraseDeRitmo('Futbol', ['2026-08-07'])).toBeNull();
  });
});

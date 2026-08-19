import { describe, it, expect } from 'vitest';
import { queTeFrena, progresoDelDia, type EstadoDelDia } from '@/lib/frena';

const base: EstadoDelDia = {
  cargoSueno: false,
  cargoAnimo: false,
  cargoSenal: false,
  comidasHoy: 0,
  hora: 9,
  diasSinAportar: null,
};
const e = (p: Partial<EstadoDelDia>): EstadoDelDia => ({ ...base, ...p });

describe('queTeFrena · las señales del día', () => {
  it('el sueño tiene prioridad sobre el ánimo', () => {
    // Si faltan dos, frenar por la menos explicativa gasta el único permiso del
    // día en lo que menos importa.
    expect(queTeFrena(e({}))?.clave).toBe('sueno');
  });

  it('con el sueño cargado, pasa al ánimo', () => {
    expect(queTeFrena(e({ cargoSueno: true }))?.clave).toBe('animo');
  });

  it('⚠️ con dos de tres señales ya no frena por señales', () => {
    // Con dos de tres, la tarjeta ya no avisa de un día vacío: pide la última
    // que falta. Eso es el pedido con culpa que la app no hace.
    expect(queTeFrena(e({ cargoSueno: true, cargoAnimo: true }))).toBeNull();
    expect(queTeFrena(e({ cargoSueno: true, cargoSenal: true }))).toBeNull();
  });

  it('con todo cargado y nada más que decir, no frena', () => {
    expect(queTeFrena(e({ cargoSueno: true, cargoAnimo: true, cargoSenal: true }))).toBeNull();
  });
});

describe('queTeFrena · la comida', () => {
  const dia = { cargoSueno: true, cargoAnimo: true, cargoSenal: true };

  it('⚠️ a la mañana NO pregunta por la comida', () => {
    // A las 9 no haber comido no es un dato que falte: es un martes. Frenar ahí
    // inventa un hueco donde no hay ninguno.
    expect(queTeFrena(e({ ...dia, hora: 9, comidasHoy: 0 }))).toBeNull();
  });

  it('a la tarde sí, si no anotó ninguna', () => {
    expect(queTeFrena(e({ ...dia, hora: 15, comidasHoy: 0 }))?.clave).toBe('comida');
  });

  it('con una comida anotada, no frena', () => {
    expect(queTeFrena(e({ ...dia, hora: 21, comidasHoy: 1 }))).toBeNull();
  });

  it('⚠️ la comida NO depende de las señales del día', () => {
    // Podés tener el día entero cargado y no haber anotado nada de comer. Son de
    // otra naturaleza: una es el check-in del día, la otra es un seguimiento.
    expect(queTeFrena(e({ ...dia, hora: 20, comidasHoy: 0 }))?.clave).toBe('comida');
  });
});

describe('queTeFrena · el aporte', () => {
  const todo = { cargoSueno: true, cargoAnimo: true, cargoSenal: true, comidasHoy: 2, hora: 20 };

  it('sin objetivo de plata activo, no hay nada que reclamar', () => {
    expect(queTeFrena(e({ ...todo, diasSinAportar: null }))).toBeNull();
  });

  it('⚠️ a los 5 días todavía no frena', () => {
    // Un objetivo de plata no se mueve todos los días: apartás cuando cobrás.
    // Un umbral corto convertiría el aviso en insistencia, y con plata es donde
    // más incomoda.
    expect(queTeFrena(e({ ...todo, diasSinAportar: 5 }))).toBeNull();
  });

  it('a las dos semanas sí', () => {
    expect(queTeFrena(e({ ...todo, diasSinAportar: 14 }))?.clave).toBe('aporte');
  });

  it('⚠️ el sueño le gana al aporte', () => {
    // El orden es una prioridad: el permiso del día se gasta en lo que más
    // explica cómo venís, no en lo que lleva más tiempo esperando.
    expect(queTeFrena(e({ diasSinAportar: 90 }))?.clave).toBe('sueno');
  });
});

describe('progresoDelDia', () => {
  it('mide sobre las tres señales, no sobre los candidatos', () => {
    // El anillo dice cuánto llevás de HOY: un aporte de hace dos semanas no es
    // parte de hoy.
    expect(progresoDelDia(e({ diasSinAportar: 90 }))).toBe(0);
    expect(progresoDelDia(e({ cargoSueno: true }))).toBeCloseTo(1 / 3);
    expect(progresoDelDia(e({ cargoSueno: true, cargoAnimo: true, cargoSenal: true }))).toBe(1);
  });
});

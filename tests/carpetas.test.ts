import { describe, it, expect } from 'vitest';
import {
  VACIO,
  asignarChat,
  borrarCarpeta,
  carpetaDe,
  contarPorCarpeta,
  crearCarpeta,
  leerCarpetas,
  renombrarCarpeta,
  serializarCarpetas,
} from '@/lib/carpetas';

describe('leerCarpetas', () => {
  it('sin nada guardado devuelve vacío', () => {
    expect(leerCarpetas(null)).toEqual(VACIO);
    expect(leerCarpetas('')).toEqual(VACIO);
  });

  it('con JSON roto no explota', () => {
    expect(leerCarpetas('{no es json')).toEqual(VACIO);
  });

  it('descarta asignaciones a carpetas que ya no existen', () => {
    const e = leerCarpetas(JSON.stringify({ carpetas: [{ id: 'c1', nombre: 'Terapia' }], asignados: { '5': 'c1', '9': 'fantasma' } }));
    expect(e.asignados).toEqual({ '5': 'c1' });
  });

  it('va y vuelve sin perder nada', () => {
    const e = asignarChat(crearCarpeta(VACIO, 'Mudanza', 'c1'), 7, 'c1');
    expect(leerCarpetas(serializarCarpetas(e))).toEqual(e);
  });
});

describe('crearCarpeta', () => {
  it('limpia el nombre', () => {
    expect(crearCarpeta(VACIO, '  Terapia   semanal ', 'c1').carpetas[0].nombre).toBe('Terapia semanal');
  });

  it('no crea dos con el mismo nombre, aunque cambie la capitalización', () => {
    const uno = crearCarpeta(VACIO, 'Terapia', 'c1');
    expect(crearCarpeta(uno, 'terapia', 'c2').carpetas).toHaveLength(1);
  });

  it('ignora el nombre vacío', () => {
    expect(crearCarpeta(VACIO, '   ', 'c1').carpetas).toHaveLength(0);
  });
});

describe('asignarChat', () => {
  const base = crearCarpeta(VACIO, 'Mudanza', 'c1');

  it('mete el chat en la carpeta', () => {
    expect(carpetaDe(asignarChat(base, 3, 'c1'), 3)).toBe('c1');
  });

  it('con null lo saca', () => {
    const con = asignarChat(base, 3, 'c1');
    expect(carpetaDe(asignarChat(con, 3, null), 3)).toBeNull();
  });

  it('ignora carpetas que no existen', () => {
    expect(carpetaDe(asignarChat(base, 3, 'fantasma'), 3)).toBeNull();
  });

  it('un chat vive en UNA carpeta: reasignar lo mueve, no lo duplica', () => {
    const dos = crearCarpeta(base, 'Terapia', 'c2');
    const e = asignarChat(asignarChat(dos, 3, 'c1'), 3, 'c2');
    expect(carpetaDe(e, 3)).toBe('c2');
    expect(contarPorCarpeta(e)).toEqual({ c1: 0, c2: 1 });
  });
});

describe('borrarCarpeta', () => {
  it('borra la carpeta y suelta sus chats, sin tocar los de otras', () => {
    let e = crearCarpeta(VACIO, 'Mudanza', 'c1');
    e = crearCarpeta(e, 'Terapia', 'c2');
    e = asignarChat(e, 1, 'c1');
    e = asignarChat(e, 2, 'c2');
    const despues = borrarCarpeta(e, 'c1');
    expect(despues.carpetas.map((c) => c.id)).toEqual(['c2']);
    expect(carpetaDe(despues, 1)).toBeNull();
    expect(carpetaDe(despues, 2)).toBe('c2');
  });
});

describe('renombrarCarpeta', () => {
  it('cambia el nombre sin tocar las asignaciones', () => {
    const e = asignarChat(crearCarpeta(VACIO, 'Mudanza', 'c1'), 4, 'c1');
    const r = renombrarCarpeta(e, 'c1', 'Mudanza a Berlín');
    expect(r.carpetas[0].nombre).toBe('Mudanza a Berlín');
    expect(carpetaDe(r, 4)).toBe('c1');
  });

  it('con nombre vacío no hace nada', () => {
    const e = crearCarpeta(VACIO, 'Mudanza', 'c1');
    expect(renombrarCarpeta(e, 'c1', '  ')).toEqual(e);
  });
});

describe('contarPorCarpeta', () => {
  it('cuenta las vacías en cero', () => {
    const e = crearCarpeta(crearCarpeta(VACIO, 'A', 'c1'), 'B', 'c2');
    expect(contarPorCarpeta(asignarChat(e, 1, 'c1'))).toEqual({ c1: 1, c2: 0 });
  });
});

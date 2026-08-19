import { describe, it, expect } from 'vitest';
import { hoyLocal, leerDescartadas, serializarDescartadas } from '@/lib/tarjetas-descartadas';

const HOY = '2026-07-31';

describe('leerDescartadas — lo que se recuerda', () => {
  it('devuelve los ids que descartaste hoy', () => {
    expect(leerDescartadas(serializarDescartadas(['a', 'b'], HOY), HOY)).toEqual(['a', 'b']);
  });

  it('lo de AYER no cuenta: mañana la baraja arranca entera', () => {
    // Es la regla que hace que "Ahora no" no sea "nunca más".
    expect(leerDescartadas(serializarDescartadas(['a'], '2026-07-30'), HOY)).toEqual([]);
  });

  it('sin cookie, no hay nada descartado', () => {
    expect(leerDescartadas(undefined, HOY)).toEqual([]);
  });
});

describe('leerDescartadas — cuando la cookie viene rota', () => {
  // ⚠️ El peor caso tiene que ser "te vuelve a aparecer una tarjeta", nunca una
  // pantalla que no carga. La cookie la puede editar cualquiera desde el
  // navegador y la lee un componente que dibuja el Home.
  it('un JSON roto no rompe la pantalla', () => {
    expect(leerDescartadas('{esto no es json')).toEqual([]);
  });

  it('ids que no son una lista', () => {
    expect(leerDescartadas(encodeURIComponent(JSON.stringify({ dia: HOY, ids: 'a' })), HOY)).toEqual([]);
  });

  it('descarta los elementos que no son texto y se queda con el resto', () => {
    const crudo = encodeURIComponent(JSON.stringify({ dia: HOY, ids: ['a', 7, null, 'b'] }));
    expect(leerDescartadas(crudo, HOY)).toEqual(['a', 'b']);
  });

  it('sin el día no se asume que es de hoy', () => {
    expect(leerDescartadas(encodeURIComponent(JSON.stringify({ ids: ['a'] })), HOY)).toEqual([]);
  });
});

describe('la ida y vuelta server ↔ navegador', () => {
  it('lo que escribe el navegador lo lee el server igual', () => {
    // El bug original fue justo que cada lado veía otra cosa. Si esto se rompe,
    // vuelven las tarjetas que aparecen y se van solas.
    const ids = ['toca-12-2026-07-31', 'meta-alta-3'];
    expect(leerDescartadas(serializarDescartadas(ids, HOY), HOY)).toEqual(ids);
  });

  it('sobrevive a un id con caracteres que romperían la cookie', () => {
    const ids = ['a;b=c', 'con espacio', 'ñandú'];
    expect(leerDescartadas(serializarDescartadas(ids, HOY), HOY)).toEqual(ids);
  });

  it('el valor no lleva ; ni = sin escapar, que cortarían la cookie', () => {
    const valor = serializarDescartadas(['a;b=c'], HOY);
    expect(valor).not.toContain(';');
    expect(valor.split('=').length).toBe(1);
  });
});

describe('hoyLocal', () => {
  it('usa el día LOCAL y no UTC', () => {
    // A las 22:00 en Alemania ya es otro día en UTC. Si esto usara UTC, las
    // tarjetas se limpiarían solas a las 22 en vez de a medianoche.
    expect(hoyLocal(new Date(2026, 6, 31, 22, 30))).toBe('2026-07-31');
  });

  it('rellena mes y día con cero', () => {
    expect(hoyLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

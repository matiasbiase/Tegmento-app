import { describe, it, expect } from 'vitest';
import { diasQueSuman } from '@/lib/racha';
import { diasDeRacha } from '@/lib/marcas';

const d = (iso: string) => ({ creado: iso });
const cu = (iso: string, origen: string) => ({ creado: iso, origen });

describe('diasQueSuman · qué sostiene la racha', () => {
  it('escribir suma', () => {
    expect(diasQueSuman({ mensajes: [d('2026-08-09T10:00:00')] })).toEqual(new Set(['2026-08-09']));
  });

  it('marcar el ánimo suma', () => {
    expect(diasQueSuman({ animo: [d('2026-08-09T22:00:00')] })).toEqual(new Set(['2026-08-09']));
  });

  it('⚠️⚠️ el cuerpo cargado A MANO suma — es el bug del 10/08', () => {
    // Matías abrió la app el 08/08, cargó el sueño con su calidad, y la racha
    // se cortó igual: le mostraba 2 días donde había 22.
    expect(diasQueSuman({ cuerpo: [cu('2026-08-08T07:23:00', 'manual')] })).toEqual(new Set(['2026-08-08']));
  });

  it('⚠️ el cuerpo que trajo Apple Salud NO suma', () => {
    // Su regla del 05/08: sin esto la racha se sostendría sola con el reloj
    // prendido y dejaría de significar nada.
    expect(diasQueSuman({ cuerpo: [cu('2026-08-08T08:00:00', 'salud')] })).toEqual(new Set());
  });

  it('⚠️ el mismo día con los dos orígenes suma una vez, no se pierde', () => {
    // El caso real: el reloj manda el sueño y además él anota la energía.
    const dias = diasQueSuman({
      cuerpo: [cu('2026-08-08T08:00:00', 'salud'), cu('2026-08-08T21:00:00', 'manual')],
    });
    expect(dias).toEqual(new Set(['2026-08-08']));
  });

  it('un origen desconocido no suma: ante la duda, no infla la racha', () => {
    expect(diasQueSuman({ cuerpo: [cu('2026-08-08T08:00:00', 'vaya-a-saber')] })).toEqual(new Set());
  });

  it('junta las tres fuentes sin repetir el día', () => {
    const dias = diasQueSuman({
      mensajes: [d('2026-08-09T10:00:00')],
      animo: [d('2026-08-09T22:00:00')],
      cuerpo: [cu('2026-08-09T07:00:00', 'manual')],
    });
    expect(dias).toEqual(new Set(['2026-08-09']));
  });

  it('⚠️ marcar una actividad suma (11/08)', () => {
    // El Home puso "hoy, de un toque" como la acción más a mano de la pantalla,
    // y era justo la única que no sostenía la llama: la app invitaba a hacer lo
    // que no contaba.
    expect(diasQueSuman({ marcas: [{ fecha: '2026-08-08' }] })).toEqual(new Set(['2026-08-08']));
  });

  it('⚠️ la fecha de una marca va derecho, sin pasar por Date', () => {
    // La columna es una fecha, no un timestamp: pasarla por `new Date()` la
    // correría un día en cualquier huso al oeste de Greenwich.
    expect(diasQueSuman({ marcas: [{ fecha: '2026-01-01' }] })).toEqual(new Set(['2026-01-01']));
  });

  it('una marca sin fecha no rompe ni suma', () => {
    expect(diasQueSuman({ marcas: [{ fecha: '' }] })).toEqual(new Set());
  });

  it('sin nada, no suma nada', () => {
    expect(diasQueSuman({})).toEqual(new Set());
  });
});

describe('⚠️ el caso real que lo destapó, de punta a punta', () => {
  // Reproduce los días de Matías alrededor del 08/08. El 8 solo cargó sueño a
  // mano; los demás escribió o marcó el ánimo.
  const hoy = new Date('2026-08-10T12:00:00');
  const base = {
    mensajes: [d('2026-08-10T09:00:00'), d('2026-08-09T11:00:00'), d('2026-08-07T15:00:00')],
    animo: [d('2026-08-09T21:00:00'), d('2026-08-07T21:00:00'), d('2026-08-06T21:00:00')],
  };

  it('sin contar el cuerpo manual, la racha se corta en el 8 y muestra 2', () => {
    const dias = diasQueSuman(base);
    expect(diasDeRacha(dias, hoy)).toEqual(['2026-08-10', '2026-08-09']);
  });

  it('contándolo, el 8 deja de ser un agujero y la racha sigue de largo', () => {
    const dias = diasQueSuman({ ...base, cuerpo: [cu('2026-08-08T07:23:00', 'manual')] });
    expect(diasDeRacha(dias, hoy)).toEqual(['2026-08-10', '2026-08-09', '2026-08-08', '2026-08-07', '2026-08-06']);
  });

  it('⚠️ pero si ese sueño lo hubiera mandado el reloj, se corta igual', () => {
    const dias = diasQueSuman({ ...base, cuerpo: [cu('2026-08-08T08:00:00', 'salud')] });
    expect(diasDeRacha(dias, hoy)).toEqual(['2026-08-10', '2026-08-09']);
  });
});

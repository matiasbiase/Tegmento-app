import { describe, it, expect } from 'vitest';
import { avisoDelHome, momentoDe } from '@/lib/avisos-ritual';
import { RITUAL_APAGADO, type EstadoRitual } from '@/lib/ritual';

const PRENDIDO: EstadoRitual = { activo: true, manana: { hora: 8, minuto: 30 }, noche: { hora: 22, minuto: 0 } };
const NADA = { sueno: false, animo: false };
const TODO = { sueno: true, animo: true };

describe('momentoDe — franjas, no la hora exacta', () => {
  it('la mañana va de las 5 a las 12', () => {
    expect(momentoDe(5)).toBe('manana');
    expect(momentoDe(8)).toBe('manana');
    expect(momentoDe(11)).toBe('manana');
  });

  it('⚠️ a las 10 sigue siendo la mañana, aunque el aviso sea de las 8:30', () => {
    // Con la hora exacta, el aviso de la mañana no aparecería nunca salvo que
    // abras a las 8:30 clavadas.
    expect(momentoDe(10)).toBe('manana');
  });

  it('la noche arranca a las 19 y cruza la medianoche', () => {
    expect(momentoDe(19)).toBe('noche');
    expect(momentoDe(23)).toBe('noche');
    expect(momentoDe(2)).toBe('noche');
  });

  it('el medio del día no es ningún momento', () => {
    expect(momentoDe(13)).toBeNull();
    expect(momentoDe(16)).toBeNull();
  });
});

describe('avisoDelHome', () => {
  it('a la mañana, con el sueño sin cargar, pide el sueño', () => {
    const a = avisoDelHome(PRENDIDO, NADA, 9);
    expect(a?.momento).toBe('manana');
    expect(a?.hoja).toBe('sueno');
  });

  it('a la noche, con el ánimo sin cargar, pide cerrar el día', () => {
    const a = avisoDelHome(PRENDIDO, NADA, 22);
    expect(a?.momento).toBe('noche');
    expect(a?.hoja).toBe('animo');
  });

  it('⚠️ el texto es EL MISMO que el de la notificación', () => {
    // Si acá se prueba una cosa y afuera sale otra, esto no sirve para nada.
    expect(avisoDelHome(PRENDIDO, NADA, 9)?.titulo).toBe('¿Cómo dormiste?');
    expect(avisoDelHome(PRENDIDO, NADA, 22)?.titulo).toBe('Cerrá el día');
  });

  it('con el dato ya cargado no hay nada que pedir', () => {
    expect(avisoDelHome(PRENDIDO, TODO, 9)).toBeNull();
    expect(avisoDelHome(PRENDIDO, { sueno: true, animo: false }, 9)).toBeNull();
  });

  it('en el medio del día no aparece, aunque falte todo', () => {
    expect(avisoDelHome(PRENDIDO, NADA, 15)).toBeNull();
  });

  it('⚠️ con el ritual apagado NO aparece, aunque acá adentro no moleste', () => {
    // Apagó el ritual: mostrarlo igual sería desobedecer el único control que
    // tiene sobre esto.
    expect(avisoDelHome(RITUAL_APAGADO, NADA, 9)).toBeNull();
  });

  it('⚠️⚠️ si la tarjeta que frena ya pidió lo mismo, el aviso se calla', () => {
    // Dos cosas distintas pidiendo el mismo dato en la misma pantalla es lo que
    // hace que la gente apague las dos.
    expect(avisoDelHome(PRENDIDO, NADA, 9, 'sueno')).toBeNull();
    expect(avisoDelHome(PRENDIDO, NADA, 22, 'animo')).toBeNull();
  });

  it('pero si la tarjeta pidió OTRA cosa, el aviso sigue', () => {
    expect(avisoDelHome(PRENDIDO, NADA, 9, 'animo')?.hoja).toBe('sueno');
  });

  it('⚠️ devuelve UNO o ninguno, nunca los dos', () => {
    // Con los dos, el Home dejaría de ser un recordatorio y sería una lista de
    // tareas.
    const a = avisoDelHome(PRENDIDO, NADA, 9);
    expect(a).not.toBeNull();
    expect(Array.isArray(a)).toBe(false);
  });
});

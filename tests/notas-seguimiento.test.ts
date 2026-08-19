import { describe, expect, it } from 'vitest';
import { franjaDe, franjaDominante, notaDeActividad } from '@/lib/notas-seguimiento';

/** Marca en un día, a una hora local. */
const m = (fecha: string, hora: string) => ({ fecha, creado: `${fecha}T${hora}:00` });

describe('franjaDe', () => {
  it('parte el día como lo parte cualquiera', () => {
    expect(franjaDe('2026-07-29T08:00:00')).toBe('mañana');
    expect(franjaDe('2026-07-29T15:00:00')).toBe('tarde');
    expect(franjaDe('2026-07-29T22:00:00')).toBe('noche');
    expect(franjaDe('2026-07-29T03:00:00')).toBe('noche');
  });
});

describe('franjaDominante', () => {
  it('necesita al menos cinco marcas', () => {
    const pocas = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'].map((f) => m(f, '22:00'));
    expect(franjaDominante(pocas)).toBeNull();
  });

  it('con cinco marcas de noche, es de noche', () => {
    const noches = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'].map((f) => m(f, '21:30'));
    expect(franjaDominante(noches)).toBe('noche');
  });

  it('si están repartidas, no hay franja', () => {
    expect(
      franjaDominante([
        m('2026-07-20', '08:00'),
        m('2026-07-21', '14:00'),
        m('2026-07-22', '21:00'),
        m('2026-07-23', '09:00'),
        m('2026-07-24', '16:00'),
      ]),
    ).toBeNull();
  });
});

describe('notaDeActividad', () => {
  const cincoNoches = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'].map((f) => m(f, '22:00'));

  it('sin marcas no dice nada', () => {
    expect(notaDeActividad([], '2026-07-29')).toBeNull();
  });

  // Lo que pidió Matías, y en la forma que corresponde: habla de cuándo la
  // MARCÁS (que es lo que sabemos), no de cuándo la hacés.
  it('avisa de la franja y propone la mañana', () => {
    const n = notaDeActividad([...cincoNoches, m('2026-07-25', '22:00')], '2026-07-25');
    expect(n?.clase).toBe('horario');
    expect(n?.texto).toMatch(/marcás/i);
    expect(n?.texto).toMatch(/mañana/i);
  });

  // Volver primero: a alguien que retoma después de dos semanas no se le dice
  // que viene flojo.
  it('celebrar la vuelta gana sobre todo lo demás', () => {
    const n = notaDeActividad([...cincoNoches, m('2026-08-10', '22:00')], '2026-08-10');
    expect(n?.clase).toBe('vuelta');
    expect(n?.texto).toMatch(/17 días/);
  });

  it('un hueco corto no se comenta', () => {
    const n = notaDeActividad([...cincoNoches, m('2026-07-26', '22:00')], '2026-07-26');
    expect(n?.clase).not.toBe('vuelta');
  });

  // ⚠️ Este caso NO puede tener un hueco de 7 días o más justo antes de hoy: eso
  // es una vuelta y gana. "Viene costando" es otra cosa: seguís apareciendo,
  // pero cada vez menos. (El primer intento de este test tenía un hueco de 56
  // días y fallaba con razón.)
  it('dice que viene costando solo si hay historia para afirmarlo', () => {
    // Horas repartidas a propósito: con todas en la misma franja ganaría la nota
    // de horario, que va antes (es neutral y accionable; "viene costando" es lo
    // más cerca del reproche y por eso queda último).
    const vieja = [
      m('2026-06-01', '09:00'),
      m('2026-06-03', '15:00'),
      m('2026-06-05', '21:00'),
      m('2026-07-20', '08:00'),
      m('2026-07-25', '16:00'),
      m('2026-07-28', '22:00'),
    ];
    expect(notaDeActividad(vieja, '2026-07-28')?.clase).toBe('cuesta');
  });

  it('una actividad recién empezada nunca "viene costando"', () => {
    const nueva = [m('2026-07-27', '10:00'), m('2026-07-29', '15:00')];
    expect(notaDeActividad(nueva, '2026-07-29')).toBeNull();
  });
});

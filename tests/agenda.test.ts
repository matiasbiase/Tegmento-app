import { describe, expect, it } from 'vitest';
import {
  extraerMarcaAgenda,
  limpiarMarcaAgenda,
  inicioDe,
  fechaDeInicio,
  horaDeInicio,
  etiquetaDiaAgenda,
} from '@/lib/agenda';

describe('extraerMarcaAgenda', () => {
  it('extrae título, fecha y hora', () => {
    expect(extraerMarcaAgenda('Te lo anoto.\n[+agenda: Turno del dentista | 2026-07-23 | 10:00]')).toEqual({
      titulo: 'Turno del dentista',
      fecha: '2026-07-23',
      hora: '10:00',
    });
  });

  it('acepta eventos sin hora (todo el día)', () => {
    expect(extraerMarcaAgenda('[+agenda: Boulder con Lena | 2026-07-25]')).toEqual({
      titulo: 'Boulder con Lena',
      fecha: '2026-07-25',
      hora: null,
    });
  });

  it('devuelve null si no hay marca', () => {
    expect(extraerMarcaAgenda('un mensaje cualquiera')).toBeNull();
  });

  it('devuelve null si la fecha no es válida', () => {
    expect(extraerMarcaAgenda('[+agenda: Algo | mañana]')).toBeNull();
    expect(extraerMarcaAgenda('[+agenda: Algo | 2026-13-40]')).toBeNull();
  });

  it('devuelve null si la hora no es válida (pero no rompe)', () => {
    expect(extraerMarcaAgenda('[+agenda: Algo | 2026-07-23 | 25:99]')).toEqual({
      titulo: 'Algo',
      fecha: '2026-07-23',
      hora: null,
    });
  });
});

describe('limpiarMarcaAgenda', () => {
  it('saca la marca del texto', () => {
    expect(limpiarMarcaAgenda('Dale, te lo agendo.\n[+agenda: Turno | 2026-07-23 | 10:00]')).toBe('Dale, te lo agendo.');
  });
});

describe('inicioDe / fechaDeInicio / horaDeInicio', () => {
  it('arma el inicio con y sin hora', () => {
    expect(inicioDe('2026-07-23', '10:00')).toBe('2026-07-23T10:00');
    expect(inicioDe('2026-07-25', null)).toBe('2026-07-25');
  });

  it('descompone el inicio', () => {
    expect(fechaDeInicio('2026-07-23T10:00')).toBe('2026-07-23');
    expect(fechaDeInicio('2026-07-25')).toBe('2026-07-25');
    expect(horaDeInicio('2026-07-23T10:00')).toBe('10:00');
    expect(horaDeInicio('2026-07-25')).toBeNull();
  });

  it('descompone también el formato ISO de Google (con segundos y Z)', () => {
    expect(fechaDeInicio('2026-07-23T10:00:00.000Z')).toBe('2026-07-23');
    expect(horaDeInicio('2026-07-23T10:00:00.000Z')).toBe('10:00');
  });
});

describe('etiquetaDiaAgenda', () => {
  const hoy = new Date(2026, 6, 22); // miércoles 22/07/2026

  it('hoy y mañana', () => {
    expect(etiquetaDiaAgenda('2026-07-22', hoy)).toBe('Hoy · miércoles 22');
    expect(etiquetaDiaAgenda('2026-07-23', hoy)).toBe('Mañana · jueves 23');
  });

  it('resto de la semana con día y número', () => {
    expect(etiquetaDiaAgenda('2026-07-25', hoy)).toBe('Sábado 25');
  });

  it('otro mes incluye el mes', () => {
    expect(etiquetaDiaAgenda('2026-08-03', hoy)).toBe('Lunes 3 de agosto');
  });
});

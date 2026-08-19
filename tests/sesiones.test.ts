import { describe, expect, it } from 'vitest';
import { agruparEnSesiones, etiquetaSesion, partirSesiones } from '@/lib/sesiones';

const m = (rol: string, contenido: string, creado?: string | null) => ({ rol, contenido, creado });

describe('agruparEnSesiones', () => {
  it('parte por día del calendario', () => {
    const s = agruparEnSesiones([
      m('user', 'hola', '2026-07-27T10:00:00'),
      m('assistant', 'qué tal', '2026-07-27T10:00:30'),
      m('user', 'volví', '2026-07-29T09:00:00'),
    ]);
    expect(s.map((x) => x.dia)).toEqual(['2026-07-27', '2026-07-29']);
    expect(s[0].mensajes).toHaveLength(2);
    expect(s[1].mensajes).toHaveLength(1);
  });

  it('no parte lo que pasó el mismo día aunque sea a horas distintas', () => {
    const s = agruparEnSesiones([
      m('user', 'temprano', '2026-07-29T08:00:00'),
      m('user', 'de noche', '2026-07-29T23:30:00'),
    ]);
    expect(s).toHaveLength(1);
  });

  // Un mensaje recién enviado todavía no tiene fecha del server: es de hoy.
  it('pega los mensajes sin fecha a la sesión abierta', () => {
    const s = agruparEnSesiones([m('user', 'viejo', '2026-07-27T10:00:00'), m('user', 'recién', null)]);
    expect(s).toHaveLength(1);
    expect(s[0].mensajes).toHaveLength(2);
  });

  it('con la lista vacía no inventa sesiones', () => {
    expect(agruparEnSesiones([])).toEqual([]);
  });
});

describe('partirSesiones', () => {
  it('pliega lo anterior y deja abierta la última', () => {
    const { plegadas, abierta } = partirSesiones([
      m('user', 'lunes', '2026-07-27T10:00:00'),
      m('user', 'martes', '2026-07-28T10:00:00'),
      m('user', 'hoy', '2026-07-29T10:00:00'),
    ]);
    expect(plegadas.map((s) => s.dia)).toEqual(['2026-07-27', '2026-07-28']);
    expect(abierta?.dia).toBe('2026-07-29');
  });

  // Si se plegara todo, volver a un chat viejo abriría una pantalla vacía.
  it('un chat de un solo día no pliega nada', () => {
    const { plegadas, abierta } = partirSesiones([m('user', 'hola', '2026-07-29T10:00:00')]);
    expect(plegadas).toEqual([]);
    expect(abierta?.mensajes).toHaveLength(1);
  });
});

describe('etiquetaSesion', () => {
  const ahora = new Date('2026-07-29T12:00:00');
  it('dice Hoy y Ayer', () => {
    expect(etiquetaSesion('2026-07-29', ahora)).toBe('Hoy');
    expect(etiquetaSesion('2026-07-28', ahora)).toBe('Ayer');
  });

  it('para lo más viejo escribe el día', () => {
    expect(etiquetaSesion('2026-07-22', ahora)).toMatch(/22 de julio/);
  });
});

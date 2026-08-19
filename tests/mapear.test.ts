import { describe, it, expect } from 'vitest';
import { mapearMail, mapearEvento } from '@/lib/google/mapear';

describe('mapearMail', () => {
  it('extrae remitente, asunto y fecha', () => {
    const fila = mapearMail({
      id: 'abc',
      snippet: 'Hola Matías…',
      internalDate: '1781200000000',
      payload: {
        headers: [
          { name: 'From', value: 'Mariana K <mariana@estudiok.com>' },
          { name: 'Subject', value: 'Feedback portfolio' },
        ],
      },
    });
    expect(fila.gmailId).toBe('abc');
    expect(fila.remitente).toBe('Mariana K');
    expect(fila.asunto).toBe('Feedback portfolio');
    expect(fila.recibido).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('tolera headers faltantes', () => {
    const fila = mapearMail({ id: 'x' });
    expect(fila.asunto).toBe('(sin asunto)');
    expect(fila.remitente).toBe('(desconocido)');
    expect(fila.recibido).toBeNull();
  });
});

describe('mapearEvento', () => {
  it('evento con hora', () => {
    const fila = mapearEvento({
      id: 'ev1',
      summary: 'Clase de alemán',
      start: { dateTime: '2026-06-12T14:30:00+02:00' },
      end: { dateTime: '2026-06-12T16:00:00+02:00' },
    });
    expect(fila.titulo).toBe('Clase de alemán');
    expect(fila.inicio).toContain('2026-06-12');
  });

  it('evento de día completo y sin título', () => {
    const fila = mapearEvento({ id: 'ev2', start: { date: '2026-06-15' }, end: { date: '2026-06-16' } });
    expect(fila.titulo).toBe('(sin título)');
    expect(fila.inicio).toBe('2026-06-15T00:00:00');
  });
});

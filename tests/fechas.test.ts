import { describe, it, expect } from 'vitest';
import { etiquetaFecha } from '@/lib/fechas';

const ahora = new Date('2026-06-11T15:00:00');

describe('etiquetaFecha', () => {
  it('hoy → hora', () => {
    expect(etiquetaFecha('2026-06-11T11:42:00', ahora)).toBe('11:42');
  });
  it('ayer → Ayer', () => {
    expect(etiquetaFecha('2026-06-10T20:00:00', ahora)).toBe('Ayer');
  });
  it('misma semana → día corto capitalizado', () => {
    expect(etiquetaFecha('2026-06-08T09:00:00', ahora)).toBe('Lun');
  });
  it('más viejo → fecha corta', () => {
    expect(etiquetaFecha('2026-05-20T09:00:00', ahora)).toBe('20/05');
  });
});

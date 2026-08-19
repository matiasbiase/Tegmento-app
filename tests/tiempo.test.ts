import { describe, it, expect } from 'vitest';
import { horasPorArea } from '@/lib/tiempo';

describe('horasPorArea', () => {
  it('suma horas de eventos por área', () => {
    const horas = horasPorArea([
      { areaId: 1, inicio: '2026-06-08T10:00:00Z', fin: '2026-06-08T12:00:00Z' },
      { areaId: 1, inicio: '2026-06-09T10:00:00Z', fin: '2026-06-09T11:30:00Z' },
      { areaId: 2, inicio: '2026-06-09T14:00:00Z', fin: '2026-06-09T15:00:00Z' },
    ]);
    expect(horas.get(1)).toBeCloseTo(3.5);
    expect(horas.get(2)).toBeCloseTo(1);
  });

  it('ignora eventos sin área o con duración inválida', () => {
    const horas = horasPorArea([
      { areaId: null, inicio: '2026-06-08T10:00:00Z', fin: '2026-06-08T12:00:00Z' },
      { areaId: 3, inicio: '2026-06-08T12:00:00Z', fin: '2026-06-08T10:00:00Z' },
    ]);
    expect(horas.size).toBe(0);
  });
});

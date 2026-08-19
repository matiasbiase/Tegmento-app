import { describe, expect, it } from 'vitest';
import { ABIERTAS, aperturaActividad, aperturaTema, elegirApertura } from '@/lib/aperturas';

describe('aperturas del Home', () => {
  it('mete el título en la frase', () => {
    expect(aperturaActividad('el alemán', new Date('2026-07-28T10:00:00Z'))).toContain('el alemán');
    expect(aperturaTema('la mudanza', new Date('2026-07-28T10:00:00Z'))).toContain('la mudanza');
  });

  it('no cambia dentro del mismo día', () => {
    const manana = aperturaActividad('el alemán', new Date('2026-07-28T07:00:00Z'));
    const noche = aperturaActividad('el alemán', new Date('2026-07-28T22:00:00Z'));
    expect(manana).toBe(noche);
  });

  // Lo que motivó todo esto: Matías veía SIEMPRE la misma pregunta.
  it('cambia de un día para otro', () => {
    const hoy = aperturaActividad('el alemán', new Date('2026-07-28T10:00:00Z'));
    const manana = aperturaActividad('el alemán', new Date('2026-07-29T10:00:00Z'));
    expect(manana).not.toBe(hoy);
  });

  it('a lo largo de una semana usa varias formas distintas', () => {
    const vistas = new Set<string>();
    for (let d = 0; d < 7; d++) {
      vistas.add(aperturaActividad('el alemán', new Date(`2026-07-${20 + d}T10:00:00Z`)));
    }
    expect(vistas.size).toBeGreaterThanOrEqual(5);
  });
});

describe('elegirApertura', () => {
  const POOL = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Fechas locales a propósito: la franja se decide con la hora del teléfono.
  const manana = new Date(2026, 6, 28, 9, 0);
  const tarde = new Date(2026, 6, 28, 16, 0);
  const noche = new Date(2026, 6, 28, 22, 0);

  it('no se queda con la misma frase todo el día', () => {
    // Lo que marcó Matías: a la noche seguía esperándolo la de la mañana.
    expect(elegirApertura(POOL, manana)).not.toBe(elegirApertura(POOL, tarde));
    expect(elegirApertura(POOL, tarde)).not.toBe(elegirApertura(POOL, noche));
  });

  it('no cambia dentro de la misma franja', () => {
    // Si cambiara en cada refresh dejaría de ser algo que la app te dijo.
    expect(elegirApertura(POOL, new Date(2026, 6, 28, 16, 5))).toBe(elegirApertura(POOL, new Date(2026, 6, 28, 19, 40)));
  });

  it('al día siguiente no repite la franja anterior', () => {
    expect(elegirApertura(POOL, new Date(2026, 6, 29, 9, 0))).not.toBe(elegirApertura(POOL, manana));
  });

  it('sin nada que decir devuelve null y la app se calla', () => {
    expect(elegirApertura([], manana)).toBeNull();
    expect(elegirApertura(['', '  '], manana)).toBeNull();
  });

  it('con una sola opción la devuelve siempre', () => {
    expect(elegirApertura(['única'], manana)).toBe('única');
    expect(elegirApertura(['única'], noche)).toBe('única');
  });

  it('las abiertas invitan a contar o a anotar, y son varias', () => {
    expect(ABIERTAS.length).toBeGreaterThanOrEqual(5);
    expect(ABIERTAS.every((a) => a.trim().endsWith('?'))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { diasDeExperimento, limpiarExperimento, notasDeExperimento } from '@/lib/experimentos';
import { armarDisparadores } from '@/lib/disparadores';
import { confianzaSegunEvidencia } from '@/lib/observacion-valida';

const VACIO = { patronesConfirmados: [], actividades: [], factoresRecientes: [], diasSinSueno: null };

describe('experimentos', () => {
  it('cuenta los días desde que arrancó', () => {
    const notas = notasDeExperimento('2026-07-20T10:00:00.000Z');
    expect(diasDeExperimento(notas, new Date('2026-07-24T10:00:00.000Z'))).toBe(4);
  });

  it('una actividad común no es un experimento', () => {
    expect(diasDeExperimento('Salió de algo que notó el Analista.')).toBeNull();
    expect(diasDeExperimento(null)).toBeNull();
  });

  it('una nota rota no rompe nada', () => {
    expect(diasDeExperimento('Experimento del Analista · arrancó cualquiera')).toBeNull();
  });
});

describe('limpiarExperimento', () => {
  // El botón ya dice "+ probar:", así que el "Probá" del modelo sobra.
  it('saca el "Probá" del principio', () => {
    expect(limpiarExperimento('Probá acostarte antes tres noches')).toBe('acostarte antes tres noches');
    expect(limpiarExperimento('Intentá llevarte el almuerzo')).toBe('llevarte el almuerzo');
  });

  it('deja en paz lo que ya viene bien', () => {
    expect(limpiarExperimento('anotar cómo estás al despertar')).toBe('anotar cómo estás al despertar');
  });

  // Lo que salió mal de verdad: "…incluso si estás " cortado a la mitad.
  it('no parte palabras al recortar', () => {
    const largo = 'programar dos sesiones cortas de bouldering esta semana, incluso si estás cansado';
    const r = limpiarExperimento(largo);
    expect(r.length).toBeLessThanOrEqual(73);
    expect(r).toMatch(/…$/);
    expect(r).not.toMatch(/\s…$/);
  });
});

describe('la app vuelve a preguntar por el experimento', () => {
  it('no pregunta antes de los 3 días', () => {
    const d = armarDisparadores({ ...VACIO, experimentos: [{ titulo: 'Acostarte antes', dias: 1 }] });
    expect(d).toHaveLength(0);
  });

  it('a los 3 días pregunta cómo fue', () => {
    const d = armarDisparadores({ ...VACIO, experimentos: [{ titulo: 'Acostarte antes', dias: 3 }] });
    expect(d[0].texto).toContain('acostarte antes');
    expect(d[0].texto).toMatch(/qué tal/i);
  });

  // Es lo único de la lista que él aceptó hacer: va antes que cualquier otra cosa.
  it('va primero, arriba de los patrones confirmados', () => {
    const d = armarDisparadores({
      ...VACIO,
      patronesConfirmados: ['Dormís mejor cuando entrenás'],
      experimentos: [{ titulo: 'Acostarte antes', dias: 5 }],
    });
    expect(d[0].texto).toMatch(/qué tal/i);
    expect(d.length).toBeGreaterThan(1);
  });
});

describe('la confianza se cuenta, no se cree', () => {
  // El caso real del 28/07: "alta" con una sola fecha citada.
  it('una sola fecha no puede ser confianza alta', () => {
    expect(confianzaSegunEvidencia('El 2026-07-25 registraste libido 2/5.', 'alta')).toBe('baja');
  });

  it('dos o tres fechas topean en media', () => {
    expect(confianzaSegunEvidencia('2026-07-01 y 2026-07-05.', 'alta')).toBe('media');
    expect(confianzaSegunEvidencia('2026-07-01, 2026-07-05 y 2026-07-09.', 'alta')).toBe('media');
  });

  it('con cuatro o más, la alta se respeta', () => {
    const e = '2026-07-01, 2026-07-05, 2026-07-09 y 2026-07-14.';
    expect(confianzaSegunEvidencia(e, 'alta')).toBe('alta');
  });

  it('nunca sube una confianza que el modelo puso prudente', () => {
    const e = '2026-07-01, 2026-07-05, 2026-07-09 y 2026-07-14.';
    expect(confianzaSegunEvidencia(e, 'baja')).toBe('baja');
  });

  // La misma fecha repetida no suma: son menciones, no días distintos.
  it('cuenta días distintos, no menciones', () => {
    expect(confianzaSegunEvidencia('El 2026-07-25 y otra vez el 2026-07-25.', 'alta')).toBe('baja');
  });

  it('sin fechas citadas, no toca nada', () => {
    expect(confianzaSegunEvidencia('Los días que entrenás.', 'media')).toBe('media');
  });
});

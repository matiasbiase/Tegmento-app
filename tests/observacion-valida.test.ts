import { describe, it, expect } from 'vitest';
import { esObservacionValida, esHiloValido, evidenciaCoherente, limpiarObservacion } from '@/lib/observacion-valida';

describe('esObservacionValida', () => {
  it('rechaza las etiquetas que devolvió el análisis del 25/07', () => {
    // Los casos reales que Matías cazó: "¿por qué dolor y persistencia es un patrón?"
    expect(esObservacionValida('dolor y persistencia')).toBe(false);
    expect(esObservacionValida('gasto recurrente')).toBe(false);
    expect(esObservacionValida('compensación/recompensa')).toBe(false);
    expect(esObservacionValida('preocupación por la salud')).toBe(false);
    expect(esObservacionValida('auto-análisis y monitoreo del estado de ánimo')).toBe(false);
  });

  it('acepta las frases que sí conectan dos cosas', () => {
    expect(
      esObservacionValida('Los días que jugás al fútbol con el pie lesionado, al día siguiente tu ánimo aparece más bajo'),
    ).toBe(true);
    expect(esObservacionValida('Las semanas con varios gastos seguidos coinciden con un ánimo más apagado')).toBe(true);
    expect(esObservacionValida('Cuando dormís menos de 7 horas, la energía del otro día baja a 2')).toBe(true);
  });

  it('rechaza una frase larga que igual no relaciona nada', () => {
    expect(esObservacionValida('Matías está atravesando un momento de cambios importantes en su vida')).toBe(false);
  });

  it('no se cuelga con vacío', () => {
    expect(esObservacionValida('')).toBe(false);
    expect(esObservacionValida('   ')).toBe(false);
  });
});

describe('esHiloValido', () => {
  it('rechaza el título suelto', () => {
    expect(esHiloValido('reflexión sobre cambios recientes en Alemania')).toBe(false);
  });

  it('acepta una tensión bien contada', () => {
    expect(esHiloValido('El trabajo te da sentido pero te está comiendo el descanso de la semana')).toBe(true);
  });
});

describe('evidenciaCoherente', () => {
  const DESDE = '2026-06-25';
  const HASTA = '2026-07-25';

  it('rechaza la evidencia inventada del 25/07 (fechas de 2024)', () => {
    // El modelo devolvió esto citando datos que no existen en la base.
    expect(
      evidenciaCoherente('Varios tickets con montos elevados (ej: 2024-03-12 $5800, 2024-03-19 $6200)', DESDE, HASTA),
    ).toBe(false);
    expect(evidenciaCoherente('El 2024-03-05 dormiste hasta la 1:30 AM', DESDE, HASTA)).toBe(false);
  });

  it('acepta la evidencia que cae dentro de la ventana analizada', () => {
    expect(evidenciaCoherente('El 2026-07-21 registraste el ánimo en bajón tras dormir 5h', DESDE, HASTA)).toBe(true);
    expect(evidenciaCoherente('Los registros del 2026-06-30 y 2026-07-14 lo muestran', DESDE, HASTA)).toBe(true);
  });

  it('acepta evidencia sin ninguna fecha', () => {
    expect(evidenciaCoherente('El día que anotaste el bajón después del partido', DESDE, HASTA)).toBe(true);
  });

  it('rechaza años sueltos de afuera de la ventana', () => {
    expect(evidenciaCoherente('Como venís haciendo desde marzo de 2024', DESDE, HASTA)).toBe(false);
  });
});

describe('limpiarObservacion', () => {
  it('saca el paréntesis que es solo una lista de fechas', () => {
    expect(
      limpiarObservacion(
        'Los días que dormís más de 8 horas (2026-07-21, 2026-07-23 y 2026-07-25) tu libido tiende a estar más alta.',
      ),
    ).toBe('Los días que dormís más de 8 horas tu libido tiende a estar más alta.');
  });

  it('saca la escala interna con la preposición que la introduce', () => {
    // El caso real del 29/07: la frase terminaba en "hacia el 3/5".
    expect(
      limpiarObservacion(
        'Las noches con menos de 8 horas de sueño coinciden con una caída en tu nivel de energía hacia el 3/5.',
      ),
    ).toBe('Las noches con menos de 8 horas de sueño coinciden con una caída en tu nivel de energía.');
  });

  it('saca las dos cosas juntas y no deja costuras', () => {
    expect(
      limpiarObservacion(
        'Las noches con menos de 8 horas de sueño (2026-07-26, 2026-07-27 y 2026-07-28) coinciden con una caída en tu nivel de energía hacia el 3/5.',
      ),
    ).toBe('Las noches con menos de 8 horas de sueño coinciden con una caída en tu nivel de energía.');
  });

  it('saca la fecha suelta con el artículo que la presenta', () => {
    expect(limpiarObservacion('El día 2026-07-22 gastaste más de lo habitual y anotaste cansancio')).toBe(
      'El día gastaste más de lo habitual y anotaste cansancio.',
    );
  });

  it('no toca los números que SÍ significan algo', () => {
    const t = 'Las noches de menos de 7h de sueño vienen seguidas de días flojos.';
    expect(limpiarObservacion(t)).toBe(t);
  });

  it('deja intacta una observación que ya venía limpia', () => {
    const t = '¿Será que los días de mucho gasto vienen con una sensación de carga?';
    expect(limpiarObservacion(t)).toBe(t);
  });
});

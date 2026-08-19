import { describe, expect, it } from 'vitest';
import { fallbackHighlight, promptHighlight, type DatosHighlight } from '@/lib/highlights';

/**
 * `fallbackHighlight` es **lo que Matías lee cuando Ollama no está**, así que es
 * de lo poco que tiene que funcionar justo cuando todo lo demás falló. Estaba sin
 * tests (R.5 del informe del 13/08).
 */
function datos(p: Partial<DatosHighlight> = {}): DatosHighlight {
  return {
    nombre: 'Matías',
    rueda: [],
    animoReciente: [],
    deadlines: [],
    ultimaEntrada: null,
    ...p,
  } as DatosHighlight;
}

const area = (nombre: string, actual: number, deseado: number, foco = false) => ({
  nombre,
  actual,
  deseado,
  foco,
});

describe('el highlight sin IA', () => {
  it('nunca queda vacío: siempre saluda', () => {
    expect(fallbackHighlight(datos())).toContain('Hola Matías');
  });

  it('⚠️ habla de dirección, no de puntajes — "4 de 5" lee como boletín', () => {
    const t = fallbackHighlight(datos({ rueda: [area('Salud física', 3, 5, true)] }));
    expect(t).toContain('Salud física');
    expect(t).not.toContain('3/5');
    expect(t).not.toContain('3 de 5');
  });

  it('prioriza un área marcada como foco sobre una con más gap', () => {
    const t = fallbackHighlight(
      datos({ rueda: [area('Finanzas', 1, 5), area('Salud física', 3, 4, true)] }),
    );
    expect(t).toContain('Salud física');
    expect(t).not.toContain('Finanzas');
  });

  it('sin foco, elige la de más distancia entre donde está y donde quiere', () => {
    const t = fallbackHighlight(datos({ rueda: [area('Ocio', 4, 5), area('Finanzas', 1, 5)] }));
    expect(t).toContain('Finanzas');
  });

  it('un área que ya llegó no se propone como pendiente', () => {
    const t = fallbackHighlight(datos({ rueda: [area('Ocio', 5, 5, true)] }));
    expect(t).toBe('Hola Matías.');
  });

  it('dice "hoy vence" y no "en 0 días"', () => {
    const t = fallbackHighlight(datos({ deadlines: [{ titulo: 'Examen LID', dias: 0 }] }));
    expect(t).toContain('Hoy vence');
    expect(t).not.toContain('0 día');
  });

  it('el ánimo general no se nombra como si fuera un área', () => {
    const t = fallbackHighlight(datos({ animoReciente: [{ area: 'general', estado: 'bien', cuando: 'ayer' }] }));
    expect(t).toContain('venías');
    expect(t).not.toContain('general,');
  });
});

describe('el prompt del highlight', () => {
  it('marca el foco, que es lo que el modelo tiene que priorizar', () => {
    const p = promptHighlight(datos({ rueda: [area('Contexto', 3, 4, true)] }));
    expect(p).toContain('[foco]');
  });

  it('⚠️ dice explícitamente cuando NO hay datos, en vez de mandar un hueco', () => {
    // Un campo vacío se lee como "no pasó nada"; "(sin registros recientes)" se
    // lee como "no hay dato". Al modelo hay que decírselo.
    const p = promptHighlight(datos());
    expect(p).toContain('(sin registros recientes)');
    expect(p).toContain('(ninguno cercano)');
  });

  it('sin última entrada no deja la etiqueta colgada', () => {
    expect(promptHighlight(datos())).not.toContain('ÚLTIMA ENTRADA');
  });
});

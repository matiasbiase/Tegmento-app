import { describe, expect, it } from 'vitest';
import { sugeridosDe } from '@/lib/sugeridos';

describe('sugeridosDe', () => {
  it('saca el texto y la ruta de un link interno', () => {
    const s = sugeridosDe('¿Arrancamos? [Un rato de foco](/foco)');
    expect(s).toHaveLength(1);
    expect(s[0].texto).toBe('Un rato de foco');
    expect(s[0].href).toBe('/foco');
  });

  it('agrupa por destino: el mismo dos veces es un solo chip', () => {
    expect(sugeridosDe('[Foco](/foco) y si querés [otra vez foco](/foco)')).toHaveLength(1);
  });

  // La fila de arriba del teclado, no un menú.
  it('no pasa de tres', () => {
    const s = sugeridosDe('[a](/foco) [b](/calma) [c](/animo) [d](/rueda) [e](/historial)');
    expect(s).toHaveLength(3);
  });

  it('sin links no devuelve nada', () => {
    expect(sugeridosDe('Te escucho, ¿qué es lo que te tiene así?')).toEqual([]);
    expect(sugeridosDe(null)).toEqual([]);
    expect(sugeridosDe('')).toEqual([]);
  });

  it('ignora URLs externas', () => {
    expect(sugeridosDe('mirá [esto](https://ejemplo.com)')).toEqual([]);
  });

  describe('el color dice de qué se trata', () => {
    it('lo del cuerpo va en verde', () => {
      // ⚠️ Esto decía `/animo`, que se borró el 05/08 (su contenido se despliega
      // ahora desde la pastilla de Ánimo, en Cuerpo). El test siguió compilando
      // y falló bien: la ruta muerta caía al color por defecto.
      expect(sugeridosDe('[Respirar](/calma)')[0].color).toBe(sugeridosDe('[Ánimo](/cuerpo)')[0].color);
    });

    it('hacer algo va en otro color que descansar', () => {
      expect(sugeridosDe('[Foco](/foco)')[0].color).not.toBe(sugeridosDe('[Calma](/calma)')[0].color);
    });

    it('lo que no tiene color propio cae en el lila de la app', () => {
      expect(sugeridosDe('[Ver mi rueda](/rueda)')[0].color).toBe('var(--color-iris-deep)');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  DIAS_HASTA_OLVIDARLO,
  DIAS_PARA_SER_CABO,
  caboDelDia,
  cabosSueltos,
  yaSeEngancho,
} from '@/lib/cabos-sueltos';

const hoy = '2026-08-07';
/** Una fecha a N días para atrás de `hoy`. */
function haceDias(n: number): string {
  const d = new Date(`${hoy}T00:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const tema = (nombre: string, dias: number) => ({ nombre, ultimaVez: haceDias(dias) });

describe('yaSeEngancho', () => {
  // ⚠️⚠️ Es el cruce que hace útil a todo esto: un tema que ya es una actividad
  // no es un cabo suelto, y preguntar por él sería la app haciéndose la
  // desmemoriada.
  it('reconoce cuando el tema es parte de un título más largo', () => {
    expect(yaSeEngancho('alemán', ['Alemán B2 para diciembre'])).toBe(true);
  });

  it('y cuando el título es parte del tema, que es la otra dirección', () => {
    expect(yaSeEngancho('buscar trabajo de cuidados', ['buscar trabajo'])).toBe(true);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(yaSeEngancho('ALEMAN', ['alemán'])).toBe(true);
  });

  it('no engancha lo que no se parece', () => {
    expect(yaSeEngancho('mudanza', ['Alemán', 'Bouldern'])).toBe(false);
  });

  it('un tema vacío nunca es un cabo', () => {
    expect(yaSeEngancho('   ', [])).toBe(true);
  });
});

describe('cabosSueltos', () => {
  it('deja pasar lo que quedó sin enganchar', () => {
    const r = cabosSueltos([tema('mudanza', 5)], ['Alemán'], hoy);
    expect(r).toEqual([{ tema: 'mudanza', dias: 5 }]);
  });

  // ⚠️ Lo de hoy o de ayer no es un cabo suelto: es una conversación en curso.
  // Preguntar por eso sería la app apurándote.
  it('lo muy reciente todavía no cuenta', () => {
    expect(cabosSueltos([tema('mudanza', DIAS_PARA_SER_CABO - 1)], [], hoy)).toEqual([]);
  });

  // ⚠️ Y lo muy viejo tampoco: eso ya lo dejaste, y preguntarlo se siente como
  // que la app te revuelve el cajón.
  it('lo muy viejo se da por olvidado', () => {
    expect(cabosSueltos([tema('mudanza', DIAS_HASTA_OLVIDARLO + 1)], [], hoy)).toEqual([]);
  });

  it('lo que ya es una actividad no aparece', () => {
    expect(cabosSueltos([tema('alemán', 5)], ['Alemán B2'], hoy)).toEqual([]);
  });

  it('ordena del más fresco al más viejo', () => {
    const r = cabosSueltos([tema('viejo', 20), tema('fresco', 4)], [], hoy);
    expect(r.map((c) => c.tema)).toEqual(['fresco', 'viejo']);
  });

  // Un mismo tema puede venir de varias charlas.
  it('no repite el mismo tema dos veces', () => {
    const r = cabosSueltos([tema('mudanza', 4), tema('Mudanza', 9)], [], hoy);
    expect(r).toEqual([{ tema: 'mudanza', dias: 4 }]);
  });

  it('sin temas no devuelve nada', () => {
    expect(cabosSueltos([], ['Alemán'], hoy)).toEqual([]);
  });
});

describe('caboDelDia', () => {
  it('sin cabos no hay pregunta', () => {
    expect(caboDelDia([], hoy)).toBeNull();
  });

  // ⚠️ El mismo todo el día: si cambiara en cada refresh sería desconcertante.
  it('es estable dentro del mismo día', () => {
    const cabos = cabosSueltos([tema('a', 4), tema('b', 6), tema('c', 8)], [], hoy);
    expect(caboDelDia(cabos, hoy)).toEqual(caboDelDia(cabos, hoy));
  });

  it('con uno solo, devuelve ese', () => {
    const cabos = cabosSueltos([tema('mudanza', 5)], [], hoy);
    expect(caboDelDia(cabos, hoy)?.tema).toBe('mudanza');
  });

  // ⚠️ Rota, para que no se vuelva un cartel fijo.
  it('cambia de un día para el otro', () => {
    const cabos = [
      { tema: 'a', dias: 4 },
      { tema: 'b', dias: 5 },
      { tema: 'c', dias: 6 },
    ];
    const elegidos = new Set(
      ['2026-08-07', '2026-08-08', '2026-08-09'].map((d) => caboDelDia(cabos, d)?.tema),
    );
    expect(elegidos.size).toBeGreaterThan(1);
  });

  // ⚠️ Solo rota entre los tres más frescos: sobre veinte se vuelve un archivo
  // que se recita en vez de una pregunta.
  it('nunca elige uno que no esté entre los tres más frescos', () => {
    const cabos = Array.from({ length: 10 }, (_, i) => ({ tema: `t${i}`, dias: i + 4 }));
    const elegidos = Array.from({ length: 30 }, (_, i) => {
      const d = new Date('2026-01-01T00:00:00');
      d.setDate(d.getDate() + i);
      return caboDelDia(cabos, d.toISOString().slice(0, 10))?.tema;
    });
    expect(new Set(elegidos)).toEqual(new Set(['t0', 't1', 't2']));
  });
});

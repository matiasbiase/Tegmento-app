import { describe, it, expect } from 'vitest';
import {
  candidatos,
  desdeMes,
  temperatura,
  temperaturaEnPalabras,
  type Temperatura,
} from '@/lib/objetivos-arranque';

/** Marcas a N días de "hoy", que en todos los tests es 2026-07-30. */
const HOY = '2026-07-30';

function haceDias(n: number): string {
  const d = new Date(`${HOY}T00:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function marcas(...dias: number[]) {
  return dias.map((n) => ({ fecha: haceDias(n) }));
}

describe('temperatura', () => {
  it('sin un solo movimiento se calla: null, no "frío"', () => {
    // Un objetivo recién anotado no está frío, está sin empezar. Decirle frío
    // sería un reproche por algo que todavía no pasó.
    expect(temperatura([], HOY)).toBeNull();
  });

  it('varias veces en los últimos días: caliente', () => {
    expect(temperatura(marcas(0, 2, 5), HOY)).toBe('caliente');
  });

  it('⚠️ una sola vez reciente NO alcanza para caliente', () => {
    // Es el caso que hace mentir a la escala: tocar algo una vez después de
    // meses quietos no lo vuelve caliente.
    expect(temperatura(marcas(1, 200, 240), HOY)).toBe('activo');
  });

  it('algo del último mes pero nada reciente: viene bajando', () => {
    expect(temperatura(marcas(20, 25, 28), HOY)).toBe('templado');
  });

  it('nada en 30 días: frío', () => {
    expect(temperatura(marcas(45, 60, 90), HOY)).toBe('frío');
  });

  it('ignora marcas en el futuro', () => {
    // Un evento de agenda de la semana que viene no calienta nada hoy.
    expect(temperatura([{ fecha: '2026-08-15' }, ...marcas(50)], HOY)).toBe('frío');
  });
});

describe('temperaturaEnPalabras', () => {
  const todas: Temperatura[] = ['caliente', 'activo', 'templado', 'frío'];

  it('⚠️ ninguna manda a hacer nada ni felicita a nadie', () => {
    // La regla de "nada de arengas" (lib/objetivos.ts) mirada del otro lado: si
    // una frase se puede leer con voz de entrenador —o de reto— está mal escrita.
    const prohibidas = /aflojes|dale|vamos|retom|volvé|deberías|tenés que|falta|poco|mal|!|¡/i;
    for (const t of todas) {
      expect(temperaturaEnPalabras(t)).not.toMatch(prohibidas);
    }
  });

  it('describe la cosa, no a la persona: nada de "estás"', () => {
    // "Estás haciendo poco" juzga; "está frío" describe. Es la diferencia que
    // marcó Matías el 30/07 y es toda la razón de que exista esta escala.
    for (const t of todas) {
      expect(temperaturaEnPalabras(t)).not.toMatch(/\bestás\b|\bvenís\b/i);
    }
  });

  it('frío se dice frío', () => {
    expect(temperaturaEnPalabras('frío')).toBe('está frío');
  });
});

describe('desdeMes', () => {
  it('el mes, no la fecha exacta', () => {
    expect(desdeMes('2026-03-12', HOY)).toBe('desde marzo');
  });

  it('cuando cruzó de año lo dice, o "marzo" parecería de hace cuatro meses', () => {
    expect(desdeMes('2025-10-02', HOY)).toBe('desde octubre del año pasado');
  });

  it('más de un año atrás lleva el año', () => {
    expect(desdeMes('2024-05-02', HOY)).toBe('desde mayo de 2024');
  });
});

describe('candidatos', () => {
  const aleman = { titulo: 'Alemán', marcas: marcas(...Array.from({ length: 40 }, (_, i) => i * 4)) };

  it('propone lo que tiene arco largo y sostenido', () => {
    const [c] = candidatos([aleman], [], HOY);
    expect(c.titulo).toBe('Alemán');
    expect(c.temperatura).toBe('caliente');
  });

  it('⚠️ NUNCA muestra la cantidad de veces', () => {
    // Es el pedido literal de Matías: "no me gusta el noventa y seis veces".
    // El número existe adentro (`dias`) porque ordena; afuera no sale nunca.
    const [c] = candidatos([aleman], [], HOY);
    expect(c.frase).not.toMatch(/\d/);
    expect(c.frase).toBe('desde febrero, y viene caliente');
  });

  it('⚠️ no propone algo que ya es un objetivo', () => {
    // "Alemán" contra el objetivo "Aprender alemán": proponerlo sería ofrecerle
    // duplicar sus propios datos, y los movimientos automáticos irían a los dos.
    expect(candidatos([aleman], ['Aprender alemán'], HOY)).toHaveLength(0);
  });

  it('descarta lo de arco corto: dos semanas no es un objetivo', () => {
    const nuevo = { titulo: 'Correr', marcas: marcas(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12) };
    expect(candidatos([nuevo], [], HOY)).toHaveLength(0);
  });

  it('descarta el arco largo con pocas marcas: probado tres veces no es "algo en lo que venís"', () => {
    const suelto = { titulo: 'Guitarra', marcas: marcas(10, 90, 180) };
    expect(candidatos([suelto], [], HOY)).toHaveLength(0);
  });

  it('primero el arco más largo, y como mucho dos', () => {
    const corto = { titulo: 'Yoga', marcas: marcas(...Array.from({ length: 15 }, (_, i) => i * 4)) };
    const medio = { titulo: 'Postulaciones', marcas: marcas(...Array.from({ length: 20 }, (_, i) => i * 10)) };
    // Postulaciones abarca 190 días y Alemán 156: el más largo va primero, y
    // Yoga (56 días) queda afuera aunque también califique.
    const salida = candidatos([corto, aleman, medio], [], HOY);
    expect(salida).toHaveLength(2);
    expect(salida.map((c) => c.titulo)).toEqual(['Postulaciones', 'Alemán']);
  });

  it('lo que viene frío igual se propone, sin retarlo', () => {
    // Que algo esté frío no lo descalifica como objetivo — al contrario, puede
    // ser justo lo que se le perdió de vista. Pero se dice como un hecho.
    const frio = { titulo: 'Escribir', marcas: marcas(...Array.from({ length: 14 }, (_, i) => 60 + i * 8)) };
    const [c] = candidatos([frio], [], HOY);
    expect(c.temperatura).toBe('frío');
    expect(c.frase).toMatch(/está frío$/);
  });
});

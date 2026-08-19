import { describe, it, expect } from 'vitest';
import {
  arcoEnPalabras,
  diasEntre,
  estimarDeCerrados,
  granularidad,
  horasPuestas,
  progresoDeMeta,
  proyeccion,
  reencuadre,
  ritmoReciente,
  serieArco,
  tieneMeta,
  type Movimiento,
} from '@/lib/objetivos';

function mov(fecha: string, horas: number | null = null): Movimiento {
  return { fecha, horas, nota: null, origen: 'manual' };
}

describe('diasEntre', () => {
  it('cuenta días enteros', () => {
    expect(diasEntre('2026-07-01', '2026-07-30')).toBe(29);
    expect(diasEntre('2026-07-30', '2026-07-30')).toBe(0);
  });

  it('nunca da negativo, y una fecha ilegible no revienta', () => {
    expect(diasEntre('2026-07-30', '2026-07-01')).toBe(0);
    expect(diasEntre('cualquiera', '2026-07-01')).toBe(0);
  });
});

describe('arcoEnPalabras', () => {
  it('el caso que motivó la pantalla: nueve meses y dos semanas', () => {
    expect(arcoEnPalabras('2025-10-12', '2026-07-30')).toBe('9 meses y 2 semanas');
  });

  it('más de un año', () => {
    expect(arcoEnPalabras('2025-03-03', '2026-07-30')).toBe('1 año y 4 meses');
  });

  it('recién empezado habla en DÍAS, no en "0 meses"', () => {
    // "0 meses" convertiría un objetivo de 6 días en un fracaso el primer día.
    expect(arcoEnPalabras('2026-07-24', '2026-07-30')).toBe('6 días');
    expect(arcoEnPalabras('2026-07-29', '2026-07-30')).toBe('1 día');
  });

  it('entre dos semanas y dos meses habla en semanas', () => {
    expect(arcoEnPalabras('2026-06-02', '2026-07-21')).toBe('7 semanas');
  });

  it('un año justo no dice "y 0 meses"', () => {
    expect(arcoEnPalabras('2025-07-30', '2026-07-30')).toBe('1 año');
  });
});

describe('granularidad', () => {
  it('lo corto se dibuja en semanas y lo largo en meses', () => {
    expect(granularidad('2026-07-24', '2026-07-30')).toBe('semanas');
    expect(granularidad('2025-10-12', '2026-07-30')).toBe('meses');
  });
});

describe('serieArco', () => {
  it('agrupa por mes y la altura es relativa al mes más movido', () => {
    const movs = [
      mov('2026-07-02'), mov('2026-07-10'),
      mov('2026-06-01'),
      mov('2026-05-01'), mov('2026-05-02'), mov('2026-05-03'), mov('2026-05-04'),
    ];
    const cols = serieArco(movs, '2025-10-12', '2026-07-30', 3);
    expect(cols.map((c) => c.clave)).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(cols.map((c) => c.cuantos)).toEqual([4, 1, 2]);
    expect(cols.map((c) => c.alto)).toEqual([100, 25, 50]);
  });

  it('un período vacío queda en 0, para pintarlo gris y NO rojo', () => {
    const cols = serieArco([mov('2026-07-02')], '2025-10-12', '2026-07-30', 2);
    expect(cols[0]).toMatchObject({ cuantos: 0, alto: 0 });
  });

  it('sin ningún movimiento, ninguna columna se infla', () => {
    const cols = serieArco([], '2025-10-12', '2026-07-30', 3);
    expect(cols.every((c) => c.alto === 0 && c.cuantos === 0)).toBe(true);
  });

  it('en un objetivo corto agrupa por semana', () => {
    const cols = serieArco([mov('2026-07-30'), mov('2026-07-29')], '2026-07-24', '2026-07-30', 2);
    expect(cols.at(-1)?.cuantos).toBe(2);
  });
});

describe('reencuadre', () => {
  const arranco = { arranco: '2025-10-12' };

  it('EL CASO DE MATÍAS: el hueco chico al lado del arco largo', () => {
    // "si vengo nueve meses y después un par de semanas no busco, siento que
    // abandoné todo. Miro los otros nueve meses y digo: che, estuve trabajando."
    const movs = [mov('2026-07-14'), mov('2026-05-02'), mov('2025-11-01')];
    expect(reencuadre(movs, arranco, '2026-07-30')).toBe('2 semanas sin moverlo. Antes de eso, 9 meses y 2 semanas.');
  });

  it('con movimiento reciente cuenta el arco sin felicitar a nadie', () => {
    const t = reencuadre([mov('2026-07-28')], arranco, '2026-07-30');
    expect(t).toBe('Lo venís moviendo. 9 meses y 2 semanas en esto.');
  });

  it('recién empezado no pretende que hay un arco largo', () => {
    const t = reencuadre([mov('2026-07-25')], { arranco: '2026-07-24' }, '2026-07-30');
    expect(t).toBe('Arrancó hace 6 días. En un par de semanas se empieza a ver la forma.');
  });

  it('nuevo y sin movimientos avisa que todavía no hay nada que mirar', () => {
    expect(reencuadre([], { arranco: '2026-07-24' }, '2026-07-30')).toBe(
      'Arrancó hace 6 días. Todavía no hay arco para mirar.',
    );
  });

  it('arco largo sin movimientos: dice el hecho y CÓMO se llena, sin inventar nada', () => {
    // Pasa al anotar un objetivo que viene de antes que la app. Una tarjeta muda
    // no se entiende, así que se dice lo único útil en ese momento.
    const t = reencuadre([], arranco, '2026-07-30');
    expect(t).toBe(
      'Anotado desde el 12/10/2025, sin movimientos todavía. Se van a sumar solos cuando marques algo que se llame parecido.',
    );
    // Y sigue sin ser una arenga.
    expect(t).not.toMatch(/!|¡/);
  });

  it('nunca escribe una arenga ni un signo de exclamación', () => {
    const casos = [
      reencuadre([mov('2026-07-14')], arranco, '2026-07-30'),
      reencuadre([mov('2026-07-28')], arranco, '2026-07-30'),
      reencuadre([], { arranco: '2026-07-29' }, '2026-07-30'),
    ];
    for (const t of casos) {
      expect(t).not.toMatch(/!|¡/);
      expect(t?.toLowerCase()).not.toMatch(/aflojes|vamos|dale|bien ahí|felicit|orgullo/);
    }
  });
});

describe('horasPuestas', () => {
  it('suma las horas que se saben', () => {
    expect(horasPuestas([mov('2026-07-01', 2), mov('2026-07-02', 1.5)], null)).toEqual({
      horas: 3.5,
      movimientos: 2,
      estimadas: false,
    });
  });

  it('SIN horasPorVez no inventa horas: solo cuenta movimientos', () => {
    // Es la diferencia entre saber y suponer. La app no supone sola.
    expect(horasPuestas([mov('2026-07-01'), mov('2026-07-02')], null)).toEqual({
      horas: null,
      movimientos: 2,
      estimadas: false,
    });
  });

  it('con horasPorVez estima, y AVISA que estimó', () => {
    // El número sale de lo que dijo Matías, no de un promedio de la app.
    expect(horasPuestas([mov('2026-07-01'), mov('2026-07-02')], 0.75)).toEqual({
      horas: 1.5,
      movimientos: 2,
      estimadas: true,
    });
  });

  it('mezcla reales y estimadas, y sigue avisando', () => {
    const r = horasPuestas([mov('2026-07-01', 2), mov('2026-07-02')], 1);
    expect(r).toEqual({ horas: 3, movimientos: 2, estimadas: true });
  });

  it('sin movimientos no hay horas', () => {
    expect(horasPuestas([], 1)).toEqual({ horas: null, movimientos: 0, estimadas: false });
  });
});

describe('progresoDeMeta', () => {
  it('con meta y horas estimadas da la barra', () => {
    expect(progresoDeMeta({ fechaMeta: '2026-11-15', horasEstimadas: 330 }, 212)).toEqual({
      porcentaje: 64,
      hechas: 212,
      totales: 330,
    });
  });

  it('UN OBJETIVO ABIERTO NO PUEDE TENER PORCENTAJE', () => {
    // Sin denominador no hay fracción. Es la regla central de la sección.
    expect(progresoDeMeta({ fechaMeta: null, horasEstimadas: 330 }, 212)).toBeNull();
  });

  it('con meta pero sin horas estimadas tampoco', () => {
    expect(progresoDeMeta({ fechaMeta: '2026-11-15', horasEstimadas: null }, 212)).toBeNull();
  });

  it('no pasa del 100 aunque se hayan puesto más horas', () => {
    expect(progresoDeMeta({ fechaMeta: '2026-11-15', horasEstimadas: 100 }, 150)?.porcentaje).toBe(100);
  });
});

describe('proyeccion', () => {
  const conMeta = { fechaMeta: '2026-11-15', horasEstimadas: 330 };

  it('EL RITMO VA SIEMPRE EN LA FRASE, no solo el resultado', () => {
    // Sin la premisa, "llegás con 3 semanas de sobra" es un oráculo.
    const p = proyeccion(conMeta, 212, 10, '2026-07-30');
    expect(p?.llega).toBe(true);
    expect(p?.texto).toContain('Al ritmo de las últimas semanas');
  });

  it('SI VA ATRASADO LO DICE IGUAL, y con el mismo tono', () => {
    const p = proyeccion(conMeta, 100, 1, '2026-07-30');
    expect(p?.llega).toBe(false);
    expect(p?.texto).toContain('no llegás');
    expect(p?.texto).toMatch(/h por semana/);
    expect(p?.texto).not.toMatch(/!|¡/);
  });

  it('sin ritmo dice cuánto haría falta, en vez de callarse', () => {
    const p = proyeccion(conMeta, 100, 0, '2026-07-30');
    expect(p?.llega).toBe(false);
    expect(p?.texto).toMatch(/harían falta/);
  });

  it('si ya puso las horas, no proyecta: informa', () => {
    const p = proyeccion(conMeta, 340, 5, '2026-07-30');
    expect(p?.llega).toBe(true);
    expect(p?.texto).toContain('Ya pusiste');
  });

  it('UN OBJETIVO ABIERTO NUNCA PROYECTA', () => {
    expect(proyeccion({ fechaMeta: null, horasEstimadas: 330 }, 212, 10, '2026-07-30')).toBeNull();
  });

  it('con la fecha ya pasada no proyecta nada', () => {
    expect(proyeccion(conMeta, 212, 10, '2026-12-01')).toBeNull();
  });
});

describe('ritmoReciente', () => {
  it('promedia las horas por semana de la ventana', () => {
    const movs = [mov('2026-07-29', 4), mov('2026-07-22', 4), mov('2026-01-01', 100)];
    // Solo entran las dos recientes: 8 h en 8 semanas = 1 h/semana.
    expect(ritmoReciente(movs, null, '2026-07-30', 8)).toBe(1);
  });

  it('sin nada reciente el ritmo es cero', () => {
    expect(ritmoReciente([mov('2026-01-01', 50)], null, '2026-07-30', 8)).toBe(0);
  });
});

describe('estimarDeCerrados', () => {
  it('da un RANGO, no un número', () => {
    const cerrados = [
      { titulo: 'Mudarme', arranco: '2026-06-02', cerrado: '2026-07-21' },
      { titulo: 'Mudanza vieja', arranco: '2025-01-01', cerrado: '2025-02-05' },
      { titulo: 'Otra', arranco: '2024-03-01', cerrado: '2024-04-26' },
    ];
    expect(estimarDeCerrados(cerrados)).toBe('Los 3 que cerraste te llevaron entre 5 y 8 semanas.');
  });

  it('CON UN SOLO CASO SE CALLA', () => {
    // Un caso no es un rango: presentarlo como tal le da a un dato el peso de tres.
    expect(estimarDeCerrados([{ titulo: 'Mudarme', arranco: '2026-06-02', cerrado: '2026-07-21' }])).toBeNull();
  });

  it('ignora los que no están cerrados', () => {
    expect(
      estimarDeCerrados([
        { titulo: 'a', arranco: '2026-06-02', cerrado: null },
        { titulo: 'b', arranco: '2026-06-02', cerrado: '2026-07-21' },
      ]),
    ).toBeNull();
  });

  it('si todos duraron lo mismo no finge un rango', () => {
    const t = estimarDeCerrados([
      { titulo: 'a', arranco: '2026-01-01', cerrado: '2026-01-15' },
      { titulo: 'b', arranco: '2026-02-01', cerrado: '2026-02-15' },
    ]);
    expect(t).toBe('Los 2 que cerraste te llevaron 2 semanas.');
  });
});

describe('tieneMeta', () => {
  it('la fecha es lo que define el tipo', () => {
    expect(tieneMeta({ fechaMeta: '2026-11-15' })).toBe(true);
    expect(tieneMeta({ fechaMeta: null })).toBe(false);
  });
});

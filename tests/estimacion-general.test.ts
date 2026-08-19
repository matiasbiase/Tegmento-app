import { describe, it, expect } from 'vitest';
import { concuerdan, validarEstimacion, validarEstimacionWeb } from '@/lib/estimacion-general';
import { dominioDe } from '@/lib/buscar';

const BUENA = {
  sabe: true,
  cantidad: 750,
  unidad: 'horas',
  fuente: 'el Goethe-Institut',
  detalle: 'de clase, para ir de cero a B2',
};

describe('validarEstimacion — lo que pasa', () => {
  it('un número con un organismo detrás se muestra', () => {
    const e = validarEstimacion(BUENA);
    expect(e).not.toBeNull();
    expect(e!.texto).toBe('Suele estimarse en unas 750 horas, de clase, para ir de cero a B2.');
    expect(e!.fuente).toBe('el Goethe-Institut');
  });

  it('saca el "según" de adelante, que lo pone la UI', () => {
    expect(validarEstimacion({ ...BUENA, fuente: 'según el Goethe-Institut' })!.fuente).toBe('el Goethe-Institut');
  });

  it('anda sin detalle', () => {
    const e = validarEstimacion({ ...BUENA, detalle: undefined });
    expect(e!.texto).toBe('Suele estimarse en unas 750 horas.');
  });
});

describe('validarEstimacion — callarse es el resultado esperado', () => {
  it('cuando el modelo dice que no sabe', () => {
    expect(validarEstimacion({ sabe: false })).toBeNull();
  });

  it('cuando no contestó nada parseable', () => {
    expect(validarEstimacion(null)).toBeNull();
    expect(validarEstimacion('750 horas')).toBeNull();
    expect(validarEstimacion({})).toBeNull();
  });

  it('⚠️ cuando la "fuente" es una forma de no tener fuente', () => {
    // Es el filtro que más trabaja: el modelo completa el campo igual cuando no
    // tiene a quién nombrar, porque contestar es su default.
    for (const fuente of [
      'estudios recientes',
      'la experiencia general',
      'varias fuentes',
      'internet',
      'expertos en el tema',
      'el promedio de la gente',
      'el consenso de la comunidad',
      'otros usuarios',
    ]) {
      expect(validarEstimacion({ ...BUENA, fuente })).toBeNull();
    }
  });

  it('cuando la fuente viene vacía', () => {
    expect(validarEstimacion({ ...BUENA, fuente: '' })).toBeNull();
    expect(validarEstimacion({ ...BUENA, fuente: '  ' })).toBeNull();
    expect(validarEstimacion({ ...BUENA, fuente: undefined })).toBeNull();
  });

  it('cuando el número no es un número, o es absurdo', () => {
    expect(validarEstimacion({ ...BUENA, cantidad: 0 })).toBeNull();
    expect(validarEstimacion({ ...BUENA, cantidad: -5 })).toBeNull();
    expect(validarEstimacion({ ...BUENA, cantidad: 'muchas' })).toBeNull();
    // 90.000 horas de clase para un B2 es la clase de número que tira un modelo
    // cuando pierde el hilo, y sale con la misma seguridad que el bueno.
    expect(validarEstimacion({ ...BUENA, cantidad: 90_000 })).toBeNull();
    expect(validarEstimacion({ ...BUENA, unidad: 'meses', cantidad: 900 })).toBeNull();
  });

  it('cuando la unidad no es una de las tres', () => {
    expect(validarEstimacion({ ...BUENA, unidad: 'años' })).toBeNull();
    expect(validarEstimacion({ ...BUENA, unidad: '' })).toBeNull();
  });

  it('⚠️ "sabe" tiene que ser true de verdad, no parecido a true', () => {
    // Si alcanzara con que sea "truthy", un `sabe: "false"` (string) pasaría,
    // y el string "false" es truthy en JS.
    expect(validarEstimacion({ ...BUENA, sabe: 'false' })).toBeNull();
    expect(validarEstimacion({ ...BUENA, sabe: 1 })).toBeNull();
  });
});

describe('cómo se dice', () => {
  it('⚠️ habla en general, NUNCA le promete nada a Matías', () => {
    // "Te va a llevar 750 horas" es una promesa sobre su vida que la app no
    // tiene con qué sostener: el número es de un folleto, no de sus datos.
    const t = validarEstimacion(BUENA)!.texto;
    expect(t).toMatch(/^Suele estimarse/);
    expect(t).not.toMatch(/\bte\b|\bvas\b|\bvos\b|\btu\b|tuyo/i);
  });

  it('no arenga ni exclama, como el resto de Objetivos', () => {
    expect(validarEstimacion(BUENA)!.texto).not.toMatch(/[!¡]/);
  });
});

// ── LA VARIANTE CON BÚSQUEDA ─────────────────────────────────────────────────

const RESULTADOS = [
  { url: 'https://www.escuelita.com/cursos', dominio: 'escuelita.com' },
  { url: 'https://www.goethe.de/de/spr/kup/tst/gzb2.html', dominio: 'goethe.de' },
  { url: 'https://blog.random.net/aleman', dominio: 'random.net' },
];

const WEB = { sabe: true, cantidad: 750, unidad: 'horas', resultado: 2, detalle: 'de clase desde cero' };

describe('validarEstimacionWeb', () => {
  it('la fuente sale de la URL del resultado, no de lo que escriba el modelo', () => {
    // Es lo único que permite llamar a esto "verificado": el modelo señala un
    // resultado que ya existe y el dominio lo pone el código.
    const e = validarEstimacionWeb(WEB, RESULTADOS);
    expect(e!.fuente).toBe('goethe.de');
    expect(e!.texto).toBe('Suele estimarse en unas 750 horas, de clase desde cero.');
  });

  it('⚠️ un índice fuera de rango se descarta entero', () => {
    // Señalar el resultado 7 cuando hay 3 es la señal de que se lo inventó.
    expect(validarEstimacionWeb({ ...WEB, resultado: 7 }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, resultado: 0 }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, resultado: -1 }, RESULTADOS)).toBeNull();
  });

  it('sin índice no hay fuente, y sin fuente no se muestra', () => {
    expect(validarEstimacionWeb({ ...WEB, resultado: undefined }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, resultado: 'el segundo' }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, resultado: 1.5 }, RESULTADOS)).toBeNull();
  });

  it('⚠️ el modelo NO puede meter un dominio que no esté en la lista', () => {
    // Aunque lo mande explícito: el campo `fuente` ni se lee en esta variante.
    const e = validarEstimacionWeb({ ...WEB, fuente: 'la NASA' }, RESULTADOS);
    expect(e!.fuente).toBe('goethe.de');
  });

  it('sin resultados no hay nada que señalar', () => {
    expect(validarEstimacionWeb(WEB, [])).toBeNull();
  });

  it('sigue rechazando números absurdos y unidades raras', () => {
    expect(validarEstimacionWeb({ ...WEB, cantidad: 90_000 }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, unidad: 'años' }, RESULTADOS)).toBeNull();
    expect(validarEstimacionWeb({ ...WEB, sabe: false }, RESULTADOS)).toBeNull();
  });
});

describe('dominioDe', () => {
  it('saca el www', () => {
    expect(dominioDe('https://www.goethe.de/algo?x=1')).toBe('goethe.de');
  });

  it('una URL rota devuelve vacío, y eso descarta el resultado', () => {
    expect(dominioDe('no soy una url')).toBe('');
    expect(dominioDe('')).toBe('');
  });
});

describe('concuerdan — la búsqueda confirma, no pisa', () => {
  const e = (cantidad: number, unidad = 'horas') => ({ texto: '', fuente: '', cantidad, unidad });

  it('la misma cifra redondeada distinto, concuerda', () => {
    expect(concuerdan(e(750), e(800))).toBe(true);
    expect(concuerdan(e(600), e(750))).toBe(true);
  });

  it('⚠️ el caso real: 750 del Goethe (B2) contra 1200 de un blog (que es C2)', () => {
    // Probado el 30/07. El buscador encuentra la tabla y el modelo se equivoca
    // de fila; si esto concordara, la tarjeta mostraría la cifra de C2 en un
    // objetivo de B2, y encima marcada como verificada.
    expect(concuerdan(e(750), e(1200))).toBe(false);
  });

  it('unidades distintas nunca concuerdan', () => {
    // Pasar horas a semanas necesita saber cuántas horas por semana, que es
    // justo lo que nadie sabe.
    expect(concuerdan(e(40, 'horas'), e(40, 'semanas'))).toBe(false);
  });

  it('un cero no concuerda con nada', () => {
    expect(concuerdan(e(0), e(0))).toBe(false);
  });
});

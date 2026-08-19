import { describe, expect, it } from 'vitest';
import { armarTira, contarCosas, indiceDeHoy, recortar } from '@/lib/tira';
import { diaVacio, type DetalleDia } from '@/lib/dia';

function dia(cambios: Partial<DetalleDia>): DetalleDia {
  return { ...diaVacio(), ...cambios };
}

describe('recortar', () => {
  it('deja corto lo que ya entra', () => {
    expect(recortar('Cumpleaños de Sofi')).toBe('Cumpleaños de Sofi');
  });

  it('corta en el espacio cuando el espacio cae tarde', () => {
    // El último espacio dentro del límite está en 24, o sea pasado el 60% de 30:
    // cortar ahí cuesta poco y deja palabras enteras.
    expect(recortar('Me salió bien la charla con Sofi', 30)).toBe('Me salió bien la charla con…');
  });

  it('⚠️ corta al medio de la palabra si el único espacio cae MUY temprano', () => {
    // Espacio en 10 contra un límite de 30: respetarlo tiraría dos tercios del
    // renglón para no partir una palabra que igual no entra entera. Se prefiere
    // usar el largo disponible.
    expect(recortar('a'.repeat(10) + ' ' + 'b'.repeat(80), 30)).toBe('a'.repeat(10) + ' ' + 'b'.repeat(19) + '…');
  });

  it('corta duro si no hay ningún espacio', () => {
    expect(recortar('x'.repeat(50), 10)).toBe('x'.repeat(10) + '…');
  });

  it('aplasta los saltos de línea, que en un renglón rompen el layout', () => {
    expect(recortar('hola\n\n  mundo')).toBe('hola mundo');
  });
});

describe('contarCosas', () => {
  it('cuenta el sueño como una sola cosa aunque no sea una lista', () => {
    expect(contarCosas(dia({ sueno: { hs: 7, calidad: null } }))).toBe(1);
  });

  it('suma todo lo del día', () => {
    const d = dia({
      hechas: ['Alemán', 'Correr'],
      fotos: [{ path: 'a.jpg', hora: '10:00' }],
      gastos: [{ comercio: 'Rewe', total: 12, moneda: 'EUR' }],
    });
    expect(contarCosas(d)).toBe(4);
  });
});

describe('armarTira · quién se lleva el título', () => {
  const hoy = '2026-08-06';

  it('el evento le gana a los gastos: un cumpleaños no es un día de compras', () => {
    const t = armarTira(
      {
        '2026-08-05': dia({
          eventos: [{ titulo: 'Cumpleaños de Sofi', hora: '20:00' }],
          gastos: [
            { comercio: 'Rewe', total: 12, moneda: 'EUR' },
            { comercio: 'Bar', total: 30, moneda: 'EUR' },
          ],
        }),
      },
      {},
      hoy,
    );
    expect(t[0].titulo).toBe('Cumpleaños de Sofi');
    expect(t[0].categoria).toBe('evento');
    expect(t[0].detalle).toBe('2 gastos');
  });

  it('lo que escribió él le gana al resumen de la charla', () => {
    const t = armarTira(
      {
        '2026-08-05': dia({
          notas: [{ texto: 'Me salió bien la entrevista', hora: '18:00' }],
          charlas: [{ texto: 'Hablaron del trabajo', hora: '19:00' }],
        }),
      },
      {},
      hoy,
    );
    expect(t[0].titulo).toBe('Me salió bien la entrevista');
    // Las dos son categoría 'nota', así que la charla queda contada en el resto.
    expect(t[0].detalle).toBe('');
    expect(t[0].cuantas).toBe(2);
  });

  it('un día de solo sueño lo dice con las horas', () => {
    const t = armarTira({ '2026-08-05': dia({ sueno: { hs: 7.5, calidad: 'bien' } }) }, {}, hoy);
    expect(t[0].titulo).toBe('Dormiste 7.5 h');
  });

  it('el resto se cuenta y se corta en tres, no se inventaria', () => {
    const t = armarTira(
      {
        '2026-08-05': dia({
          eventos: [{ titulo: 'Dentista', hora: '09:00' }],
          hechas: ['Alemán'],
          notas: [{ texto: 'n', hora: '1' }],
          gastos: [{ comercio: 'Rewe', total: 1, moneda: 'EUR' }],
          comidas: [{ nota: 'pasta', hora: '13:00' }],
          fotos: [{ path: 'a.jpg', hora: '10:00' }],
        }),
      },
      {},
      hoy,
    );
    expect(t[0].detalle.split(' · ')).toHaveLength(3);
    expect(t[0].detalle).toBe('una actividad · una nota · un gasto');
  });
});

describe('armarTira · el orden y el futuro', () => {
  const hoy = '2026-08-06';

  it('ordena de futuro a pasado', () => {
    const t = armarTira(
      {
        '2026-08-01': dia({ hechas: ['viejo'] }),
        '2026-10-15': dia({ eventos: [{ titulo: 'Viaje', hora: null }] }),
        '2026-08-06': dia({ hechas: ['hoy'] }),
      },
      {},
      hoy,
    );
    expect(t.map((d) => d.clave)).toEqual(['2026-10-15', '2026-08-06', '2026-08-01']);
  });

  it('⚠️ el evento futuro NO se pierde: sacada la grilla, la tira es la única forma de llegar a él', () => {
    const t = armarTira({ '2026-10-15': dia({ eventos: [{ titulo: 'Viaje', hora: null }] }) }, {}, hoy);
    expect(t).toHaveLength(1);
    expect(t[0].futuro).toBe(true);
  });

  it('hoy no es futuro', () => {
    const t = armarTira({ '2026-08-06': dia({ hechas: ['x'] }) }, {}, hoy);
    expect(t[0].futuro).toBe(false);
  });

  it('un día de ciclo sin nada más igual aparece: la grilla lo pintaba y no se puede perder', () => {
    const t = armarTira({}, { '2026-08-04': 'periodo' }, hoy);
    expect(t).toHaveLength(1);
    expect(t[0].titulo).toBe('Período');
    expect(t[0].cuantas).toBe(0);
  });

  it('un día vacío de verdad no ensucia la tira', () => {
    const t = armarTira({ '2026-08-04': diaVacio() }, {}, hoy);
    expect(t).toEqual([]);
  });

  it('el ciclo no duplica un día que ya tiene cosas', () => {
    const t = armarTira({ '2026-08-04': dia({ hechas: ['Correr'] }) }, { '2026-08-04': 'periodo' }, hoy);
    expect(t).toHaveLength(1);
    expect(t[0].titulo).toBe('Correr');
  });
});

describe('indiceDeHoy', () => {
  const hoy = '2026-08-06';
  const armar = (claves: string[]) =>
    armarTira(Object.fromEntries(claves.map((c) => [c, dia({ hechas: ['x'] })])), {}, hoy);

  it('cae en hoy cuando hoy existe', () => {
    const t = armar(['2026-10-15', '2026-08-06', '2026-08-01']);
    expect(t[indiceDeHoy(t, hoy)].clave).toBe('2026-08-06');
  });

  it('sin hoy, elige el día más cercano y no el primero de la lista', () => {
    // 08-05 está a 1 día; 10-15 está a 70. Arriba está el futuro, así que el
    // primero de la lista es el LEJANO: abrir en el índice 0 sería abrir en octubre.
    const t = armar(['2026-10-15', '2026-08-05']);
    expect(t[indiceDeHoy(t, hoy)].clave).toBe('2026-08-05');
  });

  it('si el futuro está más cerca que el pasado, gana el futuro', () => {
    const t = armar(['2026-08-07', '2026-01-01']);
    expect(t[indiceDeHoy(t, hoy)].clave).toBe('2026-08-07');
  });

  it('todo en el pasado: cae en el más reciente', () => {
    const t = armar(['2026-08-01', '2026-07-01']);
    expect(t[indiceDeHoy(t, hoy)].clave).toBe('2026-08-01');
  });

  it('todo en el futuro: cae en el más próximo, o sea el último de la lista', () => {
    const t = armar(['2026-12-01', '2026-09-01']);
    expect(t[indiceDeHoy(t, hoy)].clave).toBe('2026-09-01');
  });

  it('tira vacía no rompe', () => {
    expect(indiceDeHoy([], hoy)).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { SIN_TITULO, TITULO_PRIVADO, carpetasDe, esReciente, filtrarNotas, notaVacia, ordenarNotas, partirNota, resumenNota, seMuestra, tituloVisible, type Nota, unirNota } from '@/lib/notas';

function nota(p: Partial<Nota> & { id: number }): Nota {
  return {
    titulo: '',
    cuerpo: '',
    carpeta: null,
    creado: '2026-07-01T10:00:00.000Z',
    actualizado: '2026-07-01T10:00:00.000Z',
    ...p,
  };
}

describe('partirNota', () => {
  it('toma el primer renglón como título', () => {
    expect(partirNota('Lo de la mudanza\nNo sé si es el lugar o soy yo.')).toEqual({
      titulo: 'Lo de la mudanza',
      cuerpo: 'No sé si es el lugar o soy yo.',
    });
  });

  it('sin salto de línea, todo es título', () => {
    expect(partirNota('Siesta rara')).toEqual({ titulo: 'Siesta rara', cuerpo: '' });
  });

  it('conserva el renglón en blanco que despega el título del texto', () => {
    // Si el cuerpo se trimeara, este aire se perdería en cada guardado — y como
    // se guarda mientras se escribe, el texto se movería solo bajo el cursor.
    const { cuerpo } = partirNota('Título\n\nPrimer párrafo');
    expect(cuerpo).toBe('\nPrimer párrafo');
  });

  it('conserva los renglones vacíos del medio', () => {
    const { cuerpo } = partirNota('T\nuno\n\n\ndos');
    expect(cuerpo).toBe('uno\n\n\ndos');
  });

  it('ida y vuelta: partir y volver a unir no cambia el texto', () => {
    const original = 'Lo de la mudanza\n\nCada vez que pienso en firmar me agarra algo.\n\nY sin embargo.';
    const { titulo, cuerpo } = partirNota(original);
    expect(unirNota(titulo, cuerpo)).toBe(original);
  });
});

describe('tituloVisible', () => {
  it('cae al placeholder cuando el primer renglón está vacío', () => {
    expect(tituloVisible({ titulo: '' })).toBe(SIN_TITULO);
    expect(tituloVisible({ titulo: '   ' })).toBe(SIN_TITULO);
  });

  it('usa el título cuando lo hay', () => {
    expect(tituloVisible({ titulo: 'Ideas sueltas' })).toBe('Ideas sueltas');
  });
});

describe('resumenNota', () => {
  it('aplasta los saltos para que la vista previa aproveche las dos líneas', () => {
    expect(resumenNota('uno\ndos\n\ntres')).toBe('uno dos tres');
  });

  it('recorta sin partir palabras al medio', () => {
    const largo = 'Aprender a soldar y volver a tocar la guitarra alguna vez';
    const r = resumenNota(largo, 20);
    expect(r.endsWith('…')).toBe(true);
    expect(r.length).toBeLessThanOrEqual(21);
    // No corta "guit|arra": lo último es una palabra entera.
    expect(r.replace('…', '').trim().split(' ').at(-1)).toBe('y');
  });

  it('no toca lo que ya entra', () => {
    expect(resumenNota('corto')).toBe('corto');
  });
});

describe('notaVacia', () => {
  it('los espacios en blanco no cuentan como nota', () => {
    expect(notaVacia('')).toBe(true);
    expect(notaVacia('  \n\n ')).toBe(true);
    expect(notaVacia('a')).toBe(false);
  });
});

describe('ordenarNotas', () => {
  const notas = [
    nota({ id: 1, titulo: 'Zapatos', actualizado: '2026-07-01T10:00:00.000Z' }),
    nota({ id: 2, titulo: 'Ánimo', actualizado: '2026-07-03T10:00:00.000Z' }),
    nota({ id: 3, titulo: 'ñoquis', actualizado: '2026-07-02T10:00:00.000Z' }),
  ];

  it('recientes: la más nueva primero', () => {
    expect(ordenarNotas(notas, 'recientes').map((n) => n.id)).toEqual([2, 3, 1]);
  });

  it('alfabético: las tildes y la ñ caen donde corresponde', () => {
    // Con una comparación cruda, "Ánimo" se iba después de "Zapatos".
    expect(ordenarNotas(notas, 'alfabetico').map((n) => n.titulo)).toEqual(['Ánimo', 'ñoquis', 'Zapatos']);
  });

  it('no muta el array que recibe', () => {
    const antes = notas.map((n) => n.id);
    ordenarNotas(notas, 'alfabetico');
    expect(notas.map((n) => n.id)).toEqual(antes);
  });
});

describe('esReciente', () => {
  const ahora = new Date('2026-07-30T12:00:00.000Z');

  it('hoy y hace tres días, sí', () => {
    expect(esReciente('2026-07-30T09:00:00.000Z', ahora)).toBe(true);
    expect(esReciente('2026-07-27T09:00:00.000Z', ahora)).toBe(true);
  });

  it('hace un mes, no', () => {
    expect(esReciente('2026-06-30T09:00:00.000Z', ahora)).toBe(false);
  });

  it('una fecha ilegible no revienta', () => {
    expect(esReciente('cualquier cosa', ahora)).toBe(false);
  });
});

describe('filtrarNotas', () => {
  const ahora = new Date('2026-07-30T12:00:00.000Z');
  const notas = [
    nota({ id: 1, titulo: 'Lo de la mudanza', cuerpo: 'algo en el pecho', actualizado: '2026-07-30T09:00:00.000Z' }),
    nota({ id: 2, titulo: 'Ánimo raro', cuerpo: 'sin motivo', carpeta: 'Suelto', actualizado: '2026-07-29T09:00:00.000Z' }),
    nota({ id: 3, titulo: 'Vieja', cuerpo: 'de hace rato', carpeta: 'Suelto', actualizado: '2026-05-01T09:00:00.000Z' }),
  ];

  it('busca sin tildes: "animo" encuentra "Ánimo"', () => {
    expect(filtrarNotas(notas, { texto: 'animo' }, ahora).map((n) => n.id)).toEqual([2]);
  });

  it('busca también en el cuerpo', () => {
    expect(filtrarNotas(notas, { texto: 'pecho' }, ahora).map((n) => n.id)).toEqual([1]);
  });

  it('filtra por carpeta, y null son las que no tienen', () => {
    expect(filtrarNotas(notas, { carpeta: 'Suelto' }, ahora).map((n) => n.id)).toEqual([2, 3]);
    expect(filtrarNotas(notas, { carpeta: null }, ahora).map((n) => n.id)).toEqual([1]);
  });

  it('sin carpeta en el filtro, no filtra por carpeta', () => {
    expect(filtrarNotas(notas, {}, ahora)).toHaveLength(3);
  });

  it('solo recientes deja afuera la vieja', () => {
    expect(filtrarNotas(notas, { soloRecientes: true }, ahora).map((n) => n.id)).toEqual([1, 2]);
  });

  it('los filtros se acumulan', () => {
    expect(filtrarNotas(notas, { soloRecientes: true, carpeta: 'Suelto' }, ahora).map((n) => n.id)).toEqual([2]);
  });
});

describe('carpetasDe', () => {
  it('cuenta las notas de cada carpeta, ordenadas', () => {
    const notas = [
      nota({ id: 1, carpeta: 'Suelto' }),
      nota({ id: 2, carpeta: 'Mudanza' }),
      nota({ id: 3, carpeta: 'Suelto' }),
      nota({ id: 4, carpeta: null }),
    ];
    expect(carpetasDe(notas)).toEqual([
      { nombre: 'Mudanza', cuantas: 1 },
      { nombre: 'Suelto', cuantas: 2 },
    ]);
  });

  it('una carpeta en blanco no es una carpeta', () => {
    expect(carpetasDe([nota({ id: 1, carpeta: '   ' })])).toEqual([]);
  });

  it('sin notas, sin carpetas', () => {
    expect(carpetasDe([])).toEqual([]);
  });
});

// ── NOTAS PRIVADAS (31/07) ───────────────────────────────────────────────────

describe('privadas — la IA las lee, la pantalla no las muestra', () => {
  const secreta: Nota = {
    id: 9, titulo: 'Lo del jueves', cuerpo: 'algo que no quiero ver en el Home',
    carpeta: null, privada: true, creado: '2026-07-31', actualizado: '2026-07-31',
  };
  const normal: Nota = {
    id: 10, titulo: 'Ideas de películas', cuerpo: 'una peli sobre el jueves',
    carpeta: null, creado: '2026-07-31', actualizado: '2026-07-31',
  };

  it('el título queda tapado, aunque sea inocente', () => {
    // Es el primer renglón que escribió: justo lo que la vuelve reconocible.
    expect(tituloVisible(secreta)).toBe(TITULO_PRIVADO);
    expect(tituloVisible(secreta, true)).toBe('Lo del jueves');
  });

  it('una nota común no cambia', () => {
    expect(tituloVisible(normal)).toBe('Ideas de películas');
  });

  it('⚠️ NO aparece en la búsqueda mientras está bajo llave', () => {
    // El agujero menos obvio: si el buscador la encontrara, que aparezca al
    // tipear una palabra ya cuenta lo que dice adentro, aunque el título salga
    // tapado.
    const r = filtrarNotas([secreta, normal], { texto: 'jueves' });
    expect(r.map((n) => n.id)).toEqual([10]);
  });

  it('con la llave abierta se busca como cualquier otra', () => {
    const r = filtrarNotas([secreta, normal], { texto: 'jueves', desbloqueado: true });
    expect(r.map((n) => n.id)).toEqual([9, 10]);
  });

  it('seMuestra es la única puerta, para todas las pantallas', () => {
    expect(seMuestra(secreta, false)).toBe(false);
    expect(seMuestra(secreta, true)).toBe(true);
    expect(seMuestra(normal, false)).toBe(true);
  });
});

describe('filtrar por etiqueta (04/08)', () => {
  const conEtiquetas: Nota[] = [
    { id: 1, titulo: 'Mudanza', cuerpo: 'cajas', carpeta: null, etiquetas: ['Casa', 'Pendiente'], creado: '2026-08-01T10:00:00.000Z', actualizado: '2026-08-01T10:00:00.000Z' },
    { id: 2, titulo: 'Reunión', cuerpo: 'lunes', carpeta: null, etiquetas: ['trabajo'], creado: '2026-08-02T10:00:00.000Z', actualizado: '2026-08-02T10:00:00.000Z' },
    { id: 3, titulo: 'Suelta', cuerpo: 'sin nada', carpeta: null, creado: '2026-08-03T10:00:00.000Z', actualizado: '2026-08-03T10:00:00.000Z' },
  ];

  it('sin etiqueta en el filtro, pasan todas', () => {
    expect(filtrarNotas(conEtiquetas, {}).map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('una nota con varias entra por cualquiera de ellas', () => {
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Casa' }).map((n) => n.id)).toEqual([1]);
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Pendiente' }).map((n) => n.id)).toEqual([1]);
  });

  it('⚠️ compara sin mayúsculas ni tildes, como al ponerla', () => {
    // Si acá comparara literal, filtrar por "Trabajo" no encontraría la nota
    // guardada como "trabajo" y la etiqueta parecería vacía. Es el bug de los
    // 52 temas del 28/07, en su otra mitad.
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Trabajo' }).map((n) => n.id)).toEqual([2]);
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'CASA' }).map((n) => n.id)).toEqual([1]);
  });

  it('las notas sin etiquetas quedan afuera de cualquier filtro por etiqueta', () => {
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Casa' }).some((n) => n.id === 3)).toBe(false);
  });

  it('se combina con el resto de los filtros', () => {
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Casa', texto: 'cajas' }).map((n) => n.id)).toEqual([1]);
    expect(filtrarNotas(conEtiquetas, { etiqueta: 'Casa', texto: 'lunes' })).toEqual([]);
  });
});

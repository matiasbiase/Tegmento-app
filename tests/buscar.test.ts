import { describe, it, expect } from 'vitest';
import { dominioDe, mapearResultados } from '@/lib/buscar';

// `buscar.ts` es lo único de toda la app que sale de la Mac, así que lo que
// decide qué entra de ahí conviene tenerlo fijado. El `fetch` no se prueba —eso
// es SearXNG—; se prueba qué se hace con lo que devuelve.

// La forma real de una respuesta de SearXNG con `format=json`.
const RESPUESTA = {
  query: 'alemán B2 cuántas horas suele llevar',
  results: [
    {
      url: 'https://www.goethe.de/de/spr/kup/prf/prf/gb2.html',
      title: 'Goethe-Zertifikat B2',
      content: 'El nivel B2 requiere entre 600 y 750 horas de clase para alumnos con requisitos previos.',
      engine: 'duckduckgo',
    },
    {
      url: 'https://www.sprachschule.org/blog/niveles?utm_source=rss',
      title: 'Cuántas horas lleva cada nivel',
      content: 'Para llegar a C2 se calculan unas 1200 horas de estudio.',
    },
    // Sin `content`: el resumen es lo único que el modelo lee, así que sin él el
    // resultado no aporta nada y ocupa un lugar de los cinco.
    { url: 'https://ejemplo.com/sin-resumen', title: 'Una nota sin resumen' },
    // Sin URL válida no hay dominio, y el dominio es lo que se le muestra a él
    // como fuente.
    { url: 'no-es-una-url', title: 'Rota', content: 'algo' },
  ],
};

describe('dominioDe', () => {
  it('devuelve el dominio pelado, sin www', () => {
    expect(dominioDe('https://www.goethe.de/de/spr/kup/prf/prf/gb2.html')).toBe('goethe.de');
    expect(dominioDe('http://sprachschule.org/blog?x=1')).toBe('sprachschule.org');
  });

  it('con una URL que no se puede leer devuelve vacío en vez de tirar', () => {
    // Es la puerta de entrada de texto que vino de afuera: si esto tirara, se
    // caería la estimación entera por un resultado mal formado.
    expect(dominioDe('no-es-una-url')).toBe('');
    expect(dominioDe('')).toBe('');
  });
});

describe('mapearResultados', () => {
  it('se queda con los que tienen dominio y resumen', () => {
    const r = mapearResultados(RESPUESTA);
    expect(r).toHaveLength(2);
    expect(r?.map((x) => x.dominio)).toEqual(['goethe.de', 'sprachschule.org']);
  });

  it('⚠️ null y lista vacía no son lo mismo', () => {
    // null es "no se pudo buscar" —y ahí vale caer a la memoria del modelo—;
    // lista vacía es "se buscó y no hay nada". Quien llama distingue los dos.
    expect(mapearResultados(null)).toBeNull();
    expect(mapearResultados({})).toBeNull();
    expect(mapearResultados({ results: 'nada' })).toBeNull();
    expect(mapearResultados({ results: [] })).toEqual([]);
  });

  it('corta en la cantidad pedida ANTES de filtrar', () => {
    // A propósito: `slice` y después `filter`. Pedir 5 y que devuelva 5 buenos
    // implicaría recorrer toda la lista, y el prompt igual se arma con lo que
    // haya. Se fija el comportamiento para que se vea si alguien lo cambia.
    expect(mapearResultados(RESPUESTA, 3)).toHaveLength(2);
    expect(mapearResultados(RESPUESTA, 1)).toHaveLength(1);
  });

  it('con los campos faltantes deja strings vacíos y no rompe', () => {
    const r = mapearResultados({ results: [{ url: 'https://ejemplo.com/x', content: 'hay resumen' }] });
    expect(r).toEqual([{ titulo: '', url: 'https://ejemplo.com/x', texto: 'hay resumen', dominio: 'ejemplo.com' }]);
  });

  it('no toca la URL: se guarda como vino', () => {
    // El link es para que él pueda abrir la fuente. Limpiarle los parámetros
    // sería adivinar cuáles importan.
    const r = mapearResultados(RESPUESTA);
    expect(r?.[1].url).toBe('https://www.sprachschule.org/blog/niveles?utm_source=rss');
  });
});

import { describe, it, expect } from 'vitest';
import { parsearRss, clasificar, rankearNoticias, palabrasDeLugar, palabrasPropias, puntajePersonal, type Noticia } from '@/lib/noticias';

// Fixture con la forma real de un feed RSS 2.0 (BBC Mundo / elDiario / Xataka):
// CDATA, media:thumbnail, entidades, pubDate.
const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title><![CDATA[Diario de prueba]]></title>
  <item>
    <title><![CDATA[La inflación vuelve a subir y el ahorro pierde valor]]></title>
    <description><![CDATA[El dólar y los precios preocupan a los mercados esta semana.]]></description>
    <link>https://ejemplo.com/nota-1?at=rss&amp;x=1</link>
    <guid>https://ejemplo.com/nota-1</guid>
    <pubDate>Fri, 24 Jul 2026 08:00:00 GMT</pubDate>
    <media:thumbnail width="240" height="134" url="https://img.ejemplo.com/1.jpg"/>
  </item>
  <item>
    <title><![CDATA[Un nuevo estudio sobre el sueño y el ejercicio]]></title>
    <description><![CDATA[Dormir bien mejora la salud, dice la ciencia.]]></description>
    <link>https://ejemplo.com/nota-2</link>
    <pubDate>Thu, 23 Jul 2026 10:00:00 GMT</pubDate>
    <media:content url="https://img.ejemplo.com/2.jpg" medium="image"/>
  </item>
  <item>
    <title>Noticia sin imagen ni tema claro</title>
    <description>Algo pasó en algún lado hoy.</description>
    <link>https://ejemplo.com/nota-3</link>
    <pubDate>Wed, 22 Jul 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Item roto sin link</title>
    <description>no debería entrar</description>
  </item>
</channel>
</rss>`;

describe('parsearRss', () => {
  const items = parsearRss(RSS, 'Diario de prueba');

  it('saca los items válidos y descarta el que no tiene link', () => {
    expect(items).toHaveLength(3);
  });
  it('decodifica CDATA y entidades', () => {
    expect(items[0].titulo).toBe('La inflación vuelve a subir y el ahorro pierde valor');
    expect(items[0].link).toBe('https://ejemplo.com/nota-1?at=rss&x=1');
  });
  it('encuentra la imagen en media:thumbnail y en media:content', () => {
    expect(items[0].imagen).toBe('https://img.ejemplo.com/1.jpg');
    expect(items[1].imagen).toBe('https://img.ejemplo.com/2.jpg');
  });
  it('acepta que no haya imagen', () => {
    expect(items[2].imagen).toBeNull();
  });
  it('parsea la fecha a ISO', () => {
    expect(items[0].fecha).toBe('2026-07-24T08:00:00.000Z');
  });
  it('guarda la fuente', () => {
    expect(items[0].fuente).toBe('Diario de prueba');
  });
});

describe('clasificar', () => {
  const items = parsearRss(RSS, 'x');
  it('manda la nota de dólar/inflación a Finanzas', () => {
    expect(clasificar(items[0])).toBe('Finanzas');
  });
  it('manda la nota de sueño/ejercicio a Salud física', () => {
    expect(clasificar(items[1])).toBe('Salud física');
  });
  it('devuelve null si no engancha con ningún área', () => {
    expect(clasificar(items[2])).toBeNull();
  });
  it('el foco desempata cuando dos áreas empatan', () => {
    // "ahorro" (Finanzas +2) y "estudio" (Crecimiento +2) empatan; el foco define
    const empate = { titulo: 'Ahorro y estudio', resumen: '', link: 'x', fuente: 'x', fecha: null, imagen: null };
    expect(clasificar(empate, ['Crecimiento personal'])).toBe('Crecimiento personal');
    expect(clasificar(empate, ['Finanzas'])).toBe('Finanzas');
  });
});

describe('rankearNoticias', () => {
  const crudas = parsearRss(RSS, 'x');

  it('pone primero las de tus áreas en foco', () => {
    const r = rankearNoticias(crudas, ['Salud física']);
    expect(r[0].area).toBe('Salud física');
  });
  it('las que enganchan con algún área van antes que las sin tema', () => {
    const r = rankearNoticias(crudas, []);
    expect(r[r.length - 1].area).toBeNull();
  });
  it('deduplica por link', () => {
    const dup = [...crudas, crudas[0]];
    expect(rankearNoticias(dup, [])).toHaveLength(3);
  });
  it('respeta el límite', () => {
    expect(rankearNoticias(crudas, [], 2)).toHaveLength(2);
  });
  it('cada noticia mantiene título, link e imagen', () => {
    const r = rankearNoticias(crudas, []);
    const fin = r.find((n) => n.titulo.includes('inflación')) as Noticia;
    expect(fin.link).toBe('https://ejemplo.com/nota-1?at=rss&x=1');
    expect(fin.imagen).toBe('https://img.ejemplo.com/1.jpg');
  });
});

// Lo que hace que Descubrir sea TUYO: el contexto es dónde vivís y qué venís
// haciendo, no la actualidad del planeta.
describe('contexto personal', () => {
  const nota = (titulo: string, resumen = '') => ({
    titulo,
    resumen,
    link: `https://ej.com/${encodeURIComponent(titulo)}`,
    fuente: 'x',
    fecha: null,
    imagen: null,
  });

  it('de "Núremberg, Alemania" saca la ciudad, el país y lo europeo', () => {
    const p = palabrasDeLugar('Núremberg, Alemania');
    expect(p).toContain('nuremberg');
    expect(p).toContain('alemania');
    expect(p).toContain('europa');
  });

  it('sin lugar cargado no inventa palabras', () => {
    expect(palabrasDeLugar(null)).toEqual([]);
  });

  it('el lugar donde vivís pesa más que un tema suelto', () => {
    const p = { lugar: 'Núremberg, Alemania', palabras: ['Escalada'] };
    expect(puntajePersonal(nota('El alquiler en Alemania sube otra vez'), p)).toBeGreaterThan(
      puntajePersonal(nota('Nueva ruta de escalada en Bariloche'), p),
    );
  });

  it('una noticia que no te toca puntúa cero', () => {
    expect(puntajePersonal(nota('Elecciones en Nueva Zelanda'), { lugar: 'Núremberg, Alemania' })).toBe(0);
  });

  it('toma tus actividades reales, no una lista fija', () => {
    const p = { palabras: ['Escalada en el gimnasio', 'Aprender alemán'] };
    expect(puntajePersonal(nota('Boom de la escalada indoor'), p)).toBeGreaterThan(0);
    expect(puntajePersonal(nota('Boom del pádel indoor'), p)).toBe(0);
  });

  it('lo que te atraviesa va antes que lo de tus áreas en foco', () => {
    const crudas = [nota('Nuevo estudio sobre el sueño y el ejercicio'), nota('Sube el alquiler en Alemania')];
    const r = rankearNoticias(crudas, ['Salud física'], 12, { lugar: 'Núremberg, Alemania' });
    expect(r[0].titulo).toContain('Alemania');
  });

  it('lo que pasa donde vivís queda etiquetado como Contexto', () => {
    const crudas = [nota('Alemania estrena trenes en Baviera')];
    const r = rankearNoticias(crudas, [], 12, { lugar: 'Núremberg, Alemania' });
    expect(r[0].area).toBe('Contexto');
  });

  it('Contexto ya no se lleva la política mundial', () => {
    expect(clasificar(nota('El gobierno convoca elecciones tras la protesta'))).not.toBe('Contexto');
  });

  // Contra feeds reales, la prosa hacía matchear 9 de 35 notas de BBC con
  // palabras como "nunca" o "encontrar". Un titular sobre una amiga
  // desaparecida puntuaba más alto que una noticia de sus temas.
  it('la prosa larga no genera palabras clave', () => {
    const prosa = 'Mati está usando Tegmento para entenderse mejor y vivir su vida más a pleno, encontrando lo que le hace bien';
    expect(palabrasPropias([prosa])).toEqual([]);
  });

  it('filtra las palabras que aparecen en cualquier titular', () => {
    expect(palabrasPropias(['Quiere encontrar algo mejor'])).toEqual([]);
  });

  it('se queda con lo concreto de tus actividades', () => {
    expect(palabrasPropias(['Escalada', 'Aprender alemán'])).toEqual(['escalada', 'aprender', 'aleman']);
  });

  it('una nota triste y genérica ya no se cuela como tuya', () => {
    const p = { palabras: ['Escalada', 'Correr'] };
    expect(puntajePersonal(nota('No podía aceptar que nunca encontrarían a mi amiga desaparecida'), p)).toBe(0);
  });
});

// Atom, que es lo que usan los canales de YouTube (04/08). Con el parseo viejo
// —solo <item> de RSS 2.0— un feed de YouTube devolvía CERO videos sin tirar
// ningún error: la lista aparecía vacía, que es la peor forma de fallar.
describe('parsearRss · feeds Atom (YouTube)', () => {
  const atom = `<?xml version="1.0"?>
<feed xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <title>Value School</title>
  <entry>
    <title>Cómo funciona el interés compuesto</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
    <published>2026-08-01T10:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" width="480" height="360"/>
      <media:description>Una explicación corta sobre el interés compuesto y el ahorro.</media:description>
    </media:group>
  </entry>
</feed>`;

  it('lee los <entry> de Atom, no solo los <item>', () => {
    const r = parsearRss(atom, 'Value School', 'video');
    expect(r).toHaveLength(1);
    expect(r[0].titulo).toBe('Cómo funciona el interés compuesto');
  });

  it('⚠️ el link sale del ATRIBUTO href, no de adentro del tag', () => {
    // Es la diferencia que hacía que el parseo viejo descartara todo: en RSS el
    // link va entre las etiquetas; en Atom, en el href.
    expect(parsearRss(atom, 'x', 'video')[0].link).toBe('https://www.youtube.com/watch?v=abc123');
  });

  it('toma la miniatura de media:thumbnail y la fecha de published', () => {
    const r = parsearRss(atom, 'x', 'video')[0];
    expect(r.imagen).toBe('https://i.ytimg.com/vi/abc123/hqdefault.jpg');
    expect(r.fecha).toBe('2026-08-01T10:00:00.000Z');
  });

  it('marca el tipo, que es lo que decide la miniatura al dibujar', () => {
    expect(parsearRss(atom, 'x', 'video')[0].tipo).toBe('video');
    expect(parsearRss(atom, 'x')[0]?.tipo ?? 'nota').toBe('nota');
  });

  it('un feed RSS 2.0 sigue funcionando igual', () => {
    const rss = `<rss><channel><item>
      <title>Nota de prueba</title><link>https://ejemplo.com/a</link>
      <description>Resumen</description><pubDate>Mon, 04 Aug 2026 09:00:00 GMT</pubDate>
    </item></channel></rss>`;
    const r = parsearRss(rss, 'Diario');
    expect(r).toHaveLength(1);
    expect(r[0].link).toBe('https://ejemplo.com/a');
    expect(r[0].tipo).toBe('nota');
  });
});

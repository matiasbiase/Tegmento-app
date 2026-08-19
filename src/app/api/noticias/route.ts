import { and, eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { areas, config, lineas, objetivos } from '@/lib/db/schema';
import { palabrasDeLugar, parsearRss, rankearNoticias, type Noticia, type Personal } from '@/lib/noticias';

// Trae noticias reales de feeds RSS abiertos (gratis, sin API key), las ordena
// según las áreas en foco de la rueda, y las cachea en config para que Descubrir
// ande también sin internet. Si no hay conexión, devuelve lo último cacheado.

const FEEDS: { url: string; fuente: string }[] = [
  { url: 'https://feeds.bbci.co.uk/mundo/rss.xml', fuente: 'BBC Mundo' },
  { url: 'https://www.xataka.com/feedburner.xml', fuente: 'Xataka' },
  { url: 'https://e00-expansion.uecdn.es/rss/economia.xml', fuente: 'Expansión' },
];

// Feeds del lugar donde vivís. Si Matías vive en Alemania, lo que pasa en Europa
// SÍ lo atraviesa; las noticias globales, casi nunca. Se suman solo si el lugar
// cargado en el perfil engancha con la región.
const FEEDS_REGION: { claves: string[]; url: string; fuente: string }[] = [
  {
    claves: ['alemania', 'austria', 'suiza', 'espana', 'francia', 'italia', 'portugal', 'europa', 'europea'],
    url: 'https://es.euronews.com/rss',
    fuente: 'Euronews',
  },
];

/**
 * CANALES DE YOUTUBE (04/08, pedido de Matías: *"que aparezcan los videos"*).
 *
 * ⚠️ POR RSS Y NO POR LA API DE YOUTUBE, decisión suya: *"hacelo con esa forma
 * gratuita que me ofrecés"*. La API pide key, tiene cuota y manda tus búsquedas
 * afuera; el RSS de canal es abierto, sin cuenta y no manda nada. El precio es
 * que los canales se eligen a mano en vez de buscarse — y para tres, alcanza.
 *
 * ⚠️ LOS TRES IDs ESTÁN VERIFICADOS contra el feed real el 04/08, no copiados de
 * memoria. Si algún día uno deja de traer nada, lo más probable es que el canal
 * cambió de id: se resuelve con
 * `curl -sL https://www.youtube.com/@HANDLE | grep -o 'channel_id=UC[A-Za-z0-9_-]\{22\}'`.
 *
 * Son de finanzas en español a propósito: el bloque vive en Finanzas y se
 * filtra por área, así que un canal de otra cosa nunca se mostraría.
 */
const CANALES: { id: string; fuente: string }[] = [
  { id: 'UCpLie5obXFdf8T0NG-IRHsA', fuente: 'Value School' },
  { id: 'UCFAtJAkhvBHPz1UTyp4vnpw', fuente: 'Bolsa y Mercados' },
  { id: 'UCPVpvcPOMLgSzdBrdzvv7-g', fuente: 'Emilio Ortiz' },
];

const CLAVE_CACHE = 'noticias_cache';
const CLAVE_FECHA = 'noticias_fecha';
const FRESCO_MS = 30 * 60 * 1000; // media hora

async function traerFeed(url: string, fuente: string, tipo: 'nota' | 'video' = 'nota'): Promise<Noticia[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Tegmento/0.1 (lector RSS personal)' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parsearRss(xml, fuente, tipo).map((n) => ({ ...n, area: null }));
  } catch {
    return []; // un feed caído no tumba a los demás
  } finally {
    clearTimeout(t);
  }
}

/**
 * Lo que hace que estas noticias sean TUYAS y no las de cualquiera: dónde vivís
 * (config `lugar`) y lo que venís haciendo de verdad (los títulos de tus
 * actividades). Sin esto, el ranking se apoya solo en una lista fija de palabras
 * y devuelve la actualidad del planeta.
 *
 * A propósito NO se usa el texto libre de `conocimiento`: probado contra feeds
 * reales, la prosa aporta verbos genéricos ("encontrar", "nunca", "quiere") y
 * hace matchear cualquier noticia. Los títulos de actividades son cortos y
 * concretos — ahí sí, cada palabra quiere decir algo.
 */
async function datosPersonales(): Promise<Personal> {
  const [lugarRow, actividades, objetivosActivos] = await Promise.all([
    db.select().from(config).where(eq(config.clave, 'lugar')),
    // Ojo con el modelo: el onboarding guarda lo que hacés como tipo 'habito'
    // (Correr, Escalada, Un idioma…) y las que sumás a mano van como 'actividad'.
    // Para las noticias las dos cuentan igual: son tus intereses. Leer solo una
    // dejaba afuera TODO lo del onboarding, que es casi todo lo que te define.
    db
      .select({ titulo: lineas.titulo })
      .from(lineas)
      .where(and(inArray(lineas.tipo, ['actividad', 'habito']), inArray(lineas.estado, ['activa', 'hecha']))),
    // ⚠️ LOS OBJETIVOS ENTRAN AL RANKING (0.6, decisión suya del 03/08:
    // *"noticias que tengan que ver con los intereses de la persona, que salen
    // de los objetivos"*).
    //
    // ⚠️ Y no hubo que tocar el algoritmo: `personal.palabras` ya existía y ya
    // estaba documentado como *"tus palabras: títulos de tus actividades, tus
    // temas"*. Un objetivo es exactamente eso — "Viaje Argentina Octubre" dice
    // mucho más de qué te importa que cualquier lista de categorías.
    //
    // Solo los ACTIVOS: un objetivo logrado hace ocho meses ya no es un interés,
    // y uno en pausa lo frenaste vos. Rankear por ellos traería noticias de algo
    // que dejaste atrás.
    db.select({ titulo: objetivos.titulo }).from(objetivos).where(eq(objetivos.estado, 'activo')),
  ]);
  return {
    lugar: lugarRow[0]?.valor ?? null,
    palabras: [...actividades.map((a) => a.titulo), ...objetivosActivos.map((o) => o.titulo)],
  };
}

async function leerCache(): Promise<{ noticias: Noticia[]; fecha: string | null }> {
  const [c, f] = await Promise.all([
    db.select().from(config).where(eq(config.clave, CLAVE_CACHE)),
    db.select().from(config).where(eq(config.clave, CLAVE_FECHA)),
  ]);
  try {
    return { noticias: c[0] ? (JSON.parse(c[0].valor) as Noticia[]) : [], fecha: f[0]?.valor ?? null };
  } catch {
    return { noticias: [], fecha: null };
  }
}

async function guardarCache(noticias: Noticia[]): Promise<string> {
  const fecha = new Date().toISOString();
  const json = JSON.stringify(noticias);
  await db.insert(config).values({ clave: CLAVE_CACHE, valor: json }).onConflictDoUpdate({ target: config.clave, set: { valor: json } });
  await db.insert(config).values({ clave: CLAVE_FECHA, valor: fecha }).onConflictDoUpdate({ target: config.clave, set: { valor: fecha } });
  return fecha;
}

export async function GET(req: Request) {
  const forzar = new URL(req.url).searchParams.get('forzar') === '1';

  const cache = await leerCache();
  const fresco = cache.fecha && Date.now() - Date.parse(cache.fecha) < FRESCO_MS;
  if (fresco && !forzar) {
    return NextResponse.json({ noticias: cache.noticias, fecha: cache.fecha, cacheado: true });
  }

  const [focoRows, personal] = await Promise.all([
    db.select({ nombre: areas.nombre }).from(areas).where(eq(areas.foco, true)),
    datosPersonales(),
  ]);
  const foco = focoRows.map((a) => a.nombre);

  // A los feeds fijos se les suman los de tu región, si cargaste dónde vivís.
  const dellugar = palabrasDeLugar(personal.lugar);
  const regionales = FEEDS_REGION.filter((f) => f.claves.some((c) => dellugar.includes(c)));
  const tandas = await Promise.all([
    ...[...FEEDS, ...regionales].map((f) => traerFeed(f.url, f.fuente)),
    // Los videos entran por el MISMO camino que las notas: se rankean juntos y
    // se guardan con la misma estrellita. Lo único que los distingue es `tipo`,
    // que decide la miniatura.
    ...CANALES.map((c) => traerFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, c.fuente, 'video')),
  ]);
  const crudas = tandas.flat();

  // Sin internet (todos los feeds vacíos): devolvemos lo cacheado, con aviso.
  if (crudas.length === 0) {
    return NextResponse.json({
      noticias: cache.noticias,
      fecha: cache.fecha,
      cacheado: true,
      sinConexion: true,
    });
  }

  const noticias = rankearNoticias(crudas, foco, 15, personal);
  const fecha = await guardarCache(noticias);
  return NextResponse.json({ noticias, fecha, cacheado: false });
}

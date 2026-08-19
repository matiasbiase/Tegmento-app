// Noticias reales para Descubrir. La app corre local: no hay servicio de pago ni
// API key. Se leen feeds RSS (el formato abierto que publican casi todos los
// diarios) desde el propio servidor de Matías, se parsean, y se ordenan según sus
// áreas de foco de la rueda. Cada noticia queda etiquetada con un área, con las
// mismas etiquetas de colores que ya usa el resto de la app.
//
// Este archivo es lógica pura (parseo + clasificación). El fetch y el guardado
// viven en el endpoint /api/noticias.

export type Noticia = {
  titulo: string;
  resumen: string;
  link: string;
  fuente: string;
  fecha: string | null; // ISO, si se pudo leer
  imagen: string | null;
  area: string | null; // el área de la rueda con la que más engancha
  /**
   * 'video' cuando viene de un canal de YouTube (04/08, pedido de Matías:
   * *"ahí aparecerían los videos, en formato rectangular como ese"*).
   *
   * ⚠️ ES UN CAMPO Y NO UNA LISTA APARTE porque desde el lado de Matías son la
   * MISMA cosa: algo de afuera sobre lo que viene siguiendo. Se rankean juntos,
   * se guardan con la misma estrellita y se dibujan con el mismo rectángulo —
   * lo único que cambia es la miniatura.
   */
  tipo?: 'nota' | 'video';
};

// ─── parseo de RSS 2.0 ───────────────────────────────────────────────────────

function decodificar(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(item: string, nombre: string): string | null {
  const m = item.match(new RegExp(`<${nombre}[^>]*>([\\s\\S]*?)</${nombre}>`, 'i'));
  return m ? decodificar(m[1]) : null;
}

/** Busca la imagen donde los feeds la suelen poner, incluyendo el <img> que
 *  muchos (Xataka, WordPress) meten dentro del HTML de la descripción. */
function imagenDe(item: string): string | null {
  const patrones = [
    /<media:thumbnail[^>]*\burl="([^"]+)"/i,
    /<media:content[^>]*\burl="([^"]+)"[^>]*(?:medium="image"|type="image)/i,
    /<media:content[^>]*\burl="([^"]+)"/i,
    /<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i,
    /<img[^>]*\bsrc="([^"]+)"/i, // dentro del HTML de la descripción
  ];
  for (const p of patrones) {
    const m = item.match(p);
    if (m && /^https?:\/\//.test(m[1])) return m[1].replace(/&amp;/g, '&');
  }
  return null;
}

function fechaISO(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Parsea el XML de un feed a noticias (sin clasificar todavía).
 *
 * ⚠️ ACEPTA RSS 2.0 **Y ATOM**, y no es un lujo: los feeds de canales de YouTube
 * son Atom. Usan `<entry>` en vez de `<item>`, `<published>` en vez de
 * `<pubDate>`, y el link va en el ATRIBUTO href de `<link>` en vez de adentro
 * del tag. Con el parseo viejo, un feed de YouTube devolvía cero videos sin
 * error — la lista simplemente aparecía vacía, que es la peor forma de fallar.
 */
export function parsearRss(xml: string, fuente: string, tipo: 'nota' | 'video' = 'nota'): Omit<Noticia, 'area'>[] {
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi);
  if (entries && entries.length > 0) return parsearAtom(entries, fuente, tipo);

  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const out: Omit<Noticia, 'area'>[] = [];
  for (const item of items) {
    const titulo = tag(item, 'title');
    const link = (item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '').trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    if (!titulo || !/^https?:\/\//.test(link)) continue;
    out.push({
      titulo,
      resumen: (tag(item, 'description') ?? '').slice(0, 280),
      link: link.replace(/&amp;/g, '&'),
      fuente,
      fecha: fechaISO(tag(item, 'pubDate') ?? tag(item, 'dc:date')),
      imagen: imagenDe(item),
      tipo,
    });
  }
  return out;
}

/** La rama Atom, que es la que usan los canales de YouTube. */
function parsearAtom(entries: string[], fuente: string, tipo: 'nota' | 'video'): Omit<Noticia, 'area'>[] {
  const out: Omit<Noticia, 'area'>[] = [];
  for (const e of entries) {
    const titulo = tag(e, 'title');
    // ⚠️ En Atom el link vive en el ATRIBUTO href, no adentro del tag.
    const link = (e.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '').trim();
    if (!titulo || !/^https?:\/\//.test(link)) continue;
    out.push({
      titulo,
      // `media:description` es donde YouTube pone el texto del video.
      resumen: (tag(e, 'media:description') ?? tag(e, 'summary') ?? '').slice(0, 280),
      link: link.replace(/&amp;/g, '&'),
      fuente,
      fecha: fechaISO(tag(e, 'published') ?? tag(e, 'updated')),
      // La miniatura viene en `media:thumbnail url="…"`.
      imagen: e.match(/<media:thumbnail[^>]*url="([^"]+)"/i)?.[1] ?? null,
      tipo,
    });
  }
  return out;
}

// ─── clasificación por área de la rueda ──────────────────────────────────────
// Las áreas son las de AREAS_GUIA (rueda-vida.ts). Cada una con las palabras que
// suelen aparecer en una noticia de ese tema.

const PALABRAS: Record<string, string[]> = {
  'Salud mental': ['ansiedad', 'estres', 'estrés', 'depresion', 'depresión', 'salud mental', 'terapia', 'bienestar', 'mindfulness', 'burnout', 'emocion', 'suicid', 'psicolog'],
  'Salud física': ['salud', 'ejercicio', 'deporte', 'nutricion', 'nutrición', 'dormir', 'sueño', 'dieta', 'fitness', 'medico', 'médico', 'enfermedad', 'correr', 'gimnasio', 'cancer', 'cáncer', 'vacuna', 'obesidad'],
  'Vida social': ['amistad', 'familia', 'pareja', 'relacion', 'relación', 'comunidad', 'soledad', 'vinculo', 'vínculo', 'matrimonio', 'divorcio'],
  'Ocio y tiempo libre': ['cine', 'musica', 'música', 'viaje', 'videojuego', 'hobby', 'serie', 'pelicula', 'película', 'arte', 'cultura', 'ocio', 'concierto', 'festival', 'turismo', 'gastronomia', 'gastronomía'],
  'Negocios y carrera': ['trabajo', 'empleo', 'empresa', 'startup', 'carrera', 'tecnologia', 'tecnología', 'inteligencia artificial', ' ia ', 'negocio', 'productividad', 'oficina', 'emprend', 'despido', 'salario', 'software'],
  // Las palabras matchean por prefijo (así 'inversion' agarra 'inversiones'), y
  // por eso 'euro' se llevaba TODA noticia que dijera "Europa" o "europeos" a
  // Finanzas. Va en plural y con las formas de dos palabras, que sí son de plata.
  'Finanzas': ['dinero', 'economia', 'economía', 'inflacion', 'inflación', 'ahorro', 'inversion', 'inversión', 'banco', 'precios', 'dolar', 'dólar', 'euros', 'zona euro', 'el euro', 'impuesto', 'mercado', 'finanzas', 'bolsa', 'cripto', 'hipoteca', 'deuda'],
  'Crecimiento personal': ['aprender', 'educacion', 'educación', 'curso', 'habito', 'hábito', 'desarrollo personal', 'meta', 'proposito', 'propósito', 'universidad', 'estudio', 'leer', 'libro'],
  // Contexto NO es "lo que pasa en el mundo". En la rueda es el entorno que te
  // sostiene o te desgasta: dónde vivís, tu casa, tus trámites, cómo te movés,
  // el idioma del lugar. Antes tenía palabras de política/guerra/sociedad y por
  // eso Descubrir traía noticias globales que no lo atraviesan a uno.
  'Contexto': ['alquiler', 'vivienda', 'casa', 'hogar', 'mudanza', 'barrio', 'vecino', 'transporte', 'tren', 'subte', 'metro', 'tramite', 'trámite', 'visa', 'residencia', 'permiso', 'migra', 'extranjero', 'idioma', 'burocracia', 'seguro medico', 'seguro médico', 'servicios', 'luz y gas', 'calefaccion', 'calefacción', 'internet en casa', 'mercado inmobiliario', 'costo de vida'],
};

function norm(s: string): string {
  return ` ${s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
}

// ─── lo tuyo: el contexto del que vive, no el del mundo ──────────────────────
// El ranking no puede apoyarse solo en una lista de palabras que escribí yo:
// eso da noticias globales, iguales para cualquiera. Estas funciones arman las
// palabras que SÍ te atraviesan — dónde vivís y qué venís haciendo — y las
// noticias que las tocan se van arriba de todo.

export type Personal = {
  /** Dónde vivís, tal cual lo escribiste: "Núremberg, Alemania". */
  lugar?: string | null;
  /** Tus palabras: títulos de tus actividades, tus temas, lo que registrás. */
  palabras?: string[];
};

// País → los términos con los que las noticias suelen nombrar tu región. Es
// corto a propósito: solo lo necesario para que "vivo en Alemania" también
// enganche lo europeo, que también te pasa a vos.
const REGION: Record<string, string[]> = {
  alemania: ['alemania', 'aleman', 'alemana', 'alemanes', 'berlin', 'munich', 'baviera', 'europa', 'europea', 'union europea'],
  austria: ['austria', 'austriaco', 'viena', 'europa', 'europea', 'union europea'],
  suiza: ['suiza', 'suizo', 'zurich', 'ginebra', 'europa', 'europea'],
  espana: ['espana', 'espanol', 'espanola', 'madrid', 'barcelona', 'europa', 'europea', 'union europea'],
  francia: ['francia', 'frances', 'paris', 'europa', 'europea', 'union europea'],
  italia: ['italia', 'italiano', 'roma', 'europa', 'europea', 'union europea'],
  portugal: ['portugal', 'portugues', 'lisboa', 'europa', 'europea', 'union europea'],
  argentina: ['argentina', 'argentino', 'buenos aires', 'latinoamerica', 'america latina'],
  mexico: ['mexico', 'mexicano', 'latinoamerica', 'america latina'],
  chile: ['chile', 'chileno', 'latinoamerica', 'america latina'],
  uruguay: ['uruguay', 'uruguayo', 'latinoamerica', 'america latina'],
  colombia: ['colombia', 'colombiano', 'latinoamerica', 'america latina'],
};

/** De "Núremberg, Alemania" saca: núremberg, alemania + lo alemán y lo europeo. */
export function palabrasDeLugar(lugar: string | null | undefined): string[] {
  if (!lugar) return [];
  const limpio = norm(lugar).trim();
  const piezas = limpio.split(/[,;/·]+|\s+y\s+/).map((p) => p.trim()).filter((p) => p.length > 2);
  const out = new Set<string>(piezas);
  for (const p of piezas) {
    for (const extra of REGION[p.replace(/\s+/g, '')] ?? []) out.add(extra);
  }
  return [...out];
}

// Palabras vacías. Son las que aparecen en CUALQUIER titular: si entran, todo
// matchea con todo. Probado contra feeds reales — sin esta lista, una nota sobre
// una amiga desaparecida puntuaba alto por "nunca" y "encontrar".
const VACIAS = new Set([
  // genéricas
  'para', 'sobre', 'todos', 'todas', 'cada', 'algo', 'cosas', 'como', 'mas', 'menos', 'poco', 'mucho',
  'esto', 'eso', 'aquel', 'donde', 'cuando', 'porque', 'entre', 'desde', 'hasta', 'segun', 'contra',
  'nunca', 'siempre', 'tambien', 'ademas', 'entonces', 'aunque', 'mismo', 'misma', 'otro', 'otra',
  // verbos comodín
  'hacer', 'tener', 'poder', 'saber', 'quiere', 'quieren', 'puede', 'pueden', 'debe', 'deben',
  'encontrar', 'buscar', 'llegar', 'seguir', 'entender', 'entenderse', 'usando', 'vivir', 'estar',
  'decir', 'pensar', 'sentir', 'empezar', 'terminar', 'permiten', 'mantenerme', 'creciendo',
  // sustantivos de relleno
  'vida', 'gente', 'tiempo', 'dias', 'semana', 'anos', 'mundo', 'forma', 'parte', 'lugar', 'manera',
  'nuevo', 'nueva', 'mejor', 'peor', 'bien', 'propio', 'propios', 'personal', 'personales',
  'cambios', 'nivel', 'punta', 'mente', 'fuerte', 'verdad', 'medida', 'temas', 'consejos',
]);

/** Tus palabras reducidas a las que sirven para buscar. Sale de cosas cortas y
 *  concretas (los títulos de tus actividades), NO de texto libre: la prosa
 *  aporta verbos genéricos que hacen matchear cualquier noticia. */
export function palabrasPropias(frases: string[]): string[] {
  const out = new Set<string>();
  for (const f of frases) {
    // Una frase larga es prosa, no un interés: no se le sacan palabras clave.
    if (f.length > 60) continue;
    for (const w of norm(f).split(/[^a-z0-9]+/)) {
      if (w.length >= 5 && !VACIAS.has(w)) out.add(w);
    }
  }
  // Techo: con demasiadas palabras, "personal" deja de querer decir algo.
  return [...out].slice(0, 40);
}

/**
 * Cuánto te toca a VOS esta noticia. El lugar donde vivís pesa más que todo
 * (es literalmente tu contexto), y después lo que venís haciendo. Cero = es una
 * noticia más del mundo, no tuya.
 */
export function puntajePersonal(n: Omit<Noticia, 'area'>, p: Personal = {}): number {
  const t = norm(n.titulo);
  const r = norm(n.resumen);
  let puntos = 0;
  for (const w of palabrasDeLugar(p.lugar)) {
    if (t.includes(` ${w}`)) puntos += 3;
    else if (r.includes(` ${w}`)) puntos += 1.5;
  }
  for (const w of palabrasPropias(p.palabras ?? [])) {
    if (t.includes(` ${w}`)) puntos += 2;
    else if (r.includes(` ${w}`)) puntos += 1;
  }
  return puntos;
}

/**
 * Le pone a una noticia el área de la rueda con la que más engancha. Cuenta
 * coincidencias de palabras clave en el título (peso doble) y el resumen.
 * Si `foco` tiene áreas, empata a favor de esas (lo que estás trabajando gana).
 */
export function clasificar(n: Omit<Noticia, 'area'>, foco: string[] = []): string | null {
  const t = norm(n.titulo);
  const r = norm(n.resumen);
  const focoSet = new Set(foco);
  let mejor: string | null = null;
  let mejorPuntaje = 0;
  for (const [area, palabras] of Object.entries(PALABRAS)) {
    let p = 0;
    for (const w of palabras) {
      const needle = w.includes(' ') ? w : ` ${w}`;
      if (t.includes(needle)) p += 2;
      if (r.includes(needle)) p += 1;
    }
    if (p === 0) continue;
    if (focoSet.has(area)) p += 1.5; // desempate a favor de tus áreas en foco
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejor = area;
    }
  }
  return mejor;
}

/**
 * Ordena las noticias: primero las que te tocan a VOS (el lugar donde vivís, lo
 * que venís haciendo), después las de tus áreas en foco, y al final el resto por
 * fecha. Deduplica por link y clasifica cada una. `limite` recorta el total.
 */
export function rankearNoticias(
  crudas: Omit<Noticia, 'area'>[],
  foco: string[] = [],
  limite = 12,
  personal: Personal = {},
): Noticia[] {
  const focoSet = new Set(foco);
  const vistas = new Set<string>();
  const hayLugar = palabrasDeLugar(personal.lugar).length > 0;
  const clasificadas: { n: Noticia; propio: number }[] = [];

  for (const c of crudas) {
    if (vistas.has(c.link)) continue;
    vistas.add(c.link);
    const propio = puntajePersonal(c, personal);
    let area = clasificar(c, foco);
    // Si te toca por dónde vivís y no enganchó con ningún otro tema, eso ES tu
    // contexto: el entorno en el que estás, no la actualidad del planeta.
    if (area == null && hayLugar && propio >= 3) area = 'Contexto';
    clasificadas.push({ n: { ...c, area }, propio });
  }

  return clasificadas
    .map(({ n, propio }, i) => {
      const enFoco = n.area != null && focoSet.has(n.area);
      const tiene = n.area != null;
      const t = n.fecha ? Date.parse(n.fecha) : 0;
      return { n, propio, orden: propio >= 2 ? 0 : enFoco ? 1 : tiene ? 2 : 3, t, i };
    })
    .sort((a, b) => a.orden - b.orden || b.propio - a.propio || b.t - a.t || a.i - b.i)
    .slice(0, limite)
    .map((x) => x.n);
}

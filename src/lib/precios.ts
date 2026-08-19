/**
 * DE DÓNDE SALE EL PRECIO — la decisión que la bitácora dejó abierta el 04/08.
 *
 * ── ⚠️ LO PRIMERO, PORQUE CAMBIA EL PLANTEO ─────────────────────────────────
 *
 * El pedido §0.10 quedó anotado con esta objeción: *"una API de mercado manda
 * tus tenencias fuera de la máquina"*. **Eso no es cierto, y conviene decirlo
 * porque era la objeción más fuerte de las tres.** Pedir el precio de un papel
 * manda UN SÍMBOLO: "AAPL". No manda cuántas tenés, ni a cuánto la compraste, ni
 * cuándo. La cuenta —que es todo lo que a él le importa— se hace acá adentro con
 * datos que nunca salieron.
 *
 * Lo que sí sale, y hay que decirlo igual: **qué papeles te interesan.** Eso es
 * información sobre vos. Es exactamente el mismo trato que la app ya aceptó con
 * las noticias (sale el feed que leés) y con `buscar.ts`.
 *
 * ── ⚠️ Y LO QUE NO SE PUDO SOSTENER ──────────────────────────────────────────
 *
 * Se probó primero el CSV de Stooq, que es la opción que suele recomendarse como
 * "gratis y sin key". **No existe: devuelve la página de error del sitio, no un
 * CSV.** Quedó anotado para que no se vuelva a intentar de memoria — es la
 * lección del 04/08 con el feed de YouTube (*antes de parsear algo, mirá el
 * formato*), aplicada antes de escribir el parser esta vez.
 *
 * Lo que sí contesta, verificado el 04/08 con curl:
 *  - búsqueda por nombre → símbolo + sector
 *  - precio de cierre → número + moneda
 *
 * Sin cuenta, sin key y sin cuota declarada, igual que los feeds RSS. El precio
 * que se pide es el de CIERRE y no el intradía: es lo que alcanza para *"¿estoy
 * arriba o abajo de lo que pagué?"*, y el intradía invita a mirar la app diez
 * veces por día, que es lo contrario de lo que hace Tegmento.
 *
 * ── ⚠️ NADA DE ESTO ES OBLIGATORIO ───────────────────────────────────────────
 *
 * **El precio se puede escribir a mano y la pantalla funciona igual.** Si esto
 * se cae, si él prefiere que no salga nada, o si mañana el endpoint cambia, lo
 * único que se pierde es el autocompletado: la aritmética, que es el pedido, no
 * depende de afuera. Por eso todas las funciones devuelven `null` en vez de
 * tirar — un papel sin precio es un estado normal, no un error.
 */

const BUSCAR = 'https://query1.finance.yahoo.com/v1/finance/search';
const PRECIO = 'https://query1.finance.yahoo.com/v8/finance/chart';

/** Igual que en `noticias`: se identifica y no espera para siempre. */
const CABECERAS = { 'User-Agent': 'Tegmento/0.1 (uso personal)' };
const ESPERA_MS = 8000;

export type PapelBuscado = {
  simbolo: string;
  nombre: string;
  mercado: string | null;
  sector: string | null;
};

export type Cotizacion = {
  precio: number;
  moneda: string | null;
};

async function traer(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ESPERA_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: CABECERAS, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Sin internet, con el endpoint caído o con un JSON raro: null. La pantalla
    // ya sabe vivir sin precio, así que un error acá no es un error de la app.
    return null;
  } finally {
    clearTimeout(t);
  }
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * BUSCAR UN PAPEL POR NOMBRE O SÍMBOLO.
 *
 * ⚠️⚠️ ESTO ES UN BUSCADOR Y NO UN RECOMENDADOR, y la diferencia no es de tono:
 * devuelve lo que coincide con lo que ESCRIBISTE, en el orden que trae la
 * fuente. No hay ranking propio, no mira tus compras, no ordena por
 * "conveniencia" ni sugiere nada que no hayas nombrado. Es la condición que puso
 * Matías al aprobarlo: *"que no aconseje qué invertir, solo que sea un buscador"*
 * (§0.13), y en la UE recomendar instrumentos financieros necesita licencia.
 *
 * ⚠️ SOLO ACCIONES. El buscador de la fuente también trae fondos, cripto y
 * futuros; dejarlos entrar convertiría una lista de papeles en un catálogo de
 * productos financieros, que es justo lo que no queremos ofrecer.
 */
export async function buscarPapel(consulta: string): Promise<PapelBuscado[]> {
  const q = consulta.trim().slice(0, 60);
  if (q.length < 2) return [];

  return leerPapeles(await traer(`${BUSCAR}?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`));
}

/**
 * La respuesta de la fuente → la lista de papeles. Aparte del `fetch` para que
 * el filtro se pueda probar sin salir a Internet: **acá vive la regla de §0.13**,
 * y una regla que existe por una condición que puso Matías tiene que poder
 * fallar en un test el día que alguien la afloje.
 */
export function leerPapeles(datos: unknown): PapelBuscado[] {
  const lista = (datos as { quotes?: unknown[] } | null)?.quotes;
  if (!Array.isArray(lista)) return [];

  const salida: PapelBuscado[] = [];
  for (const cruda of lista) {
    const q2 = cruda as Record<string, unknown>;
    if (q2.quoteType !== 'EQUITY') continue;
    const simbolo = texto(q2.symbol);
    if (!simbolo) continue;
    const nombre = texto(q2.longname) ?? texto(q2.shortname) ?? simbolo;
    salida.push({
      simbolo,
      nombre,
      mercado: texto(q2.exchDisp) ?? texto(q2.exchange),
      sector: texto(q2.sectorDisp) ?? texto(q2.sector),
    });
  }
  return salida;
}

/**
 * EL PRECIO DE UN PAPEL, o `null`.
 *
 * ⚠️ DEVUELVE LA MONEDA JUNTO CON EL NÚMERO, y no es un detalle: un papel de
 * Nueva York cotiza en dólares aunque vos pienses en euros. Sin la moneda al
 * lado, el total de la cartera sumaría USD con EUR sin avisar — **que es el bug
 * exacto que había en el gráfico de gastos y hubo que arreglar el 03/08**. Acá
 * se muestra la moneda de cada papel en vez de convertir: convertir pide otra
 * fuente (el cambio del día) y otra decisión.
 */
export async function precioDe(simbolo: string): Promise<Cotizacion | null> {
  const s = simboloValido(simbolo);
  if (!s) return null;

  return leerCotizacion(await traer(`${PRECIO}/${encodeURIComponent(s)}?range=1d&interval=1d`));
}

/**
 * El símbolo normalizado, o null si no puede serlo. Se valida ANTES de salir:
 * lo que escriba Matías va pegado a una URL, así que lo que no tiene forma de
 * símbolo no se pregunta.
 */
export function simboloValido(simbolo: string): string | null {
  const s = simbolo.trim().toUpperCase();
  return /^[A-Z0-9.\-^]{1,20}$/.test(s) ? s : null;
}

/** La respuesta de la fuente → precio y moneda, o null. Aparte del `fetch`
 *  para poder probar sin Internet qué se acepta como precio y qué no. */
export function leerCotizacion(datos: unknown): Cotizacion | null {
  const meta = (datos as { chart?: { result?: { meta?: Record<string, unknown> }[] } } | null)
    ?.chart?.result?.[0]?.meta;
  const precio = meta?.regularMarketPrice;
  if (typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0) return null;
  return { precio, moneda: texto(meta?.currency) };
}

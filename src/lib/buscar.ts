/**
 * BUSCAR EN INTERNET, A TRAVÉS DE UN SEARXNG QUE CORRE ACÁ MISMO.
 *
 * Es lo único de toda la app que sale de la Mac, y por eso está encerrado en un
 * archivo solo: para que se vea de una qué sale, cuándo y hacia dónde.
 *
 * ── POR QUÉ SEARXNG Y NO UNA API ─────────────────────────────────────────────
 *
 * Elección de Matías (30/07). SearXNG corre en un contenedor local: no hay API
 * key, no hay cuenta, no hay factura y no hay una empresa guardando un historial
 * asociado a él. Las consultas igual salen a Internet —eso no lo arregla nadie,
 * las hace SearXNG contra los buscadores— pero salen sin nombre pegado.
 *
 * ⚠️ **LO QUE SALE ES EL TÍTULO DEL OBJETIVO, NADA MÁS.** Nunca sus registros,
 * ni sus notas, ni sus movimientos, ni el arco. La consulta se arma en
 * `lib/estimador.ts` con el título y una palabra fija ("cuántas horas"), y el
 * título lo escribió él sabiendo que iba a ser el nombre de la pantalla. Si
 * algún día esto necesita mandar algo más, es una decisión nueva y hay que
 * volver a preguntar.
 *
 * ── Y POR QUÉ NUNCA ROMPE NADA ───────────────────────────────────────────────
 *
 * ⚠️ SearXNG apagado es el estado NORMAL, no un error. Matías no tiene por qué
 * dejar Docker prendido para usar su diario. Toda falla —contenedor caído,
 * timeout, JSON raro— devuelve `null`, y quien llama sigue de largo. La app
 * nunca queda esperando ni muestra un error por esto.
 */

/** Dónde escucha el SearXNG local. Se puede mover con `SEARXNG_URL`. */
const BASE = process.env.SEARXNG_URL ?? 'http://localhost:8080';

/**
 * Corto a propósito. Esto corre en el worker, detrás de una llamada a Gemma que
 * ya tarda; si el buscador no contesta en cinco segundos, no está.
 */
const TIMEOUT_MS = 5_000;

export type Resultado = {
  titulo: string;
  url: string;
  /** El resumen que devuelve el buscador. Es lo que lee el modelo. */
  texto: string;
  /** "goethe.de" — es lo que se le muestra a Matías como fuente. */
  dominio: string;
};

/** El dominio pelado de una URL, o '' si no se puede leer. */
export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * LO QUE VIENE DE SEARXNG → LO QUE LEE EL MODELO. Separado del `fetch` para que
 * se pueda probar sin levantar el contenedor, igual que `parsearRss` en
 * `lib/noticias`: la parte que decide qué entra es esta, no la red.
 *
 * ⚠️ SE FILTRA LO QUE NO TIENE DOMINIO NI TEXTO, y no es cosmético: el resumen
 * es lo único que el modelo lee para sacar la cifra, y el dominio es lo único
 * que Matías ve como fuente. Un resultado sin ninguno de los dos no aporta y
 * ocupa uno de los cinco lugares.
 *
 * Devuelve null cuando la respuesta no tiene la forma esperada: eso es "no se
 * pudo buscar", que no es lo mismo que "no hay nada".
 */
export function mapearResultados(datos: unknown, cuantos = 5): Resultado[] | null {
  const results = (datos as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return null;

  return results
    .slice(0, cuantos)
    .map((r) => {
      const o = r as Record<string, unknown>;
      const u = typeof o.url === 'string' ? o.url : '';
      return {
        titulo: typeof o.title === 'string' ? o.title : '',
        url: u,
        texto: typeof o.content === 'string' ? o.content : '',
        dominio: dominioDe(u),
      };
    })
    .filter((r) => r.dominio !== '' && r.texto !== '');
}

/**
 * Busca y devuelve los primeros resultados, o null si el buscador no está.
 *
 * Null y lista vacía NO son lo mismo, y quien llama tiene que distinguirlos:
 * null es "no se pudo buscar" (y entonces vale caer a la memoria del modelo);
 * lista vacía es "se buscó y no hay nada" (y entonces no hay nada que decir).
 */
export async function buscar(consulta: string, cuantos = 5): Promise<Resultado[] | null> {
  const url = `${BASE}/search?q=${encodeURIComponent(consulta)}&format=json&language=es`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    return mapearResultados(await res.json(), cuantos);
  } catch {
    // Contenedor apagado, timeout, JSON roto. Es el caso normal, no un error.
    return null;
  }
}

/** ¿Está levantado? Para decírselo a Matías en vez de que adivine. */
export async function buscadorVivo(): Promise<boolean> {
  return (await buscar('test', 1)) !== null;
}

// EL PASO 7 DEL CEREBRO: dónde queda lo que la app aprende de Matías.
//
// Hasta hoy el destino era **un párrafo de 561 caracteres que se borraba y se
// reescribía entero** en cada corrida del Analista (`delete` + `insert`, mismo
// título). Por eso lo que él confirmó hace tres semanas no llegaba al chat, y
// por eso la app no "sabía más" con el tiempo: no tenía dónde poner lo que sabe.
//
// ── LAS TRES REGLAS QUE ORDENAN ESTE ARCHIVO ─────────────────────────────────
//
// 1. ⚠️ **UN PATRÓN NUNCA APARECE DE LA NADA.** Siempre sale de episodios que se
//    pueden abrir y mirar. Es la regla que él escribió el 30/07 —*"siempre se
//    muestra de dónde salió; sin el origen es magia y no se puede auditar"*—
//    aplicada al esquema y no a la interfaz.
//
// 2. ⚠️⚠️ **LO QUE ÉL CONFIRMÓ PESA MÁS QUE LO QUE EL MODELO CREE.** Hoy pasa lo
//    contrario: `guardarAnalisis` filtra por la confianza que el modelo se pone
//    a sí mismo, y sus 34 veredictos no influyen en nada. Acá el estado lo
//    decide él, y lo descartado no vuelve al chat aunque el modelo insista.
//
// 3. ⚠️ **LA TAXONOMÍA ES LA RUEDA, no un vocabulario nuevo.** Hoy conviven tres
//    para la misma vida: las 8 áreas, los 9 factores de ánimo y 20 `temas` que
//    el clasificador inventa solo —con "Finanzas" y "Vida social" repetidos como
//    área y como tema—. Un cuarto vocabulario sería el problema de los 52 temas
//    del 28/07 un piso más arriba. Las áreas ya tienen score, foco e historia, y
//    los objetivos ya apuntan ahí.

/** De dónde salió un hecho. Corto a propósito: es lo que se muestra. */
export type OrigenHecho =
  | 'chat'
  | 'notas'
  | 'marcas'
  | 'analista'
  | 'onboarding'
  | 'confirmados'
  /** Un cruce calculado sobre las filas, ya pasado por `lib/sesgos`. */
  | 'calculo';

/**
 * ⚠️ EL ESTADO LO MUEVE ÉL, NO EL MODELO. `no_confirmado` es donde nace todo lo
 * que deduce la app; para pasar a `confirmado` hace falta que él lo diga.
 * `descartado` no se borra: saber que algo NO le pasa es información, y borrarlo
 * haría que el Analista lo vuelva a proponer la semana siguiente.
 */
export type EstadoHecho = 'no_confirmado' | 'confirmado' | 'descartado';

export type Hecho = {
  id: number;
  tipo: 'episodio' | 'patron' | 'preferencia';
  contenido: string;
  /** Lo que dijo ÉL cuando el bot preguntó. Sin esto un episodio no sube a patrón. */
  porque: string | null;
  /** El área de la rueda. `null` mientras no se pueda ubicar: es mejor que inventar. */
  areaId: number | null;
  estado: EstadoHecho;
  origen: OrigenHecho;
  /** Cuándo pasó lo que el hecho cuenta (≠ cuándo se guardó). */
  cuando: string;
  /** `null` = no vence. Ver `esVigente`. */
  vence: string | null;
  /** Solo en patrones: los ids de los episodios de los que salió. */
  saleDe: number[];
};

/**
 * Cuántos episodios que coinciden hacen falta para que nazca un patrón.
 *
 * ⚠️ TRES Y NO DOS. Con dos, cualquier coincidencia es un patrón — y su regla
 * dice *"no mostrar cosas hechas con pocos datos: con un solo caso no hay
 * rango"*. Dos casos son un caso y su repetición; tres es lo mínimo que
 * distingue una tendencia de una casualidad.
 */
export const MINIMO_PARA_PATRON = 3;

/** Cuántos hechos entran en el contexto del chat. */
export const TOPE_PARA_EL_CHAT = 12;

export function esVigente(h: Pick<Hecho, 'vence'>, ahora: string): boolean {
  return h.vence == null || h.vence > ahora;
}

/**
 * ¿Este episodio puede contar para un patrón?
 *
 * ⚠️ SIN `porque` NO CUENTA, y es la regla más importante del archivo. Un
 * episodio sin explicación es una coincidencia registrada: "se juntó con amigos
 * y el ánimo no subió" no dice nada hasta que él cuenta que hablaron del
 * trabajo. **Es lo que obliga al bot a preguntar**: sin preguntas no hay
 * explicaciones, y sin explicaciones el cerebro nunca sube de episodio a patrón.
 */
export function cuentaParaPatron(h: Pick<Hecho, 'tipo' | 'porque' | 'estado'>): boolean {
  return h.tipo === 'episodio' && h.estado !== 'descartado' && Boolean(h.porque?.trim());
}

/** Los episodios de un área que ya alcanzan para proponer un patrón. */
export function episodiosQueYaAlcanzan(
  episodios: Hecho[],
  minimo = MINIMO_PARA_PATRON,
): Hecho[] {
  const utiles = episodios.filter(cuentaParaPatron);
  return utiles.length >= minimo ? utiles : [];
}

/**
 * Qué le llega al bot en cada charla.
 *
 * El orden es la regla 2 hecha código: **primero lo que él confirmó**, después
 * lo que la app dedujo y todavía no validó. Lo descartado no entra nunca.
 *
 * ⚠️ Y DENTRO DE CADA GRUPO, LOS PATRONES ANTES QUE LOS EPISODIOS: un patrón
 * resume varios episodios, así que dice más por caracter. El contexto de un
 * modelo local es corto y es lo que hay que gastar bien.
 */
export function paraElChat(hechos: Hecho[], ahora: string, tope = TOPE_PARA_EL_CHAT): Hecho[] {
  const peso = (h: Hecho) => {
    const porEstado = h.estado === 'confirmado' ? 0 : 2;
    const porTipo = h.tipo === 'patron' ? 0 : 1;
    return porEstado + porTipo;
  };
  return hechos
    .filter((h) => h.estado !== 'descartado' && esVigente(h, ahora))
    .sort((a, b) => peso(a) - peso(b) || b.cuando.localeCompare(a.cuando))
    .slice(0, tope);
}

/** Las palabras de una frase, sin tildes, sin puntuación y sin mayúsculas. */
function palabras(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    // Los diacríticos que `NFD` acaba de separar.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Cuánto se parecen dos frases, de 0 a 1: qué proporción de sus palabras
 * comparten (Jaccard).
 */
export function similitud(a: string, b: string): number {
  const A = new Set(palabras(a));
  const B = new Set(palabras(b));
  if (A.size === 0 || B.size === 0) return 0;
  let comunes = 0;
  for (const x of A) if (B.has(x)) comunes++;
  return comunes / (A.size + B.size - comunes);
}

/**
 * A partir de acá dos frases son el mismo hecho.
 *
 * ⚠️ 0,75 SALIÓ DE UN CASO REAL, no de una intuición. El 13/08 el Analista
 * escribió, en dos corridas seguidas:
 *
 *   "Los días **en los que** te rodeás de gente o compartís actividades…"
 *   "Los días **en que** te rodeás de gente o compartís actividades…"
 *
 * El mismo hecho, con una palabra de diferencia. Y a la vez tiene que dejar
 * pasar como distintos "dormís mal los domingos" y "dormís mal los lunes", que
 * comparten casi todo. Los dos casos están en los tests.
 */
export const UMBRAL_MISMO_HECHO = 0.75;

/**
 * Qué hacer cuando llega un hecho nuevo que dice lo mismo que uno viejo.
 *
 * ⚠️ NO SE DUPLICA NI SE PISA: se deja el que ya está. Pisarlo perdería el
 * veredicto de él —que es el dato más caro de la app— y duplicarlo llenaría el
 * contexto del chat con la misma frase tres veces.
 *
 * ⚠️⚠️ Y COMPARA POR PARECIDO, NO POR IGUALDAD, porque **el modelo reformula un
 * poco en cada corrida**. Comparando exacto, cada lunes agregaría una versión
 * nueva de lo mismo: en ocho semanas serían dieciséis frases para dos ideas. Es
 * exactamente el error que dejó 52 temas con un chat cada uno el 28/07 —comparar
 * mal y crear uno nuevo cada vez—, y la primera versión de esta función lo
 * repetía.
 */
export function mismoHecho(a: string, b: string): boolean {
  return similitud(a, b) >= UMBRAL_MISMO_HECHO;
}

/**
 * El veredicto de él sobre un hecho.
 *
 * ⚠️ CONFIRMAR LIMPIA EL VENCIMIENTO. Si él dice "esto me pasa", deja de ser una
 * deducción con fecha de caducidad y pasa a ser algo que sabemos: caduca cuando
 * él lo desmienta, no cuando pase el tiempo.
 */
export function trasVeredicto(h: Hecho, veredicto: 'confirmado' | 'descartado'): Hecho {
  return veredicto === 'confirmado'
    ? { ...h, estado: 'confirmado', vence: null }
    : { ...h, estado: 'descartado' };
}

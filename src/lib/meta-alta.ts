/**
 * CUÁNDO UNA META QUEDÓ DEMASIADO ALTA, Y A CUÁNTO BAJARLA.
 *
 * Pedido de Matías (31/07), con el caso concreto: *"en Seguimiento tengo Leer, le
 * puse siete días y solo leí tres. Que te diga: quizás este objetivo por ahora es
 * demasiado alto, podríamos bajarlo y después ir subiéndolo de a poco"*.
 *
 * Y con el porqué, que es de él y viene de lo que trabajaron en Stepwise:
 * **cuando una tarea queda muy grande, lo mejor es achicarla y hacerla. Lo más
 * importante es hacerla.** Es hábitos atómicos aplicado.
 *
 * ── LO QUE LA APP HACE HOY, Y POR QUÉ NO ALCANZA ─────────────────────────────
 *
 * Hoy solo dice "te faltan 4 de 7 de leer". Eso es **el hueco sin la salida**:
 * te recuerda lo que no hiciste y te deja ahí. Repetido cada semana, una meta que
 * no se cumple nunca deja de ser una meta y pasa a ser un reproche semanal.
 *
 * Bajarla no es aflojar: es lo único que convierte una meta rota en una que se
 * cumple, y una que se cumple se puede subir después.
 *
 * ── LAS REGLAS QUE LO HACEN NO MOLESTO ───────────────────────────────────────
 *
 * ⚠️ **NO SE OFRECE CON UNA SEMANA MALA.** Hace falta un historial: una semana
 * floja le pasa a cualquiera y ofrecer bajar la meta ahí es la app leyendo un
 * resfrío como una tendencia. Se miran TRES semanas cerradas.
 *
 * ⚠️ **NO SE OFRECE SI NO HIZO NADA.** Cero de siete no es una meta demasiado
 * alta: es algo que no arrancó, o que ya no va. Bajarle la meta a algo que no
 * empezaste es cambiarle el número a un problema que es otro.
 *
 * ⚠️ **NO SE OFRECE SI YA ESTÁ CERCA.** Cinco de siete no está mal calibrada,
 * está bien y le faltó poco. Solo cuando lo que hace de verdad es bastante menos
 * que lo que se propuso.
 *
 * ⚠️ **Y LA PROPUESTA ES LO QUE YA HACE, NO UN NÚMERO INVENTADO.** Se propone la
 * mediana de esas tres semanas: es el número que él ya viene cumpliendo, así que
 * la meta nueva nace cumplida. Proponer "bajala a 5" cuando hace 3 sería repetir
 * el mismo error más chico.
 */

/** Semanas cerradas que se miran. Menos que esto es ruido; más, es historia
 *  vieja que no dice cómo viene ahora. */
const SEMANAS = 3;

/**
 * Qué tan lejos tiene que estar para llamarla alta. 0.6 = hace el 60% o menos.
 * Con 5 de 7 (71%) no se dice nada: eso no está mal calibrado.
 */
const UMBRAL = 0.6;

export type Semana = { hechos: number };

export type MetaAlta = {
  /** A cuánto conviene bajarla: lo que ya viene haciendo. */
  sugerida: number;
  /** Lo que viene haciendo, para poder decirlo. */
  tipico: number;
};

/** La mediana, que aguanta una semana rara mucho mejor que el promedio: una
 *  semana de 7 no puede sola convencer a la app de que la meta está bien. */
function mediana(ns: number[]): number {
  const orden = [...ns].sort((a, b) => a - b);
  const m = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[m] : Math.round((orden[m - 1] + orden[m]) / 2);
}

/**
 * ¿Conviene ofrecer bajar esta meta? Null cuando no —que es casi siempre, y está
 * bien—. `semanas` son las semanas CERRADAS, de la más vieja a la más reciente.
 */
export function metaDemasiadoAlta(meta: number | null, semanas: Semana[]): MetaAlta | null {
  if (meta == null || meta <= 1) return null;
  if (semanas.length < SEMANAS) return null;

  const ultimas = semanas.slice(-SEMANAS).map((s) => s.hechos);
  const tipico = mediana(ultimas);

  // No arrancó (o dejó): el problema no es el número de la meta.
  if (tipico <= 0) return null;
  // Está cerca: no hay nada que corregir.
  if (tipico / meta > UMBRAL) return null;
  // Alguna semana la cumplió entera: la meta es alcanzable y lo probó.
  if (ultimas.some((n) => n >= meta)) return null;

  return { sugerida: tipico, tipico };
}

/**
 * Cómo se lo dice.
 *
 * ⚠️ ES UN HECHO Y UNA OFERTA, NUNCA UN CONSEJO NI UN RETO. Sin "deberías", sin
 * "no aflojes", sin signos de exclamación — la misma regla que gobierna Objetivos
 * entero. Y sin "solo hiciste": lo que hizo se cuenta, no se descuenta.
 *
 * El "por ahora" y el "después la subimos" no son para endulzar: son la parte que
 * hace que bajarla no se sienta una derrota, que es exactamente lo que la vuelve
 * aceptable.
 */
export function fraseMetaAlta(titulo: string, meta: number, m: MetaAlta): string {
  return `Te propusiste ${titulo} ${meta} veces por semana y venís haciendo ${m.tipico}. ¿La bajamos a ${m.sugerida} por ahora? Después la subimos.`;
}

/**
 * Agrupa las marcas en SEMANAS CERRADAS, de la más vieja a la más reciente.
 *
 * ⚠️ LA SEMANA EN CURSO NO CUENTA, y es la decisión que más cambia el resultado:
 * un miércoles llevás 1 de 7 y eso no dice nada sobre si la meta está alta — te
 * faltan cuatro días. Si la semana a medias entrara, la app te ofrecería bajar la
 * meta todos los lunes.
 *
 * Las semanas arrancan el LUNES, como la grilla de Seguimiento: si acá cortaran
 * distinto, los números de las dos pantallas no coincidirían y una de las dos
 * estaría mintiendo.
 */
export function semanasDe(fechas: string[], ahora: Date = new Date(), cuantas = SEMANAS): Semana[] {
  // El lunes de la semana EN CURSO: todo lo de acá en adelante se descarta.
  const lunesActual = new Date(ahora);
  lunesActual.setHours(0, 0, 0, 0);
  const dow = (lunesActual.getDay() + 6) % 7; // 0 = lunes
  lunesActual.setDate(lunesActual.getDate() - dow);

  const salida: Semana[] = [];
  for (let i = cuantas; i >= 1; i--) {
    const desde = new Date(lunesActual);
    desde.setDate(desde.getDate() - 7 * i);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 7);
    const d = iso(desde);
    const h = iso(hasta);
    salida.push({ hechos: fechas.filter((f) => f >= d && f < h).length });
  }
  return salida;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * "CUÁNTO SUELE LLEVAR ESTO", con lo que se sabe del mundo y no con tus datos.
 *
 * Pedido de Matías (30/07): *"hay proyectos que no sabés cuánto te van a llevar,
 * entonces está bueno como estimación… si sabés que el Goethe dice setecientas
 * cincuenta horas, podés poner 'estimado según datos del Goethe'. Y si no lo
 * sabe, no pone nada"*.
 *
 * ── LAS DOS ESTIMACIONES DE LA APP, Y POR QUÉ NO SE MEZCLAN ──────────────────
 *
 * | | De dónde sale | Qué tan firme es |
 * |---|---|---|
 * | `estimarDeCerrados` (lib/objetivos.ts) | Los objetivos que Matías YA cerró | Es un hecho suyo |
 * | Esta | Lo que el modelo sabe del mundo | Es una cita, y **sin verificar** |
 *
 * ⚠️ **VAN EN RENGLONES SEPARADOS Y NUNCA EN LA MISMA FRASE.** Si "los 3 que
 * cerraste te llevaron 5 a 8 semanas" y "el Goethe dice 750 horas" se juntan, el
 * segundo se contagia de la solidez del primero, y no tienen la misma solidez ni
 * de cerca: uno lo vivió él, el otro lo dijo un modelo de 12B de memoria.
 *
 * ⚠️ **Y NO ALIMENTA NINGÚN CÁLCULO.** No entra en `horasEstimadas`, no mueve
 * una barra de progreso, no arma una proyección. Es texto que se lee y se
 * descarta. Si el número está mal, se equivoca en una frase; si entrara al
 * cálculo, se equivocaría adentro de todo lo demás y sin avisar.
 *
 * ── LA VALIDACIÓN ES EL 90% DE ESTE ARCHIVO, Y ES A PROPÓSITO ────────────────
 *
 * Es la misma decisión que se tomó con las observaciones del Analista y con el
 * subrayado de "Cómo se lee": **al modelo no se le pide que se porte bien, se le
 * valida la respuesta.** Acá pesa más que en ningún otro lado, porque Gemma tira
 * números con total seguridad aunque se los invente, y un número inventado con
 * cara de dato es peor que no decir nada — Matías lo va a leer para decidir si
 * se mete en algo.
 *
 * Callarse es el resultado ESPERADO y el más frecuente. Todo lo que no pasa los
 * filtros se descarta entero: no hay versión degradada ni "más o menos".
 */

export const ESQUEMA_ESTIMACION = {
  type: 'object',
  properties: {
    sabe: { type: 'boolean' },
    cantidad: { type: 'number' },
    unidad: { type: 'string', enum: ['horas', 'semanas', 'meses'] },
    fuente: { type: 'string' },
    detalle: { type: 'string' },
  },
  required: ['sabe'],
} as const;

export type Estimacion = {
  /** "Suele estimarse en unas 750 horas de clase, para ir de cero a B2." */
  texto: string;
  /** "según el Goethe-Institut" — va aparte, en chico, debajo. */
  fuente: string;
  /** El número pelado y su unidad, para poder comparar dos estimaciones entre
   *  sí. No se muestra: ya está adentro de `texto`. */
  cantidad: number;
  unidad: string;
};

/**
 * ¿Estas dos estimaciones dicen más o menos lo mismo?
 *
 * ⚠️ ES LO QUE DECIDE SI ALGO SE PUEDE LLAMAR VERIFICADO, y sale de una prueba
 * concreta del 30/07: para "aprender alemán, llegar al B2", la búsqueda trajo
 * 1200 horas de sprachschule.org — que es la cifra correcta para **C2**, y lo
 * decía en su propia frase. El buscador encuentra la tabla bien y el modelo se
 * equivoca de fila.
 *
 * Dos números lejos no es "uno mejor y otro peor": es la señal de que uno de los
 * dos está contestando otra pregunta. Y cuando no se sabe cuál, el que se
 * muestra es el que vino con nombre y apellido (el Goethe, el PMI), no el del
 * blog que salió tercero.
 *
 * Distintas unidades nunca concuerdan: convertir horas a semanas necesitaría
 * saber cuántas horas por semana, que es justo lo que nadie sabe.
 */
export function concuerdan(a: Estimacion, b: Estimacion): boolean {
  if (a.unidad !== b.unidad) return false;
  const mayor = Math.max(a.cantidad, b.cantidad);
  const menor = Math.min(a.cantidad, b.cantidad);
  if (menor <= 0) return false;
  // Un 30% de diferencia es la misma cifra redondeada distinto. Más que eso ya
  // es otro nivel, otro examen u otra pregunta.
  return mayor / menor <= 1.3;
}

/** Techos por unidad. Más que esto no es una estimación, es ruido. */
const TECHO: Record<string, number> = { horas: 10_000, semanas: 520, meses: 240 };

/**
 * Lo que NO es una fuente, por más que venga en el campo `fuente`.
 *
 * ⚠️ ESTE FILTRO ES EL QUE MÁS TRABAJA. El prompt pide un organismo con nombre,
 * y cuando el modelo no tiene ninguno igual completa el campo —contestar es su
 * default— con "estudios", "la experiencia general" o "varias fuentes". Eso no
 * es una fuente: es la forma que tiene de no tener una, y encima disfraza de
 * dato lo que es un invento. Sin nombre propio, se descarta todo.
 */
const NO_ES_FUENTE = [
  'estudio', 'investigacion', 'experiencia', 'general', 'varios', 'varias',
  'internet', 'fuentes', 'expertos', 'especialistas', 'gente', 'promedio',
  'comunidad', 'usuarios', 'consenso', 'suele', 'depende', 'diversos',
];

function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Convierte lo que devolvió el modelo en algo mostrable, o en null.
 *
 * Acepta el objeto ya parseado. Null en cualquiera de estos casos, sin excepción
 * y sin rescatar lo que se pueda:
 *   - dijo que no sabe (el caso más común, y está bien)
 *   - el número no es un número, es cero, es negativo o se fue del techo
 *   - la unidad no es una de las tres
 *   - la fuente está vacía, o es una de las que no son fuente
 */
export function validarEstimacion(crudo: unknown): Estimacion | null {
  if (typeof crudo !== 'object' || crudo === null) return null;
  const o = crudo as Record<string, unknown>;

  if (o.sabe !== true) return null;

  const unidad = typeof o.unidad === 'string' ? o.unidad.trim().toLowerCase() : '';
  if (!(unidad in TECHO)) return null;

  const cantidad = typeof o.cantidad === 'number' ? o.cantidad : Number(o.cantidad);
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > TECHO[unidad]) return null;

  const fuente = typeof o.fuente === 'string' ? o.fuente.trim() : '';
  if (fuente.length < 3) return null;
  const f = normalizar(fuente);
  if (NO_ES_FUENTE.some((mala) => f.includes(mala))) return null;

  const detalle = typeof o.detalle === 'string' ? o.detalle.trim().replace(/\.$/, '') : '';

  // ⚠️ "SUELE ESTIMARSE", NUNCA "TE VA A LLEVAR". Es lo único que separa una cita
  // general de una promesa sobre la vida de Matías, y la app no tiene con qué
  // sostener la segunda. Hay un test que rechaza la segunda persona.
  const redondo = Math.round(cantidad * 10) / 10;
  const texto = `Suele estimarse en unas ${redondo} ${unidad}${detalle ? `, ${detalle}` : ''}.`;

  return { texto, fuente: fuente.replace(/^seg[uú]n\s+/i, ''), cantidad: redondo, unidad };
}

// ── LA VARIANTE CON BÚSQUEDA ─────────────────────────────────────────────────

export const ESQUEMA_ESTIMACION_WEB = {
  type: 'object',
  properties: {
    sabe: { type: 'boolean' },
    cantidad: { type: 'number' },
    unidad: { type: 'string', enum: ['horas', 'semanas', 'meses'] },
    resultado: { type: 'number' },
    detalle: { type: 'string' },
  },
  required: ['sabe'],
} as const;

/**
 * Igual que la de arriba, pero la fuente NO la escribe el modelo: la señala.
 *
 * ⚠️ ESTA ES TODA LA DIFERENCIA, Y ES LA QUE HACE QUE ESTO SE PUEDA LLAMAR
 * VERIFICADO. En la versión de memoria, el modelo tipea el nombre de la fuente
 * — y puede inventarlo con la misma facilidad con la que inventa el número. Acá
 * devuelve el NÚMERO DE ORDEN de un resultado que ya existe, y el dominio lo
 * saca el código de la URL que trajo el buscador. El modelo no puede inventar un
 * dominio que no esté en la lista: a lo sumo puede señalar mal, y para eso está
 * el rango.
 *
 * Si el índice no cae dentro de los resultados que se le pasaron, se descarta
 * todo. Un índice fuera de rango es la señal de que se lo inventó.
 */
export function validarEstimacionWeb(
  crudo: unknown,
  resultados: { url: string; dominio: string }[],
): Estimacion | null {
  if (typeof crudo !== 'object' || crudo === null) return null;
  const o = crudo as Record<string, unknown>;

  if (o.sabe !== true) return null;

  const unidad = typeof o.unidad === 'string' ? o.unidad.trim().toLowerCase() : '';
  if (!(unidad in TECHO)) return null;

  const cantidad = typeof o.cantidad === 'number' ? o.cantidad : Number(o.cantidad);
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > TECHO[unidad]) return null;

  // El prompt los numera desde 1, como se los mostró.
  const indice = typeof o.resultado === 'number' ? o.resultado : Number(o.resultado);
  if (!Number.isInteger(indice) || indice < 1 || indice > resultados.length) return null;

  const dominio = resultados[indice - 1]?.dominio ?? '';
  if (!dominio) return null;

  const detalle = typeof o.detalle === 'string' ? o.detalle.trim().replace(/\.$/, '') : '';
  const redondo = Math.round(cantidad * 10) / 10;

  return {
    texto: `Suele estimarse en unas ${redondo} ${unidad}${detalle ? `, ${detalle}` : ''}.`,
    fuente: dominio,
    cantidad: redondo,
    unidad,
  };
}

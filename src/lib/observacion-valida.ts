// Una observación del Analista tiene que ser una FRASE QUE CONECTA DOS COSAS,
// no una etiqueta.
//
// El 25/07 el análisis devolvió esto, y Matías lo cazó al toque:
//   "gasto recurrente", "compensación/recompensa", "dolor y persistencia",
//   "preocupación por la salud"
// Son códigos temáticos: no dicen nada que él no supiera y no se pueden
// confirmar ni descartar. Lo que sirve es "los días que jugás al fútbol con el
// pie lesionado, al otro día registrás el ánimo más bajo".
//
// El prompt ya lo pide con ejemplos y el modelo igual colapsa a etiquetas cuando
// el historial es largo. Así que se valida acá y lo que no cumple se descarta.

/** Marcas de que la frase relaciona dos cosas y no es un rótulo. */
const CONECTORES = [
  'cuando',
  'los días',
  'los dias',
  'las veces',
  'las semanas',
  'cada vez',
  'después de',
  'despues de',
  'antes de',
  'tras ',
  'mientras',
  'coincide',
  'aparece',
  'suele',
  'tiende',
  'se relaciona',
  'va de la mano',
  'al otro día',
  'al otro dia',
  'al día siguiente',
  'al dia siguiente',
  'y eso',
  'pero ',
  'aunque',
  'si ',
  'porque',
  'baja',
  'sube',
  'mejora',
  'empeora',
  'cae',
];

/** Mínimo de palabras para que sea una oración y no un rótulo de dos palabras. */
const MIN_PALABRAS = 7;

/**
 * true si el texto parece una observación de verdad: una oración con largo
 * suficiente y alguna marca de relación entre dos cosas.
 */
export function esObservacionValida(patron: string): boolean {
  const t = patron.trim().toLowerCase();
  if (!t) return false;
  const palabras = t.split(/\s+/).filter(Boolean);
  if (palabras.length < MIN_PALABRAS) return false;
  return CONECTORES.some((c) => t.includes(c));
}

/**
 * El hilo central también tiene que ser una frase, no un título. No se le exige
 * conector (puede ser una tensión bien contada sin ninguno de esos), solo que
 * sea una oración de verdad.
 */
export function esHiloValido(hilo: string): boolean {
  return hilo.trim().split(/\s+/).filter(Boolean).length >= MIN_PALABRAS;
}

/**
 * ¿La evidencia cita fechas que existen en los datos que le pasamos?
 *
 * Al exigirle frases con datos concretos, el modelo empezó a INVENTARLOS: citaba
 * "2024-03-12 $5800" cuando los registros son de julio de 2026 y en euros. Una
 * observación con evidencia inventada es peor que una etiqueta vaga, porque
 * suena rigurosa. Si nombra una fecha de afuera de la ventana analizada, se cae.
 *
 * `desde` y `hasta` van en YYYY-MM-DD (se comparan como texto, que en ISO
 * ordena igual que cronológicamente).
 */
export function evidenciaCoherente(evidencia: string, desde: string, hasta: string): boolean {
  const texto = evidencia ?? '';

  const fechas = texto.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (fechas.some((f) => f < desde || f > hasta)) return false;

  // Años sueltos ("en marzo de 2024"), que no entran en el formato de arriba.
  const anios = texto.match(/\b20\d{2}\b/g) ?? [];
  const anioDesde = Number(desde.slice(0, 4));
  const anioHasta = Number(hasta.slice(0, 4));
  return anios.every((a) => Number(a) >= anioDesde && Number(a) <= anioHasta);
}

/**
 * Baja la confianza a lo que la evidencia banca de verdad.
 *
 * El prompt le da al Analista un criterio numérico (alta = 5 días o más, media
 * = 3 o 4, baja = 2, y con 1 no es una relación). Igual la infla: el 28/07
 * devolvió "cuando te sentís cuestionado la libido baja considerablemente" en
 * confianza ALTA citando UNA sola fecha. Y una relación inflada no se queda
 * quieta: le tira abajo la credibilidad a las otras tres, porque Matías conoce
 * su vida y ve que esa no se sostiene.
 *
 * Así que se cuenta acá, sobre las fechas que la propia evidencia cita, y la
 * confianza declarada nunca puede superar a la contada. Nunca la sube: si el
 * modelo fue prudente, se respeta.
 */
export function confianzaSegunEvidencia(evidencia: string, declarada: string): string {
  const fechas = new Set((evidencia ?? '').match(/\d{4}-\d{2}-\d{2}/g) ?? []);
  // Sin fechas citadas no hay con qué contar: se deja lo que dijo el modelo, que
  // para eso están las otras validaciones.
  if (fechas.size === 0) return declarada;

  // ⚠️ LOS NÚMEROS SALEN DE CUÁNTOS DATOS TIENE LA APP, no de la estadística.
  // Con el umbral "ideal" (5 para alta, 3 para media) y diez días de registros,
  // TODAS las relaciones caían a baja. Y las bajas no se ofrecen para confirmar,
  // así que la pantalla quedaba vacía y los experimentos no aparecían nunca:
  // el filtro contra lo forzado terminaba apagando la función entera.
  // Con 4 y 2 se sostiene lo que importa (una sola fecha NUNCA pasa de baja:
  // un día no es una relación) y la app puede volver a hablar.
  // Si algún día hay meses de historial, esto se sube.
  const techo = fechas.size >= 4 ? 'alta' : fechas.size >= 2 ? 'media' : 'baja';
  const ORDEN = ['baja', 'media', 'alta'];
  return ORDEN.indexOf(declarada) > ORDEN.indexOf(techo) ? techo : declarada;
}

/**
 * DEJA LA OBSERVACIÓN COMO PARA LEERLA, no como para auditarla.
 *
 * Pedido de Matías (29/07), mirando la tarjeta "Algo que noté" en el Home:
 * *"no sé por qué aparece la fecha de cuándo lo anoté, no hace falta que marque
 * eso, y no hace falta que diga tres de cinco, no hace falta que ponga esos
 * números"*. Y tiene razón: al abrir la app querés leer QUÉ notó, no las
 * pruebas. Las fechas viven en `evidencia`, que es el campo que existe
 * exactamente para eso, y el "3/5" es la escala interna de la app filtrándose a
 * la superficie: adentro es un número, afuera es "la energía más baja".
 *
 * Es SOLO PARA MOSTRAR. El texto crudo sigue siendo la identidad de la
 * observación (con él se guarda el veredicto y se sabe si ya la contestaste),
 * así que nunca hay que limpiar antes de comparar o de guardar.
 *
 * El prompt del Analista ya pide que las fechas no vayan en el `patron`; esto
 * es la red de abajo, para lo que ya está guardado y para cuando el modelo se
 * olvide.
 */
export function limpiarObservacion(patron: string): string {
  let t = patron ?? '';

  // 1. El paréntesis que es solo una lista de fechas: "(2026-07-26, 2026-07-27
  //    y 2026-07-28)". Se va entero, paréntesis incluido.
  t = t.replace(/\s*\((?:\s*\d{4}-\d{2}-\d{2}\s*(?:,|;|y|e)?\s*)+\)/gi, '');

  // 2. Las fechas sueltas que quedaron fuera de paréntesis, con el "el" o el
  //    "los" que las presenta.
  t = t.replace(/\s*\b(?:el|los|del|desde el|hasta el)?\s*\d{4}-\d{2}-\d{2}\b/gi, '');

  // 3. La escala interna: "hacia el 3/5", "en 2 de 5". Se lleva la preposición
  //    que la introduce, porque sin ella queda "una caída en tu energía hacia .".
  t = t.replace(/\s*\b(?:hasta|hacia|en|al?|de|por|sobre)\s+(?:el|la|los|las|un|una)?\s*\d(?:[.,]\d)?\s*(?:\/|\s+de\s+)\s*5\b/gi, '');
  // Y la que aparece sin preposición delante.
  t = t.replace(/\s*\b\d(?:[.,]\d)?\s*(?:\/|\s+de\s+)\s*5\b/gi, '');

  // 4. La costura: espacios dobles, la coma o el punto que quedaron colgados y
  //    los paréntesis que se vaciaron.
  t = t
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

  // Si al sacar la cola se comió el punto final, se lo devuelve: es una frase.
  if (t && !/[.!?…]$/.test(t)) t = `${t}.`;
  return t;
}

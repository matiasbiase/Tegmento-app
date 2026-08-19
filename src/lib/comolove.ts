/**
 * "Ver cómo lo puede haber leído" solo tiene sentido si hay OTRO.
 *
 * La marca `[+comolove:]` ofrece mirar algo con los ojos de la otra persona. El
 * prompt dice, con todas las letras, que solo va cuando hay alguien más
 * involucrado. **Se lo pedimos tres veces y siguió apareciendo igual**: el 29/07
 * le salió con "no muy bien, tengo dos caminos" y con "dormí una siesta". No
 * había nadie. Matías lo leyó y se quedó pensando de quién le hablaba la app, y
 * eso le arruinó una respuesta que estaba bien.
 *
 * Así que se hace como con las promesas falsas (ver lib/promesas): **no se le
 * pide al modelo, se corrige la respuesta antes de guardarla.** Es la misma
 * lección que ya nos costó dos arreglos en el prompt: a un modelo chico no se le
 * pide que ignore una opción, se le saca la opción.
 *
 * ⚠️ La decisión se toma mirando EL MENSAJE DE MATÍAS, no la respuesta del
 * modelo: quién está involucrado lo dice él, no el asistente.
 */

export const MARCA_COMOLOVE = /\[\+comolove:\s*([^\]\n]+)\]/i;

/**
 * Palabras que delatan a otra persona. Están en singular y plural porque el
 * chequeo es por substring: "amigo" pesca "amigos" y "amiga" pesca "amigas".
 */
const PERSONAS = [
  'amig', 'novi', 'pareja', 'esposa', 'esposo', 'marido', 'mujer',
  'mamá', 'mama', 'madre', 'vieja', 'papá', 'papa', 'padre', 'viejo',
  'herman', 'tío', 'tio', 'tía', 'tia', 'prim', 'abuel', 'suegr', 'cuñad',
  'famili', 'jefe', 'jefa', 'compañer', 'colega', 'cliente', 'equipo',
  'profe', 'médic', 'medic', 'doctor', 'terapeuta', 'psicólog', 'psicolog',
  'vecin', 'conocid', 'chica', 'chico', 'gente', 'alguien', 'nadie',
  'mi ex', 'una persona', 'un tipo', 'una mina',
];

/** Formas verbales que implican un ida y vuelta con alguien. */
const CON_OTRO = [
  'me dijo', 'me dijeron', 'le dije', 'les dije', 'me escribió', 'le escribí',
  'me contestó', 'le contesté', 'me habló', 'le hablé', 'hablé con', 'hablamos',
  'discutí', 'discutimos', 'peleé', 'peleamos', 'me contó', 'le conté',
  'me pidió', 'le pedí', 'me trató', 'quedamos', 'me ignoró', 'no me contestó',
];

/**
 * ¿Matías está hablando de alguien más?
 *
 * Los nombres propios cuentan: si escribe "quedé mal con Ana", no hay ninguna
 * palabra de la lista pero hay otra persona clarísima. Se detectan como palabra
 * capitalizada que NO arranca la oración; es una heurística y por eso va última,
 * pero el costo de equivocarse acá es bajo (se ofrece un botón de más), mucho
 * menor que el de no ofrecerlo cuando de verdad hacía falta.
 */
export function hayOtraPersona(mensaje: string): boolean {
  const t = ` ${mensaje.toLowerCase()} `;
  if (PERSONAS.some((p) => t.includes(p))) return true;
  if (CON_OTRO.some((v) => t.includes(v))) return true;

  // Nombre propio: mayúscula en una palabra que no abre la oración.
  return /(?<![.!?¡¿]\s|^)\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/u.test(mensaje.trim());
}

/**
 * Saca la marca si en el mensaje de Matías no hay nadie más.
 *
 * Solo saca la MARCA, nunca el texto: la respuesta del asistente puede estar
 * perfecta (en el caso del 29/07 lo estaba: "te escucho, ¿qué es lo que te tiene
 * así?"). Lo que sobra es el botón.
 */
export function sacarComoloveSinOtro(respuesta: string, mensajeUsuario: string): string {
  if (!MARCA_COMOLOVE.test(respuesta)) return respuesta;
  if (hayOtraPersona(mensajeUsuario)) return respuesta;
  return respuesta.replace(MARCA_COMOLOVE, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * LO QUE WHISPER INVENTA SOBRE EL SILENCIO.
 *
 * Encontrado el 04/08/2026 mirando la base: había un mensaje de Matías que
 * decía **"¡Suscríbete al canal!"**. No lo dijo él. Whisper entrenó con
 * subtítulos de YouTube, así que cuando le das un audio vacío o con puro ruido
 * **no devuelve nada: devuelve la frase que más veces vio en un silencio**, que
 * son los cierres de los videos.
 *
 * ── ⚠️ POR QUÉ ESTO IMPORTA MÁS DE LO QUE PARECE ────────────────────────────
 *
 * No es un mensaje feo en el chat. Ese texto entra a `chat_mensajes` como algo
 * que él dijo, y de ahí lo lee **el Analista, los patrones y la memoria del
 * bot**. O sea: un audio en silencio puede terminar convertido en un "hecho"
 * sobre su vida. Es la misma clase de problema que un número inventado, que es
 * la regla que más veces se repitió en este proyecto — con el agravante de que
 * acá la app se lo atribuye a él.
 *
 * ── ⚠️⚠️ LA REGLA QUE HACE QUE ESTO SEA SEGURO ──────────────────────────────
 *
 * **Solo se descarta cuando la transcripción ENTERA es el artefacto.** Nunca
 * cuando aparece adentro de algo más largo.
 *
 * Y es la decisión central del archivo, no un detalle de implementación: si
 * filtrara por "contiene", un audio real donde él dice *"gracias"* al final se
 * perdería entero. **Borrar algo que sí dijo es mucho peor que dejar pasar una
 * frase rara**: lo primero le saca un dato de su vida sin avisar, lo segundo se
 * ve en pantalla y se borra a mano.
 */

/**
 * Las frases que Whisper devuelve sobre el silencio, en español.
 *
 * ⚠️ ESTÁN NORMALIZADAS (sin tildes, sin signos, en minúscula) porque el modelo
 * las devuelve con variantes: "¡Suscríbete al canal!", "Suscribete al canal",
 * "SUSCRÍBETE AL CANAL". Comparar el texto crudo dejaría pasar la mitad.
 *
 * ⚠️ Y NO SE AGREGA "gracias" SOLO. Aparece en las listas de artefactos que
 * andan dando vueltas, pero *"gracias"* es una cosa que una persona dice a una
 * app. Prefiero dejar pasar una que borrar un mensaje de verdad — ver la regla
 * de arriba.
 */
const ARTEFACTOS = [
  'suscribete al canal',
  'suscribete',
  'suscribete a mi canal',
  'suscribete al canal y activa la campanita',
  'no te olvides de suscribirte',
  'no olvides suscribirte',
  'gracias por ver el video',
  'gracias por ver este video',
  'gracias por vernos',
  'nos vemos en el proximo video',
  'hasta el proximo video',
  'subtitulos realizados por la comunidad de amara org',
  'subtitulado por la comunidad de amara org',
  'subtitulos por la comunidad de amara org',
  'amara org',
  'mas informacion en www mooji org',
  'www mooji org',
  'subtitulos realizados por',
  'un saludo y hasta la proxima',
];

/** Minúsculas, sin tildes, sin signos ni espacios de más. */
function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ⚠️ EL LOOP: Whisper a veces se traba y repite la misma frase corta N veces
 * ("gracias gracias gracias gracias"). Eso NO es una lista fija —depende del
 * audio— así que se detecta por forma: pocas palabras distintas repetidas
 * muchas veces. Una persona no habla así.
 *
 * El piso de 4 repeticiones es deliberado: *"no, no, no"* es algo que alguien
 * dice de verdad.
 */
function esLoop(normalizado: string): boolean {
  const palabras = normalizado.split(' ').filter(Boolean);
  if (palabras.length < 8) return false;
  const distintas = new Set(palabras);
  return palabras.length / distintas.size >= 4;
}

/**
 * ¿Esto es algo que Whisper inventó y no algo que dijo una persona?
 *
 * ⚠️ Compara la transcripción ENTERA contra la lista. Un audio real que termina
 * con "gracias por ver el video" —vaya a saber por qué— se conserva completo.
 */
export function esAlucinacion(texto: string): boolean {
  const n = normalizar(texto);
  if (!n) return true; // solo signos o espacios: no dijo nada
  if (ARTEFACTOS.includes(n)) return true;
  return esLoop(n);
}

/**
 * La transcripción lista para guardar, o `''` si no había nada que guardar.
 *
 * Devuelve string vacío y no `null` para que la ruta pueda tratarlo igual que
 * "el audio salió mudo", que es lo que de verdad pasó.
 */
export function limpiarTranscripcion(texto: string): string {
  const limpio = texto.trim();
  return esAlucinacion(limpio) ? '' : limpio;
}

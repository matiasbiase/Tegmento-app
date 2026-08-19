/**
 * CÓMO ARRANCA LA APP LA CONVERSACIÓN.
 *
 * Antes esto era UNA plantilla: `¿Cómo viene lo de ${titulo}?`, usada por las
 * dos ramas que más caen (tenés una actividad en curso, o hay un tema abierto).
 * Resultado: Matías veía siempre la misma frase, y con razón le sonó a que la
 * app no entendía nada de lo que estaba haciendo (28/07: "¿siempre usás la
 * misma frase?, no sé si entiende bien lo que estoy haciendo").
 *
 * El problema real no era el molde sino que **había uno solo**. Una pregunta
 * repetida deja de ser una pregunta: se vuelve el ruido que hace la app al
 * abrirse. Con varias formas distintas de preguntar por lo mismo, la app parece
 * lo que es, alguien que se acuerda, en vez de un cartel.
 *
 * ⚠️ NO SON SINÓNIMOS, SON ÁNGULOS DISTINTOS. "¿Cómo viene?" pregunta por el
 * avance; "¿te está costando?" por la dificultad; "¿seguís con eso?" por si
 * sigue vivo. Cambiar solo las palabras y preguntar siempre lo mismo sería el
 * mismo problema con más texto.
 *
 * La elección es por DÍA y no al azar: dentro del mismo día la app te dice
 * siempre lo mismo (si cambiara en cada refresh sería desconcertante), y al día
 * siguiente cambia sola.
 */

/** Preguntas por algo que él sostiene en el tiempo (una actividad). */
const POR_UNA_ACTIVIDAD = [
  (q: string) => `¿Cómo viene lo de ${q}?`,
  (q: string) => `¿Seguís con ${q}?`,
  (q: string) => `Contame de ${q}, ¿en qué quedó?`,
  (q: string) => `¿Pudiste con ${q} estos días?`,
  (q: string) => `¿Te está costando ${q}?`,
  (q: string) => `De ${q}, ¿qué me contás?`,
];

/** Preguntas por un tema del que vinieron hablando. */
const POR_UN_TEMA = [
  (q: string) => `¿Cómo viene lo de ${q}?`,
  (q: string) => `¿Quedó algo dando vueltas con ${q}?`,
  (q: string) => `La última vez hablamos de ${q}, ¿cambió algo?`,
  (q: string) => `¿Seguís pensando en ${q}?`,
  (q: string) => `¿Dónde quedó lo de ${q}?`,
];

/**
 * PREGUNTAS QUE NO DEPENDEN DE NINGÚN DATO, y que igual sirven.
 *
 * Pedido de Matías (29/07): *"quizás no te quiero contar nada del curso, no
 * tiene ningún sentido. Pero que te pregunte algo más como: ¿te da vueltas algo
 * en la cabeza?, ¿tenés alguna idea?, ¿algo que quieras seguir? Ese tipo de
 * preguntas que abran a conversar, o simplemente a anotar algo de lo que
 * hiciste"*.
 *
 * ⚠️ ESTO CONTRADICE A MEDIAS LA REGLA VIEJA ("si no hay nada tuyo que decir, la
 * app se calla"), y es a propósito. Esa regla era contra lo GENÉRICO-VACÍO
 * ("¿cómo va todo?"), pero una app que solo sabe preguntar por lo que ya tiene
 * anotado te encierra en lo que ya anotaste: si esta semana lo que te da vueltas
 * es algo de lo que nunca hablaste, no hay ninguna pregunta que lo abra.
 * Estas no afirman nada ni fingen contexto: abren la puerta y se corren.
 *
 * La mitad invita a CONTAR y la otra mitad a ANOTAR: el 70% de los días él entra
 * y solo registra, así que la mitad de las veces la puerta más honesta es la
 * chica.
 */
export const ABIERTAS = [
  '¿Te da vueltas algo en la cabeza?',
  '¿Hay algo que quieras dejar anotado, aunque sea corto?',
  '¿Tenés alguna idea dando vueltas?',
  '¿Algo que quieras arrancar o seguir estos días?',
  '¿Pasó algo hoy que valga la pena guardar?',
  '¿Qué te dejó el día hasta acá?',
];

/** El día del calendario, para rotar sin azar y sin guardar nada. */
function indiceDelDia(ahora: Date, largo: number): number {
  const dias = Math.floor(ahora.getTime() / 86_400_000);
  return ((dias % largo) + largo) % largo;
}

/** Mañana, tarde o noche: tres momentos, con el mismo corte que el resto de la
 *  app (el saludo, el ritual). */
function franjaDelDia(ahora: Date): 0 | 1 | 2 {
  const h = ahora.getHours();
  return h >= 5 && h < 12 ? 0 : h >= 20 || h < 5 ? 2 : 1;
}

/**
 * LA PREGUNTA DEL MOMENTO, rotando TRES VECES POR DÍA.
 *
 * Antes rotaba una vez por día y Matías lo marcó (29/07): *"hasta ahora todo el
 * día me quedó en eso, en el 'qué me contás'"*. Un día entero es demasiado: si
 * a las 9 de la mañana no tenías nada para decir de eso, a las 9 de la noche
 * seguís teniendo la misma frase esperándote, y ya no la lees.
 *
 * ⚠️ Y NO CAMBIA EN CADA REFRESH, que sería lo fácil. Si la pregunta se renueva
 * cada vez que entrás, deja de ser algo que la app te dijo y pasa a ser un
 * cartel rotativo: entrás dos veces seguidas, ves dos preguntas distintas y
 * ninguna te espera. Tres momentos por día es lo que se parece a alguien que te
 * pregunta cuando te ve.
 */
export function elegirApertura(pool: string[], ahora: Date = new Date()): string | null {
  const opciones = pool.filter((p) => p && p.trim());
  if (opciones.length === 0) return null;
  const slot = Math.floor(ahora.getTime() / 86_400_000) * 3 + franjaDelDia(ahora);
  return opciones[((slot % opciones.length) + opciones.length) % opciones.length];
}

export function aperturaActividad(titulo: string, ahora: Date = new Date()): string {
  return POR_UNA_ACTIVIDAD[indiceDelDia(ahora, POR_UNA_ACTIVIDAD.length)](titulo);
}

export function aperturaTema(tema: string, ahora: Date = new Date()): string {
  return POR_UN_TEMA[indiceDelDia(ahora, POR_UN_TEMA.length)](tema);
}

/**
 * PREGUNTAS POR UN CABO SUELTO: algo de lo que hablaste y no quedó enganchado en
 * ninguna parte (07/08, pedido de Matías).
 *
 * ⚠️ NO SON LAS DE `POR_UN_TEMA`, Y LA DIFERENCIA ES EL DATO QUE TIENEN ATRÁS.
 * Aquellas preguntan por algo de lo que se habló; estas preguntan por algo de lo
 * que se habló **y que la app verificó que no se convirtió en nada**. Con esa
 * información, "¿seguís pensando en X?" se queda corta: lo que hay para
 * preguntar es qué pasó en el medio.
 *
 * ⚠️ Y NINGUNA RETA. Ese es el filo de esta función: la app sabe que no hiciste
 * nada con eso, y decirlo mal —"no lo anotaste", "quedó en la nada"— convierte
 * una pregunta en un reproche con datos. Preguntan por la historia, no por la
 * omisión: puede que lo hayas resuelto, o descartado, y las dos son respuestas
 * buenas. La última lo dice con todas las letras, porque a veces la respuesta
 * correcta es "ya está, no hace falta que lo sigas".
 */
/**
 * ⚠️ TIENEN QUE FUNCIONAR PARA UN COMPROMISO **Y** PARA UN TEMA AMPLIO, porque
 * la tabla `temas` guarda las dos cosas: al lado de "curso de alemán" hay
 * "ansiedad" y "vida social". *"¿Lo seguiste?"* suena bien para lo primero y
 * mal para lo segundo —a la ansiedad no la seguís—, así que ninguna frase acá
 * puede dar por hecho que el tema es algo que se hace. Todas preguntan por el
 * estado, no por la ejecución.
 */
const POR_UN_CABO = [
  (q: string) => `Hace unos días hablamos de ${q} y no volvió a aparecer. ¿En qué quedó?`,
  (q: string) => `¿Qué pasó con ${q}?`,
  (q: string) => `Quedó dando vueltas lo de ${q}. ¿Sigue ahí?`,
  (q: string) => `De ${q} no me contaste más. ¿Cómo va?`,
  (q: string) => `Lo de ${q}, ¿se acomodó o sigue igual?`,
];

export function aperturaCabo(tema: string, ahora: Date = new Date()): string {
  return POR_UN_CABO[indiceDelDia(ahora, POR_UN_CABO.length)](tema);
}

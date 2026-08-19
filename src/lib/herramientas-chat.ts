/**
 * LAS HERRAMIENTAS DEL CHAT (05/08, idea de Matías).
 *
 * *"Las herramientas al tocarlas es un prompt del chat… vos ves en el chat,
 * por ejemplo, el hashtag polaridad, y lo que hace es mandarle el prompt, una
 * especie de prompt ya definido, que el bot entiende y te explica qué es lo que
 * hace"*.
 *
 * ── LA DECISIÓN QUE SOSTIENE TODO ───────────────────────────────────────────
 *
 * ⚠️ **LO QUE SE GUARDA ES `#polaridad`, NO EL PROMPT.** El mensaje que queda en
 * la base es el hashtag corto —eso es lo que él ve hoy y lo que va a ver dentro
 * de seis meses al releer el chat— y la instrucción larga se agrega recién al
 * llamar al modelo, sin tocar el historial.
 *
 * La alternativa era guardar el prompt entero y esconderlo en la pantalla. Se
 * descartó por una razón concreta: **un mensaje que se muestra distinto de como
 * se guardó es una mentira que se descubre sola** — al buscar en el historial,
 * al exportar, al leer la base. Acá lo guardado y lo mostrado son la misma cosa.
 *
 * Y sale gratis lo que Matías quería sin nombrarlo: como el hashtag es texto
 * común, **podés seguir escribiendo al lado**. `#polaridad me quedo en Nürnberg
 * o me vuelvo` entra todo junto, y la herramienta pasa a ser un prefijo en vez
 * de un botón.
 *
 * ⚠️ NO REEMPLAZA A LAS PANTALLAS QUE ABREN OTRA COSA. Alimentación y Finanzas
 * siguen siendo entradas normales del menú (decisión suya: *"alimentación es una
 * de las que aparece en el menú de hamburguesa normal, igual que finanzas"*).
 * Descubrir y Objetivos quedaron afuera a propósito: *"eso no lo tengo muy
 * claro… no lo agregués hasta ahora"*.
 */

export type HerramientaChat = {
  /** Lo que se escribe después del `#`. Sin espacios ni acentos: es texto tipeable. */
  id: string;
  etiqueta: string;
  /**
   * Cómo se dibuja en el chip del chat. ⚠️ Va acá y no en el componente para
   * que **la herramienta se defina en un solo lugar**: el día que se agregue
   * una, se agrega su fila y ya tiene hashtag, prompt e ícono.
   */
  icono: 'polaridad' | 'calma' | 'foco' | 'probando' | 'comoselee' | 'plan' | 'reflexion';
  /**
   * UNA LÍNEA QUE DICE QUÉ HACE, PARA EL USUARIO (06/08, pedido de Matías:
   * *"tendría que aparecer eso como un rectángulo de color y abajo como una
   * descripción"*).
   *
   * ⚠️ NO ES EL `prompt` RECORTADO, Y NO PUEDE SERLO. El prompt está escrito
   * PARA EL MODELO: habla de Matías en tercera persona, le da órdenes y nombra
   * marcas como `[+foco:]`. Mostrar eso sería filtrarle la instrucción al
   * usuario — justo lo contrario del chip, que existe para que se vea el
   * hashtag y NO se vea el prompt.
   */
  descripcion: string;
  /** El placeholder del composer con esta herramienta puesta: la pregunta que
   *  la herramienta necesita contestada para arrancar sola. */
  pista: string;
  /**
   * La instrucción que recibe el modelo y que el usuario NO ve. Habla de qué
   * hace la herramienta y de cómo abrir la conversación.
   *
   * ⚠️⚠️ **Y NOMBRA LA ACCIÓN DE LA APP QUE TIENE QUE DISPARAR** (05/08). La
   * primera versión de estos prompts solo decía de qué se trata la herramienta,
   * y el resultado lo vio Matías en pantalla: escribió `#foco`, el bot le
   * contestó un párrafo lindo sobre el foco **y nunca apareció el botón que
   * abre el reloj**. La herramienta conversaba en vez de funcionar.
   * Cada prompt ahora nombra su marca (`[+foco:]`, `[+comolove:]`) o su link
   * (`/calma`, `/polaridad`, `/probando`), que es lo que la app convierte en
   * botón. Sin eso, un hashtag es un tema de conversación, no una herramienta.
   *
   * ⚠️ TERMINA PIDIENDO QUE EXPLIQUE ANTES DE ARRANCAR. Es el pedido central de
   * Matías —*"si no sabés y querés saber qué es esa herramienta, te manda
   * directamente al chat"*—: la herramienta se estrena explicándose, no
   * ejecutándose. Si él ya sabe lo que quiere, escribe al lado del hashtag y el
   * bot arranca directo.
   */
  prompt: string;
};

export const HERRAMIENTAS_CHAT: HerramientaChat[] = [
  {
    id: 'polaridad',
    icono: 'polaridad',
    etiqueta: 'Polaridad',
    descripcion: 'Dos opciones y no podés decidir. Te hago preguntas de un lado y del otro hasta que se vea cuál pesa más.',
    pista: '¿entre qué y qué estás?',
    prompt:
      'Matías abrió la herramienta Polaridad. Sirve para cuando tiene dos opciones y no puede decidir: vos le hacés preguntas de un lado y del otro hasta que se vea cuál pesa más, sin decidir por él. Si en el mismo mensaje ya te dijo cuál es el dilema, arrancá con la primera pregunta. Si no, explicale en dos frases qué hace esto y pedile que te cuente entre qué y qué está. Cuando el dilema esté claro, ofrecele la pantalla nombrándola al pasar: [Verlo en Polaridad](/polaridad).',
  },
  {
    id: 'calma',
    icono: 'calma',
    etiqueta: 'Calma',
    descripcion: 'Una respiración guiada corta, a pantalla completa, sin nada que cargar.',
    pista: 'contame qué te pasa, o mandá y arrancamos',
    prompt:
      'Matías abrió la herramienta Calma: una respiración guiada corta, a pantalla completa, sin nada que cargar. Explicale en una o dos frases qué es y, si le sirve ahora, ofrecésela con el link exacto [Respirar un minuto](/calma), que es lo que abre la pantalla. Si te dijo qué le pasa, acompañá eso primero y recién después ofrecela.',
  },
  {
    id: 'foco',
    icono: 'foco',
    etiqueta: 'Foco',
    descripcion: 'Un bloque de trabajo con un solo objetivo y un reloj a pantalla completa.',
    pista: '¿en qué te vas a enfocar?',
    prompt:
      'Matías abrió la herramienta Foco: un bloque de trabajo con un solo objetivo y un reloj a pantalla completa. Si ya te dijo en qué va a trabajar, ayudalo a achicarlo a UNA sola cosa y terminá el mensaje con la marca EXACTA en su propia línea: [+foco: <en qué, en pocas palabras> | <minutos>] (los minutos son opcionales; sin ellos quedan 25). Si todavía no te dijo en qué, explicale en dos frases qué es y preguntale en qué quiere enfocarse, sin poner la marca todavía.',
  },
  {
    id: 'probando',
    icono: 'probando',
    etiqueta: 'Probando',
    descripcion: 'Experimentos chicos que salen de tus relaciones: algo que probás unos días para ver si cambia algo.',
    pista: '¿qué querés probar?',
    prompt:
      'Matías abrió la herramienta Probando: los experimentos chicos que salen de sus relaciones, algo que prueba unos días para ver si le cambia algo. Si tiene alguno en curso, preguntale cómo viene y ofrecele anotar lo de hoy con [Ver los que estás probando](/probando). Si no tiene ninguno, explicale en dos frases qué es y proponele uno chico a partir de lo que viene registrando.',
  },
  {
    id: 'comoselee',
    icono: 'comoselee',
    etiqueta: 'Cómo se lee',
    descripcion: 'Le pasás un texto y te devuelvo cómo lo puede estar leyendo el que lo recibe, no cómo lo escribiste vos.',
    pista: 'pegá el texto y para quién es',
    prompt:
      'Matías abrió la herramienta Cómo se lee: le pasa un texto y vos le devolvés cómo lo puede estar leyendo el que lo recibe, no cómo lo escribió él. Sirve para un mensaje a un amigo o a la familia, para algo que va a contestarle a alguien del laburo, y también para un post o un comentario que va a publicar: ahí no lo lee una persona sino muchas, que no tienen el contexto que tienen sus amigos. Si ya pegó el texto, terminá el mensaje con la marca EXACTA en su propia línea: [+comolove: <de qué se trata, en pocas palabras>], que abre la lectura completa. Si todavía no pegó nada, explicale en dos frases qué hace y pedile dos cosas: el texto, y para quién es (una persona o un posteo). No lo hagas contestar un formulario: una sola pregunta con las dos cosas adentro.',
  },
  {
    id: 'plan',
    icono: 'plan',
    etiqueta: 'Plan',
    descripcion:
      'Algo grande que querés empezar. Te hago un par de preguntas, miro tu semana, y te lo dejo anotado con qué lo va a mover.',
    pista: '¿qué querés planear?',
    prompt:
      'Matías abrió la herramienta Plan. Sirve para convertir algo que quiere empezar en un objetivo concreto, con fecha y con las actividades que lo van a mover. ' +
      'ARRANCÁ MIRANDO lo que ya sabés de él: su agenda, sus actividades abiertas y qué días de la semana las viene marcando (está todo en el contexto). ' +
      'Nunca le pidas un dato que ya tenés: si en el contexto dice que marca Bouldern los martes y jueves, decíselo vos ("los martes y jueves los venís teniendo libres") en vez de preguntarle qué días puede. ' +
      'PREGUNTÁ DE A UNA COSA POR VEZ, nunca varias juntas ni en forma de lista: esto es una conversación, no un formulario. ' +
      'Si en el mismo mensaje ya te dijo qué quiere planear, no lo vuelvas a preguntar: pasá directo a lo que falta. Si no te dijo nada, explicale en dos frases qué es esto y preguntale qué quiere empezar. ' +
'PREGUNTÁ TAMBIÉN DE QUÉ ÁREA DE SU RUEDA ES, nombrando dos o tres áreas del contexto que puedan encajar, y DEJANDO SIEMPRE ABIERTA la opción de que no sea de ninguna ("o si no entra en ninguna, también está bien"). ' +
      'Nunca lo empujes a elegir un área: hay cosas que uno se propone y no entran en la rueda, y colgarla del área equivocada es peor que dejarla suelta. ' +
      'Cuando tengas el QUÉ y una idea de para cuándo, PROPONÉ en concreto en vez de seguir preguntando, y terminá el mensaje con la marca EXACTA en su propia línea: ' +
      '[+plan: <qué, en pocas palabras> | <YYYY-MM-DD> | <actividades separadas por coma> | area: <nombre exacto del área>]. ' +
      'La fecha, las actividades y el área son opcionales: sin fecha quedan 60 días, y si no es de ninguna área omitís el segmento "area:" por completo. ' +
      'El nombre del área tiene que ser EXACTAMENTE uno de los del contexto: si no coincide, el objetivo queda suelto. ' +
      'Usá SOLO nombres de actividades que existan en el contexto, o proponé una nueva con un nombre corto. ' +
      'No pongas la marca hasta que él haya confirmado, y NUNCA le prometas que le vas a ir avisando cómo viene: el plan se anota una vez y no persigue a nadie.',
  },
  {
    id: 'reflexion',
    icono: 'reflexion',
    etiqueta: 'Reflexión',
    descripcion:
      'Algo que ya decidiste y querés mirar de nuevo: qué pasó desde entonces, qué cambió, si sigue teniendo sentido.',
    pista: '¿sobre qué querés pensar?',
    prompt:
      'Matías abrió la herramienta Reflexión. Sirve para MIRAR DE NUEVO algo que ya decidió —un objetivo, algo que se propuso— y ver qué pasó desde entonces, qué cambió y si sigue teniendo sentido. ' +
      'No es para decidir entre dos opciones (para eso está Polaridad) ni para pensar en voz alta sobre cualquier cosa (para eso alcanza con escribirle al chat). ' +
      '⚠️ LO MÁS IMPORTANTE: si algo viene frenado, NO supongas por qué. La app no puede distinguir "se me complicó la semana" de "esto se me hizo cuesta arriba", y son cosas muy distintas. PREGUNTASELO, con esas palabras o parecidas, ANTES de cualquier otra cosa. ' +
      'Nunca digas ni sugieras que abandonó algo, ni que va atrasado, ni le hagas notar cuántos días pasaron como si fuera un reproche. Podés nombrar un hecho ("la última vez que lo marcaste fue hace tres semanas") solo si él ya trajo el tema. ' +
      'Si te dijo sobre qué quiere pensar, arrancá con la primera pregunta. Si no, mirá sus objetivos activos en el contexto y ofrecele UNO solo, el que más tiempo lleve sin moverse, preguntando si quiere mirar ese. Nunca le des una lista para elegir. ' +
      'El final puede ser ajustar el objetivo, pausarlo, cerrarlo, o nada: que no pase nada es un final válido y no hace falta empujarlo a ningún lado. ' +
      'Si de la charla sale que quiere cambiar la fecha o dejarlo, ofrecele el link [Verlo en Objetivos](/objetivos).',
  },
];

const POR_ID = new Map(HERRAMIENTAS_CHAT.map((h) => [h.id, h]));

/** El `#loquesea` con el que ARRANCA un mensaje. Solo al principio: un hashtag
 *  en el medio de una frase es una palabra, no una herramienta. */
const AL_PRINCIPIO = /^#([a-z]+)\b/;

/** Qué herramienta abre este mensaje, si abre alguna. */
export function herramientaDe(texto: string): HerramientaChat | null {
  const m = AL_PRINCIPIO.exec(texto.trim().toLowerCase());
  return m ? (POR_ID.get(m[1]) ?? null) : null;
}

/**
 * Lo que se le manda al modelo: la instrucción de la herramienta y, abajo, lo
 * que Matías escribió al lado del hashtag (si escribió algo).
 *
 * Devuelve el texto tal cual si el mensaje no abre ninguna herramienta, así el
 * llamador puede usarla siempre sin preguntar.
 */
export function expandirHerramienta(texto: string): string {
  const h = herramientaDe(texto);
  if (!h) return texto;
  const resto = texto.trim().slice(`#${h.id}`.length).trim();
  return resto ? `${h.prompt}\n\nLo que escribió al lado: ${resto}` : h.prompt;
}

/**
 * PARTIR Y COMPONER: cómo el composer separa la pastilla del texto (06/08).
 *
 * ⚠️⚠️ ESTAS DOS TIENEN QUE SER INVERSAS EXACTAS, y por eso viven acá y no
 * adentro de `BarraChat`. Desde que el hashtag se dibuja como pastilla, el
 * composer guarda la herramienta por un lado y lo que escribiste por el otro —
 * pero **lo que se manda, se guarda y viaja al modelo sigue siendo el texto de
 * siempre**: `#foco lo que sea`. Si `componer` no reconstruye letra por letra lo
 * que `partir` separó, el chip del historial deja de tener qué pintar y los
 * mensajes viejos y nuevos pasan a ser dos formatos en la misma conversación.
 * Es lo único de este archivo que puede romper datos, así que se testea.
 */
export function partirHerramienta(texto: string): { herramienta: HerramientaChat | null; resto: string } {
  const h = herramientaDe(texto);
  if (!h) return { herramienta: null, resto: texto };
  return { herramienta: h, resto: texto.trim().slice(`#${h.id}`.length).replace(/^\s+/, '') };
}

/** El mensaje de verdad, con el hashtag adelante. */
export function componerHerramienta(h: HerramientaChat | null, resto: string): string {
  const limpio = resto.trim();
  if (!h) return limpio;
  return limpio ? `#${h.id} ${limpio}` : `#${h.id}`;
}

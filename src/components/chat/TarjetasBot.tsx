/**
 * The assistant's cards: what it has to say, stacked as a deck you swipe.
 *
 * The rules for the deck itself live in `src/lib/baraja-bot.ts` and not here,
 * because the deck is drawn by two components at once — see that file's note.
 *
 * The avatar is deliberately drawn from the outer grid rather than inside each
 * card: one avatar that never remounts, instead of one per card whose animation
 * would restart on every swipe. What sits inside the cards are empty floated
 * boxes, so the text wraps around a hole the avatar happens to occupy.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COOKIE_DESCARTADAS, hoyLocal, serializarDescartadas } from '@/lib/tarjetas-descartadas';
import { AvatarIA } from '@/components/ui/AvatarIA';
import { pintarDia, ponerMetaSemanal } from '@/lib/actions/actividades';
import { descartarObservacion, seguirObservacion } from '@/lib/actions/observaciones';
import {
  hayQueMostrarPuntitos,
  indiceTrasDescartar,
  indiceVisible,
  quedan as loQueQueda,
} from '@/lib/baraja-bot';

/**
 * EL BOT, ACOPLADO A LA BARRA DE ESCRIBIR.
 *
 * Idea original de Matías (31/07): *"me gusta ver el bot… pueden ser varias
 * tarjetas, le ponés ahora no, ahora no, y siempre está el bot ahí sugiriendo"*.
 *
 * ── ⚠️⚠️ DE TARJETA A BARRA (12/08, propuesta C) ─────────────────────────────
 *
 * Hasta hoy esto era una tarjeta suelta arriba del Home, con su vidrio, su borde
 * y sus botones adentro. Matías eligió la **C** de las tres maquetas de
 * `docs/maquetas/2026-08-12-barra-escritura.html`: *la tarjeta deja de ser
 * tarjeta y se acopla arriba del campo de texto, formando una sola pieza*.
 *
 * Lo que gana no es estética. **Contestarle al bot y anotar pasan a ser el mismo
 * gesto**: antes la pregunta vivía arriba de todo y el lugar para contestarla
 * abajo de todo, con media pantalla en el medio.
 *
 * Y arregla N.23 de raíz: los botones salen de la caja que les recortaba la
 * sombra. **El bug no se arregla, desaparece** — no hay más `overflow` con
 * hijos con sombra adentro.
 *
 * ── LAS CUATRO PRECISIONES QUE PUSO ÉL ENCIMA DE LA C ────────────────────────
 *
 * 1. El avatar es `AvatarIA`, el componente real, no un ícono de chat.
 * 2. La franja de arriba va en `glass-tinte`, no en lila plano: el plano se leía
 *    como otra superficie pegada encima; el vidrio deja ver el fondo y las dos
 *    zonas se leen como una pieza.
 * 3. Los puntitos se quedan y bajan a la línea de los botones.
 * 4. "Ya lo hice" y "Ahora no", más chicos: ya no compiten con una tarjeta.
 *
 * ── ⚠️⚠️ EL GESTO, QUE ERA LA PREGUNTA QUE FALTABA ──────────────────────────
 *
 * Quedó anotado el 12/08 como *lo que hay que mirar antes de codear*: si la
 * pregunta vive pegada a un campo de texto, **deslizar en horizontal ahí pelea
 * con el propio campo** (seleccionar texto, mover el cursor).
 *
 * 👉 **Resuelto partiendo la pieza en dos zonas, no eligiendo entre las tres
 * salidas que se habían planteado.** El swipe corre SOLO en la franja de vidrio
 * —que no es un campo de texto y no tiene cursor que mover— y el renglón de
 * escribir no lleva ningún manejador horizontal.
 *
 * ⚠️⚠️ ACÁ DECÍA QUE LOS PUNTITOS ERAN LA OTRA SALIDA —*"quien no descubra el
 * deslizamiento llega igual tocando"*— Y DESDE EL 17/08 YA NO LO SON: Matías
 * pidió que dejaran de ser tocables para poder bajarlos a la franja del
 * indicador de home. **O sea que hoy deslizar es el único camino.** El porqué,
 * lo que se pierde y cómo volver atrás están en `PuntitosBot`.
 *
 * ⚠️ Se descartó *"la siguiente llega sola al contestar"*: eso decide por vos
 * cuál mirás y convierte la baraja en una cola. Y se descartó *"una pregunta por
 * día"*, que ya estaba descartado el 12/08 por ser un cambio de producto
 * disfrazado de cambio de UI.
 *
 * ── LO QUE SOBREVIVIÓ SIN CAMBIOS ───────────────────────────────────────────
 *
 * · **"Ahora no" descarta LA TARJETA, no al bot.** El bot se queda siempre.
 * · **Se ve una sola por vez.** Cinco a la vez serían una lista de pendientes.
 * · **El tinte lo pone la que estás mirando** (regla del 02/08: el color dice de
 *   qué se trata).
 * · **El avatar no se re-monta al cambiar de tarjeta**: está afuera de la pista
 *   que se desliza, si no la animación arrancaría de cero en cada descarte.
 * · **Lo descartado no vuelve hasta mañana**, en una cookie por id.
 */

// ⚠️⚠️ ACÁ ESTABA `responder`, Y SE FUE (13/08). No hacía más que disparar
// `enfocar-composer`: poner el cursor en el campo de texto. Tenía sentido cuando
// el bot vivía arriba del Home y contestarle era irse a otro lado; desde que la
// tarjeta se acopló a la barra, el campo está tres centímetros abajo y a la
// vista. Matías: *"no es necesario, porque contestás ya abajo"*.
export type AccionBot =
  // ⚠️ ABRE LA HOJA DE REGISTRO EN VEZ DE MANDARTE A ESCRIBIR (01/08, Matías:
  // *"me manda a escribir o contestar ahí abajo, en vez de que se abra como una
  // pequeña tarjetita de alimentación… eso tenía que estar conectado"*).
  | { tipo: 'hoja'; etiqueta: string; hoja: string }
  | { tipo: 'ir'; etiqueta: string; href: string }
  | { tipo: 'marcar'; etiqueta: string; lineaId: number }
  | { tipo: 'bajar-meta'; etiqueta: string; lineaId: number; a: number }
  | { tipo: 'relacion'; etiqueta: string; patron: string; evidencia: string; veredicto: 'anotada' | 'descartada' }
  // ── ⚠️ ABRE UNA CHARLA CON TU PROPIA FRASE ADELANTE (18/08) ────────────────
  // Es lo que hacía "Volver sobre esto" en la tarjeta de relectura, que se mudó
  // acá adentro. El punto de toda la pieza es el pedido del 05/08: *"que el chat
  // dé ganas de hablar, no solo de anotar"*. Un recuerdo sin puerta es un adorno.
  | { tipo: 'retomar'; etiqueta: string; texto: string; cuando: string };

/**
 * DE QUÉ SE TRATA LA TARJETA, QUE ES DE DONDE SALE SU COLOR (02/08).
 *
 * ⚠️ EL COLOR DICE DE QUÉ SE TRATA, NO "ACÁ HAY UN BOTÓN". Verde para lo del
 * cuerpo, oro para lo que hay que hacer, rosa para lo que la app leyó de vos, e
 * iris para lo que te pregunta. **Si cada tarjeta tuviera su color, el color
 * dejaría de significar algo.**
 */
/**
 * ⚠️ `recordar` ENTRÓ EL 18/08 CON LA RELECTURA, y es el único que no habla con
 * la voz del bot: **cita algo que escribiste vos.** Por eso se lleva el verde
 * que la tarjeta ya tenía en el Home —Matías lo eligió *"si no se confunde"* con
 * el bot— y por eso su texto se dibuja en serif itálica (ver el `<p>` de la
 * pista). Los otros tres son el bot hablando; este es el bot mostrándote un
 * espejo.
 */
export type TonoTarjeta = 'hacer' | 'leer' | 'preguntar' | 'recordar';

export type TarjetaBot = {
  /** Estable entre cargas: es lo que se recuerda al descartarla. */
  id: string;
  texto: string;
  detalle?: string;
  /** Sin tono, se pinta como pregunta: es lo que hace el bot por defecto. */
  tono?: TonoTarjeta;
  /**
   * El hecho del cerebro que esta tarjeta está preguntando, si es que pregunta
   * uno. Lo usa la barra: **lo que escribas mientras esta tarjeta está adelante
   * se guarda como el `porque` de ese hecho** (`explicarHecho`).
   *
   * ⚠️ Es lo que convierte una respuesta en el chat en algo que el cerebro
   * aprende. Sin esto, contestar la pregunta del bot es solo hablar.
   */
  hechoId?: number;
  acciones: AccionBot[];
};

/**
 * El tinte de cada tono, en las mismas tres capas que `glass-tinte`: un poco de
 * color arriba, otro poco abajo, y blanco al 74% de base — que es lo que
 * garantiza que el texto se siga leyendo. Solo cambia el hue.
 */
const TINTE: Record<TonoTarjeta, { fondo: string; borde: string }> = {
  // Oro: lo que se resuelve haciendo algo (marcar el día, bajar una meta).
  hacer: {
    fondo:
      'linear-gradient(140deg, oklch(0.78 0.12 75 / 0.16) 0%, transparent 46%),' +
      'linear-gradient(320deg, oklch(0.72 0.13 55 / 0.12) 0%, transparent 52%),' +
      'rgba(255,255,255,.74)',
    borde: '#b5762a2e',
  },
  // Rosa: lo que la app leyó de vos y te devuelve. Es la familia de Patrones.
  leer: {
    fondo:
      'linear-gradient(140deg, oklch(0.70 0.11 10 / 0.15) 0%, transparent 46%),' +
      'linear-gradient(320deg, oklch(0.62 0.14 350 / 0.11) 0%, transparent 52%),' +
      'rgba(255,255,255,.74)',
    borde: '#c255712e',
  },
  // ── ⚠️ VERDE: TU PROPIA FRASE, DEVUELTA (18/08) ──────────────────────────
  // Es el mismo verde de la tarjeta de relectura que vivía en el Home, traído
  // tal cual: los dos degradés corridos al verde sobre el mismo blanco de base.
  // ⚠️ NO ES EL VERDE DE "HECHO". Acá significa *esto lo dijiste vos*, y en
  // ninguna de las cuatro familias hay otra cosa que quiera decir eso.
  recordar: {
    fondo:
      'linear-gradient(140deg, oklch(0.72 0.11 165 / 0.16) 0%, transparent 48%),' +
      'linear-gradient(320deg, oklch(0.72 0.09 150 / 0.10) 0%, transparent 52%),' +
      'rgba(255,255,255,.74)',
    borde: '#3d9b8038',
  },
  // Iris: la pregunta. Es el color del bot, así que es el default.
  preguntar: {
    fondo:
      'linear-gradient(140deg, oklch(0.72 0.13 195 / 0.10) 0%, transparent 45%),' +
      'linear-gradient(320deg, oklch(0.60 0.17 310 / 0.09) 0%, transparent 50%),' +
      'rgba(255,255,255,.74)',
    borde: '#6c78ee29',
  },
};

function guardarDescartadas(ids: string[]) {
  // `max-age` de dos días y no de uno: el corte real lo hace el `dia` que va
  // adentro del valor (ver `lib/tarjetas-descartadas`).
  document.cookie = `${COOKIE_DESCARTADAS}=${serializarDescartadas(ids)}; path=/; max-age=172800; samesite=lax`;
}

/**
 * ABRE LA HOJA DE REGISTRO, QUE VIVE EN EL HOME.
 *
 * ⚠️ Va por evento y no por prop porque la barra está en el LAYOUT y la hoja en
 * la página: son hermanos en el árbol. Es el mismo hueco que resuelve
 * `canal-bot` en la otra dirección, y el mismo mecanismo que ya usaban
 * `enfocar-composer` y `escribir-en-composer`.
 */
export const EVENTO_HOJA = 'abrir-hoja-registro';

export type Baraja = ReturnType<typeof usarBaraja>;

/**
 * EL CEREBRO DE LA BARAJA. Lo usa `BarraGlobal` una sola vez y se lo pasa a las
 * dos piezas que dibujan: la franja de arriba y la fila de abajo.
 *
 * ⚠️ ESTÁ ACÁ Y NO ADENTRO DE UNA DE LAS DOS PIEZAS porque las dos necesitan lo
 * mismo —cuál mirás, cuántas quedan, el tinte— y la pieza de abajo además
 * dispara lo que cambia la de arriba. Con el estado en una de ellas, la otra
 * recibiría media docena de props sueltas y el día que se agregue una acción
 * habría que enhebrarla por las dos.
 */
export function usarBaraja(tarjetas: TarjetaBot[]) {
  const router = useRouter();
  // ⚠️ ARRANCA VACÍA A PROPÓSITO: `tarjetas` YA VIENE FILTRADA DEL SERVER. Esto
  // solo guarda lo que descartás EN ESTA pantalla, para que la tarjeta se vaya
  // al toque sin esperar al server. Empezar vacía es lo que hace que el primer
  // dibujo del navegador sea idéntico al HTML que vino.
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  // La que se está yendo: se queda un instante para poder animarla.
  const [saliendo, setSaliendo] = useState<string | null>(null);
  const [pedido, setPedido] = useState(0);

  const pista = useRef<HTMLDivElement>(null);

  const quedan = loQueQueda(tarjetas, descartadas);
  const indice = indiceVisible(quedan.length, pedido);
  const actual = quedan[indice] ?? null;
  const tinte = TINTE[actual?.tono ?? 'preguntar'];

  /**
   * Cuál está centrada, medida contra la posición real de cada hoja y no
   * dividiendo el scroll por el ancho.
   *
   * ⚠️ La cuenta fácil (`scrollLeft / clientWidth`) se desincroniza apenas hay
   * separación entre hojas: el error se acumula y en la cuarta ya marca la
   * quinta. Comparar contra el `offsetLeft` no puede desfasarse porque es la
   * posición que el navegador ya calculó.
   */
  const mirarScroll = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const hojas = Array.from(el.children) as HTMLElement[];
    if (hojas.length === 0) return;
    let cerca = 0;
    let mejor = Infinity;
    hojas.forEach((h, i) => {
      const d = Math.abs(h.offsetLeft - el.scrollLeft);
      if (d < mejor) {
        mejor = d;
        cerca = i;
      }
    });
    setPedido(cerca);
  }, []);

  /**
   * ⚠️⚠️ ACÁ VIVÍA `irA`, QUE LLEVABA A UNA TARJETA POR ÍNDICE, Y SE FUE
   * (17/08). Su único llamador eran los puntitos, y los puntitos dejaron de ser
   * botones por decisión de Matías — ver la nota larga en `PuntitosBot`, que
   * también explica qué se pierde con eso.
   *
   * 👉 Se borra en vez de quedarse "por si vuelve" porque es exactamente lo que
   * pasó con `responder` y con `FilaBot`: una función que sobrevive a su motivo
   * queda ahí meses hasta que alguien la vuelve a enchufar sin releer por qué se
   * había ido. Si hay que volver atrás, son cinco líneas: el `scrollTo` al
   * `offsetLeft` de `children[i]`.
   */
  function descartar(id: string) {
    if (saliendo) return;
    setSaliendo(id);

    // ⚠️ LA COOKIE SE ESCRIBE YA, ANTES DE LA ANIMACIÓN. Las acciones que
    // descartan llaman a `router.refresh()` enseguida: si la cookie esperara los
    // 220ms, ese pedido saldría sin ella y el server devolvería la que se va.
    const nuevas = [...descartadas, id];
    guardarDescartadas(nuevas);

    // Adónde queda mirando después. La regla está en `lib/baraja-bot` porque
    // acá adentro no se podría testear y es la que decide si "Ahora no" se
    // siente como pasar de página o como saltar.
    const iba = quedan.findIndex((t) => t.id === id);
    const destino = indiceTrasDescartar(quedan.length, iba < 0 ? indice : iba);

    setTimeout(() => {
      setDescartadas(nuevas);
      setPedido(destino);
      setSaliendo(null);
    }, 220);
  }

  async function correr(a: AccionBot, idTarjeta: string) {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (a.tipo === 'hoja') {
        window.dispatchEvent(new CustomEvent(EVENTO_HOJA, { detail: a.hoja }));
      } else if (a.tipo === 'ir') {
        router.push(a.href);
      } else if (a.tipo === 'marcar') {
        await pintarDia(a.lineaId, hoyLocal());
        descartar(idTarjeta);
        router.refresh();
      } else if (a.tipo === 'bajar-meta') {
        await ponerMetaSemanal(a.lineaId, a.a);
        descartar(idTarjeta);
        router.refresh();
      } else if (a.tipo === 'retomar') {
        // ⚠️ NO DESCARTA LA TARJETA: te vas a otra pantalla y la charla ES el
        // resultado. Descartarla además la borraría de una baraja que no vas a
        // estar mirando, y mañana ese recuerdo no volvería sin motivo.
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido: `${a.cuando} escribí esto: “${a.texto}”. Quiero volver sobre eso.`,
            continuar: false,
          }),
        });
        const { chatId } = (await res.json()) as { chatId?: number };
        router.push(chatId ? `/chat/${chatId}` : '/chat');
      } else if (a.tipo === 'relacion') {
        // Las dos respuestas se guardan igual de fuerte: "no es así" también es
        // información, y por eso descartar acá NO es lo mismo que el "Ahora no"
        // de al lado, que no guarda nada.
        if (a.veredicto === 'anotada') await seguirObservacion(a.patron, a.evidencia);
        else await descartarObservacion(a.patron, a.evidencia);
        descartar(idTarjeta);
        router.refresh();
      }
    } finally {
      setOcupado(false);
    }
  }

  return { quedan, indice, actual, tinte, ocupado, saliendo, pista, mirarScroll, descartar, correr };
}

/**
 * LA FRANJA DE ARRIBA — lo que el bot dice, acoplado al campo de texto.
 *
 * ⚠️ ES LA ÚNICA ZONA QUE ACEPTA EL DESLIZAMIENTO. Ver la nota del gesto arriba:
 * abajo hay un `<textarea>` y un swipe horizontal ahí pelearía con el cursor.
 */
export function FranjaBot({ baraja }: { baraja: Baraja }) {
  const { quedan, indice, actual, tinte, ocupado, saliendo, pista, mirarScroll, descartar, correr } = baraja;

  /**
   * ── ⚠️⚠️ UN SOLO RENGLÓN CUANDO LA TARJETA NO TIENE BOTONES (17/08) ────────
   * La regla, el tope de largo y el porqué de los dos viven en `lib/baraja-bot`,
   * junto con la lección del 13/08 que este cambio respeta en vez de
   * contradecir. Acá solo se dibuja.
   */
  // ⚠️⚠️ YA NO HAY DOS FORMAS: LA FRANJA ES SIEMPRE LA COMPACTA (18/08).
  // Las acciones se fueron abajo (ver `AccionesBot`), y no tener botones era la
  // única condición que decidía la forma. Con `franjaCompacta` borrada, la
  // grilla dejó de tener que mover piezas de celda mientras deslizás — que era
  // el problema de ingeniería del 17/08 y desapareció solo al desaparecer el
  // motivo.

  /**
   * ⚠️⚠️ EL ALTO ES EL DE LA TARJETA QUE MIRÁS, NO EL DE LA MÁS ALTA (13/08).
   *
   * Matías: *"si hay menos texto, la haría más chica a la tarjetita; que cambie
   * de tamaño"*. Y tenía razón dos veces: la pista es un flex horizontal, así
   * que **su alto siempre fue el de la tarjeta más alta de la baraja**. Con una
   * larga adentro, la corta se dibujaba con un hueco enorme debajo. Encima yo le
   * había sacado el `items-start` al reescribir, y sin eso las cortas además se
   * estiraban: doble motivo para el mismo espacio gigante.
   *
   * Se mide la tarjeta visible y se le pone ese alto a la pista, con transición
   * para que no salte. `offsetHeight` y no una fórmula sobre el texto: el alto
   * real depende de la fuente, del ancho y de dónde corte cada palabra, y eso lo
   * sabe el navegador y no nosotros.
   */
  const [alto, setAlto] = useState<number>();
  useEffect(() => {
    const el = pista.current?.children[indice] as HTMLElement | undefined;
    if (el) setAlto(el.offsetHeight);
    // ⚠️ Antes acá iba también `compacta`, porque cambiaba el ANCHO de la pista
    // y con otro ancho el mismo texto corta en otra parte. Con una sola forma el
    // ancho ya no cambia, así que la dependencia se fue con ella (18/08).
  }, [indice, pista, quedan.length, actual?.texto]);

  // ── ⚠️⚠️ SIN NADA QUE DECIR, LO DICE. NUNCA QUEDA MUDO (13/08) ──────────────
  //
  // Matías, tres veces seguidas: *"está mudo, no hay tarjetitas, arreglá esto"*.
  // Y lo que pidió al final es la solución, no un parche: *"cuando no se ve, que
  // diga 'no tengo nada más por hoy', pero todo con el mismo formato de esa
  // tarjetita, que se ve el rectángulo de otro color y queda siempre
  // encapsulado"*.
  //
  // 👉 EL CAMBIO DE FONDO ES ESE: antes, "no hay tarjetas" y "algo se rompió" se
  // veían EXACTAMENTE IGUAL —una barra sin bot—, así que cada vez que la baraja
  // quedaba vacía por un motivo legítimo (todo descartado, o el bug de
  // `lecturas`) parecía una app rota. **Un estado vacío que se ve es lo que
  // separa "no tengo nada" de "me caí".**
  //
  // Antes esto vivía en la tarjeta vieja y se perdió al mudarse a la barra: la
  // franja pasó a devolver `null`, y con ella se iba el bot entero.
  //
  // ⚠️ Más bajo que una tarjeta con texto (`py-2` contra `pb-2 pt-2.5`) y sin
  // acciones, sin ✕ y sin puntitos: no hay nada que responder, nada que
  // descartar y nada entre qué elegir. Mismo vidrio y mismo avatar, porque es el
  // mismo bot en su estado callado — no otro componente.
  // ── ⚠️⚠️ VACÍA: EL BOT SOLO, SIN NINGÚN RECUADRO (18/08) ──────────────────
  //
  // Matías: *"cuando queda vacío queda solo el bot, pero sin recuadro ni nada"*.
  //
  // 👉 Y ES MEJOR QUE LOS DOS ESTADOS VACÍOS QUE TUVO ANTES. El del 13/08 era una
  // franja con *"Por hoy no tengo nada más"*, que servía para distinguir "no
  // tengo nada" de "me caí" — pero eso importaba cuando la franja era parte de
  // la barra y su ausencia dejaba un hueco raro. Suelta arriba del nav, **el
  // avatar solo YA dice las dos cosas**: está, o sea que no se cayó; y no dice
  // nada, o sea que no tiene nada.
  //
  // ⚠️ NO DEVUELVE `null` — esa es toda la idea. El bot no desaparece nunca; lo
  // que desaparece es lo que tenía para decir.
  if (quedan.length === 0) {
    return (
      <div className="mb-2 flex px-1">
        {/* ⚠️ MÁS GRANDE QUE HABLANDO, Y ES AL REVÉS DE COMO ESTABA (18/08).
            Matías: *"cuando no hay nada haría el bot más grande"*. La regla
            vieja era la contraria —*"callado ocupa menos que hablando"*, del
            13/08— y tenía sentido cuando el estado vacío era una franja con
            texto adentro: ahí el avatar competía con el cartel.
            👉 Sin caja y sin texto, el avatar ES la pieza entera. A 30px se leía
            como un resto de algo que se fue; a 44 se lee como el bot esperando.
            Es el mismo tamaño que tiene en el saludo del Home. */}
        <AvatarIA px={48} reacciona className="flex-none" />
      </div>
    );
  }

  return (
    // ── ⚠️⚠️ EL BOT AFUERA DE LA TARJETA (18/08) ──────────────────────────────
    //
    // Matías: *"dejá el bot con el tamaño y la posición donde está, y que la
    // tarjetita empiece por fuera del robot; que estén separados"*.
    //
    // 👉 ES LA FORMA DE UNA BURBUJA DE CHAT, y por eso funciona acá: **el que
    // habla no va adentro de lo que dice.** Adentro, el avatar era una pieza más
    // del contenido y competía con los botones por el renglón de abajo; afuera,
    // es quién firma el mensaje.
    //
    // ⚠️ `items-end`: el avatar se apoya en el borde de ABAJO de la tarjeta, que
    // es donde ya estaba parado. Era la condición que él puso —*"con el tamaño y
    // la posición donde está"*—, y de paso es lo correcto: una burbuja crece
    // hacia arriba, así que anclado abajo el avatar no se mueve cuando el texto
    // tiene uno o tres renglones.
    //
    // ⚠️ EL VIDRIO Y EL TINTE SE QUEDAN EN LA TARJETA, no suben acá: si el color
    // envolviera también al avatar volveríamos a tener una sola pieza, que es
    // justo lo que se vino a separar.
    <div className="mb-2 flex items-end gap-2">
      {/* ── ⚠️ 48px, EL TAMAÑO DE CUANDO ESTÁ SOLO (18/08) ─────────────────
          Matías: *"el tamaño del bot me refería a que se mantenga como el que
          estaba cuando estaba afuera; hacelo un poco más grande, inclusive un
          poquito más grande de lo que era antes"*.

          Venía de 30px, que era el tamaño que tenía **adentro** de la tarjeta —
          ahí competía con el texto y tenía que achicarse. Afuera no compite con
          nada, así que puede tener el tamaño que ya tenía en el estado vacío
          (44) y un poco más.

          ⚠️ Y ES EL MISMO NÚMERO QUE EL ESTADO VACÍO, a propósito: es
          literalmente el mismo bot. Si al quedarse sin tarjetas cambiara de
          tamaño, se leería como que apareció otro. */}
          <AvatarIA px={48} reacciona className="mb-0.5 flex-none" />
      <div
        className="glass-tinte min-w-0 flex-1 rounded-[20px] px-3 py-2"
        style={{ background: tinte.fondo, transition: 'background 260ms ease' }}
      >
      {/* ── ⚠️⚠️ EL TEXTO ABAJO, DE PUNTA A PUNTA (13/08) ─────────────────────────
          Diseño de Matías, y es mejor que los dos que probé antes: *"lo mejor es
          dejar el bot arriba, y en esa misma línea donde está el bot que aparezca
          la cruz, y el texto abajo de principio a fin. Así el texto tiene mucho
          más lugar y ocupa mucho menos espacio"*.

          Los dos intentos anteriores tenían al avatar EN LA MISMA FILA que el
          texto, y los dos fallaron por lo mismo: **el avatar le come 42px de
          ancho a cada renglón, durante todos los renglones.** Sacándolo arriba,
          el texto usa el ancho completo y la tarjeta baja de alto en vez de
          subir. Un avatar al lado del texto parece que ahorra espacio y hace lo
          contrario.

          ⚠️ `items-center` era mío y estaba mal: dejaba la ✕ y el avatar
          flotando en el medio de la tarjeta. Van arriba, en su renglón. */}
      {/* ── ⚠️⚠️ LA LÍNEA DE ARRIBA HACE TRES COSAS (13/08) ──────────────────────
          Idea de Matías, y es la que cierra tres intentos fallidos de ubicar los
          botones: *"puede estar todo en la línea de arriba, porque acordate que
          tenemos un espacio ahí vacío… todos los botones que estaban antes, ahí,
          en esa misma línea, y aprovechamos eso"*.

          Entre el avatar y la ✕ había un hueco muerto de casi todo el ancho.
          Ahora vive ahí lo que se puede contestar de un toque.

          👉 Y POR QUÉ ESTA VEZ ENTRA, DESPUÉS DE FALLAR TRES: las veces
          anteriores los botones compartían renglón CON EL TEXTO, y el texto es
          largo y variable — cualquier cosa al lado suyo lo estrangula. Acá
          comparten renglón con un avatar y un ícono, que miden lo que miden
          siempre. **El problema nunca fue el ancho de los botones: era con quién
          lo compartían.** */}
      {/* ── ⚠️⚠️ ES UNA GRILLA Y NO DOS FILAS APILADAS, Y ESE ES EL TRUCO (17/08)
          Las cuatro piezas —avatar, botones, ✕ y pista— están SIEMPRE en este
          mismo orden en el DOM; lo único que cambia entre la forma con botones y
          la compacta era en qué celda caía cada una.

          👉 **DESDE EL 18/08 HAY UNA SOLA FORMA** y las tres piezas —avatar, ✕ y
          pista— viven todas en la fila 1: la pista ocupa las tres columnas y las
          otras dos se dibujan encima. Los botones se fueron abajo, que era la
          única condición que decidía la forma.

          ⚠️ SE DEJA ESCRITO QUÉ CUIDABA ESTO, porque el día que vuelvan dos
          formas vuelve el problema: al cambiar de forma la pista cambiaba de
          celda, y si eso se hubiera escrito como "la pista adentro de la fila de
          arriba o adentro del bloque de abajo", React la habría re-montado
          **con el dedo apoyado** y el scroll habría vuelto a cero en plena
          deslizada. Moviéndola de celda, el nodo era el mismo.

          ⚠️ `items-start` y no `items-center`: el texto puede tener tres
          renglones y el avatar tiene que quedarse arriba, en el suyo. Es la
          misma corrección que ya se había hecho el 13/08. */}
      {/* ── ⚠️⚠️ TODO ABAJO: EL BOT, LOS BOTONES Y LA ✕ EN UN RENGLÓN (18/08) ──
          Matías, dos pedidos en una frase: *"la ✕ para sacar los mensajes la
          pondría abajo, en la esquina donde están los botones, porque como va
          cambiando la altura es molesto tener que ir subiendo y bajando"*, y
          *"o si no, pasar el bot abajo también, todo en la misma línea"*.

          👉 **EL PRIMERO ES EL MOTIVO REAL Y ES DE USO, NO ESTÉTICO.** La altura
          de esta tarjeta la decide el texto que estás mirando, así que con la ✕
          arriba el dedo tiene que buscarla en un lugar distinto en cada tarjeta,
          y encima cambia MIENTRAS deslizás. Abajo está siempre a la misma
          distancia del borde de la pantalla.

          ⚠️ SE ELIGIÓ SU SEGUNDA OPCIÓN Y NO LA PRIMERA, con motivo. La primera
          era que el texto arrancara al costado del avatar para ganar lugar — o
          sea el envolver, que estuvo puesto hasta esta mañana y **lo bajamos hoy
          mirándolo**: con tres renglones el avatar empuja los dos primeros y el
          tercero arranca pegado al borde, y él lo describió como *"el texto
          queda detrás del robot"*. Bajando el avatar el texto gana el ancho
          completo igual, y sin quedar dentado.

          ⚠️ Y CON ESTO SE FUE LA GRILLA DE TRES COLUMNAS. Existía para que la
          pista pudiera compartir fila con el avatar y la ✕ sin re-montarse al
          cambiar de forma (17/08). Sin nada arriba, la pista es simplemente el
          primer hijo. Es la tercera vez en dos días que sacar una condición
          borra la complejidad en vez de arreglarla.

          ⚠️ EL AVATAR SIGUE FUERA DE LA PISTA, que es la regla del 12/08: si
          viviera adentro de cada tarjeta habría uno por tarjeta y su animación
          arrancaría de cero en cada deslizada. */}
      <div>
        <div
          ref={pista}
          onScroll={mirarScroll}
          // `sin-scrollbar` esconde la barra. El snap hace que el dedo suelte y la
          // pregunta se acomode sola. Sigue siendo LA ÚNICA zona que acepta el
          // deslizamiento: abajo hay un textarea y un swipe ahí pelearía con el
          // cursor.
          //
          // ⚠️⚠️ EN COMPACTA ARRANCA EN LA FILA 1 Y OCUPA LAS TRES COLUMNAS, o
          // sea que se superpone con el avatar y con la ✕. No es un descuido: es
          // lo que hace que el texto ENVUELVA (ver los dos huecos flotados de
          // cada tarjeta, unas líneas más abajo). Sin superponerse, la segunda
          // línea arrancaría a la derecha del avatar como la primera, que es
          // exactamente el desperdicio que se vino a sacar.
          className="sin-scrollbar flex min-w-0 snap-x snap-mandatory items-start gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain"
          style={{ height: alto, transition: 'height 200ms ease' }}
          role="group"
          aria-label="Lo que te dice el asistente"
        >
          {quedan.map((t) => (
            <div
              key={t.id}
              className={`w-full flex-none snap-start transition-all duration-[220ms] ease-out ${
                saliendo === t.id ? '-translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
              }`}
            >
              {/* ── ⚠️⚠️ LOS DOS HUECOS QUE HACEN QUE EL TEXTO ENVUELVA (17/08) ──
                  Pregunta de Matías: *"¿se puede hacer una variable de que si un
                  texto es un solo renglón o cierto tamaño, pueda empezar arriba y
                  terminar abajo?… que no se generen estos espacios vacíos al
                  cohete"*. Se puede, y esto es cómo.

                  Son dos cajas vacías flotadas —una a la izquierda del tamaño del
                  avatar, otra a la derecha del de la ✕— que les reservan el lugar
                  a los primeros renglones. Después el texto usa el ancho
                  completo. El avatar y la ✕ de verdad se dibujan encima, desde la
                  grilla de afuera.

                  ⚠️ CUÁNTOS RENGLONES EXACTAMENTE: **dos, no uno**, y está
                  medido, no supuesto. El avatar mide 30px y un renglón 19.6px, o
                  sea que el flotante tapa el primero entero y 10px del segundo —
                  y un renglón se acorta si el flotante lo toca, aunque sea por un
                  pixel. Del TERCERO en adelante el texto arranca en x=0.
                  👉 Si algún día hace falta que solo se coma el primero, el número
                  a bajar es el `px` del avatar, no el alto del hueco: bajar el
                  hueco por su cuenta mete el texto DEBAJO del avatar.

                  ⚠️⚠️ SON HUECOS Y NO EL AVATAR MISMO, y esa es toda la gracia.
                  El avatar tiene que quedarse FUERA de la pista: si viviera
                  adentro de cada tarjeta habría uno por tarjeta y su animación
                  arrancaría de cero en cada deslizada (regla del 12/08, y está en
                  el docstring de arriba). Flotando un hueco, el texto envuelve
                  igual y el avatar sigue siendo uno solo que nunca se re-monta.

                  👉 Y ESTO ES LO QUE CONTESTA LA OBJECIÓN DEL 13/08 en vez de
                  esquivarla: *"el avatar le come 42px de ancho a cada renglón,
                  durante todos los renglones"*. Acá se los come **en uno solo**,
                  así que ya no hace falta ningún tope de largo.

                  Las medidas: 30 + 6 del `gap-x-1.5` de la grilla a la izquierda,
                  28 + 6 a la derecha. Van pegadas al avatar y a la ✕ reales: si
                  alguno cambia de tamaño, estos números cambian con él.

                  ⚠️ El hueco lo llevan TODAS las tarjetas de la pista y no solo
                  la que estás mirando, y eso ya no necesita ninguna condición
                  desde que la forma es una sola: mientras deslizás, la tarjeta
                  de al lado asoma medio cuerpo, y sin el hueco ese pedazo
                  pasaría por debajo del avatar. */}
              {/* ── ⚠️⚠️ LOS HUECOS FLOTADOS SE FUERON (18/08, mirando la app) ──
                  Estaban acá desde el 17/08 para que el texto ENVOLVIERA al
                  avatar. Con textos de uno o dos renglones se veía bien; con
                  tres se veía roto, y Matías lo describió exacto: *"los textos
                  quedan detrás del robot y quedan por debajo"*.

                  👉 **Y TENÍA RAZÓN, MEDIDO:** el avatar mide 30px y un renglón
                  19.6, así que el flotante empuja los DOS primeros y el tercero
                  arranca en x=0. El resultado son dos renglones corridos a la
                  derecha y uno pegado al borde izquierdo, debajo del robot. No
                  se lee como un párrafo, se lee como un error de maquetado.

                  ⚠️⚠️ LO QUE FALLÓ NO FUE LA IDEA, FUE CON QUÉ SE VALIDÓ. La
                  maqueta del 17/08 que aprobó el envolver medía las seis
                  preguntas abiertas del bot, que son de UN renglón. Las
                  relecturas y los avisos de meta son de tres. **Se aprobó sobre
                  el caso corto y se usó en el largo.**

                  Vuelve la forma del 13/08, que es diseño suyo: *"dejar el bot
                  arriba, y en esa misma línea donde está el bot que aparezca la
                  cruz, y el texto abajo de principio a fin"*. Cuesta ~20px en
                  las tarjetas cortas y no se rompe nunca en las largas. */}
              {/* ⚠️ EL `detalle` YA NO SE DIBUJA (13/08): *"el detalle abajo que
                  suma un renglón más, no me parece"*. El campo sigue en el tipo
                  porque tres tarjetas lo mandan; simplemente no se muestra. Si en
                  un mes sigue sin dibujarse, se va del tipo y de quienes lo pasan.

                  ⚠️ SIN `text-pretty` EN COMPACTA: `text-wrap: pretty` reequilibra
                  los renglones para no dejar una palabra huérfana al final, y con
                  un flotante en el medio eso pelea con el envolver — deja aire a
                  la derecha del avatar, que es justo lo que se vino a sacar. */}
              {/* ── ⚠️⚠️ DOS VOCES, DOS TIPOGRAFÍAS (18/08) ─────────────────
                  La franja dejó de tener un solo estilo de texto el día que la
                  relectura se mudó adentro. El bot habla en sans 13.5 iris; una
                  relectura **te cita a vos**, y va en serif itálica entre
                  comillas, que es exactamente como se veía en el Home.

                  👉 Y NO ES DECORACIÓN. El motivo está escrito desde que nació
                  esa tarjeta: *"es tu voz, no la de la app; con la misma
                  tipografía se leería como algo que dice el sistema"*. Mudarla
                  sin traerse la serif habría hecho que tus propias frases
                  sonaran como el asistente — justo lo que la serif vino a
                  evitar.

                  ⚠️ SALE DEL TONO Y NO DE UN CAMPO APARTE. Un `voz: 'mia'` al
                  lado de `tono: 'recordar'` serían dos campos que hay que
                  acordarse de poner juntos, y el día que uno se olvide la
                  tarjeta sale en verde con la voz del bot. Mientras `recordar`
                  sea el único tono que cita, el tono alcanza. Si algún día otro
                  tono también citara, ESE es el momento de partirlo en dos
                  campos, no antes.

                  ⚠️ Las comillas van acá y no en el texto que llega: si
                  vinieran adentro del `texto`, el día que la misma frase se use
                  en otro lado llegarían con ella. */}
              {t.tono === 'recordar' ? (
                <p className="font-serif text-[14.5px] italic leading-[1.45] text-tinta">
                  “{t.texto}”
                </p>
              ) : (
                <p className="text-[13.5px] font-medium leading-[1.45] text-iris-deep">{t.texto}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── LA FILA DE ABAJO: AVATAR · BOTONES · ✕ ─────────────────────────
            Los tres viven acá porque los tres son SIEMPRE del mismo alto,
            pase lo que pase con el texto. Es lo que hace que la ✕ no se mueva.

            ⚠️ `items-center` y no `items-start`: acá no hay nada alto con lo que
            alinearse: son tres piezas de una línea. Es la corrección inversa a
            la que hubo que hacer arriba el 13/08. */}
        <div className="mt-2 flex items-center gap-2">
          <AccionesBot baraja={baraja} />
          {actual && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => descartar(actual.id)}
              aria-label="Ahora no"
              title="Ahora no"
              // ⚠️ `ml-auto`: se va sola al borde derecho tenga o no botones al
              // lado. Sin esto, con una sola acción corta la ✕ le quedaría
              // pegada en el medio de la nada.
              className="-mr-1 ml-auto grid size-7 flex-none place-items-center rounded-full text-niebla-2 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[14px]">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * LOS BOTONES DE LA TARJETA, ABAJO — en el renglón de escribir.
 *
 * ── ⚠️⚠️ LA CUARTA UBICACIÓN, Y LA QUE ÉL VENÍA PIDIENDO (18/08) ────────────
 *
 * Matías, sobre por qué los había dejado arriba: *"pero cuando lo necesita, ¿por
 * qué no ponerlos abajo?"*.
 *
 * 👉 Y ES LO QUE ÉL YA HABÍA PEDIDO EL 13/08: *"sin los botones ya no sería una
 * exageración de tarjetita"*, con las respuestas abajo, en el renglón de
 * escribir, *"como que vaya cambiando esa parte del chat"*. Aquel día se hizo al
 * revés —a la línea de arriba de la franja— y el comentario del final de este
 * archivo quedó cinco días diciendo que vivían en `BarraChat` cuando no era
 * cierto. Ahora sí.
 *
 * ⚠️ SOLO EXISTE CUANDO HAY ALGO QUE OFRECER, que es la mitad de su frase: no es
 * un renglón fijo que a veces está vacío, es un renglón que aparece. Sin
 * acciones no se dibuja y el composer mide lo que midió siempre.
 *
 * 👉 **Y ESO ES LO QUE PAGA EL ALTO.** Antes los botones no costaban un renglón
 * propio pero SÍ costaban la forma alta de la franja: con botones medía 80px,
 * sin botones 48px. Ahora la franja mide 48px siempre y el renglón de acciones
 * cuesta ~34px, y solo en las tarjetas que tienen. Es más bajo justo donde antes
 * era más alto.
 *
 * ⚠️ EN GRIS Y SIN FONDO DE COLOR, como estaban arriba: son una alternativa a
 * escribir, no la acción principal. Lo principal sigue siendo el campo. Un botón
 * lila acá volvería a decir "tocá esto en vez de contarme".
 *
 * ⚠️ NO REEMPLAZAN AL PLACEHOLDER, que era la otra opción de la maqueta. Poner
 * las pastillas donde dice "Escribí o tocá el mic…" borra el único cartel que
 * dice que ahí se puede escribir, y el que abre la app por primera vez no lo ve
 * nunca. Van en su propio renglón, arriba del campo.
 */
export function AccionesBot({ baraja }: { baraja: Baraja }) {
  const { actual, ocupado, correr } = baraja;
  const acciones = actual?.acciones ?? [];
  if (!actual || acciones.length === 0) return null;

  return (
    // ── ⚠️⚠️ EL TOPE DE ANCHO VA ACÁ Y NO EN CADA PASTILLA (18/08) ────────────
    // Primero estaba como `max-w-[48%]` en cada botón y salió aplastado a "B…":
    // un porcentaje se resuelve contra el ancho del contenedor, y el contenedor
    // era este div, cuyo ancho lo decidía justamente su contenido. Círculo.
    // Acá el 62% se mide contra el renglón del composer, que sí tiene ancho.
    //
    // ⚠️ `flex-none` para que las pastillas midan lo suyo y el campo se quede
    // con el resto; el `max-w` es el que evita que dos etiquetas largas dejen al
    // campo en cero.
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      {acciones.map((a, i) => (
        <button
          key={i}
          type="button"
          disabled={ocupado}
          onClick={() => correr(a, actual.id)}
          // ── ⚠️⚠️ EN LILA, Y ESO INVIERTE UNA REGLA VIEJA (18/08) ───────────
          // Matías, mirándolo: *"el botón de bajar la 2 queda en blanco, no se
          // nota; tendría que ser más llamativo… que todos los botones sean más
          // lilita, algo que contraste"*.
          //
          // ⚠️ ACÁ DECÍA LO CONTRARIO, con un argumento suyo del 13/08: *un
          // botón lila volvería a decir "tocá esto en vez de contarme"*, y por
          // eso iban en gris sobre `bg-white/55`. **La regla sigue siendo buena
          // y lo que falló fue el medio**: ese blanco al 55% estaba pensado para
          // apoyarse sobre el vidrio tinteado de la franja cuando la franja era
          // parte del composer. Hoy la tarjeta es una pieza suelta con su propio
          // tinte, y blanco sobre casi-blanco no se ve.
          //
          // 👉 EL PUNTO MEDIO: tinte lila y texto lila, PERO SIN RELLENO PLENO.
          // Se ve, se toca, y sigue sin competir con el campo de escribir — que
          // era lo único que la regla del 13/08 venía a proteger. Un lila sólido
          // con texto blanco sí la rompería.
          className="max-w-[46%] truncate rounded-full border border-iris-borde bg-iris-soft px-2.5 py-1 text-[12px] font-semibold text-iris-deep disabled:opacity-50"
        >
          {a.etiqueta}
        </button>
      ))}
    </div>
  );
}

/**
 * LOS PUNTITOS — en la franja del indicador de home, sin ocupar alto.
 *
 * ── ⚠️⚠️ DEJARON DE SER BOTONES, Y ES UN CAMBIO DE REGLA (17/08) ────────────
 *
 * Matías: *"los puntitos que se van moviendo no hace falta que sean cliqueables
 * o tocables… estaría bueno que todo el menú vaya un poco más abajo y no ocupe
 * espacio"*.
 *
 * ⚠️ ESTO **INVIERTE** LA DECISIÓN DEL 07/08, que decía lo contrario con un
 * argumento suyo: *un botón decorativo es un bug* (26/07), y estos eran *"la
 * salida de quien no descubra que la franja se desliza"*. Se lo dije al
 * proponerlo y eligió igual, así que queda anotado con todas las letras: **desde
 * hoy, la única forma de cambiar de tarjeta es deslizar la franja.** Si en unos
 * días aparece que se descubren menos tarjetas, esta es la causa a mirar
 * primero, y volver atrás es cambiar `<span>` por `<button>` y devolverles el
 * `irA`.
 *
 * 👉 Y ES LO QUE PERMITE BAJARLOS: en el iPhone hay ~34px reservados abajo para
 * el indicador de home, y ahí no se pueden poner cosas para tocar —iOS se queda
 * con ese gesto—. Un adorno sí entra. Los puntitos pasan a costar **0px de
 * alto** en vez de 14px, y la barra entera baja con ellos (ver `BarraGlobal`).
 *
 * ⚠️ `aria-hidden`: si ya no se pueden usar, tampoco tienen que aparecer en el
 * lector de pantalla. Lo que la baraja tiene para decir sigue anunciado en la
 * pista, que es la que lleva el `role="group"` y su etiqueta.
 *
 * ⚠️ SIN `gap`: la separación la pone el padding de cada uno, así se tocan entre
 * sí y no quedan pixeles muertos en el medio.
 *
 * ⚠️ Y NO SE DIBUJAN CON UNA SOLA TARJETA (`hayQueMostrarPuntitos`), que es lo
 * que él pidió con *"si aparecen los puntitos abajo, pero si no, no"*: un solo
 * puntito no informa nada.
 */
export function PuntitosBot({ baraja }: { baraja: Baraja }) {
  const { quedan, indice } = baraja;
  if (!hayQueMostrarPuntitos(quedan.length)) return null;

  return (
    // ⚠️ `absolute` y no `mt-1.5`: es lo que hace que no empujen nada. El padre
    // es la caja `fixed` de `BarraGlobal` —una caja fija es contenedor de sus
    // hijos absolutos—, y el `bottom` de ahí abajo los deja arriba del indicador
    // sin pisarlo. La cuenta está en `BarraGlobal`, al lado del padding que la
    // acompaña: son un solo número repartido en dos lugares.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-[max(6px,calc(env(safe-area-inset-bottom)-20px))] flex items-center justify-center"
    >
      {quedan.map((t, i) => (
        <span key={t.id} className="grid place-items-center px-[3px]">
          <span
            className="block h-1 rounded-full transition-all duration-200"
            style={{
              width: i === indice ? 16 : 5,
              background: i === indice ? 'var(--color-iris)' : 'var(--color-niebla-2)',
            }}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * ⚠️⚠️ ACÁ VIVÍA `FilaBot`, LA FILA DE ABAJO, Y SE FUE ENTERA (13/08).
 *
 * Matías: *"no me gusta que aparezca el botón contestar o ahora no abajo de
 * todo; eso saquémoslo, porque levanta mucho todo y además no es necesario"*.
 *
 * Tenía los botones de la tarjeta y los puntitos. Los tres se mudaron adentro
 * de `FranjaBot`: las acciones y la ✕ a la derecha del texto, los puntitos
 * debajo del avatar, donde había hueco muerto.
 *
 * ⚠️ LO QUE SE APRENDIÓ ACÁ, Y ES LO QUE HAY QUE RECORDAR: esta fila nació el
 * 12/08 al mudar la tarjeta del bot a la barra, y **se mudó con los botones que
 * la tarjeta tenía sin preguntarse si seguían haciendo falta**. "Contestar"
 * llevaba un día siendo un botón que ponía el cursor en un campo que ya estaba
 * a la vista. Cuando una pieza cambia de lugar, hay que volver a preguntarle
 * para qué está.
 */

/**
 * ⚠️ CUANDO NO QUEDA NINGUNA, EL BOT NO DESAPARECE — pero tampoco ocupa la barra.
 *
 * En la tarjeta, quedarse sin nada mostraba *"Por hoy no tengo nada más"*, y era
 * información: significa que estás al día. Acoplado al campo de texto, ese
 * mismo cartel ocuparía la mitad de la barra para decir que no hay nada, todo el
 * tiempo y en todas las pantallas. Así que la franja se va y **el bot sigue
 * estando donde siempre estuvo: en el avatar del Home**.
 */

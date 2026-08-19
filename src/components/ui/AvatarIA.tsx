'use client';

import { useEffect, useState } from 'react';

/**
 * El asistente: la cabeza lila con los ojos, y dos estrellas cayendo **abajo a
 * la izquierda**, como la cuerdita de un pensamiento (07/08).
 *
 * ⚠️ REDIBUJADO ENTERO EL 07/08 después de nueve vueltas con Matías, todas en
 * maqueta. El recorrido completo —qué se probó, qué se descartó y por qué— está
 * en `docs/maquetas/2026-08-07-bot-vidrio-lila.html`, que anda solo en el
 * navegador. Lo que cambió: el degradé ahora oscurece (antes iba de lila a lila
 * y se veía plano), el interior tiene dos manchas de color que derivan, los ojos
 * son simétricos y un 15% más grandes, las estrellas bajaron, y el aro se dibuja
 * adentro del `viewBox` para que su grosor sea proporcional en cualquier tamaño.
 *
 * ⚠️ LO QUE **NO** SE APLICÓ, y está listo en la maqueta: las siete expresiones
 * (pensando, contento, escéptico, sorprendido, guiño, durmiendo) y el color
 * atado al ánimo. Faltan dos decisiones antes: **cuándo se dispara cada una** —
 * reaccionar a lo que acabás de hacer no es lo mismo que reflejar cómo estás, y
 * lo segundo te devuelve tu estado sin que se lo pidas.
 *
 * ⚠️ ES UN SOLO SVG, y esa es la razón de que exista este componente. Antes el
 * avatar era un `<span>` redondo con el gradiente por CSS y el glifo de los ojos
 * adentro: con esa forma **las estrellas no pueden salirse de la cabeza**, que
 * es justo lo que él pidió ("que estén por fuera, separadas, y se vean
 * completas"). Dibujando todo en el mismo lienzo, la cabeza ocupa la esquina de
 * abajo a la izquierda y las estrellas viven en el aire que sobra.
 *
 * Por eso `px` es el LIENZO ENTERO, no la cabeza: la cabeza mide un 52% de eso
 * (a 44px de lienzo, unos 23px de cabeza). Si algún día se quiere la cabeza más
 * grande, se sube `px`, no el radio.
 *
 * Las estrellas van en `iris-2`, medio tono más claro que la cabeza: mismo
 * color de la familia, pero despegado. Probamos el oro de la paleta y se veía
 * mejor en grande, pero ese color ya significa "mails / importante" en el resto
 * de la app y no vale gastarlo acá.
 *
 * La animación vive en globals.css (`pestanea-ia`, `titila-ia`) y respeta
 * prefers-reduced-motion. La cabeza NO se mueve: probamos que respirara y a
 * Matías no le gustó.
 */
/** Una de cada tres veces aparece con mate. Ver `useMate`. */
const CHANCE_MATE = 1 / 3;

/**
 * Decide si esta vez hay mate. Dos cosas importantes:
 *  - se sortea UNA sola vez al montar y no se vuelve a tocar: si dependiera del
 *    render, el mate aparecería y desaparecería mientras lo estás mirando, que
 *    es peor que tenerlo siempre;
 *  - el sorteo va en un efecto y no en el render, porque este componente se
 *    pinta primero en el server: con `Math.random()` suelto, el server dibuja
 *    una cosa, el cliente otra, y React tira error de hidratación.
 */
function useMate(): boolean {
  const [conMate, setConMate] = useState(false);
  useEffect(() => {
    setConMate(Math.random() < CHANCE_MATE);
  }, []);
  return conMate;
}

/**
 * ⚠️⚠️ EL GROSOR DEL ARO, QUE **NO** ES UNA CONSTANTE (10/08).
 *
 * Matías, mirando la app: *"le falta el borde, como de vidrio"*. Y no era una
 * impresión: **a `px={44}` el aro medía 0,59 px reales**. Con 34% de blanco, eso
 * no es un borde sutil — no existe.
 *
 * ⚠️ LA CAUSA ES UNA VUELTA ATRÁS SIN QUERER. El 07/08 se probó el aro
 * proporcional puro y **se descartó**, porque en chico desaparece; quedó
 * aprobada una **recta con offset**, `0,9 + d × 0,013`, que da 1,5 px con la
 * cabeza en 46 y 2 px con la cabeza en 84. Después el bot se redibujó como un
 * SVG entero y el `strokeWidth` pasó a vivir adentro del `viewBox` — lo que es
 * proporcional puro otra vez. El comentario de entonces lo celebraba como *"la
 * proporción es la misma en cualquier tamaño, sin fórmula que mantener"*, y esa
 * frase describe exactamente el defecto que la fórmula existía para tapar.
 *
 * **Lección: cuando una solución nueva dice "y además nos ahorra la fórmula",
 * vale preguntar por qué existía la fórmula.**
 *
 * Acá la recta vuelve, convertida a unidades del `viewBox`. La cabeza mide 52
 * unidades de 100, así que en pantalla mide `0,52 × px`:
 *
 *   grosor_en_pantalla = 0,9 + 0,013 × (0,52 × px)
 *   grosor_en_viewBox  = grosor_en_pantalla × 100 / px  =  90/px + 0,676
 *
 * Verificado: `px=88` (cabeza 46) → 1,50 px · `px=44` (cabeza 23) → 1,20 px.
 * O sea **el doble de lo que se veía**, y en el tamaño chico es la diferencia
 * entre que haya vidrio y que no.
 */
function grosorDelAro(px: number): number {
  return 90 / px + 0.676;
}

/**
 * ── ⚠️⚠️ LAS CARAS, AL TOCARLO (18/08) ──────────────────────────────────────
 *
 * Matías: *"¿podés hacer que si tocás el ícono del bot se enoje o se maree o
 * haga caras?"*.
 *
 * ⚠️ SOLO CAMBIAN LOS OJOS. La cabeza, el aro, las manchas que derivan y las
 * estrellas quedan intactas: son cuatro vueltas de correcciones suyas
 * (07-11/08) y no tienen nada que ver con el humor. **Una cara se hace con la
 * mirada, no repintando al personaje.**
 *
 * ⚠️ Y SE VA SOLA A LOS 1.2s. Un bot que se queda enojado te está diciendo algo
 * que no es cierto: no pasó nada, lo tocaste. Es un guiño, no un estado.
 *
 * ⚠️ NO SE REPITE LA MISMA DOS VECES SEGUIDAS: con tres caras y azar puro, tocar
 * dos veces y ver lo mismo se lee como que no funcionó.
 */
// ── ⚠️⚠️ LA CANTIDAD DE TOQUES ELIGE LA CARA (18/08) ────────────────────────
//
// Matías, corrigiendo la versión anterior: *"cuando la tocás sigue cambiando
// cada vez que la tocás; en vez de eso, un toque que sea enojo, dos toques…"*.
//
// 👉 **Y LA DIFERENCIA NO ES DE ORDEN, ES DE MODELO.** Yo había hecho una rueda:
// cada toque avanza uno y sigue girando para siempre. Él quiere un **conteo**:
// tocar una vez es un gesto, tocar dos veces es OTRO gesto — como un click y un
// doble click. La cara no es "la siguiente", es "la que corresponde a cuántas
// veces me tocaste".
//
// Por eso hace falta la ventana: sin ella no existe "dos toques", porque no hay
// forma de saber si el segundo toque es parte del mismo gesto o uno nuevo.
const CARAS = ['enojado', 'mareado', 'sorprendido'] as const;
type Cara = (typeof CARAS)[number];

/**
 * CUÁNTO ESPERA ANTES DE DAR EL GESTO POR TERMINADO.
 *
 * ⚠️ 600ms Y NO UN SEGUNDO: *"un segundo es demasiado quizás"*, y tiene razón —
 * con un segundo, dos toques normales se cuentan como uno y nunca llegás a la
 * segunda cara. Es la misma ventana que usa un doble click de sistema, un poco
 * estirada porque acá el dedo apunta a un círculo de 30px.
 *
 * ⚠️ Y ES LO QUE DEVUELVE LA CARA NORMAL. Al vencerse, el conteo vuelve a cero y
 * el bot se acomoda solo: no hace falta un temporizador aparte para eso.
 */
const VENTANA_MS = 600;

export function AvatarIA({
  px = 44,
  className = '',
  reacciona = false,
}: {
  px?: number;
  className?: string;
  /**
   * Si responde al toque con una cara. Apagado por defecto: el avatar aparece en
   * listas, cabeceras y mensajes, y ahí un toque tiene que hacer lo que hace la
   * fila, no una gracia.
   */
  reacciona?: boolean;
}) {
  const conMate = useMate();
  const aro = grosorDelAro(px);
  // ⚠️ SE GUARDA EL NÚMERO DE TOQUES Y NO LA CARA. La cara sale de la cuenta, y
  // el número sirve además como `key` del grupo animado: cambiar la key lo
  // re-monta, y eso es lo que **reinicia el temblor en cada toque**. Con la cara
  // sola, tocar dos veces seguidas hacia el mismo estado no volvería a temblar.
  const [toques, setToques] = useState(0);

  // ⚠️ EL TOPE ES `length` Y NO UN MÓDULO: del tercer toque en adelante se queda
  // en la última cara en vez de volver a empezar. Tocarlo cinco veces seguidas
  // es un solo gesto —*"lo estoy sacudiendo"*—, y que la cara girara mientras
  // tanto lo convertiría otra vez en la rueda que él acaba de bajar.
  const cara: Cara | null = toques === 0 ? null : CARAS[Math.min(toques, CARAS.length) - 1];

  // La ventana: mientras sigas tocando se reinicia, y cuando parás vuelve a cero
  // —o sea, a la cara normal—. Un solo temporizador para las dos cosas.
  useEffect(() => {
    if (toques === 0) return;
    const id = setTimeout(() => setToques(0), VENTANA_MS);
    return () => clearTimeout(id);
  }, [toques]);

  const dibujo = (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      className={`flex-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* ⚠️ LA CABEZA VA DE LILA MEDIO A LILA PROFUNDO, casi opaca (07/08).
            Matías, después de recorrer del vidrio transparente al color pleno:
            *"casi como color puro"*. Antes era `iris → iris-2`, o sea de claro a
            más claro, y por eso se veía plana: **un degradé que no oscurece no
            dibuja un volumen, dibuja una mancha**. */}
        <linearGradient id="grad-avatar-ia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7884f2" />
          <stop offset="52%" stopColor="#626ee4" />
          <stop offset="100%" stopColor="#4a56c8" />
        </linearGradient>
        {/* Las dos manchas que derivan adentro. Ver `deriva-ia-1/2` en globals. */}
        <radialGradient id="mancha-ia-lila">
          <stop offset="0%" stopColor="#aab9ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#aab9ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mancha-ia-turquesa">
          <stop offset="0%" stopColor="#7ed6de" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#7ed6de" stopOpacity="0" />
        </radialGradient>
        {/* La sombra de adentro, abajo.
            ── ⚠️⚠️ SE BAJÓ MUCHO (11/08) ────────────────────────────────────
            Matías: *"tiene como mucho negro el costado, que hace que parezca un
            botoncito o una esfera, y esa sensación no la quiero"*.

            ⚠️ ERA LO ÚNICO QUE LE DABA VOLUMEN desde que se sacó el brillo
            especular, y **ese era el problema**: volumen es exactamente lo que
            convierte un disco en una esfera. Lo que él quiere es **vidrio**, y un
            vidrio no es una bola — es una superficie con canto.

            Al 50% y con radio 0,75, el oscurecido arrancaba abajo y **trepaba por
            los costados** hasta media cabeza: de ahí el "negro del costado".
            Ahora 0,22 y radio 0,58, o sea **un apoyo abajo y nada más**.

            Lo que sostiene la lectura de vidrio pasa a ser el aro y las dos
            manchas que derivan, que es lo que él eligió en las nueve vueltas del
            07/08 — no el sombreado. */}
        <radialGradient id="hondo-ia" cx="0.5" cy="1" r="0.58">
          <stop offset="0%" stopColor="#2e3696" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#2e3696" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cabeza-ia">
          <circle cx="42" cy="54" r="26" />
        </clipPath>
        <filter id="difuso-ia" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* ── LAS ESTRELLAS, ABAJO Y A LA IZQUIERDA (07/08) ────────────────────
          Matías: *"como si fuera un pensamiento… la cuerdita"*. Antes asomaban
          arriba a la derecha y se leían como dos adornos flotando al costado;
          cayendo por debajo se leen como algo que gotea del bot.

          ⚠️ LA GRANDE ES MÁS QUE LA CHICA, Y ESO NO ES ESTÉTICA: con radios
          parecidos las dos se leen como dos puntos iguales y **la cuerdita deja
          de tener dirección**. Empezó siendo el doble exacto (5,6 contra 2,8).

          ⚠️ LA CHICA CRECIÓ A 3,6 Y SE CORRIÓ 2,5 (10/08). Matías: *"la última
          estrella de abajo, la chiquita, se ve muy chica; hacerla un poquito más
          grande"*. A `px={44}` medía **1,2 px de radio real** — casi un punto.

          ⚠️⚠️ AGRANDARLA SIN ALEJARLA LAS FUSIONÓ, y él lo vio enseguida: *"le
          sacaste la estrellita esa que te pedí y la hiciste más grande a la
          otra"*. No se sacó ninguna: **al crecer, el hueco entre las dos cayó de
          1,22 px a 0,97 px**, y por debajo de un pixel el suavizado de pantalla
          las une en una sola mancha. Dos figuras separadas por menos de 1 px no
          son dos figuras.

          ⚠️ **Y ESE 0,97 LO HABÍA CALCULADO YO, DÁNDOLO POR BUENO.** El error no
          fue no medir: fue **medir y no tener un umbral**. Un número sin criterio
          de aceptación no es una verificación, es un número. El criterio que
          faltaba: **el hueco tiene que superar 1 px a tamaño real, o las dos
          formas se leen como una.**

          Arreglado corriendo la chica 2,5 unidades por la línea de la cuerdita
          —la dirección que une las dos, así el gesto no cambia—: el hueco queda
          en **2,08 px**, casi el doble del original. Y la relación grande/chica
          es 1,56, que es lo que protegía la decisión del 07/08 (con radios
          parecidos las dos se leen como dos puntos iguales y la cuerdita pierde
          dirección).

          Van ANTES de la cabeza, o sea por detrás: si algún día se acercan, la
          cabeza gana.

          ── ⚠️ SUBIERON Y SE CORRIERON A LA IZQUIERDA (10/08) ─────────────────
          Pedido de Matías: *"subí las estrellas manteniendo obvio las distancias
          pero más izquierda arriba"*.

          ⚠️ EL DESPLAZAMIENTO VA EN UN `<g>` DE AFUERA Y NO EN LOS PATHS NI EN
          LOS `<g>` ANIMADOS, y las dos cosas importan:

           · **En un `<g>` aparte** porque `titila-ia` anima `transform`. Un
             `transform` propio en el mismo grupo se lo come la animación y el
             movimiento no pasaría — se vería igual y parecería que el pedido no
             se aplicó.
           · **No tocando los paths** porque así *"manteniendo las distancias"*
             es una garantía y no algo que haya que recalcular a mano: las dos
             estrellas se mueven juntas por construcción, y el tamaño de cada
             una y la separación entre ellas quedan exactamente como estaban.

          ⚠️ EL DESPLAZAMIENTO SE ELIGE POR EL AIRE QUE DEJA, NO A OJO. Las
          estrellas están a la izquierda del centro de la cabeza, así que **subir
          las ACERCA al círculo y correrlas las ALEJA**: los dos ejes tiran para
          lados opuestos y "un poco más arriba a la izquierda" no es un solo
          gesto. Por eso el valor sale de medir la distancia mínima de la estrella
          grande al borde del círculo, y no de tantear.

          Recorrido: `(-5 -4)` dejaba 4,92 unidades de aire; `(-9 -8)` deja 5,08.
          O sea que se movió cuatro y cuatro **conservando el aire**, que es lo
          que pidió Matías: *"subile un poco las estrellas más arriba hacia la
          izquierda, respetando la distancia desde el borde"*.
          ⚠️ Ojo con las combinaciones parejas: `(-8 -8)` cae a 4,44 y la grande
          empieza a meterse detrás de la cabeza. */}
      <g transform="translate(-9 -8)">
        <g className="titila-ia" fill="var(--color-iris-2)">
          <path d="M25.9 80.6 L27.5 84.6 L31.5 86.2 L27.5 87.8 L25.9 91.8 L24.3 87.8 L20.3 86.2 L24.3 84.6 Z" />
        </g>
        {/* ⚠️⚠️ ACÁ ESTABA LA ESTRELLA CHICA Y SE FUE (11/08). Matías la pidió
            dos veces: *"el bot tiene todavía dos estrellitas; pido que le saques
            la más chiquita"*.

            ⚠️ VA CONTRA LA DECISIÓN DEL 07/08, y conviene saberlo: eran dos
            porque **la diferencia de tamaño entre ellas era lo que le daba
            DIRECCIÓN a la cuerdita** —con radios parecidos se leían como dos
            puntos iguales y el gesto perdía sentido—. Con una sola, ese
            argumento deja de aplicar entero: no hay dirección que construir.

            Queda por ver si la grande sola se sigue leyendo como un pensamiento
            o pasa a ser un adorno al costado. **Si pasa lo segundo, la salida no
            es devolver la chica: es mover o inclinar la que queda.** */}
      </g>

      <circle cx="42" cy="54" r="26" fill="url(#grad-avatar-ia)" />

      {/* El color moviéndose, recortado a la cabeza. */}
      {/* ── ⚠️⚠️ SE MUEVE LA CABEZA, NO EL DIBUJO ENTERO (18/08) ──────────────
          Matías: *"la estrellita que está abajo del bot que quede fija, solo se
          mueve el bot"*. Antes la clase iba en el `<svg>`, así que el bamboleo
          se llevaba puestas las estrellas — y las estrellas son la cuerdita del
          pensamiento: si tiemblan con la cabeza dejan de ser un pensamiento y
          pasan a ser parte del muñeco.

          Por eso este `<g>` arranca DESPUÉS del grupo de las estrellas y las
          deja afuera.

          ⚠️ `transform-box: view-box` + origen en 42,54: es el centro de la
          cabeza. Sin esto el origen cae en 0,0 —la esquina del `viewBox`— y
          rotar o escalar desde ahí manda la cabeza a pasear en vez de moverla en
          el lugar.

          ⚠️ LA `key` ES EL NÚMERO DE TOQUES, no la cara: re-monta el grupo en
          cada toque y con eso la animación del temblor vuelve a empezar. Sin la
          key, tocar de nuevo no reinicia nada porque la clase ya estaba puesta. */}
      <g
        key={toques}
        className={`late-ia ${cara === 'mareado' ? 'marea-ia' : ''}`}
        style={{ transformBox: 'view-box', transformOrigin: '42px 54px' }}
      >
      <g clipPath="url(#cabeza-ia)">
        <ellipse
          className="deriva-ia-1"
          cx="34"
          cy="46"
          rx="17"
          ry="17"
          fill="url(#mancha-ia-lila)"
          filter="url(#difuso-ia)"
        />
        <ellipse
          className="deriva-ia-2"
          cx="50"
          cy="62"
          rx="15"
          ry="15"
          fill="url(#mancha-ia-turquesa)"
          filter="url(#difuso-ia)"
        />
        <circle cx="42" cy="54" r="26" fill="url(#hondo-ia)" />
      </g>

      {/* ⚠️ EL ARO VA DIBUJADO ADENTRO DEL `viewBox`, no como `border` de CSS, y
          esa es la razón de fondo por la que el avatar es un SVG. Matías: *"el
          borde cuando está más pequeño, ¿por qué aumenta?"* — y era cierto: un
          borde fijo de 2px es el 4,3% del diámetro en una cabeza de 46px y el
          2,4% en una de 84, así que el chico se veía mucho más pesado.

          ⚠️⚠️ PERO EL TRAZO **NO** ES UNA CONSTANTE DEL `viewBox` (10/08). Serlo
          es proporcional puro, que es justo lo que se descartó el 07/08 porque
          en chico desaparece — y desapareció: a `px={44}` medía 0,59 px reales.
          Ver `grosorDelAro`, que trae de vuelta la recta con offset que él
          aprobó. */}
      <circle cx="42" cy="54" r="26" fill="none" stroke="rgba(255,255,255,.34)" strokeWidth={aro} />

      {/* ⚠️ LOS OJOS: IGUALES, CENTRADOS Y UN 15% MÁS GRANDES (07/08).
          Antes estaban en 36,6 y 52,3 sobre una cabeza centrada en 42 — o sea
          **corridos 2,45 a la derecha**, algo que nadie había notado y que hacía
          que la cara mirara de costado sin querer. Ahora son simétricos.
          El 15% salió de probar 10 y 20: *"entre diez y veinte me gusta"*. */}
      {/* ⚠️ `pestanea-ia` SOLO EN LA CARA NORMAL: el parpadeo escala los ojos en
          Y, y sobre unas cejas enojadas o unos ojos girando se lee como un
          defecto. Cada cara tiene su propio movimiento o ninguno. */}
      {cara === null && (
        <g className="pestanea-ia" fill="#fff">
          <ellipse cx="35" cy="51.5" rx="3.24" ry="4.9" />
          <ellipse cx="49" cy="51.5" rx="3.24" ry="4.9" />
        </g>
      )}

      {/* Enojado: los ojos se achatan y bajan por dentro. Las cejas son los
          mismos dos trazos inclinados — sin cejas, un ojo achatado se lee como
          "dormido". */}
      {cara === 'enojado' && (
        <g fill="#fff" stroke="#fff" strokeLinecap="round">
          <ellipse cx="35" cy="52.5" rx="3.24" ry="3.1" />
          <ellipse cx="49" cy="52.5" rx="3.24" ry="3.1" />
          <path d="M31.4 45.4 L38.4 47.9" strokeWidth="2.4" fill="none" />
          <path d="M52.6 45.4 L45.6 47.9" strokeWidth="2.4" fill="none" />
        </g>
      )}

      {/* Mareado: dos espirales. La cabeza entera se bambolea con `marea-ia`. */}
      {cara === 'mareado' && (
        <g fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
          <path d="M35 51.5 m0,-4.4 a4.4,4.4 0 1,1 -3.1,1.3 a2.6,2.6 0 1,1 2.6,2.6" />
          <path d="M49 51.5 m0,-4.4 a4.4,4.4 0 1,1 -3.1,1.3 a2.6,2.6 0 1,1 2.6,2.6" />
        </g>
      )}

      {/* Sorprendido: redondos y más grandes, con una pupila oscura adentro.
          ⚠️ Sin la pupila, dos círculos blancos grandes se leen como susto, no
          como sorpresa: es el punto negro el que los vuelve una mirada. */}
      {cara === 'sorprendido' && (
        <g>
          <circle cx="35" cy="51.5" r="5.2" fill="#fff" />
          <circle cx="49" cy="51.5" r="5.2" fill="#fff" />
          <circle cx="35" cy="51.5" r="2.1" fill="#4a56c8" />
          <circle cx="49" cy="51.5" r="2.1" fill="#4a56c8" />
        </g>
      )}

      {/* El mate, cuando toca. Va ÚLTIMO, o sea al frente: la bombilla tiene que
          pisarle el borde a la cara para que se lea que está tomando y no que
          hay un mate flotando al lado. La boca va chata y no redondeada: con la
          curva parecía una bocha de helado (lo marcó Matías). */}
      {conMate && (
        <g className="flota-mate">
          <path d="M66 76 L57 67" stroke="var(--color-niebla-3)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M60.9 77 L75.1 77 A10 10 0 1 1 60.9 77 Z" fill="var(--color-oro)" />
          <rect x="60.9" y="77" width="14.2" height="3.6" fill="var(--color-verde)" />
        </g>
      )}
      </g>
    </svg>
  );

  if (!reacciona) return dibujo;

  // ⚠️ `<button>` Y NO UN `onClick` EN EL SVG: es tocable, así que tiene que
  // poder enfocarse con teclado y anunciarse. El `aria-label` dice qué hace, no
  // qué es — el dibujo ya es `aria-hidden`.
  return (
    <button
      type="button"
      onClick={() => setToques((n) => n + 1)}
      aria-label="Tocá al asistente"
      className={`flex-none rounded-full leading-[0] ${className}`}
    >
      {dibujo}
    </button>
  );
}
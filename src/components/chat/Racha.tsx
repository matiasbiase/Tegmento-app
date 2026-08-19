/**
 * LA RACHA, AL LADO DEL SALUDO (07/08).
 *
 * ⚠️ SE SEPARÓ DEL MES, Y ESO ES LO QUE ARREGLA. Hasta hoy la llama vivía en la
 * esquina de `MesDeUso`, o sea **tres cosas distintas compartiendo una caja**:
 * el calendario del mes, qué anotaste hoy y cuántos días seguidos llevás. Es lo
 * que hacía que esa tarjeta se viera "rara" y lo que la obligó a rehacerse dos
 * veces (06/08). Separadas, **la llama dice "venís" y el mes dice "cuándo"**.
 *
 * ⚠️⚠️ VA A LA IZQUIERDA, PEGADA AL SALUDO, Y NO EN LA ESQUINA DERECHA: el botón
 * de hamburguesa es un círculo fijo de 46px arriba a la derecha con `z-60`, así
 * que ahí la taparía. No es una preferencia estética, es el layout que ya está.
 *
 * ── LO QUE NO SE TOCA ────────────────────────────────────────────────────────
 *
 * El dibujo de la llama viene de cuatro vueltas de correcciones suyas (05-06/08)
 * y llega igual: el pico ladeado (una llama simétrica **es** una gota), el
 * `translate(0 2.1)` que la centra dentro de su viewBox, el relleno con
 * degradé y el latido que `prefers-reduced-motion` apaga.
 *
 * ⚠️ Y SIGUE DESAPARECIENDO CUANDO SE CORTA, SIN DECIR NUNCA QUE SE CORTÓ. Una
 * racha es el mecanismo que fabrica exactamente el sentimiento del que salió
 * esta app —*"vengo nueve meses y paré dos semanas, abandoné todo"*—, así que
 * existe mientras suma y se va callada cuando no. Con un día no hay racha:
 * arranca en 2, y eso lo decide quien la calcula (`diasDeRacha`).
 */
/**
 * ── ⚠️ UNA SOLA FORMA: FUEGO AL COSTADO, SIN "SEGUIDOS" (10/08) ──────────────
 *
 * Matías: *"que sea el fueguito sin seguidos y el fuego al costado como estaba
 * antes, pero sí más grande de como estaba al lado del título"*.
 *
 * Estuvo un rato en dos variantes —columna para la esquina, pastilla para ir
 * pegada al saludo— y el argumento era que en la esquina correspondía *"una
 * cifra grande con su unidad debajo"*. **Él lo simplificó y tiene razón por dos
 * motivos que se suman:**
 *
 *  1. **"seguidos" es una unidad que no hace falta.** Ya lo había dicho el
 *     06/08: *"sacaría la palabra seguidos porque se entiende"*. Un número al
 *     lado de una llama no se lee de ninguna otra manera.
 *  2. **Una sola forma es una sola cosa.** Dos gramáticas para el mismo dato
 *     obligaban a elegir bien en cada lugar nuevo, y elegir mal se veía raro sin
 *     que nada lo avisara. Con una, no hay nada que elegir.
 *
 * ⚠️ **MÁS GRANDE QUE LA QUE ESTUVO AL LADO DEL TÍTULO** (llama 17→22, número
 * 13,5→18). Ahí competía con un serif de 32 y tenía que achicarse; en la esquina
 * de un bloque que nadie toca, es lo único con peso y puede tenerlo.
 *
 * ── LO QUE NO SE TOCA ────────────────────────────────────────────────────────
 *
 * El dibujo llega intacto de cuatro vueltas suyas: el pico ladeado (una llama
 * simétrica **es** una gota), el `translate(0 2.1)` que la centra dentro de su
 * viewBox, el relleno con degradé y el latido que `prefers-reduced-motion` apaga.
 *
 * ⚠️ Y SIGUE DESAPARECIENDO CUANDO SE CORTA, SIN DECIR NUNCA QUE SE CORTÓ. Una
 * racha es el mecanismo que fabrica exactamente el sentimiento del que salió
 * esta app —*"vengo nueve meses y paré dos semanas, abandoné todo"*—, así que
 * existe mientras suma y se va callada cuando no. Con un día no hay racha:
 * arranca en 2, y eso lo decide quien la calcula (`diasDeRacha`).
 */
/**
 * ── ⚠️⚠️ EN FUEGO Y NO EN LILA (18/08) ──────────────────────────────────────
 *
 * Matías: *"que la racha sea roja"*.
 *
 * 👉 **Y ES UN ROJO NUEVO, NO EL QUE LA APP YA TENÍA.** El rojo que había es
 * `brick`, y brick ya significa una cosa: **algo salió mal**. Lo usan el error
 * del login, el micrófono mientras graba y el ánimo "mal" de `EvolucionAnimo`.
 * Pintar la racha con ese rojo le daría al mejor dato de la pantalla el color de
 * los problemas — y es exactamente el razonamiento que ya está escrito en
 * `ChipsDeHoy` para no usar el verde ahí (*"el verde ya significa otra cosa acá
 * arriba"*). Así que la racha estrena `--color-fuego`, un naranja quemado que se
 * lee como llama.
 *
 * ⚠️⚠️ PERO LA PASTILLA VUELVE AL LILA (18/08, al verlo corriendo). Matías:
 * *"el fondo de la racha no me gusta que sea naranja, hacerlo lila como era
 * antes, pero lo demás en rojo"*. Y mirándolo tiene razón por algo concreto:
 * **el fondo naranja convertía a la racha en el objeto más caliente de la
 * pantalla**, compitiendo con el saludo, cuando su trabajo es que la mires de
 * reojo. En lila la pastilla se apaga y el fuego queda solo en la llama, que es
 * donde el color significa algo. El `--color-fuego-tint` queda sin usar por
 * ahora; se borra si en una semana sigue así.
 *
 * ⚠️ EL DEGRADÉ VA DE CLARO A OSCURO ARRIBA-ABAJO, como el que tenía en lila,
 * porque es lo que hace que parezca fuego y no una silueta plana: la punta de
 * una llama es lo más caliente y lo más claro. Invertirlo la apaga.
 *
 * ⚠️ Lo único que cambia es el color. El dibujo —el pico ladeado, el
 * `translate(0 2.1)`, el latido que `prefers-reduced-motion` apaga— llega
 * intacto de las cuatro vueltas de correcciones suyas del 05-06/08.
 */
export function Racha({ dias }: { dias: number }) {
  if (dias < 2) return null;

  return (
    // ── ⚠️⚠️ DE PASTILLA ACOSTADA A BLOQUE PARADO (18/08) ─────────────────────
    //
    // Matías: *"un rectángulo de color, con un color medio fuerte que llama la
    // atención, para que veas la racha… que sea rectangular pero para abajo, no
    // para el costado; el fuego más grande y blanco, y el número lo dejamos de
    // color"*.
    //
    // 👉 EL CAMBIO DE ORIENTACIÓN ES LO QUE LO HACE FUNCIONAR, no el color.
    // Acostada, la racha competía por el ANCHO con el saludo, que es la pieza
    // más grande de la pantalla, y por eso había que achicarla hasta que dejaba
    // de verse. Parada ocupa el hueco vertical que quedaba libre al lado de la
    // hamburguesa, así que puede ser grande sin sacarle nada a nadie.
    //
    // ⚠️⚠️ EL DEGRADÉ VA DE OSCURO ARRIBA A CLARO ABAJO, Y NO ES DECORACIÓN: es
    // lo que hace legibles a las dos piezas con un solo fondo. Arriba, donde va
    // la llama BLANCA, el naranja es oscuro y la recorta; abajo, donde va el
    // número OSCURO, es claro y lo sostiene. Al revés, cada una se apagaría
    // sobre su mitad.
    //   · blanco sobre el naranja de arriba (#e0562c) → 3.6:1, y alcanza porque
    //     la llama es un gráfico grande, no texto.
    //   · marrón sobre el naranja de abajo (#f2a33f) → 7.4:1, cómodo para AA.
    //
    // ⚠️ Y POR ESO EL NÚMERO NO ES BLANCO. Él pidió *"el fuego blanco y el número
    // de color"*: son las dos únicas cosas adentro, y si compartieran color el
    // bloque se leería como un solo dibujo en vez de "una llama y un número".
    //
    // ⚠️ ALINEA POR ARRIBA CON LA HAMBURGUESA, no por el centro. Cuando medían
    // 42 y 46 el centro era lo correcto —dos piezas parecidas se comparan por el
    // medio—; con 66 contra 46 centrarlas dejaría al bloque asomando por arriba
    // del botón y por abajo, y se leería como desalineado en las dos puntas. Ver
    // el hueco flotado en `AsistenteEntrada`.
    <div
      className="inline-flex w-[46px] flex-none flex-col items-center gap-0.5 rounded-[16px] px-1 pb-[7px] pt-[6px]"
      style={{
        background: 'linear-gradient(180deg, #e0562c 0%, #ea6b30 46%, #f2a33f 100%)',
        boxShadow: '0 3px 10px rgba(192,73,47,.28), inset 0 1.5px 0 rgba(255,255,255,.35)',
      }}
      aria-label={`${dias} días seguidos`}
    >
      {/* ⚠️ BLANCA Y PLENA, sin el degradé que tenía: sobre un fondo de color, un
          degradé naranja dentro de otro naranja desaparece. El volumen ahora lo
          pone el fondo, no la llama. */}
      <svg viewBox="0 0 24 24" className="latido-llama block size-[28px] flex-none" aria-hidden="true">
        <path
          fill="#fff"
          transform="translate(0 2.1)"
          d="M12 1.5c4 4.1 6.2 7 6.2 10.4a6.2 6.2 0 1 1-12.4 0c0-1.6.5-3.1 1.5-4.3.35 1.15 1 2 2 2.45C8.65 7.1 9.9 4.4 12 1.5Z"
        />
      </svg>
      <span aria-hidden="true" className="font-sans text-[19px] font-bold leading-none" style={{ color: '#4a1608' }}>
        {dias}
      </span>
    </div>
  );
}

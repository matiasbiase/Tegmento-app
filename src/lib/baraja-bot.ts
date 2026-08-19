/**
 * LAS REGLAS DE LA BARAJA DEL BOT, AHORA QUE VIVE PEGADA A LA BARRA DE ESCRIBIR.
 *
 * Salieron de adentro de `TarjetasBot` el 12/08, cuando se aplicó la propuesta C
 * (`docs/maquetas/2026-08-12-barra-escritura.html`): la tarjeta dejó de ser
 * tarjeta y se acopló arriba del campo de texto. Con eso, **la baraja pasó a
 * vivir en dos componentes** —la franja de arriba dibuja la pregunta, la fila de
 * abajo dibuja los botones y los puntitos— y lo que antes era estado privado de
 * un archivo ahora lo comparten dos.
 *
 * ⚠️ POR ESO ESTÁN ACÁ Y NO EN EL COMPONENTE. Mientras fue una sola tarjeta, el
 * clamp del índice podía ser una línea suelta adentro del render. Repartido en
 * dos lugares, una regla implícita se convierte en dos implementaciones que se
 * despegan al primer retoque. Es la misma razón por la que `partirHerramienta` y
 * `componerHerramienta` no viven adentro de `BarraChat`.
 */

/** Lo mínimo que la baraja necesita saber de una tarjeta para ordenarla. */
type ConId = { id: string };

/**
 * Las que siguen en pie. `tarjetas` YA VIENE FILTRADA DEL SERVER (la cookie la
 * lee `chat/page.tsx`); esto saca únicamente lo que descartaste en esta pantalla
 * y todavía no dio la vuelta por el server.
 */
export function quedan<T extends ConId>(tarjetas: T[], descartadas: string[]): T[] {
  return tarjetas.filter((t) => !descartadas.includes(t.id));
}

/**
 * Cuál se está mirando, clampeada a la lista.
 *
 * ⚠️ CLAMPEA AL LEER Y NO GUARDA CLAMPEADO, y esto es un arreglo viejo que
 * conviene no perder: al descartar la última, el índice queda apuntando afuera
 * de la lista por un render. Si de ahí saliera un `undefined`, el tinte se caería
 * al default y la franja parpadearía de color justo mientras la tarjeta se va.
 */
export function indiceVisible(cuantas: number, pedido: number): number {
  if (cuantas <= 0) return 0;
  return Math.min(Math.max(pedido, 0), cuantas - 1);
}

/**
 * DÓNDE QUEDA EL FOCO DESPUÉS DE DESCARTAR, contado explícitamente.
 *
 * ⚠️ ANTES ESTO NO EXISTÍA Y NO HACÍA FALTA: la pista era un `overflow-x` con
 * `snap`, el navegador reajustaba el scroll solo al acortarse la lista y
 * `mirarScroll` volvía a leer dónde había quedado. Acoplada a la barra la franja
 * es angosta y el scroll ya no es la fuente de la verdad, así que el índice lo
 * llevamos nosotros — y entonces la regla tiene que estar escrita.
 *
 * Sacar la del medio deja el foco en el MISMO índice, que ahora es la que
 * seguía: es lo que hace que "Ahora no" se sienta como pasar de página y no como
 * saltar. Sacar la última es el único caso que retrocede, porque no hay adónde
 * avanzar.
 */
export function indiceTrasDescartar(cuantasHabia: number, indice: number): number {
  const quedaron = cuantasHabia - 1;
  if (quedaron <= 0) return 0;
  return Math.min(indice, quedaron - 1);
}

/**
 * ⚠️ CON UNA SOLA TARJETA NO VAN LOS PUNTITOS. Un punto solo no dice "estás en la
 * primera de una": dice que hay un adorno abajo. Aparecen recién cuando hay
 * adónde ir. Es la regla del 07/08 y sobrevivió a la mudanza sin cambiar.
 */
export function hayQueMostrarPuntitos(cuantas: number): boolean {
  return cuantas > 1;
}

/**
 * ── ⚠️⚠️ CUÁNDO EL TEXTO ARRANCA EN LA LÍNEA DEL AVATAR (17/08) ──────────────
 *
 * Matías, mirando el Home: *"esto, que es cortito, entra ahí arriba y no tiene
 * ningún botón, entonces podría estar entre medio de la cruz y el bot. Así se
 * achica mucho el espacio"*.
 *
 * Y el hueco existe por escrito: la nota del 13/08 que puso los botones en la
 * línea del avatar dice que **entre el avatar y la ✕ había un hueco muerto de
 * casi todo el ancho**. Cuando la tarjeta no trae botones, ese hueco vuelve a
 * quedar vacío y el texto se va solo a un renglón nuevo abajo.
 *
 * ⚠️ NO ES UN CUARTO DIBUJO DEL BOT: con una línea queda igual que el estado
 * callado (*"Por hoy no tengo nada más"*) con la ✕ agregada.
 *
 * ── ⚠️⚠️ Y NO HAY TOPE DE LARGO, QUE FUE LA SEGUNDA VUELTA (17/08) ───────────
 *
 * La primera versión de esto solo se aplicaba a textos de hasta 38 caracteres,
 * para no repetir el error del 13/08 —*"el avatar le come 42px de ancho a cada
 * renglón, durante todos los renglones"*—. Matías lo miró y preguntó lo que
 * había que preguntar: *"¿se puede hacer una variable de que si un texto es un
 * solo renglón o cierto tamaño, pueda empezar arriba y terminar abajo?… que no
 * se generen estos espacios vacíos al cohete"*.
 *
 * 👉 **Se puede, y borra el problema en vez de esquivarlo: el texto ENVUELVE.**
 * Los primeros renglones corren entre el avatar y la ✕; después el texto usa el
 * ancho completo, porque más abajo ya no hay avatar. O sea que el costo se paga
 * **arriba y una sola vez**, no en todos los renglones — y esa era exactamente
 * la objeción del 13/08, así que queda contestada y no ignorada.
 *
 * Por eso desapareció el tope de largo que esto tuvo durante una hora:
 * **cualquier largo entra**. Medido en el navegador, contra las seis preguntas
 * abiertas reales (`docs/maquetas/2026-08-17-barra-compacta.html`):
 *
 * | renglones | franja antes | franja ahora |
 * |---|---|---|
 * | 1 | 80px | 48px |
 * | 2 | 99px | 57px |
 * | 3 | 119px | 77px |
 *
 * ⚠️ La otra salida que él ofreció —*"o ver de hacer las preguntas un poquito
 * más cortas"*— se descartó: son la voz del asistente. Reescribir lo que dice
 * para que entre en un layout es al revés de como se decide acá, y es la misma
 * razón por la que el 14/08 no se tocó `asistente.md`.
 *
 * ── ⚠️⚠️ Y LA FUNCIÓN SE BORRÓ AL DÍA SIGUIENTE (18/08) ─────────────────────
 *
 * `franjaCompacta` decidía entre dos formas según si la tarjeta tenía botones.
 * Los botones se fueron al renglón de abajo (`AccionesBot`), así que **no hay
 * más tarjetas con botones arriba: la forma compacta es la única.** Una función
 * que siempre devuelve `true` no es una regla, es ruido.
 *
 * 👉 Y CON ELLA SE FUE EL PROBLEMA DE INGENIERÍA DEL 17/08, sin arreglarlo: la
 * grilla movía la pista de celda al cambiar de forma, y había que cuidar que ese
 * cambio no re-montara la pista **con el dedo apoyado**. Sin dos formas no hay
 * cambio de celda, y el riesgo desapareció con el motivo. Es la segunda vez en
 * dos días que sacar una condición borra un bug en vez de arreglarlo.
 *
 * ⚠️ Lo que NO se fue es el envolver: los dos huecos flotados de cada tarjeta
 * siguen igual y siguen siendo la respuesta a la objeción del 13/08. Eso era la
 * idea; esto era solo el interruptor.
 */

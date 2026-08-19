/**
 * UNA IDEA CONTADA AL CHAT, GUARDADA DE UN TOQUE.
 *
 * Pedido §2.2 (27/07): una cajita para *"ideas, sueños y cosas que algún día
 * querés hacer"*, sin fecha ni seguimiento — *"ahí está la gracia"*.
 *
 * ── ⚠️⚠️ POR QUÉ ESTO **NO** ES UNA CAJITA, Y ESO ES TODO EL DISEÑO ─────────
 *
 * El 29/07 se construyó una cajita y Matías fue tajante al verla: *"sacá la
 * cajita, no tiene ningún sentido"*. Se removió entera. Era otra cajita —la de
 * novedades, no la de ideas— pero compartían la forma: **un lugar nuevo donde
 * las cosas se acumulan**. Y la conclusión que quedó escrita ese día fue
 * literalmente: *"la próxima solución tiene que atacar eso sin agregar un lugar
 * nuevo"*.
 *
 * Así que una idea **es una nota con la etiqueta "Idea"**. Nada más. Sin tabla
 * nueva, sin pantalla nueva, sin ícono nuevo en ningún lado. Notas ya está en la
 * barra desde ayer y las etiquetas existen desde hoy.
 *
 * ── ⚠️ Y ESO CONTESTA LA PREGUNTA QUE §2.2 DEJÓ ABIERTA ─────────────────────
 *
 * *"Cómo evitar que se vuelva un cementerio."* **Un cementerio es un lugar donde
 * solo van cosas muertas.** Una idea entre tus notas no es eso: la ves cuando
 * mirás Notas, que es algo que hacés por otros motivos. Si nunca la tocás, es
 * una nota más que no tocaste — no una lápida en una pantalla que solo existe
 * para contener lo que no hiciste.
 *
 * ── LA EVIDENCIA QUE LO DESTRABÓ ────────────────────────────────────────────
 *
 * Mirando la base el 04/08 apareció que **Matías tipeó *"Tengo una idea o un
 * plan que quiero seguir"* dos veces, en dos chats distintos**. Le estaba
 * hablando al chat porque no había dónde. Por eso la puerta de entrada va
 * exactamente ahí y no en un botón de otra pantalla.
 */

export const MARCA_IDEA = /\[\+idea:\s*([^\]\n]+)\]/i;

export type MarcaIdea = {
  /** Lo que va a ser el título de la nota. */
  texto: string;
};

/**
 * Saca la idea del mensaje del modelo, o `null`.
 *
 * ⚠️ SE RECORTA A 120 CARACTERES porque el título de una nota es su primer
 * renglón (así funciona Notas, y así lo pidió él). Una marca larguísima haría
 * una nota con un título de tres líneas, que en la lista se ve como un error.
 */
export function leerMarcaIdea(texto: string): MarcaIdea | null {
  const m = MARCA_IDEA.exec(texto);
  if (!m) return null;
  const limpio = m[1].trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!limpio) return null;
  return { texto: limpio };
}

/** El mensaje sin la marca, que es lo que se muestra en la burbuja. */
export function sinMarcaIdea(texto: string): string {
  return texto.replace(MARCA_IDEA, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * ⚠️ LA ETIQUETA ES UNA SOLA Y ESTÁ FIJA ACÁ.
 *
 * Si cada idea llegara con la etiqueta que se le ocurra al modelo, el filtro de
 * Notas se llenaría de "idea", "ideas", "Idea futura" y ninguna agruparía nada —
 * que es exactamente el bug de los 52 temas del 28/07, en su versión de
 * etiquetas. `alternarEtiqueta` normaliza al comparar, pero solo puede
 * normalizar lo que le llega igual.
 */
export const ETIQUETA_IDEA = 'Idea';

/**
 * La etiqueta de las relaciones mandadas a Notas (05/08).
 *
 * ⚠️ VIVE ACÁ, AL LADO DE `ETIQUETA_IDEA`, y no en el componente que la usa: son
 * las dos etiquetas que pone la app sola, y tenerlas juntas es lo que evita que
 * mañana alguien escriba "Relaciones" en plural en otro archivo y termine con
 * dos etiquetas que no agrupan nada — el bug de los 52 temas, otra vez.
 */
export const ETIQUETA_RELACION = 'Relación';

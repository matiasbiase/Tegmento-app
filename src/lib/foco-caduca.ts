/**
 * CUÁNDO CADUCA UN FOCO (06/08).
 *
 * ⚠️⚠️ LA REGLA LA ELIGIÓ MATÍAS Y DESCARTA LAS OTRAS DOS QUE ESTABAN SOBRE LA
 * MESA. Quedaban anotadas tres opciones —a los X meses, al rehacer la rueda y
 * ver que subió, o al cerrar los objetivos del área— y eligió la tercera:
 * *"cuando ve que cumpliste los objetivos relacionados"*.
 *
 * Y es la mejor de las tres por lo que mide cada una:
 *  · **A los X meses** mide el calendario, no a vos. Un foco de seis meses puede
 *    estar igual de vivo el día 180.
 *  · **Al rehacer la rueda** depende de que hagas la rueda, o sea que el aviso
 *    llega justo cuando ya estás mirando el tema — tarde y de más.
 *  · **Al cumplir los objetivos del área** es la única que mira lo que HICISTE.
 *    Y encima llega en el momento exacto en que el foco se quedó sin trabajo:
 *    un área en foco sin nada abierto no está enfocando nada, está ocupando un
 *    lugar de los tres.
 *
 * ⚠️ NO CAMBIA EL FOCO SOLO. Devuelve las áreas que quedaron sin trabajo para
 * que la pantalla PREGUNTE. Sacarle el foco a un área por su cuenta sería la app
 * decidiendo qué te importa — que es exactamente lo que el foco vino a evitar,
 * porque es la única de las dos preguntas de la rueda que no se deduce.
 */

export const CLAVE_FOCO_CUMPLIDO = 'foco_cumplido_visto';

/** Lo mínimo que hace falta saber de un objetivo para este cálculo. */
export type ObjetivoDelArea = {
  areaId: number | null;
  estado: string;
  /** Si es de rueda o de hábito: si ya llegó a lo que se propuso. */
  llego?: boolean;
};

/**
 * LAS ÁREAS EN FOCO QUE SE QUEDARON SIN TRABAJO.
 *
 * Un área caduca cuando **tenía objetivos y ya no le queda ninguno pendiente**.
 *
 * ⚠️ UN ÁREA EN FOCO SIN NINGÚN OBJETIVO NO CADUCA, y la diferencia es todo:
 * ese foco no está cumplido, está **sin empezar**. Preguntarle "ya tenés esto
 * resuelto, ¿querés cambiar?" a alguien que todavía no anotó nada sería leer la
 * pantalla vacía como un logro — el mismo error que decirle "frío" a un objetivo
 * que nunca arrancó.
 *
 * ⚠️ Y UN PAUSADO CUENTA COMO PENDIENTE. Pausar es "esto sigue vivo, lo frené":
 * si contara como terminado, pausar sería la forma silenciosa de que el área te
 * pregunte si querés soltarla.
 */
export function focosCumplidos<T extends { id: number; nombre: string; foco: boolean }>(
  areas: T[],
  objetivos: ObjetivoDelArea[],
): T[] {
  return areas.filter((a) => {
    if (!a.foco) return false;
    const suyos = objetivos.filter((o) => o.areaId === a.id);
    if (suyos.length === 0) return false;
    return suyos.every((o) => estaTerminado(o));
  });
}

/**
 * ⚠️ "TERMINADO" INCLUYE LO QUE LLEGÓ PERO NO SE CERRÓ A MANO, y tiene que
 * incluirlo: desde el 06/08 la app mide sola si un objetivo de rueda o de hábito
 * llegó, pero **no lo cierra** —esa decisión es tuya—. Si acá solo contaran los
 * cerrados, el foco no caducaría nunca por culpa de un objetivo que la propia
 * app ya da por cumplido y está esperando que vos confirmes.
 */
function estaTerminado(o: ObjetivoDelArea): boolean {
  if (o.estado === 'logrado' || o.estado === 'abandonado') return true;
  return o.llego === true;
}

/**
 * El texto de la pregunta. Vive acá y no en el JSX porque cambia según cuántas
 * áreas caducaron, y una plantilla con un plural mal armado es de las cosas que
 * se ven en producción y no en un test que no existe.
 */
export function textoFocoCumplido(nombres: string[], conLogro = true): string {
  if (nombres.length === 0) return '';
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  const plural = nombres.length > 1;

  // ⚠️⚠️ NO FELICITAR POR ALGO QUE ABANDONASTE (06/08). El primer texto decía
  // "cumpliste todo lo que te propusiste" para las dos salidas, y la primera vez
  // que se vio de verdad fue con un objetivo que Matías había cerrado con "esto
  // ya no va". **La app lo felicitaba por haberlo soltado.**
  // El área caduca igual —no le queda trabajo abierto, que es la regla— pero
  // decirlo como un logro es la clase de mentira amable que hace desconfiar del
  // resto de la pantalla.
  if (!conLogro) {
    return plural
      ? `Ya no te queda nada abierto en ${lista}, y siguen siendo focos tuyos.`
      : `Ya no te queda nada abierto en ${lista}, y sigue siendo uno de tus focos.`;
  }
  return plural
    ? `Cumpliste lo que te propusiste en ${lista}, y siguen siendo focos tuyos.`
    : `Cumpliste lo que te propusiste en ${lista}, y sigue siendo uno de tus focos.`;
}

/**
 * ¿HUBO ALGO LOGRADO DE VERDAD en estas áreas, o solamente cosas soltadas?
 *
 * Decide cuál de las dos frases va. Alcanza con UNO logrado: si cerraste dos y
 * uno lo lograste, "cumpliste lo que te propusiste" es cierto.
 */
export function huboLogro(areaIds: number[], objetivos: ObjetivoDelArea[]): boolean {
  return objetivos.some(
    (o) => o.areaId != null && areaIds.includes(o.areaId) && (o.estado === 'logrado' || o.llego === true),
  );
}

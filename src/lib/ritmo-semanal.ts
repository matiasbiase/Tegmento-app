/**
 * QUÉ DÍAS DE LA SEMANA SOLÉS HACER CADA COSA.
 *
 * Existe para que `#plan` pueda **proponer en vez de preguntar**: *"los martes y
 * jueves los venís teniendo libres"* en lugar de *"¿qué días podés?"*. Es la
 * misma decisión que `objetivos-arranque` — preguntar sin proponer le deja todo
 * el trabajo al usuario.
 *
 * ⚠️ EL ASISTENTE NO TENÍA ESTE DATO. `lib/contexto.ts` le pasa las actividades
 * (qué tiene abierto) pero no las `marcas` (cuándo las hace), así que el modelo
 * sabía que existía "Bouldern" y no que lo hace los viernes. Sin esto, `#plan`
 * tendría que preguntar cosas que la app ya sabe, que es justo lo que la regla
 * de la casa prohíbe: *no hacerte tipear un dato que la app ya tiene*.
 *
 * ── ⚠️⚠️ DOS VECES ES EL PISO, Y NO ES UN NÚMERO ELEGIDO A OJO ──────────────
 *
 * Es el mismo umbral que usa `tocaHoy` en `lib/marcas.ts`, y por el mismo
 * motivo escrito ahí: **con una sola vez, cualquier actividad "tocaría" todos
 * los días**. Un solo martes no es un hábito de los martes, es un martes.
 *
 * ⚠️ Y CON LOS DATOS DE HOY ESTO VA A DEVOLVER VACÍO CASI SIEMPRE — medido el
 * 11/08: de nueve actividades activas, solo Bouldern tiene más de tres marcas.
 * **Eso está bien y es lo que corresponde**: sin patrón, el contexto dice que no
 * hay patrón y el bot pregunta. Inventar un día a partir de una marca sería un
 * número con cara de dato, que es lo que la app tiene prohibido.
 */

const NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Cuántas veces tiene que caer en el mismo día para que sea un patrón. */
export const MINIMO_PARA_PATRON = 2;

/**
 * Los días de la semana en los que esta actividad cae al menos `minimo` veces,
 * en orden de la semana (lunes primero) y no por frecuencia.
 *
 * ⚠️ ORDENADOS COMO LA SEMANA, a propósito: "martes y jueves" se lee como un
 * ritmo; "jueves y martes" —que sería el orden por frecuencia— se lee como una
 * lista desordenada y el modelo lo repite tal cual.
 */
export function diasQueSoles(fechas: string[], minimo: number = MINIMO_PARA_PATRON): string[] {
  const cuenta = new Array<number>(7).fill(0);
  for (const f of fechas) {
    // Mediodía para que ningún huso horario corra el día.
    const d = new Date(`${f}T12:00:00`);
    if (!Number.isNaN(d.getTime())) cuenta[d.getDay()] += 1;
  }
  // Lunes a domingo, que es como se lee una semana acá.
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return orden.filter((i) => cuenta[i] >= minimo).map((i) => NOMBRES[i]);
}

/**
 * La línea que va al contexto del asistente, o `null` si no hay patrón.
 *
 * ⚠️ DEVUELVE `null` Y NO UNA FRASE VACÍA: el que arma el contexto tiene que
 * poder decidir si escribe "(sin patrón todavía)" o directamente no escribe
 * nada. Una función que devuelve `""` obliga a chequear el string, y ese chequeo
 * se olvida.
 */
export function fraseDeRitmo(titulo: string, fechas: string[]): string | null {
  const dias = diasQueSoles(fechas);
  if (dias.length === 0) return null;
  const cuales = dias.length === 1 ? dias[0] : `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;
  return `${titulo}: suele caer ${dias.length === 1 ? 'los' : 'los'} ${cuales}`;
}

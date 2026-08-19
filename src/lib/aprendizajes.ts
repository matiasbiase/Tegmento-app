// Qué termina sabiendo la IA sobre Matías.
//
// Cada vez que corre el Analista, esto arma la entrada de `conocimiento`
// titulada "Lo que Tegmento aprendió" — que el asistente lee **en cada charla**,
// junto al perfil del onboarding. O sea: de todo lo que produce el Analista,
// esto es lo único que le habla al bot todos los días.
//
// ⚠️⚠️ VIVE ACÁ Y NO EN `analista.ts` POR UNA RAZÓN CONCRETA: allá estaba
// enterrado en tres líneas adentro de una función de 30 que además escribe en
// cuatro tablas, así que **no había forma de probar la regla sin una base de
// datos**. Y la regla es justamente lo discutible. Sacarla no cambia nada del
// comportamiento; hace que se pueda mirar.
//
// ⚠️ EL SESGO QUE TIENE HOY, DICHO ANTES DE QUE ALGUIEN LO LEA COMO CORRECTO:
// `patronesParaElCerebro` decide con **la confianza que el modelo se pone a sí
// mismo**, y solo mira el análisis que acaba de correr. No mira los veredictos
// de Matías, que viven en `sugerencias` con tipo `observacion`. Las
// consecuencias están escritas como tests en `tests/aprendizajes.test.ts`, para
// que se vean en vez de discutirse. El arreglo espera su sí.

/** Una observación tal como la devuelve el modelo. */
export type ObservacionCruda = {
  patron: string;
  evidencia: string;
  /** La confianza que se pone el MODELO. No es el veredicto de Matías. */
  confianza: string;
  experimento?: string;
};

/**
 * Lo que Matías contestó sobre una observación que le mostramos.
 * `anotada` = "me pasa" · `descartada` = "no me pasa" · `en_duda` = "no sé".
 */
export type Veredicto = {
  contenido: string;
  estado: string;
};

/** El título es fijo a propósito: la entrada se reemplaza y no se duplica. */
export const TITULO_APRENDIZAJES = 'Lo que Tegmento aprendió';

/** Cuántos patrones entran. Más que esto y el contexto del chat se llena de esto. */
export const MAX_PATRONES = 4;

/**
 * ── ⚠️⚠️ ACÁ VIVÍA `patronesParaElCerebro`, Y SE BORRÓ CON SU BUG (13/08) ─────
 *
 * Elegía qué patrones le llegaban al bot **filtrando por la confianza que el
 * modelo se ponía a sí mismo**, y mirando solo la corrida del día. Era el bug más
 * viejo del cerebro: algo que Matías marcó "no me pasa" podía estar
 * aconsejándolo, y algo que confirmó hace tres semanas no llegaba.
 *
 * El 13/08 a la mañana se sacó de `analista.ts` y se le pusieron 11 tests, tres
 * de ellos **fijando el sesgo a propósito**, con esta nota: *"el día que se
 * arregle, esos tres tienen que fallar"*.
 *
 * 👉 **No fallaron: se borraron con la función.** El arreglo no fue cambiarle el
 * criterio, fue que ese camino dejara de existir. Ahora los patrones viven en la
 * tabla `hechos` —cada uno con su estado y su origen— y `contexto.ts` los manda
 * al chat en dos listas rotuladas: lo que él confirmó y lo que la app dedujo.
 * Las reglas están en `lib/cerebro-hechos`, con sus propios tests.
 *
 * ⚠️ Se fue también `contradicenUnVeredicto`, que existía para MEDIR el problema
 * antes de decidir el arreglo. Ya se midió: 34 veredictos sin influir. Cumplió.
 */

/**
 * El texto que queda guardado y que el asistente lee en cada charla.
 *
 * ── ⚠️⚠️ YA NO LISTA LOS PATRONES (13/08) ────────────────────────────────────
 *
 * Hasta hoy pegaba acá los cuatro patrones que pasaban el filtro de confianza
 * del modelo. **Eso era el bug más viejo del cerebro**: los patrones llegaban al
 * chat como una lista plana donde todo pesaba igual, elegidos por la seguridad
 * que el modelo se ponía a sí mismo, y los 34 veredictos de Matías no influían.
 *
 * Ahora los patrones viven en la tabla `hechos`, cada uno con su estado, y
 * `contexto.ts` los manda al chat en **dos listas rotuladas**: lo que él
 * confirmó y lo que la app dedujo. Dejarlos también acá sería mandarlos dos
 * veces, y la copia de acá es justo la que no tiene estado — o sea que
 * reintroduciría el bug al lado del arreglo.
 *
 * ⚠️ EL HILO CENTRAL SE QUEDA, y es la razón por la que esta función no se
 * borra: es lo único que produce el Analista que **no es un patrón** —la lectura
 * de conjunto del período— y no tiene lugar en `hechos`, que guarda hechos
 * sueltos. Sin esto se perdería.
 */
export function textoAprendido(hiloCentral: string, _patrones: string[] = []): string {
  return `Lo que Tegmento fue notando en sus datos. Hilo central del período: ${hiloCentral}`;
}

/**
 * Cuántas de las observaciones que se van a guardar **contradicen un veredicto
 * suyo**. No cambia nada todavía: existe para poder medir el problema con datos
 * reales antes de decidir el arreglo.
 *
 * Compara por contenido exacto, que es como se guardaron los veredictos.
 */
export function contradicenUnVeredicto(
  patrones: string[],
  veredictos: Veredicto[],
): string[] {
  const rechazados = new Set(
    veredictos.filter((v) => v.estado === 'descartada').map((v) => v.contenido),
  );
  return patrones.filter((p) => rechazados.has(p));
}

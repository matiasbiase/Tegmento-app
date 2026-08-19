/**
 * CUÁNTO DURA UNA CONVERSACIÓN VIVA.
 *
 * Un solo número para dos cosas que estaban peleadas entre sí (29/07):
 *  - el archivador cerraba los chats a los **30 minutos** de inactividad;
 *  - el Home los reabre y sigue escribiendo en ellos hasta las **6 horas**.
 * O sea que la app pasaba cinco horas y media archivando algo que ella misma
 * iba a reabrir: le sacaba el resumen, le reescribía el título con la charla "ya
 * terminada", y al rato la conversación seguía. Cada media hora, además, se
 * gastaban dos llamadas al modelo (cronista y clasificador) sobre algo sin
 * cerrar.
 *
 * Media hora tampoco era realista para un diario personal: es lo que dura una
 * ducha, una comida o una reunión. Volver y encontrar la charla cerrada es la
 * app diciéndote que te fuiste, cuando solo dejaste el teléfono.
 *
 * ⚠️ SI ESTE NÚMERO CAMBIA, CAMBIAN LOS DOS COMPORTAMIENTOS, y así tiene que
 * ser: el momento en que un chat deja de estar vivo es uno solo.
 */
export const HORAS_CHAT_VIVO = 6;

export const MINUTOS_CHAT_VIVO = HORAS_CHAT_VIVO * 60;

/**
 * CUÁNTO DURA **LA MISMA CHARLA** — que no es lo mismo que un chat vivo (07/08).
 *
 * ⚠️⚠️ ACÁ SE SEPARA A PROPÓSITO UN NÚMERO QUE ARRIBA DICE QUE NO HAY QUE
 * SEPARAR, así que va el motivo completo.
 *
 * Matías: *"no me gusta que siempre abra el último chat que usaste… ahora me
 * parecen cosas muy mezcladas; prefiero que abra un chat siempre nuevo"*.
 *
 * El de arriba contesta *"¿puedo archivar y resumir esto?"* y necesita ser
 * LARGO: archivar algo que va a seguir es el bug que se arregló el 29/07.
 * Este contesta otra pregunta, *"¿este mensaje es parte de lo anterior?"*, y
 * necesita ser CORTO: a las seis horas ya no estás en la misma conversación,
 * estás en otro momento del día. **Con un solo número, seguir hablando a la
 * tarde metía el tema de la mañana en la misma charla** — que es exactamente lo
 * que él ve como "mezclado", y lo que después ensucia el título, el resumen y
 * el tema que se le asigna al chat.
 *
 * Bajar el de arriba habría vuelto a archivar de más; por eso son dos.
 *
 * 45 minutos es lo que dura estar en algo: te interrumpen, volvés, seguís. Más
 * que eso ya es otra sentada.
 */
export const MINUTOS_MISMA_CHARLA = 45;

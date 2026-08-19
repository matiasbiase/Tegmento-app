import { DIAS_HABITO } from '@/lib/objetivos-onboarding';

/**
 * `[+plan: qué | fecha | actividades]` — que la IA pueda dejarte un objetivo
 * armado desde el chat.
 *
 * Es la décima marca; las otras nueve ya funcionan igual (`foco-marca`,
 * `gastos-marca`, `comida-marca`, `idea-marca`…). **No se inventa un mecanismo:
 * se suma uno a los que ya andan.**
 *
 * ── ⚠️⚠️ QUÉ HACE ESTA MARCA, Y QUÉ NO ─────────────────────────────────────
 *
 * Deja **un objetivo con su fecha y sus seguimientos**, y nada más. Después el
 * plan no existe: no hay una tabla `planes` que se llene, no hay progreso del
 * plan, no hay "vas 3 de 7".
 *
 * Es la tesis de Matías, del 10/08, y es lo que separa esto de cualquier app de
 * objetivos:
 *
 * > *"La estrategia es sacarte de la cabeza estar frenando cada dos por tres.
 * > Este es el plan, lo sigo y lo analizo cuando sea necesario. Eso saca
 * > ansiedad y elimina la pregunta constante."*
 *
 * **Medirte contra el plan reinstalaría exactamente la pregunta que el plan vino
 * a sacar.** Es la misma regla que ya estaba escrita en `plan-alimentacion.ts`:
 * *"El plan es una guía, no un examen"*.
 *
 * ── EL FORMATO ──────────────────────────────────────────────────────────────
 *
 * ```
 * [+plan: volver a entrenar]                                     → 60 días, suelto
 * [+plan: volver a entrenar | 2026-10-15]                        → con fecha
 * [+plan: volver a entrenar | 2026-10-15 | Bouldern, Correr]     → con qué lo mueve
 * [+plan: volver a entrenar | | Bouldern]                        → sin fecha, con seguimientos
 * [+plan: entrenar | | Bouldern | area: Salud física]            → colgado de un área
 * ```
 *
 * ⚠️ **EL ÁREA VA CON PREFIJO `area:` Y LAS DEMÁS NO** (11/08). La fecha se
 * reconoce por su forma y las actividades son "lo que queda", pero **un nombre de
 * área y un nombre de actividad son los dos texto libre**: "Salud física" podría
 * ser cualquiera de los dos. Sin una marca explícita no hay forma de saberlo, y
 * adivinar mal cuelga el objetivo del área equivocada o inventa una actividad
 * llamada "Finanzas".
 *
 * ⚠️ **EL ORDEN DE LAS PARTES ES FIJO Y LA FECHA SE RECONOCE POR SU FORMA**, no
 * por su posición. `foco-marca` lee los minutos solo después del `|` porque
 * buscar "el primer número" convertiría *"terminar el capítulo 3"* en tres
 * minutos. Acá pasa algo parecido pero al revés: una fecha `YYYY-MM-DD` **no se
 * puede confundir con un nombre de actividad**, así que reconocerla por forma es
 * seguro y encima aguanta que el modelo mande las dos partes al revés — que es
 * el error más probable con tres campos.
 */

export const MARCA_PLAN = /\[\+plan:\s*([^\]\n]+)\]/i;

/** Cuántos días dura un objetivo al que nadie le puso fecha.
 *  Sale de `DIAS_HABITO`, que es el número que Matías eligió, para que no haya
 *  dos "60" distintos que se puedan despegar. */
export const PLAN_DIAS_DEFECTO = DIAS_HABITO;

/** Un objetivo no se propone para dentro de diez años: fuera de esto el modelo
 *  se equivocó de año y vale más caer al default que crear algo absurdo. */
const DIAS_MAX = 365 * 3;

/** Cuántos seguimientos entran. Más de cuatro no es un objetivo, es una lista. */
const MAX_ACTIVIDADES = 4;

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** El segmento del área viene marcado, porque no se puede reconocer por forma. */
const ES_AREA = /^[aá]rea\s*:\s*(.+)$/i;

export type MarcaPlan = {
  /** Qué se propone. Va como título del objetivo. */
  que: string;
  /** `YYYY-MM-DD`. Siempre hay una: sin fecha, el objetivo no se puede medir. */
  fecha: string;
  /** Los títulos de lo que lo va a mover. Puede venir vacío. */
  actividades: string[];
  /**
   * El NOMBRE del área de la rueda, o `null` si el plan no cuelga de ninguna.
   *
   * ⚠️ `null` ES UNA RESPUESTA VÁLIDA Y NO UN "todavía no": Matías pidió que
   * `#plan` pregunte el área **con la opción de que no represente ninguna**. Hay
   * cosas que uno se propone y no entran en la rueda, y forzarlas a un área
   * ensuciaría el único instrumento que la app usa para medir cómo viene cada
   * parte de su vida.
   */
  area: string | null;
};

/** Suma días a una fecha, en local. */
function sumar(hoy: Date, dias: number): string {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Lo que hay que crear, o `null` si el mensaje no trae la marca.
 *
 * ⚠️ Devuelve `null` también con la marca vacía (`[+plan: ]`): sin un "qué", el
 * objetivo quedaría sin título y la tarjeta no tendría qué decir. Es la misma
 * decisión que en `foco-marca`.
 */
export function extraerMarcaPlan(texto: string, hoy: Date = new Date()): MarcaPlan | null {
  const m = texto.match(MARCA_PLAN);
  if (!m) return null;

  const partes = m[1].split('|').map((p) => p.trim());
  const que = partes[0]?.replace(/\s+/g, ' ').slice(0, 90);
  if (!que) return null;

  const resto = partes.slice(1);

  // ⚠️ LA FECHA SE BUSCA POR FORMA, en cualquiera de las partes que sobran. Ver
  // la nota de arriba: aguanta que el modelo mande fecha y actividades al revés.
  const cruda = resto.find((p) => ES_FECHA.test(p));
  let fecha = sumar(hoy, PLAN_DIAS_DEFECTO);
  if (cruda) {
    const d = new Date(`${cruda}T12:00:00`);
    const hoyYmd = sumar(hoy, 0);
    const topeYmd = sumar(hoy, DIAS_MAX);
    // ⚠️ UNA FECHA PASADA CAE AL DEFAULT, NO SE ACEPTA. Un objetivo que vence
    // ayer nace vencido: la tarjeta lo mostraría en rojo el primer día y sería
    // la app retándote por algo que acabás de crear.
    if (!Number.isNaN(d.getTime()) && cruda >= hoyYmd && cruda <= topeYmd) fecha = cruda;
  }

  // El área, marcada con su prefijo. Se saca del resto antes de repartir lo que
  // queda entre las actividades.
  const segArea = resto.find((p) => ES_AREA.test(p));
  const area = segArea ? (ES_AREA.exec(segArea)?.[1]?.trim().slice(0, 60) || null) : null;

  const actividades = resto
    .filter((p) => p !== cruda && p !== segArea)
    .flatMap((p) => p.split(','))
    .map((a) => a.trim().replace(/\s+/g, ' ').slice(0, 60))
    .filter(Boolean)
    // Sin repetidos: el modelo a veces nombra la misma actividad dos veces.
    .filter((a, i, todas) => todas.findIndex((o) => o.toLowerCase() === a.toLowerCase()) === i)
    .slice(0, MAX_ACTIVIDADES);

  return { que, fecha, actividades, area };
}

/** El mensaje sin la marca, para mostrarlo y para leerlo en voz alta. */
export function limpiarMarcaPlan(texto: string): string {
  return texto.replace(MARCA_PLAN, '').trim();
}

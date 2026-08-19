/**
 * EL RITUAL DE ENTRADA Y SALIDA DEL DÍA.
 *
 * Pedido de Matías el 26/07 — *"al final es lo más importante"*—, con el pedido
 * explícito de que se lo recuerde en cada planificación hasta que se haga.
 * **Nueve días.** La fase 1 (que la Casa cambie según la hora) se hizo ese mismo
 * día; esto es la parte que faltaba.
 *
 * ── ⚠️ POR QUÉ ESTO ES LO QUE FALTABA, Y NO UNA PANTALLA MÁS ────────────────
 *
 * El problema está medido: **27 de 33 chats tenían un solo mensaje y había 3
 * días marcados en total.** La fase 1 acomoda lo que ves cuando entrás, pero
 * sigue dependiendo de que entres. Una app que espera a que te acuerdes no es un
 * ritual: es una herramienta que se te olvida.
 *
 * ── ⚠️ SON NOTIFICACIONES LOCALES, Y ESO ES TODO EL DESBLOQUEO ──────────────
 *
 * El 27/07 quedó anotado que había que verificar esto antes que nada: **una
 * notificación local no necesita servidor, ni certificados, ni cuenta de Apple
 * Developer paga, ni que la Mac esté prendida.** Se la programás a iOS y iOS la
 * dispara. Lo que estaba bloqueado eran las push REMOTAS, que son otra cosa.
 *
 * ⚠️ PERO HAY UN LÍMITE QUE HAY QUE DECIR, NO ESCONDER: el aviso llega con la
 * Mac apagada, y al tocarlo la app **no va a poder abrir**, porque la app vive
 * en la Mac. El recordatorio funciona siempre; poder contestarlo depende de que
 * la Mac esté. No es un bug de esto — es la arquitectura de Tegmento — pero el
 * usuario lo va a vivir como una promesa incumplida si nadie se lo dice.
 *
 * ── ⚠️ LO QUE EL TEXTO NO PUEDE HACER ───────────────────────────────────────
 *
 * Una notificación se programa **por adelantado**, así que cuando se escribe no
 * se sabe qué vas a haber cargado. Por eso **el texto no afirma nada sobre tu
 * día**: decir *"te falta el ánimo"* a las 22:00 y que resulte que lo cargaste a
 * las 19 es la app mintiendo en la pantalla de bloqueo, que es el peor lugar
 * posible para que mienta. Se invita, no se reprocha ni se informa.
 *
 * Lo que sí se puede: **volver a programarlas cada vez que abrís la app**, y ahí
 * sí saltear la de mañana si ya cargaste el sueño de hoy. Eso lo decide
 * `debeAvisar`.
 */

export type Momento = 'manana' | 'noche';

export type HoraDelRitual = { hora: number; minuto: number };

/**
 * ⚠️ LOS DEFAULTS NO SON UN GUSTO: 8:30 y 22:00.
 *
 * La de la mañana va **después** de despertarse, no al despertarse: preguntarte
 * cuánto dormiste mientras estás abriendo los ojos es pedirte algo en el peor
 * momento del día para pedir. La de la noche va a las 22, que es antes de la
 * cama y no en la cama — un aviso a las 23:30 compite con dormir, y el ritual
 * pierde siempre esa pelea.
 *
 * Se pueden cambiar los dos: el default es un punto de partida, no una regla.
 */
export const HORA_MANANA: HoraDelRitual = { hora: 8, minuto: 30 };
export const HORA_NOCHE: HoraDelRitual = { hora: 22, minuto: 0 };

/**
 * ⚠️ IDs FIJOS, UNO POR MOMENTO. iOS reemplaza una notificación cuando la
 * reprogramás con el mismo id. Con ids al azar, cada apertura de la app dejaría
 * una notificación más encolada y en una semana tendrías catorce avisos por día
 * — el mismo error que convierte un recordatorio en spam.
 */
export const ID_MANANA = 8301;
export const ID_NOCHE = 8302;

export function idDe(momento: Momento): number {
  return momento === 'manana' ? ID_MANANA : ID_NOCHE;
}

export type Aviso = { id: number; titulo: string; cuerpo: string; hora: HoraDelRitual };

/**
 * EL TEXTO DE CADA AVISO.
 *
 * ⚠️ NO AFIRMA NADA SOBRE TU DÍA, y no es timidez: ver el docstring de arriba.
 * Tampoco cuenta rachas ni dice "no entrás hace 3 días". Un recordatorio que
 * lleva la cuenta de tus fallas es un recordatorio que se apaga a la semana.
 *
 * ⚠️ Y ES UNA PREGUNTA, NO UNA ORDEN. *"¿Cómo dormiste?"* se puede contestar;
 * *"Cargá tu sueño"* es una tarea que alguien te pone. La app pide una cosa
 * chica y concreta, que es lo que un ritual necesita para sostenerse.
 */
export function avisoDe(momento: Momento, hora: HoraDelRitual): Aviso {
  if (momento === 'manana') {
    return {
      id: ID_MANANA,
      titulo: '¿Cómo dormiste?',
      cuerpo: 'Marcá la noche y arrancá el día sabiendo con qué contás.',
      hora,
    };
  }
  return {
    id: ID_NOCHE,
    titulo: 'Cerrá el día',
    cuerpo: 'Dos minutos: cómo estuvo, y listo.',
    hora,
  };
}

export type EstadoRitual = {
  /** Si él lo prendió. Apagado es el estado inicial: no se avisa sin permiso. */
  activo: boolean;
  manana: HoraDelRitual;
  noche: HoraDelRitual;
};

export const RITUAL_APAGADO: EstadoRitual = {
  activo: false,
  manana: HORA_MANANA,
  noche: HORA_NOCHE,
};

/** Hora válida y dentro del día. Una hora rota apaga el aviso, no lo corre. */
export function horaValida(h: unknown): h is HoraDelRitual {
  if (!h || typeof h !== 'object') return false;
  const { hora, minuto } = h as HoraDelRitual;
  return Number.isInteger(hora) && hora >= 0 && hora <= 23 && Number.isInteger(minuto) && minuto >= 0 && minuto <= 59;
}

/** Lee lo guardado. Ante cualquier cosa rara, apagado — nunca avisar de más. */
export function leerRitual(json: string | null | undefined): EstadoRitual {
  if (!json) return RITUAL_APAGADO;
  try {
    const j = JSON.parse(json);
    return {
      activo: j?.activo === true,
      manana: horaValida(j?.manana) ? j.manana : HORA_MANANA,
      noche: horaValida(j?.noche) ? j.noche : HORA_NOCHE,
    };
  } catch {
    return RITUAL_APAGADO;
  }
}

export type LoCargado = {
  /** Si ya marcó el sueño de hoy. */
  sueno: boolean;
  /** Si ya cerró el día (ánimo). */
  animo: boolean;
};

/**
 * ¿VALE LA PENA ESTE AVISO?
 *
 * ⚠️ ES LA MITAD DE LA FUNCIÓN, Y LA QUE DECIDE SI ESTO SIRVE O MOLESTA. Un
 * recordatorio que te llega para algo que ya hiciste enseña a ignorar los
 * recordatorios — y una vez que aprendiste a ignorarlos, no hay texto que los
 * recupere.
 *
 * Se evalúa al reprogramar (cada vez que abrís la app), no al dispararse: iOS
 * dispara sola, sin preguntarle nada a nadie.
 *
 * ⚠️ LA DE LA MAÑANA SE SALTEA SI YA MARCASTE EL SUEÑO **DE HOY**, y eso tiene
 * una consecuencia buena: si marcás el sueño a las 7 y la app se reprograma en
 * ese momento, la de mañana a las 8:30 no aparece. Al día siguiente vuelve —
 * porque "hoy" ya es otro día y `sueno` vuelve a ser false.
 */
export function debeAvisar(momento: Momento, cargado: LoCargado): boolean {
  return momento === 'manana' ? !cargado.sueno : !cargado.animo;
}

/**
 * Los avisos a programar hoy. Vacío si está apagado.
 *
 * ⚠️ DEVUELVE LOS QUE VAN, Y QUIEN LLAME TIENE QUE CANCELAR LOS QUE NO. Si esta
 * función solo devolviera lo que hay que poner, el aviso salteado seguiría
 * encolado de la programación anterior y se dispararía igual — el bug clásico de
 * los recordatorios, y el que hace que la gente los apague para siempre.
 */
export function avisosDelRitual(estado: EstadoRitual, cargado: LoCargado): Aviso[] {
  if (!estado.activo) return [];
  const salida: Aviso[] = [];
  if (debeAvisar('manana', cargado)) salida.push(avisoDe('manana', estado.manana));
  if (debeAvisar('noche', cargado)) salida.push(avisoDe('noche', estado.noche));
  return salida;
}

/** Los ids que hay que cancelar: los dos menos los que se van a programar. */
export function idsACancelar(avisos: Aviso[]): number[] {
  const van = new Set(avisos.map((a) => a.id));
  return [ID_MANANA, ID_NOCHE].filter((id) => !van.has(id));
}

/** "22:00", para mostrar en pantalla. */
export function comoTexto(h: HoraDelRitual): string {
  return `${String(h.hora).padStart(2, '0')}:${String(h.minuto).padStart(2, '0')}`;
}

/** "22:00" → la hora, o `null` si no es una hora. */
export function desdeTexto(t: string): HoraDelRitual | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = { hora: Number(m[1]), minuto: Number(m[2]) };
  return horaValida(h) ? h : null;
}

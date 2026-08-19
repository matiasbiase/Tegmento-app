/**
 * LO QUE LA APP NOTA DE UNA ACTIVIDAD, para decírtelo justo cuando la marcás.
 *
 * Pedido de Matías (29/07): *"que cada tanto tenga algunas preguntas: che, esta
 * tarea te está costando, ¿por qué? O: fijate que la marcás siempre en tal
 * horario, probá hacerla antes cuando tenés más energía"*.
 *
 * ⚠️ SE DICE AL MARCAR, no en una pantalla aparte. Es el único momento en que
 * esa actividad tiene tu atención, y una observación sobre algo que estás
 * mirando vale diez veces más que la misma guardada en un panel al que hay que ir.
 *
 * ⚠️ Y NO SIEMPRE. Cada nota tiene una condición que se cumple poco (una franja
 * horaria clara, un hueco largo, un mes flojo). Si aparecieran todas las veces,
 * en tres días serían un cartel que ya no leés.
 */

export type MarcaHora = { fecha: string; creado: string };

export type NotaSeguimiento = { texto: string; clase: 'horario' | 'cuesta' | 'vuelta' };

/** Las tres franjas del día, tal como las nombra cualquiera. */
export function franjaDe(iso: string): 'mañana' | 'tarde' | 'noche' | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'mañana';
  if (h >= 12 && h < 19) return 'tarde';
  return 'noche';
}

/** Días entre dos fechas YYYY-MM-DD. */
function diasEntre(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);
}

/**
 * La franja donde se concentran las marcas, si es que hay una.
 *
 * Pide al menos 5 marcas y que 70% caigan en la misma: con tres marcas, dos de
 * noche no son una costumbre, son dos marcas.
 */
export function franjaDominante(marcas: MarcaHora[]): 'mañana' | 'tarde' | 'noche' | null {
  if (marcas.length < 5) return null;
  const cuenta = new Map<string, number>();
  for (const m of marcas) {
    const f = franjaDe(m.creado);
    if (f) cuenta.set(f, (cuenta.get(f) ?? 0) + 1);
  }
  for (const [franja, n] of cuenta) {
    if (n / marcas.length >= 0.7) return franja as 'mañana' | 'tarde' | 'noche';
  }
  return null;
}

/**
 * Qué decirle sobre esta actividad, o null si no hay nada que valga la pena.
 *
 * `hoy` es el día que acaba de marcar. El orden importa: primero lo que celebra
 * (volver), después lo que observa, y solo al final lo que señala un problema.
 * Si alguien acaba de marcar algo después de dos semanas, lo último que
 * necesita es que le digan que viene flojo.
 */
export function notaDeActividad(marcas: MarcaHora[], hoy: string): NotaSeguimiento | null {
  if (marcas.length === 0) return null;
  const fechas = [...new Set(marcas.map((m) => m.fecha))].sort();
  const anteriores = fechas.filter((f) => f < hoy);

  // 1. Volvió después de un hueco largo. Sin reproche: el hueco no se nombra
  //    como falta, se nombra como que volvió.
  const ultima = anteriores[anteriores.length - 1];
  if (ultima) {
    const hueco = diasEntre(ultima, hoy);
    if (hueco >= 7) {
      return { texto: `Volviste después de ${hueco} días. ¿Qué te hizo retomarla?`, clase: 'vuelta' };
    }
  }

  // 2. La franja horaria. Es lo que Matías pidió, y va con una salvedad honesta:
  //    `creado` es cuándo la MARCÁS, que no siempre es cuándo la hacés. Por eso
  //    la frase dice "la marcás" y la propuesta va como pregunta, no como consejo.
  const franja = franjaDominante(marcas);
  if (franja === 'noche') {
    return {
      texto: 'La marcás casi siempre de noche. ¿Y si probás a la mañana, cuando tenés más nafta?',
      clase: 'horario',
    };
  }
  if (franja) {
    return { texto: `La marcás casi siempre por la ${franja}. ¿Te funciona ese horario?`, clase: 'horario' };
  }

  // 3. Viene costando: pocas marcas en las últimas dos semanas. Va última porque
  //    es la única que puede sonar a reproche, y solo si hay historia suficiente
  //    para afirmarlo (si arrancó hace cuatro días, no viene costando: arrancó).
  const hace14 = new Date(`${hoy}T12:00:00`);
  hace14.setDate(hace14.getDate() - 14);
  const desde = hace14.toISOString().slice(0, 10);
  const ultimas2Semanas = fechas.filter((f) => f >= desde);
  const arrancoHace = diasEntre(fechas[0], hoy);
  if (arrancoHace >= 21 && ultimas2Semanas.length <= 3) {
    return { texto: 'Esta viene costando últimamente. ¿Qué es lo que se te pone en el medio?', clase: 'cuesta' };
  }

  return null;
}

/**
 * ¿Ya le dijimos esto hace poco?
 *
 * Sin esto, la nota de horario aparecía **en cada marcado, para siempre**: una
 * vez que tenés cinco marcas de noche la condición se cumple siempre. Y con dos
 * actividades nocturnas, las dos decían la misma frase el mismo día. En tres
 * días deja de leerse, que es exactamente lo contrario de lo que pidió Matías
 * ("que cada tanto tenga algunas preguntas").
 *
 * Se guarda en localStorage y no en la base a propósito: es memoria de lo que la
 * app ya comentó, no un dato de su vida. Si se pierde, lo peor que pasa es que
 * un comentario se repita una vez.
 */
const DIAS_ENTRE_NOTAS = 14;

export function notaYaDicha(lineaId: number, clase: string, hoy: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const antes = localStorage.getItem(`nota:${lineaId}:${clase}`);
  if (!antes) return false;
  const dias = Math.round((new Date(`${hoy}T12:00:00`).getTime() - new Date(`${antes}T12:00:00`).getTime()) / 86_400_000);
  return dias < DIAS_ENTRE_NOTAS;
}

export function marcarNotaDicha(lineaId: number, clase: string, hoy: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`nota:${lineaId}:${clase}`, hoy);
}

/**
 * QUE RELACIONES NO ESTÉ VACÍO NUNCA (§C.8, pedido de Matías el 05/08).
 *
 * *"Uno de los apartados más importantes, en mi opinión, es Relaciones. Si hace
 * días que no tiene nada, está vacío. Eso siempre tiene que tener algo."*
 *
 * ── ⚠️ NO ERA FALTA DE DATOS, Y ESO ES LO IMPORTANTE ────────────────────────
 *
 * Medido el 05/08 contra su base: el Analista había producido **13
 * observaciones y 9 pasaban el filtro** —entre ellas *"cada vez que marcás
 * Amigos, el ánimo que registrás es bien o genial, nunca neutral"*, que es
 * exactamente lo que esa pantalla promete—. Estaba vacía por dos decisiones que
 * se sumaban:
 *
 *  1. **Leía solo el ÚLTIMO análisis** (2 observaciones de 13).
 *  2. **Escondía las ya contestadas**, y había contestado 20.
 *
 * ⚠️ Y el estado vacío mentía: decía *"todavía no encontré ninguna relación
 * chica"* cuando la verdad era *"ya contestaste todas las que tenía"*. Es el
 * mismo error que el "0 de 300" del techo de gastos — un hueco presentado como
 * un hallazgo.
 *
 * ── ⚠️⚠️ LA IDEA QUE LO DA VUELTA ───────────────────────────────────────────
 *
 * **Una observación que él confirmó es lo MÁS valioso de la pantalla, no lo
 * menos.** Es el único dato de toda la app que validó personalmente: el Analista
 * propuso, él dijo "me pasa". Tirarla de la vista era tirar lo único
 * verificado para dejar en su lugar preguntas sin contestar.
 *
 * Entonces la pantalla pasa a tener dos partes, y la de abajo no se vacía nunca:
 * lo que falta contestar arriba, **y lo que ya confirmaste abajo, para siempre**.
 */

export type ObsCruda = { patron: string; evidencia: string; confianza: string };

/** Normaliza para comparar patrones: el mismo cruce vuelve a salir redactado
 *  apenas distinto en cada corrida del modelo. */
function clave(p: string): string {
  return p
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Junta las observaciones de VARIOS análisis, de la más nueva a la más vieja.
 *
 * ⚠️ SE QUEDA CON LA PRIMERA APARICIÓN DE CADA PATRÓN, y como la lista entra
 * ordenada de nueva a vieja, eso significa **la versión más reciente**. Si el
 * Analista redactó el mismo cruce dos veces con distinta confianza, gana la
 * última: es la que vio más días.
 */
export function juntarObservaciones(porAnalisis: ObsCruda[][]): ObsCruda[] {
  const vistas = new Set<string>();
  const salida: ObsCruda[] = [];
  for (const grupo of porAnalisis) {
    for (const o of grupo) {
      const patron = (o.patron ?? '').trim();
      if (!patron) continue;
      const k = clave(patron);
      if (!k || vistas.has(k)) continue;
      vistas.add(k);
      salida.push({ patron, evidencia: o.evidencia ?? '', confianza: o.confianza ?? 'baja' });
    }
  }
  return salida;
}

export type Separadas = {
  /** Las que todavía no contestó. Van arriba, con "me pasa / no me pasa". */
  preguntar: ObsCruda[];
  /** Las que dijo que le pasan. Van abajo, y no se vacían nunca. */
  confirmadas: ObsCruda[];
  /**
   * Las que contestó "no sé" (05/08). No son ni una cosa ni la otra: van a
   * Cocinándose. ⚠️ Y ES DISTINTO DE NO CONTESTAR: si volvieran a `preguntar`,
   * el botón "No sé" no serviría para nada — la pantalla te lo preguntaría de
   * nuevo al instante, que es exactamente lo que él quería sacarse de encima.
   */
  dudosas: ObsCruda[];
};

/**
 * Parte las observaciones según lo que él ya contestó.
 *
 * ⚠️ LAS DESCARTADAS NO VUELVEN, NI ARRIBA NI ABAJO. Dijo que no le pasa;
 * mostrarlas otra vez —aunque fuera en una lista de "descartadas"— sería
 * discutirle. Es la misma regla que hace que una sugerencia contestada no se
 * vuelva a ofrecer.
 *
 * ⚠️ Y SE COMPARA NORMALIZANDO, igual que al juntar: las respuestas se guardan
 * con el texto exacto del patrón de ese día, y el de hoy puede venir con una
 * coma de más. Comparando literal, una observación ya contestada volvería a
 * aparecer como pregunta nueva.
 */
export function separarPorRespuesta(
  obs: ObsCruda[],
  anotadas: Iterable<string>,
  descartadas: Iterable<string>,
  enDuda: Iterable<string> = [],
): Separadas {
  const si = new Set([...anotadas].map(clave));
  const no = new Set([...descartadas].map(clave));
  const quizas = new Set([...enDuda].map(clave));

  const preguntar: ObsCruda[] = [];
  const confirmadas: ObsCruda[] = [];
  const dudosas: ObsCruda[] = [];
  for (const o of obs) {
    const k = clave(o.patron);
    if (no.has(k)) continue;
    if (si.has(k)) confirmadas.push(o);
    else if (quizas.has(k)) dudosas.push(o);
    else preguntar.push(o);
  }
  return { preguntar, confirmadas, dudosas };
}

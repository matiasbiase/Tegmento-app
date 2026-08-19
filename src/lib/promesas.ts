// El asistente no puede decir que guardó algo que todavía no está guardado.
//
// Las marcas ([+gasto:], [+actividad:], [+hecho:], [+ticket]) son PROPUESTAS: se
// vuelven un botón, y hasta que Matías no lo toca no se guarda nada. El prompt ya
// se lo dice con todas las letras ("VOS NO GUARDÁS NADA"), pero el modelo igual
// escribe "listo, ya lo anoté en Finanzas". Matías lo leyó, confió, y después no
// encontró ni el gasto ni la actividad. Que la app mienta es peor que que no
// haga algo.
//
// Así que no se le pide al modelo: se corrige la respuesta antes de guardarla.
// Si hay una marca pendiente y una oración afirma que ya está hecho, esa oración
// se saca. Se elimina la oración completa (no se reescribe) porque cortar entre
// puntos es lo único que no deja el texto roto.

/** Marcas que son una propuesta a confirmar, no algo ya hecho. */
const MARCAS_PENDIENTES = /\[\+(gasto|actividad|hecho|ticket|agenda|periodo)\b/i;

// Verbos de guardado en pasado (primera persona). El pretérito es la clave: "lo
// anoté" miente, "lo anoto si querés" está perfecto y no se toca.
//
// OJO con el final de estas palabras: `\b` en JavaScript es ASCII, así que
// después de una vocal con tilde no hay límite de palabra y `/registré\b/` no
// matchea nunca. Por eso el corte final se hace con un lookahead de letra.
const FIN = '(?![a-záéíóúüñ])';

const AFIRMA_GUARDADO: RegExp[] = [
  new RegExp(`\\b(anoté|anote|guardé|guarde|registré|registre|sumé|sume|agregué|agregue|cargué|cargue|archivé|archive|apunté|apunte)${FIN}`, 'i'),
  /\b(anotamos|guardamos|registramos|sumamos|agregamos|cargamos)\b/i,
  // Las formas con "quedó/está/tenés" también terminan en vocal con tilde, así
  // que acá tampoco sirve `\b` al final del verbo.
  new RegExp(`\\bya (está|esta|lo ten[ée]s|qued[óo])${FIN}.*(anotado|guardado|registrado|cargado|finanzas|actividades)`, 'i'),
  new RegExp(`\\bqued[óo]${FIN}.*(anotado|guardado|registrado|cargado|en finanzas|en tus actividades)`, 'i'),
  new RegExp(`\\blo (tengo|ten[ée]s)${FIN} (anotado|guardado|registrado)`, 'i'),
];

// Presente que se lee como hecho: "listo, lo sumo a tus gastos", "ahí te lo
// anoto". No es pasado, pero Matías lo leyó como que ya estaba guardado, y no lo
// estaba. Va aparte del pasado porque este SÍ admite excepción: en condicional
// ("lo anoto si querés") la frase es honesta y no se toca.
const AFIRMA_PRESENTE = new RegExp(
  `\\b(lo|la|te lo|te la|ahí te lo|ahi te lo) (sumo|anoto|guardo|registro|agrego|cargo)${FIN}`,
  'i',
);

/** Marcas de que la frase ofrece en vez de afirmar. */
const ES_CONDICIONAL = /\b(si|quer[ée]s|te sirve|prefer[íi]s|puedo|pod[ée]s|avisame|decime)\b/i;

/** Una oración que afirma haber guardado algo (o que lo está guardando ya). */
function afirmaGuardado(oracion: string): boolean {
  if (AFIRMA_GUARDADO.some((re) => re.test(oracion))) return true;
  // El presente solo miente cuando no está ofreciendo.
  return AFIRMA_PRESENTE.test(oracion) && !ES_CONDICIONAL.test(oracion);
}

/**
 * Saca de la respuesta las oraciones que afirman haber guardado algo cuando en
 * realidad quedó una marca pendiente de confirmación.
 *
 * No toca nada si no hay marca (ahí no hay nada que confirmar y el texto puede
 * estar hablando de otra cosa), ni las líneas de marca en sí.
 */
export function sacarPromesasFalsas(respuesta: string): string {
  if (!MARCAS_PENDIENTES.test(respuesta)) return respuesta;

  const lineas = respuesta.split('\n').map((linea) => {
    // La línea de la marca se deja intacta: la consume la UI, no la lee nadie.
    if (MARCAS_PENDIENTES.test(linea)) return linea;
    if (!linea.trim()) return linea;

    // Partir en oraciones cortando después del punto, no antes de los signos de
    // apertura: así "¿Cómo venís?" no pierde el "¿".
    const oraciones = linea.split(/(?<=[.!?])\s+/);
    const quedan = oraciones.filter((o) => !afirmaGuardado(o));
    // Si toda la línea era la promesa falsa, la línea se va entera.
    if (quedan.length === 0) return '';
    return quedan.join(' ').replace(/\s{2,}/g, ' ').trim();
  });

  // Sin líneas vacías de más por lo que se sacó.
  return lineas
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

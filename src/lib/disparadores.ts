// Los disparadores de conversación del home.
//
// Antes eran una lista fija de preguntas reflexivas ("¿tenés algo para bajar
// hoy?") con un par de contextuales adelante. Matías se quejó de que eran
// genéricas: "¿cómo vienen los cambios personales?" no sale de su vida, sale de
// una lista. Ahora salen de lo que la app ya sabe de él y no había forma de usar
// hasta ahora: los patrones que CONFIRMÓ, cómo viene contra las metas que se
// puso, y qué factor le viene pesando en el ánimo.
//
// Todo lógica pura: los datos se consultan en la página y acá solo se decide qué
// preguntar, así se puede testear sin base ni modelo.

export type Disparador = { texto: string; prompt: string };

export type DatosDisparadores = {
  /** Patrones que Matías marcó como "me pasa", del más nuevo al más viejo. */
  patronesConfirmados: string[];
  /** Actividades con seguimiento, con su meta semanal y lo que lleva hecho. */
  actividades: { titulo: string; meta: number | null; hechos: number }[];
  /** Factores elegidos en los check-ins de ánimo recientes (con repetidos). */
  factoresRecientes: string[];
  /** Días desde el último registro de sueño (null si nunca registró). */
  diasSinSueno: number | null;
  /** Experimentos que aceptó probar desde Relaciones, con cuántos días llevan. */
  experimentos?: { titulo: string; dias: number }[];
};

/** Días que se le da a un experimento antes de preguntar cómo fue. Tres: menos
 *  es apurarlo (todavía no pasó nada), más es que ya se lo olvidó. */
const DIAS_PARA_PREGUNTAR = 3;

/** Recorta una frase larga para que entre en un chip sin cortar una palabra. */
export function recortarChip(texto: string, max = 46): string {
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/** El factor que más se repite, si de verdad se repite (2+ veces). */
function factorDominante(factores: string[]): string | null {
  const cuenta = new Map<string, number>();
  for (const f of factores) cuenta.set(f, (cuenta.get(f) ?? 0) + 1);
  let mejor: string | null = null;
  let max = 1;
  for (const [f, n] of cuenta) {
    if (n > max) {
      max = n;
      mejor = f;
    }
  }
  return mejor;
}

/**
 * Arma los disparadores personales, del más específico al más general. Devuelve
 * los que aplican: si no hay datos suficientes vuelve vacío y la página completa
 * con las preguntas de siempre.
 */
export function armarDisparadores(d: DatosDisparadores): Disparador[] {
  const out: Disparador[] = [];

  // 0. UN EXPERIMENTO QUE ACEPTÓ PROBAR. Va PRIMERO, antes que todo lo demás
  //    (28/07, pedido de Matías: "estaría bueno que te pregunte, che, probaste
  //    esto, qué tal fue"). Es lo único de esta lista que él ACEPTÓ hacer: la
  //    app propuso, él dijo que sí, y ahora vuelve a preguntar. Sin esta vuelta,
  //    proponer un experimento sería otra forma de dar un consejo y desentenderse.
  //    Se pregunta a los 3 días y por el resultado, no por el cumplimiento: la
  //    respuesta "no lo hice" también es una respuesta y no lleva reproche.
  const experimento = (d.experimentos ?? []).find((e) => e.dias >= DIAS_PARA_PREGUNTAR);
  if (experimento) {
    out.push({
      texto: recortarChip(`¿Qué tal te fue con ${experimento.titulo.toLowerCase()}?`),
      prompt: `Hace unos días quedamos en que iba a probar ${experimento.titulo.toLowerCase()}. Te cuento qué tal me fue.`,
    });
  }

  // 1. Un patrón que él confirmó. Es lo más suyo que tenemos: lo dijo él.
  const patron = d.patronesConfirmados[0];
  if (patron) {
    out.push({
      texto: recortarChip(`Sobre eso que confirmaste: ${patron.toLowerCase()}`),
      prompt: `Quiero hablar de algo que noté y confirmé: ${patron}`,
    });
  }

  // 2. Cómo viene contra una meta que se puso. Solo si le falta algo: si ya la
  //    cumplió no hay nada que preguntar, y si va en cero suena a reproche.
  const enCurso = d.actividades.find((a) => a.meta != null && a.hechos > 0 && a.hechos < (a.meta as number));
  if (enCurso) {
    const faltan = (enCurso.meta as number) - enCurso.hechos;
    out.push({
      texto: recortarChip(`Te falta${faltan > 1 ? 'n' : ''} ${faltan} de ${enCurso.meta} de ${enCurso.titulo.toLowerCase()}`),
      prompt: `Quiero contarte cómo viene lo de ${enCurso.titulo}.`,
    });
  }

  // 3. El factor que le viene pesando en el ánimo (Dinero, Identidad, Trabajo…).
  const factor = factorDominante(d.factoresRecientes);
  if (factor) {
    out.push({
      texto: `${factor} viene apareciendo seguido`,
      prompt: `Últimamente aparece ${factor} cuando registro cómo estoy. Quiero hablar de eso.`,
    });
  }

  // 4. Un hueco en el registro, dicho sin culpa.
  if (d.diasSinSueno != null && d.diasSinSueno >= 3) {
    out.push({
      texto: `Hace ${d.diasSinSueno} días que no anotás cómo dormís`,
      prompt: 'Quiero contarte cómo vengo durmiendo estos días.',
    });
  }

  return out;
}

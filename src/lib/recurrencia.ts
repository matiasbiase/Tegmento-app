// ¿Lo que escribiste suena a algo que hacés seguido, y no a algo que pasó una vez?
//
// El chip "Actividades" de la Casa pregunta "¿qué hiciste?" y guarda todo como
// puntual. Matías escribió ahí "Hago bouldern los martes" y quedó como si hubiera
// ido al boulder una sola vez, el viernes. Lo mismo con el alemán. El formulario
// no tenía forma de decir "esto lo hago siempre".
//
// Esta función es la que dispara la repregunta. Es una heurística de texto, no un
// modelo: tiene que responder al instante y funcionar aunque Ollama esté apagado.
// Ante la duda dice que NO: el costo de no preguntar es que se guarda como hecho
// (que es lo que él pidió), y el de preguntar de más es una pregunta al pedo.

const SEÑALES: RegExp[] = [
  // frecuencia explícita: "todos los martes", "cada semana", "3 veces por semana"
  /\btodos los\b/i,
  /\btodas las\b/i,
  /\bcada (día|dia|semana|mañana|manana|noche|tarde|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i,
  /\b\d+\s*(veces|vez)\s*(por|a la|en la)\s*(semana|mes|día|dia)\b/i,
  /\b(una|dos|tres|cuatro|cinco)\s*veces\s*(por|a la)\s*semana\b/i,
  // días de la semana en plural: "los martes", "los fines de semana"
  /\blos (lunes|martes|miércoles|miercoles|jueves|viernes|sábados|sabados|domingos|fines de semana)\b/i,
  /\blas (mañanas|mananas|noches|tardes)\b/i,
  // rangos: "de lunes a viernes"
  /\bde (lunes|martes|miércoles|miercoles|jueves|viernes)\s+\w*\s*(a|hasta)?\s*(viernes|sábado|sabado|domingo)\b/i,
  // hábito declarado en presente: "estoy haciendo", "hago", "voy a X" recurrente
  /\bestoy (haciendo|yendo|entrenando|estudiando|practicando|corriendo)\b/i,
  /\b(siempre|seguido|habitualmente|semanalmente|a diario)\b/i,
  /\bempecé a\b/i,
  /\bempece a\b/i,
  /\barranqué con\b/i,
  /\barranque con\b/i,
];

/**
 * true si el texto describe algo que se repite en el tiempo (una actividad en
 * curso) en vez de algo puntual que ya pasó.
 */
export function suenaRecurrente(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 4) return false;
  return SEÑALES.some((re) => re.test(t));
}

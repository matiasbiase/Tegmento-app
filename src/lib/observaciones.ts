// De una observación del Analista a un título de actividad.
//
// El Analista escribe frases que cruzan dos cosas ("los días que caminás a la
// mañana, dormís mejor"). Eso está bien para leer, pero es un mal título de
// actividad. Acá se propone uno corto quedándose con la primera parte, la que
// nombra la conducta. Es SOLO una propuesta: en la pantalla el título se edita
// antes de guardarlo, así que preferimos recortar de más y que él complete.

/** Un patrón en formato chip para la tira que va debajo del promedio de ánimo. */
export type PatronChip = { texto: string; confirmado: boolean };

/**
 * Arma la tira de patrones: primero los que Matías confirmó, después los del
 * análisis actual que todavía no respondió. Lo que descartó no aparece: dijo que
 * no le pasa y no tiene por qué seguir viéndolo.
 */
export function chipsDePatrones(
  confirmadas: string[],
  descartadas: string[],
  actuales: string[],
  max = 6,
): PatronChip[] {
  const fuera = new Set(descartadas);
  const yaVistas = new Set<string>();
  const out: PatronChip[] = [];

  for (const texto of confirmadas) {
    if (fuera.has(texto) || yaVistas.has(texto)) continue;
    yaVistas.add(texto);
    out.push({ texto, confirmado: true });
  }
  for (const texto of actuales) {
    if (fuera.has(texto) || yaVistas.has(texto)) continue;
    yaVistas.add(texto);
    out.push({ texto, confirmado: false });
  }

  return out.slice(0, max);
}

/** Arranques típicos del Analista que no aportan nada al título. */
const PREFIJOS = [
  'los días que',
  'los dias que',
  'las veces que',
  'las semanas que',
  'noté que',
  'note que',
  'parece que',
  'se nota que',
  'cuando',
  'si',
];

/** Corta en el primer conector: lo que sigue es la consecuencia, no la conducta. */
const CORTES = [',', ';', ' y ', ' pero ', ' tu ', ' tus ', ' te ', ' al día siguiente', ' suele ', ' tiende '];

const MAX_PALABRAS = 6;
const MAX_LARGO = 48;

export function tituloDesdePatron(patron: string): string {
  let t = patron.trim().toLowerCase();
  if (!t) return '';

  for (const p of PREFIJOS) {
    if (t.startsWith(`${p} `)) {
      t = t.slice(p.length + 1);
      break;
    }
  }

  // El corte más temprano de todos: nos quedamos con la primera cláusula.
  let fin = t.length;
  for (const c of CORTES) {
    const i = t.indexOf(c);
    if (i > 0 && i < fin) fin = i;
  }
  t = t.slice(0, fin).trim();

  const palabras = t.split(/\s+/).filter(Boolean).slice(0, MAX_PALABRAS);
  t = palabras.join(' ');

  // Sin puntuación colgada al final y sin pasarse de largo.
  t = t.replace(/[.,;:!?¡¿]+$/, '').trim();
  if (t.length > MAX_LARGO) t = t.slice(0, MAX_LARGO).replace(/\s+\S*$/, '');

  return t;
}

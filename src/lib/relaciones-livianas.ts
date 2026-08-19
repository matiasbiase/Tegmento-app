/**
 * Relaciones livianas: las correlaciones CHICAS y CONCRETAS ("pantalla → ánimo"),
 * presentadas como exploración y no como hallazgo formal.
 *
 * ── DE DÓNDE SALEN ────────────────────────────────────────────────────────────
 * **Comparten motor con el Analista**: son las mismas observaciones que ya
 * produce, leídas distinto. Lo que cambia es la presentación, no el cálculo.
 *
 * ⚠️ POR ESO ACÁ NO SE TOCA `prompts/analista.md`. Era el otro camino posible
 * (pedirle al modelo dos campos más, "ladoA" y "ladoB") y se descartó: ese prompt
 * está calibrado a mano contra meses de fallas concretas —inflaba la confianza,
 * devolvía etiquetas en vez de frases, se comía las instrucciones cuando el
 * contexto crecía— y sumarle dos campos por una vista nueva es tocar el 90% del
 * valor de la app para ganar una fila de dos chips. Los dos lados se deducen de
 * la frase, acá, donde se puede testear sin levantar Ollama.
 *
 * Una observación que NO menciona dos dominios conocidos no es una relación
 * liviana: se queda en la lectura completa del Analista y no aparece en esta
 * pestaña. Es a propósito: la pestaña promete "pantalla → ánimo", y una frase que
 * no se puede reducir a dos etiquetas no cumple esa promesa.
 */

/** Un dominio que la app mide y que puede ser una de las dos puntas. */
export type Dominio = {
  clave: string;
  /** Lo que dice el chip. Corto: entra en una etiqueta de 10px. */
  etiqueta: string;
  /** El color de la tarjeta cuando este dominio es el primero. */
  color: string;
  /** Cómo se lo nombra en las observaciones del Analista. */
  palabras: string[];
  /**
   * Dominios que este TAPA cuando los dos aparecen en la misma frase.
   *
   * Existe por un caso concreto: "los días que **dormís** siesta". "Dormís" es
   * palabra de Sueño y está ANTES que "siesta", así que por posición ganaba
   * Sueño y la relación salía "Sueño → Energía" cuando la frase habla de la
   * siesta. Siesta es un caso particular de dormir, no otra cosa: cuando está,
   * manda ella.
   */
  tapa?: string[];
};

// El orden importa solo para desempatar dominios que comparten una palabra: gana
// el primero de la lista. "Siesta" antes que "Sueño" porque una observación sobre
// la siesta habla de la siesta, no del sueño de la noche.
export const DOMINIOS: Dominio[] = [
  { clave: 'pantalla', etiqueta: 'Pantalla', color: 'var(--color-rosa)', palabras: ['pantalla', 'celular', 'teléfono', 'telefono', 'scroll'] },
  { clave: 'siesta', etiqueta: 'Siesta', color: 'var(--color-verde)', palabras: ['siesta'], tapa: ['sueno'] },
  { clave: 'sueno', etiqueta: 'Sueño', color: 'var(--color-oro)', palabras: ['sueño', 'sueno', 'dormís', 'dormis', 'dormir', 'dormiste', 'horas de sueño', 'descanso'] },
  { clave: 'animo', etiqueta: 'Ánimo', color: 'var(--color-iris)', palabras: ['ánimo', 'animo', 'humor', 'bajón', 'bajon'] },
  { clave: 'energia', etiqueta: 'Energía', color: 'var(--color-verde)', palabras: ['energía', 'energia'] },
  { clave: 'libido', etiqueta: 'Libido', color: 'var(--color-rosa)', palabras: ['libido', 'deseo'] },
  { clave: 'comida', etiqueta: 'Comida', color: 'var(--color-oro)', palabras: ['comida', 'comés', 'comes', 'comiste', 'ultraprocesados', 'snacks', 'azúcar', 'azucar'] },
  { clave: 'gasto', etiqueta: 'Gastos', color: 'var(--color-oro)', palabras: ['gasto', 'gastás', 'gastas', 'gastaste', 'plata', 'compras'] },
  { clave: 'actividad', etiqueta: 'Actividades', color: 'var(--color-iris)', palabras: ['actividad', 'entrenaste', 'fútbol', 'futbol', 'correr', 'corriste', 'gimnasio', 'caminar'] },
  { clave: 'trabajo', etiqueta: 'Trabajo', color: 'var(--color-iris-deep)', palabras: ['trabajo', 'laburo', 'buscar trabajo', 'entrevista', 'postulación', 'postulacion'] },
  // ── LOS TRES QUE FALTABAN, Y POR QUÉ LA PANTALLA ESTABA VACÍA (31/07) ──────
  //
  // ⚠️ ESTE VOCABULARIO SE ESCRIBIÓ ANTES DE VER SOBRE QUÉ ESCRIBE EL ANALISTA.
  // Matías reportó que Relaciones no mostraba nada. No era un bug: de sus tres
  // observaciones nuevas, NINGUNA se podía partir en dos puntas, porque hablaban
  // de "Identidad", de "estrés y frustración" y de "preocupaciones por el futuro
  // y los trámites" — y ninguno de los tres existía acá. La pantalla funcionaba
  // perfecto contra un diccionario que no era el de su vida.
  //
  // Es la lección de fondo: un dominio que el Analista nombra seguido y que esta
  // lista no conoce vuelve la pantalla muda, y desde afuera parece rota.
  { clave: 'identidad', etiqueta: 'Identidad', color: 'var(--color-iris)', palabras: ['identidad', 'quién sos', 'quien sos', 'quién soy', 'quien soy'] },
  // Va DESPUÉS de identidad: "Identidad viene con estrés" tiene que dar
  // Identidad → Estrés, y no al revés. El orden desempata.
  { clave: 'estres', etiqueta: 'Estrés', color: 'var(--color-rosa)', palabras: ['estrés', 'estres', 'ansiedad', 'ansioso', 'ansiosa', 'frustración', 'frustracion', 'angustia', 'agobio', 'preocupación', 'preocupacion', 'preocupaciones'] },
  { clave: 'futuro', etiqueta: 'Futuro', color: 'var(--color-oro)', palabras: ['futuro', 'trámite', 'tramite', 'trámites', 'tramites', 'estancia', 'visa', 'papeles', 'mudanza', 'mudarme'] },
  { clave: 'social', etiqueta: 'Gente', color: 'var(--color-iris-2)', palabras: ['amigos', 'gente', 'social', 'familia', 'llamar'] },
];

/** Minúsculas y sin tildes, para buscar las palabras en la frase. */
function plano(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Los dos lados de la relación, en el orden en que aparecen en la frase.
 *
 * El orden es el del texto y no uno inventado: si la observación dice "los días
 * de más pantalla, al otro día el ánimo más abajo", la flecha va pantalla → ánimo
 * porque así lo contó. Invertirla sería afirmar una causa que nadie midió.
 *
 * ⚠️ SON EL PRIMERO Y EL ÚLTIMO, NO LOS DOS PRIMEROS. Las observaciones del
 * Analista suelen nombrar tres cosas: "las semanas que gastás más en snacks,
 * dormís menos horas" tiene gasto, comida y sueño. Con "los dos primeros" salía
 * "Gastos → Comida", que no es la relación: son las dos formas de nombrar el
 * mismo lado. La relación va de lo primero que se menciona a lo último, que es
 * como se cuenta una en castellano ("cuando pasa A… entonces B").
 *
 * Devuelve null si no encuentra DOS dominios distintos.
 */
export function ladosDe(patron: string): [Dominio, Dominio] | null {
  const t = plano(patron ?? '');
  const encontrados: { dominio: Dominio; pos: number }[] = [];

  for (const d of DOMINIOS) {
    let mejor = -1;
    for (const p of d.palabras) {
      const i = t.indexOf(plano(p));
      if (i !== -1 && (mejor === -1 || i < mejor)) mejor = i;
    }
    if (mejor !== -1) encontrados.push({ dominio: d, pos: mejor });
  }

  // Los tapados se van (ver `tapa`): siesta le gana a sueño en la misma frase.
  const presentes = new Set(encontrados.map((e) => e.dominio.clave));
  const tapados = new Set(
    encontrados.flatMap((e) => (presentes.has(e.dominio.clave) ? (e.dominio.tapa ?? []) : [])),
  );
  const vivos = encontrados.filter((e) => !tapados.has(e.dominio.clave));

  // Si dos dominios matchearon en la MISMA posición, es la misma palabra contada
  // dos veces (pasa con "horas de sueño" y "sueño"): se queda el primero de
  // DOMINIOS, que es el criterio de desempate declarado arriba.
  const porPos = new Map<number, Dominio>();
  for (const e of vivos) if (!porPos.has(e.pos)) porPos.set(e.pos, e.dominio);

  const ordenados = [...porPos.entries()].sort((a, b) => a[0] - b[0]).map(([, d]) => d);
  if (ordenados.length < 2) return null;
  return [ordenados[0], ordenados[ordenados.length - 1]];
}

export type Fuerza = {
  /** Ancho de la barrita, en porcentaje. Tres posiciones, no una medición. */
  ancho: number;
  /** El renglón de abajo: "5 días · pasa seguido". */
  texto: string;
  /** ¿Alcanza para preguntarle si le pasa? */
  pideConfirmacion: boolean;
};

/**
 * La barrita de evidencia.
 *
 * ⚠️ ES UNA BARRITA Y NO UN PORCENTAJE, y tiene TRES POSICIONES y no un valor
 * continuo. Los dos son la misma decisión: *"un número exacto suena a medición
 * cuando esto es una corazonada con pocos datos"*. Un 68% da la impresión de que
 * algo se calculó; una barra a media altura dice "más o menos", que es la verdad.
 *
 * La confianza que entra ya viene topeada por las fechas que la evidencia cita
 * (`confianzaSegunEvidencia`): acá no se vuelve a estimar nada.
 */
export function fuerzaDe(evidencia: string, confianza: string): Fuerza {
  const dias = new Set((evidencia ?? '').match(/\d{4}-\d{2}-\d{2}/g) ?? []).size;
  const cuantos = dias > 0 ? `${dias} ${dias === 1 ? 'día' : 'días'} · ` : '';

  // ⚠️ EL TEXTO DICE CUÁNTO SE PUEDE CONFIAR, NO CUÁNTO PASA (06/08, Matías:
  // *"usaría la línea esa para mostrar qué tan confiable es o cuán seguro estás
  // de la información"*). Antes decía "9 días · pasa seguido", que es un
  // resumen del hallazgo; ahora la barra y su renglón contestan **una sola
  // pregunta —¿cuánto le creo a esto?— y la de abajo contesta la otra: cuánto
  // te importa.** Mezcladas, la barra parecía medir importancia.
  if (confianza === 'alta') return { ancho: 72, texto: `${cuantos}bastante confiable`, pideConfirmacion: true };
  if (confianza === 'media') return { ancho: 44, texto: `${cuantos}poco confiable todavía`, pideConfirmacion: true };

  // ⚠️ LO FLOJO NO PIDE CONFIRMACIÓN. Preguntar "¿te pasa?" sobre una corazonada
  // con dos datos es pedirle que valide una corazonada, y si dice que sí se
  // vuelve verdad sin haberlo ganado. Pero tampoco se esconde: se avisa que se
  // está mirando. Misma regla que ya rige la pantalla de Relaciones.
  return { ancho: 22, texto: `${cuantos}todavía se está cocinando`, pideConfirmacion: false };
}

export type RelacionLiviana = {
  patron: string;
  frase: string;
  lados: [Dominio, Dominio];
  fuerza: Fuerza;
};

/**
 * Convierte las observaciones del Analista en relaciones livianas, y deja afuera
 * las que no se pueden reducir a dos lados.
 */
export function relacionesLivianas(
  observaciones: { patron: string; evidencia: string; confianza: string }[],
  limpiar: (patron: string) => string = (p) => p,
): RelacionLiviana[] {
  const salida: RelacionLiviana[] = [];
  for (const o of observaciones) {
    const lados = ladosDe(o.patron);
    if (!lados) continue;
    salida.push({
      patron: o.patron,
      frase: limpiar(o.patron),
      lados,
      fuerza: fuerzaDe(o.evidencia, o.confianza),
    });
  }
  return salida;
}

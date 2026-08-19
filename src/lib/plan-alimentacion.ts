/**
 * EL PLAN QUE TE DIO EL NUTRICIONISTA.
 *
 * Pedido de Matías el 04/08 (§0.9c): *"en Alimentación, que puedas cargar la
 * foto del plan de alimentación que te da un nutricionista… y la app lo pasa
 * como a objetivo, lo traduce de la foto del plan que te mandan"*.
 *
 * ── ⚠️ SÍ, ESTO REABRE LA FOTO QUE SE SACÓ EL 03/08 ─────────────────────────
 *
 * El ticket se borró porque la foto sobraba, y conviene decirlo de frente en vez
 * de descubrirlo a mitad de camino. **Pero lo que hacía sobrar al ticket era la
 * FRECUENCIA, no la foto**: un ticket es de todos los días y contarlo hablando
 * es más rápido; un plan lo recibís una vez cada varios meses y dictarlo entero
 * no tiene sentido. Es justo el caso donde una foto gana.
 *
 * ── ⚠️ LO QUE ESTE MÓDULO NO HACE ───────────────────────────────────────────
 *
 * No puntúa, no reta y no calcula un porcentaje de cumplimiento como resultado
 * principal. *"Se anota igual. El plan es una guía, no un examen."* Lo que
 * comés fuera del plan es un hecho, no una nota de conducta.
 *
 * Y el valor no es "cumpliste 5 de 7" —eso lo hace cualquiera—: es
 * `cruceConSueno`, que solo puede decirlo una app que ya tiene tu sueño.
 */

export type ComidaDelPlan = {
  /** 'HH:MM'. Es lo que ordena la lista. */
  hora: string;
  /** "Avena con fruta". */
  que: string;
  /** "1 taza", "pollo, pescado o legumbres". Opcional. */
  detalle: string | null;
};

const HORA = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;

/** 'HH:MM' normalizada, o `null` si no es una hora. */
export function normalizarHora(crudo: string): string | null {
  const m = HORA.exec(crudo.trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * LO QUE LEYÓ EL MODELO, CONVERTIDO EN FILAS.
 *
 * El formato que se le pide es `HH:MM | qué | detalle`, una comida por renglón.
 *
 * ⚠️ EL PARSER TIENE QUE SER FLOJO, NO ESTRICTO, y ese es todo el punto. Un
 * modelo local devuelve casi siempre lo que le pediste y a veces le pone un
 * guión adelante, o dice "08:00 - Avena", o mete una línea de preámbulo. Un
 * parser estricto convierte eso en **cero comidas sin ningún error**, que es
 * exactamente el falso negativo del feed de YouTube del 04/08: se lee como "no
 * se pudo leer el plan", que es un estado legítimo, y nadie va a mirar por qué.
 *
 * Lo que NO hace es inventar: un renglón sin hora reconocible se descarta. La
 * pantalla de revisión existe para agregarlo a mano, y él siempre confirma antes
 * de guardar.
 */
/**
 * Le saca la viñeta o el número de lista de adelante.
 *
 * ⚠️ NO PUEDE COMERSE LA HORA, y es el bug que tuvo este archivo la primera vez:
 * un `^[-*•·\d.)\s]+` se lleva el "08" de "08:00" y deja ":00 | Avena", que ya
 * no parsea. Por eso las dos reglas piden un espacio después y la del número
 * exige `.` o `)`, que una hora nunca tiene ahí.
 */
function sinVinieta(s: string): string {
  return s
    .trim()
    .replace(/^[-*•·–—]\s+/, '')
    .replace(/^\d{1,2}[.)]\s+/, '')
    .trim();
}

export function parsearPlan(texto: string): ComidaDelPlan[] {
  const salida: ComidaDelPlan[] = [];
  for (const renglonCrudo of texto.split('\n')) {
    const renglon = sinVinieta(renglonCrudo);
    if (!renglon) continue;

    // Separadores tolerados: la barra que se pide, y el guión, los dos puntos o
    // nada, que es lo que el modelo mete cuando se olvida del formato.
    const partes = renglon.split('|').map((p) => p.trim());
    let hora = normalizarHora(partes[0] ?? '');
    let resto = partes.slice(1);

    if (!hora) {
      const m = /^(\d{1,2}[:.]\d{2})\s*[-–—:]?\s*(.+)$/.exec(renglon);
      if (!m) continue;
      hora = normalizarHora(m[1]);
      if (!hora) continue;
      // El detalle puede venir entre paréntesis: "Avena con fruta (1 taza)".
      resto = m[2].split(/\s*[|(]\s*/).map((p) => p.replace(/\)\s*$/, '').trim());
    }

    const que = (resto[0] ?? '').trim().slice(0, 120);
    if (!que) continue;
    const detalle = resto.slice(1).filter(Boolean).join(', ').trim().slice(0, 160) || null;
    salida.push({ hora, que, detalle });
  }
  return ordenarPorHora(salida);
}

/** Por hora, que es como se lee un día. */
export function ordenarPorHora<T extends { hora: string }>(comidas: T[]): T[] {
  return comidas.slice().sort((a, b) => a.hora.localeCompare(b.hora));
}

export type MarcaDePlan = { comidaId: number; fecha: string };

/** Cuántas del plan tildaste ese día. */
export function cumplidasEn(comidaIds: number[], marcas: MarcaDePlan[], fecha: string): number {
  const delDia = new Set(marcas.filter((m) => m.fecha === fecha).map((m) => m.comidaId));
  return comidaIds.filter((id) => delDia.has(id)).length;
}

export type DiaDelPlan = {
  fecha: string; // YYYY-MM-DD
  inicial: string; // L M M J V S D
  cumplidas: number;
  total: number;
  esHoy: boolean;
};

const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Los últimos `n` días, del más viejo al de hoy. */
export function semanaDelPlan(
  comidaIds: number[],
  marcas: MarcaDePlan[],
  hoy = new Date(),
  n = 7,
): DiaDelPlan[] {
  const hoyYmd = ymd(hoy);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (n - 1 - i));
    const fecha = ymd(d);
    return {
      fecha,
      inicial: INICIALES[d.getDay()],
      cumplidas: cumplidasEn(comidaIds, marcas, fecha),
      total: comidaIds.length,
      esHoy: fecha === hoyYmd,
    };
  });
}

/**
 * ⚠️ QUÉ CUENTA COMO "UN DÍA QUE SEGUISTE EL PLAN".
 *
 * La mitad. No es un número redondo elegido al azar: con un umbral alto (todas)
 * casi ningún día califica y el cruce nunca aparece; con uno bajo (una) el
 * "seguiste el plan" deja de querer decir nada y la frase pasa a comparar ruido
 * contra ruido.
 */
const FRACCION_SEGUIDO = 0.5;

export function seguisteElPlan(dia: DiaDelPlan): boolean {
  return dia.total > 0 && dia.cumplidas / dia.total >= FRACCION_SEGUIDO;
}

/**
 * ⚠️ CUÁNTOS DÍAS DE CADA LADO HACEN FALTA PARA PODER DECIR ALGO.
 *
 * Cuatro y cuatro. Con dos días contra dos, una noche mala mueve el promedio
 * cuarenta minutos y la app afirmaría un patrón que es una anécdota. Es la misma
 * regla que ya rige en Patrones y en el Analista: **si no hay con qué, la línea
 * no aparece** — callarse es una salida válida.
 */
const MINIMO_POR_LADO = 4;

export type Sueno = { fecha: string; minutos: number };

export type Cruce = {
  /** Diferencia en minutos: positivo = dormís MÁS los días que seguís el plan. */
  minutos: number;
  diasConPlan: number;
  diasSinPlan: number;
};

/**
 * EL CRUCE: qué te pasa cuando seguís el plan.
 *
 * *"Los días que seguís el plan dormís 40 min más, en promedio."* Acá está el
 * valor real de la pantalla, y por eso la maqueta lo puso arriba del porcentaje.
 *
 * ⚠️⚠️ ES UNA CORRELACIÓN Y LA PANTALLA TIENE QUE DECIRLO ASÍ. Esta función
 * devuelve una diferencia de promedios, no una causa: dormir más puede ser lo
 * que te deja seguir el plan, y no al revés. Quien la muestre no puede escribir
 * "seguir el plan te hace dormir mejor".
 *
 * `null` cuando no hay suficientes días de alguno de los dos lados.
 */
export function cruceConSueno(dias: DiaDelPlan[], sueno: Sueno[]): Cruce | null {
  const porFecha = new Map(sueno.map((s) => [s.fecha, s.minutos]));
  const con: number[] = [];
  const sin: number[] = [];

  for (const d of dias) {
    const min = porFecha.get(d.fecha);
    if (min == null || !Number.isFinite(min)) continue;
    (seguisteElPlan(d) ? con : sin).push(min);
  }

  if (con.length < MINIMO_POR_LADO || sin.length < MINIMO_POR_LADO) return null;

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    minutos: Math.round(media(con) - media(sin)),
    diasConPlan: con.length,
    diasSinPlan: sin.length,
  };
}

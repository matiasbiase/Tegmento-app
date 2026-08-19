/**
 * ARMAR UN OBJETIVO DESDE LA RUEDA (06/08).
 *
 * ⚠️⚠️ LA DECISIÓN DE FONDO ES DE JERARQUÍA, y llegó como corrección de Matías
 * sobre la primera maqueta, que proponía **seguimientos disfrazados de
 * objetivos**: *"volver a entrenar dos veces por semana… eso es un seguimiento.
 * El objetivo es más como cuál es lo que se quiere lograr"*.
 *
 *   · **Objetivo** = lo que querés lograr. NO dice qué vas a hacer.
 *   · **Seguimiento** = lo que hacés seguido, y CUELGA de un objetivo.
 *
 * Por eso "entrenar 2 veces por semana" y "caminar 30 minutos" no son dos
 * objetivos que compiten por el mismo lugar: son dos seguimientos del mismo
 * objetivo. El flujo es **área → objetivo → seguimientos**, y el tercer paso no
 * es una función nueva: es `objetivo_lineas` y "Lo que suma a esto", usados al
 * crear en vez de después.
 *
 * ⚠️ ESTE ARCHIVO NO DIBUJA NADA Y NO TOCA LA BASE. Es la regla sola, para que
 * se pueda testear: la cadena de "qué propone para cada área" y "cuándo un
 * hábito está sostenido" son exactamente el tipo de cosa que adentro del JSX se
 * rompe callada.
 */

/** Los tres tipos, y qué significa cerrar cada uno. */
export type TipoObjetivo = 'rueda' | 'llegar' | 'habito';

/**
 * CUÁNTO TARDA EN GENERARSE UN HÁBITO: 60 DÍAS.
 *
 * ⚠️ EL NÚMERO ES DE MATÍAS, no mío. Yo había elegido 8 semanas por mi cuenta y
 * lo dejé marcado para que lo confirmara; su respuesta fue otra y más precisa:
 * *"el hábito tarda sesenta días en generarse"*. Sesenta manda, y de acá sale
 * todo lo demás — la fecha límite que se pone sola y las semanas que hay que
 * sostener.
 *
 * ⚠️ VA ARRIBA DE `TIPOS_OBJETIVO` PORQUE ESA LISTA LA USA. Un `const` no existe
 * antes de su línea: declararla abajo compila igual y explota al importar el
 * módulo, que es de los errores que ni `tsc` ni los tests de otras cosas ven.
 */
export const DIAS_HABITO = 60;

/**
 * LO MISMO EN SEMANAS SOSTENIDAS, y **derivado, no escrito aparte**: dos
 * números sueltos para la misma idea se despegan en el primer retoque. Una
 * semana cuenta como sostenida con una marca, así que 60 días son 8 semanas
 * enteras (8 × 7 = 56) más un resto que no alcanza para una novena.
 */
export const SEMANAS_HABITO = Math.floor(DIAS_HABITO / 7);

/**
 * LA FECHA LÍMITE QUE SE PONE SOLA CUANDO NO PONÉS NINGUNA.
 *
 * ⚠️⚠️ CASI TODO OBJETIVO TIENE QUE TENER UNA, y esto es un cambio de criterio
 * de Matías: *"la mayoría debería tener una fecha límite… si no tiene fecha
 * límite le ponés sesenta; si tiene una, la que él quiera"*.
 *
 * Y arregla algo concreto: **sin fecha, la tarjeta no puede decir casi nada.**
 * No hay cuenta regresiva, no hay proyección y no hay barra de progreso — la
 * regla de los dos tipos de `lib/objetivos.ts` cuelga entera de este campo. Un
 * objetivo sin fecha era, en los hechos, un objetivo que la app mira sin poder
 * opinar.
 *
 * ⚠️ ES UN DEFAULT, NO UNA OBLIGACIÓN: viene puesta y se puede correr o sacar.
 * Una fecha impuesta que no se puede tocar es una promesa que otro hizo por vos.
 */
export function fechaLimitePorDefecto(hoy: string, dias = DIAS_HABITO): string {
  const d = new Date(`${hoy}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const TIPOS_OBJETIVO: { tipo: TipoObjetivo; nombre: string; ejemplo: string; cierra: string }[] = [
  {
    tipo: 'rueda',
    nombre: 'Mover la rueda',
    ejemplo: 'subir de 2 a 3 en Salud física',
    cierra: 'cuando rehagas la rueda y haya subido',
  },
  {
    tipo: 'llegar',
    nombre: 'Llegar a algo',
    ejemplo: '1.500 € para octubre',
    cierra: 'por fecha o por monto',
  },
  {
    tipo: 'habito',
    nombre: 'Que me salga solo',
    ejemplo: 'que entrenar deje de costarme',
    cierra: `a los ${DIAS_HABITO} días, que es lo que tarda en salir solo`,
  },
];

/**
 * LO QUE LA APP PROPONE PARA UN ÁREA, sin pedirte que escribas nada.
 *
 * ⚠️ ES EL MISMO PRINCIPIO QUE `ArranqueObjetivos`: **primero se propone,
 * después se pregunta.** Una pregunta en blanco ("¿qué querés lograr en Salud
 * física?") te deja todo el trabajo; una línea que ya dice "subir de 2 a 3" es
 * ese objetivo con el trabajo hecho, y encima con una medida que no hubo que
 * inventar.
 *
 * Devuelve `null` cuando el área ya está en 5: ahí "subir uno" no existe, y
 * proponerlo sería pedirle a alguien que mejore algo que él mismo marcó como
 * pleno.
 */
export function propuestaDeRueda(area: { nombre: string; scoreActual: number | null }): {
  titulo: string;
  desde: number;
  hasta: number;
} | null {
  const desde = area.scoreActual;
  if (desde == null || desde >= 5) return null;
  const hasta = desde + 1;
  return { titulo: `Subir de ${desde} a ${hasta} en ${area.nombre}`, desde, hasta };
}

/**
 * EN QUÉ ORDEN SE OFRECEN LAS ÁREAS.
 *
 * ⚠️⚠️ MANDA EL FOCO, NO EL PUNTAJE MÁS BAJO, y esa es una idea de Matías que
 * resuelve un problema real: **son dos preguntas distintas.** La rueda pregunta
 * *cómo estás*; el foco pregunta *qué te importa ahora*. Un 2 en Contexto puede
 * no importarte y un 4 en Carrera puede ser justo donde querés empujar —
 * ordenar por el puntaje más bajo es suponer que lo peor es lo más urgente, y
 * casi nunca lo es.
 *
 * ⚠️ Y ADEMÁS EL PUNTAJE SOLO NO ALCANZA: los ocho arrancan en 3 en el wizard,
 * así que quien lo pasó sin tocar nada tiene ocho empates y "la más floja" no
 * existe. El foco sí es una respuesta.
 *
 * Dentro de cada grupo sí ordena por puntaje, que a igualdad de interés es la
 * única señal que queda. Las que están en 5 van al final: no tienen propuesta.
 */
export function areasParaElegir<T extends { nombre: string; scoreActual: number | null; foco: boolean }>(
  areas: T[],
): T[] {
  return [...areas].sort((a, b) => {
    const sinPropuesta = (x: T) => (propuestaDeRueda(x) == null ? 1 : 0);
    if (sinPropuesta(a) !== sinPropuesta(b)) return sinPropuesta(a) - sinPropuesta(b);
    if (a.foco !== b.foco) return a.foco ? -1 : 1;
    return (a.scoreActual ?? 9) - (b.scoreActual ?? 9);
  });
}

/**
 * CUÁNTAS SEMANAS SEGUIDAS VIENE SOSTENIDO UN SEGUIMIENTO, contando para atrás
 * desde la semana de `hoy`.
 *
 * Una semana cuenta como sostenida si tiene **al menos una marca**. No pide un
 * mínimo por semana a propósito: el objetivo de hábito es *que deje de
 * costarte*, y eso se mide en que no lo abandonaste, no en cuántas veces.
 *
 * ⚠️ LA SEMANA EN CURSO NO ROMPE LA CUENTA SI TODAVÍA ESTÁ VACÍA. Es lunes a la
 * mañana y hace ocho semanas que sostenés algo: sin esta excepción la tarjeta
 * diría "0 semanas" hasta que marcaras, o sea que te castigaría por la hora del
 * día. Solo se saltea la semana actual, nunca una pasada.
 */
export function semanasSostenidas(fechas: string[], hoy: string): number {
  if (fechas.length === 0) return 0;
  const semanas = new Set(fechas.map(claveSemana));
  const actual = claveSemana(hoy);

  let cuenta = 0;
  let cursor = actual;
  // La semana en curso vacía no corta: se salta y se sigue contando para atrás.
  if (!semanas.has(cursor)) cursor = semanaAnterior(cursor);
  while (semanas.has(cursor)) {
    cuenta += 1;
    cursor = semanaAnterior(cursor);
  }
  return cuenta;
}

/** Cómo viene un hábito: cuántas semanas lleva y si ya llegó. */
export function progresoHabito(fechas: string[], hoy: string): { semanas: number; falta: number; llego: boolean } {
  const semanas = semanasSostenidas(fechas, hoy);
  return { semanas, falta: Math.max(0, SEMANAS_HABITO - semanas), llego: semanas >= SEMANAS_HABITO };
}

/**
 * ¿ESTE OBJETIVO DE RUEDA YA SE CUMPLIÓ?
 *
 * ⚠️ NO CIERRA NADA SOLO, Y ESO ES A PROPÓSITO. Devuelve el veredicto para que
 * la tarjeta lo diga y vos decidas; cerrar un objetivo por su cuenta sería que
 * la app dé por terminado algo tuyo mirando un número. La bitácora dejó la regla
 * de cierre anotada y sin definir, así que acá se mide y se muestra.
 */
export function llegoLaRueda(o: { scoreHasta: number | null }, scoreActualDelArea: number | null): boolean {
  if (o.scoreHasta == null || scoreActualDelArea == null) return false;
  return scoreActualDelArea >= o.scoreHasta;
}

/** El lunes de la semana de una fecha YYYY-MM-DD, como clave comparable. */
function claveSemana(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  // getDay(): 0 = domingo. La semana arranca el lunes, así que el domingo
  // retrocede 6 y no 0 — el error clásico que mete un salto de semana.
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function semanaAnterior(clave: string): string {
  const d = new Date(`${clave}T00:00:00`);
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

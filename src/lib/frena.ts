/**
 * QUÉ TE FRENA HOY, SI ALGO.
 *
 * La tarjeta de pantalla completa (pedido 1.8) arrancó mirando solo las tres
 * señales del día. Matías, apenas la vio funcionar (04/08): *"incluso después, si
 * estoy siguiendo algo de alimentación o de finanzas, también estaría bueno algo
 * así"*.
 *
 * Esto decide cuál de todos los candidatos usa el único permiso del día.
 *
 * ── ⚠️⚠️ LA REGLA QUE NO SE NEGOCIA ─────────────────────────────────────────
 *
 * **EL "UNA VEZ POR DÍA" ES DE LA TARJETA, NO DE CADA TEMA.** Si Alimentación y
 * Finanzas pudieran frenar por su cuenta, serían tres pantallas completas por
 * día y la función se volvería exactamente lo que 1.8 vino a evitar. Por eso
 * esta función devuelve UNO o ninguno, nunca una lista.
 *
 * Lo que cambia al sumar apartados no es cuántas veces frena: es quién puede
 * usar el permiso cuando el sueño y el ánimo ya están cargados.
 */

export type Candidato = {
  /** Se escribe después de "Te falta". */
  texto: string;
  clave: 'sueno' | 'animo' | 'comida' | 'aporte';
};

export type EstadoDelDia = {
  cargoSueno: boolean;
  cargoAnimo: boolean;
  cargoSenal: boolean;
  /** Cuántas comidas anotó hoy. */
  comidasHoy: number;
  /** Hora local, 0-23. Decide si preguntar por la comida ya tiene sentido. */
  hora: number;
  /**
   * Días desde el último aporte a un objetivo de plata activo. `null` si no hay
   * ningún objetivo de plata activo — sin objetivo no hay nada que reclamar.
   */
  diasSinAportar: number | null;
};

/**
 * ⚠️ ANTES DE LAS 15 NO SE PREGUNTA POR LA COMIDA. A las 9 de la mañana no haber
 * comido no es un dato que falte: es un martes. Frenar ahí sería inventar un
 * hueco donde no hay ninguno, que es la misma trampa que "0 de 300" en el techo
 * de gastos — no comer y no anotar son cosas distintas, y a la mañana ni
 * siquiera hay qué anotar.
 */
const HORA_COMIDA = 15;

/**
 * ⚠️ DOS SEMANAS, Y ES DELIBERADAMENTE LARGO. Un objetivo de plata no se mueve
 * todos los días: apartás cuando cobrás. Con un umbral corto, la tarjeta pasaría
 * de avisar a insistir por plata, que es donde más incomoda y donde la app ya
 * decidió no opinar. A los 14 días sí es un hecho que vale contar.
 */
const DIAS_SIN_APORTAR = 14;

/**
 * Con dos de tres señales cargadas, la tarjeta ya no avisa de un día vacío: pide
 * la última que falta. Eso es el pedido con culpa que no se hace.
 */
const SENALES_PARA_NO_FRENAR = 2;

/**
 * El único candidato del día, o `null`.
 *
 * ⚠️ EL ORDEN ES UNA PRIORIDAD, NO UN GUSTO. Si faltan dos cosas, frenar por la
 * menos explicativa gasta el permiso en lo que menos importa:
 *
 *  1. **Sueño** — el caso que Matías nombró textual, y de lo que más explica
 *     cómo venís.
 *  2. **Ánimo** — el otro que se cierra una vez por día.
 *  3. **Comida** — recién a la tarde, y solo si no anotó ninguna.
 *  4. **Aporte** — lo último, y con dos semanas de umbral: es un seguimiento, no
 *     una rutina diaria.
 */
export function queTeFrena(e: EstadoDelDia): Candidato | null {
  const senales = [e.cargoSueno, e.cargoAnimo, e.cargoSenal].filter(Boolean).length;

  // Las dos del día, primero. Solo si el día está mayormente vacío.
  if (senales < SENALES_PARA_NO_FRENAR) {
    if (!e.cargoSueno) return { texto: 'el sueño de anoche', clave: 'sueno' };
    if (!e.cargoAnimo) return { texto: 'cómo estuvo tu día', clave: 'animo' };
  }

  // Lo que venís siguiendo. ⚠️ Estos NO miran `senales`: son de otra naturaleza.
  // Podés tener el día entero cargado y hace tres semanas sin tocar Finanzas.
  if (e.comidasHoy === 0 && e.hora >= HORA_COMIDA) {
    return { texto: 'lo que comiste hoy', clave: 'comida' };
  }

  if (e.diasSinAportar != null && e.diasSinAportar >= DIAS_SIN_APORTAR) {
    return { texto: 'apartar algo para lo que estás juntando', clave: 'aporte' };
  }

  return null;
}

/**
 * Cuánto del día está registrado, de 0 a 1. Es lo que dibuja el anillo.
 *
 * Se mide sobre las TRES señales del día y no sobre los candidatos: el anillo
 * dice cuánto llevás de hoy, y un aporte de hace dos semanas no es parte de hoy.
 */
export function progresoDelDia(e: EstadoDelDia): number {
  return [e.cargoSueno, e.cargoAnimo, e.cargoSenal].filter(Boolean).length / 3;
}

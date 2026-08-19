import { titular } from '@/lib/titulos';

/**
 * "HOY, DE UN TOQUE" — las actividades del día, marcables desde el Home.
 *
 * Pedido que sale de medir el uso real (07/08): en 47 días **marcó 43 y escribió
 * 17**. Marcar es lo que viene a hacer todos los días, y hasta hoy el Home no
 * tenía dónde hacerlo: había que ir a Seguimiento. Ver
 * `docs/maquetas/2026-08-07-home.html`, pieza 3.
 *
 * ── ⚠️⚠️ ESTO NO CONTRADICE LA DECISIÓN DEL 31/07, Y CONVIENE ENTENDER POR QUÉ ─
 *
 * Ese día se probó **un chip por actividad DENTRO de "Anotar rápido"** y Matías
 * lo bajó en veinte minutos: *"no quiero que aparezcan las actividades por
 * hacer, sino simplemente que te mande a seguimiento"*. Los dos motivos de
 * entonces siguen siendo ciertos, así que esta fila los respeta los dos:
 *
 *  1. **Mezclaba dos niveles.** "Anotar rápido" es una fila de TIPOS DE REGISTRO
 *     (ánimo, comida, gasto); meter ahí Bouldern y Leer es otra clase de cosa.
 *     → Acá van en un **grupo aparte, con su propio rótulo**. No se mezclan.
 *  2. **La fila crecía con cada actividad**: cinco más y era un menú.
 *     → Acá hay **tope**, y lo que sobra se resume en un "+N" que abre
 *       Seguimiento. La fila no puede crecer nunca.
 *
 * ── EL ORDEN ES ESTABLE, Y NO SE REORDENA AL MARCAR ──────────────────────────
 *
 * ⚠️ La tentación era mandar las hechas al final, como hace `pesoChip` en
 * "Anotar rápido". **Acá sería un bug**: con tope, la que acabás de marcar se
 * iría al fondo y **caería fuera de la fila**, o sea que tocás un chip, se pone
 * verde y desaparece. El tilde ya distingue lo hecho de lo pendiente; mover el
 * chip además de pintarlo es cambiarle el piso al dedo.
 *
 * Y el orden que llega —`ultimaActividad` desc— **no se mueve al marcar**:
 * `pintarDia` no toca ese campo justamente por esto (ver su nota).
 */

export type ChipDeHoy = {
  id: number;
  /** Ya recortado para el chip. */
  titulo: string;
  hecha: boolean;
};

/**
 * Cuántas entran antes de que la fila se lea como un menú. Cuatro es lo que
 * entra en una línea de teléfono con nombres de verdad, y es lo que dibuja la
 * maqueta (cuatro chips y un "+2").
 */
export const TOPE_CHIPS_HOY = 4;

/** Largo del rótulo del chip. Un nombre largo hace que la fila entre en dos
 *  líneas y la fila deja de ser una fila. */
const LARGO_ROTULO = 18;

/**
 * Las actividades que van a la fila de hoy, y cuántas quedan afuera.
 *
 * ⚠️ SOLO LAS DIARIAS. Una tarea de una sola vez ("Renovar el pasaporte") no se
 * pinta día a día: ofrecerle un tilde de hoy sería prometer un seguimiento que
 * no existe. Esas ya las nombra el bot, que es donde viven desde el 29/07.
 */
export function chipsDeHoy(
  actividades: { id: number; titulo: string; diaria: boolean; marcadaHoy: boolean }[],
  tope: number = TOPE_CHIPS_HOY,
): { visibles: ChipDeHoy[]; resto: number } {
  const diarias = actividades.filter((a) => a.diaria);

  // ⚠️ UN "+1" NO AHORRA NADA: ocupa el mismo lugar que el chip que esconde, y
  // encima obliga a salir de la pantalla para ver una sola cosa. Cuando sobra
  // exactamente una, entra.
  const cuantas = diarias.length === tope + 1 ? diarias.length : Math.max(0, tope);

  const visibles = diarias.slice(0, cuantas).map((a) => ({
    id: a.id,
    titulo: titular(a.titulo, LARGO_ROTULO),
    hecha: a.marcadaHoy,
  }));

  return { visibles, resto: diarias.length - visibles.length };
}

/**
 * Cuántas te quedan por marcar hoy. Es lo que decide si la fila tiene algo que
 * ofrecer: con todas marcadas sigue apareciendo —el tilde es la recompensa de
 * haberlas cerrado, y esconderla borraría la única prueba— pero el resto de la
 * app puede querer saberlo.
 */
export function faltanHoy(actividades: { diaria: boolean; marcadaHoy: boolean }[]): number {
  return actividades.filter((a) => a.diaria && !a.marcadaHoy).length;
}


/**
 * ── ⚠️⚠️ ACOMODAR LOS CHIPS PARA QUE NO QUEDE UN HUECO A LA DERECHA ──────────
 *
 * Matías, mirando el Home: *"queda un espacio enorme a la derecha; subí alguno
 * de las actividades hacia arriba para que no quede ese espacio"*.
 *
 * El problema es de `flex-wrap`: **corta el renglón donde no entra el siguiente
 * chip y no mira si alguno más chico entraría**. Con "Llamar familia" después de
 * dos largos, el renglón se corta y queda vacío el ancho de ese chip — aunque
 * "Leer", que sí entraba, esté esperando abajo.
 *
 * ── POR QUÉ SE REORDENA ACÁ Y NO SE MIDE EN EL NAVEGADOR ────────────────────
 *
 * Medir de verdad exige montar los chips, leer sus anchos y reordenarlos: eso es
 * **un salto visible** cada vez que abrís el Home. Acá se estima el ancho a
 * partir del texto y el orden sale ya resuelto del server, sin parpadeo.
 *
 * ⚠️ Y ES ESTABLE, que es lo que importa: el ancho depende del TÍTULO, y el
 * título no cambia cuando marcás. **Marcar no reacomoda nada** — que es la regla
 * que ya protegía `chipsDeHoy` cuando decidió no ordenar por hecho/pendiente.
 *
 * ── CÓMO ACOMODA ────────────────────────────────────────────────────────────
 *
 * Primero en orden; cuando el que sigue no entra en el renglón, **busca más
 * adelante el primero que sí entre y lo sube**. No es un reordenamiento
 * completo: es el mínimo desorden que tapa el hueco, así que la lista se sigue
 * pareciendo a la original.
 */

/** Ancho aproximado de un chip, en px: padding + aro + separación + texto. */
export function anchoAproximado(titulo: string): number {
  // 7 izq + 10 der + aro 13 + gap 6 + borde 2 ≈ 38, y ~6,5px por carácter a 12px
  // semibold. No hace falta que sea exacto: alcanza con ordenar bien.
  return 38 + titulo.length * 6.5;
}

/**
 * Ancho de contenido que se asume para el Home.
 *
 * ⚠️ ES UNA SUPOSICIÓN Y ESTÁ BIEN QUE LO SEA. La pantalla más angosta que
 * importa es un iPhone de 390px menos los 22px de margen de cada lado = 346.
 * Se usa 340 para dejar un colchón: **si la estimación se pasa, el renglón
 * envuelve solo y queda como antes** — o sea, el peor caso de equivocarse es el
 * comportamiento que ya teníamos, no algo roto.
 */
export const ANCHO_FILA = 340;

/** Separación entre chips (`gap-2`). */
const GAP = 8;

/**
 * Los mismos chips, reordenados para que sobre lo menos posible a la derecha.
 *
 * ⚠️ NO SACA NI AGREGA NINGUNO: devuelve exactamente los que entran, en otro
 * orden. Si se perdiera uno acá, el usuario no tendría cómo notarlo.
 */
export function acomodar<T extends { titulo: string }>(chips: T[], ancho: number = ANCHO_FILA): T[] {
  const quedan = [...chips];
  const salida: T[] = [];
  let libre = ancho;

  while (quedan.length > 0) {
    // El primero que entre en lo que queda del renglón.
    let i = quedan.findIndex((c) => anchoAproximado(c.titulo) <= libre);

    if (i === -1) {
      // No entra ninguno: se abre renglón nuevo y va el que seguía en orden.
      // ⚠️ Y NO el más ancho ni el más angosto: abrir renglón es empezar de
      // cero, y ahí lo que corresponde es respetar el orden original.
      libre = ancho;
      i = 0;
    }

    const [elegido] = quedan.splice(i, 1);
    salida.push(elegido);
    libre -= anchoAproximado(elegido.titulo) + GAP;
  }

  return salida;
}

/**
 * ACCIONES: LA ARITMÉTICA, Y NADA MÁS QUE LA ARITMÉTICA.
 *
 * Pedido de Matías el 04/08: *"compro acciones, vuelvo a comprar, y después no
 * sé si me conviene venderlas y volver a comprar, porque no sé si está más alto
 * o más bajo"*.
 *
 * ── ⚠️⚠️ LA LÍNEA QUE ESTE ARCHIVO NO CRUZA ─────────────────────────────────
 *
 * **Acá no hay una sola función que devuelva una opinión.** No hay `conviene()`,
 * no hay `recomendar()`, no hay `deberiasVender()`. Todo lo que sale de este
 * módulo es una resta o una división sobre números que puso él.
 *
 * Y no es una precaución mía: es la condición que él mismo puso al aprobarlo
 * (§0.13). *"Está bueno que no aconseje qué invertir, solo que sea un buscador y
 * que puedas buscar uno que te interesa."* Recomendar instrumentos financieros
 * en la UE es asesoramiento de inversión y necesita licencia — a diferencia de
 * *"gastás mucho en salidas"*, que era una cuestión de tono.
 *
 * Es el mismo mecanismo que `objetivo-plata.ts`: **movés vos, la app hace la
 * cuenta.**
 *
 * ── ⚠️ POR QUÉ HAY DOS COMPARACIONES Y NO UNA ────────────────────────────────
 *
 * Contra el PROMEDIO contesta *"¿gano o pierdo con esto?"*. Contra la ÚLTIMA
 * COMPRA contesta la pregunta que él hizo textual: *"si vuelvo a comprar, ¿está
 * más alto o más bajo que la vez pasada?"*. Son preguntas distintas y una no se
 * deduce de la otra: podés estar arriba del promedio y abajo de tu última
 * compra. Mostrar solo el promedio dejaba su pregunta sin contestar.
 */

export type Compra = {
  /** Cuántas. Puede ser fraccionaria: hay brókers que venden trozos. */
  cantidad: number;
  /** Lo que pagaste por cada una. */
  precio: number;
  /** YYYY-MM-DD */
  fecha: string;
};

export type Papel = {
  simbolo: string;
  nombre: string;
  /** El último precio conocido, o `null` si todavía no hay ninguno. */
  precio: number | null;
  compras: Compra[];
};

/** Una compra sirve si los dos números son números y la cantidad no es cero. */
function valida(c: Compra): boolean {
  return Number.isFinite(c.cantidad) && Number.isFinite(c.precio) && c.cantidad > 0 && c.precio >= 0;
}

export function comprasValidas(compras: Compra[]): Compra[] {
  return compras.filter(valida);
}

/** Cuántas tenés en total. */
export function cantidadTotal(compras: Compra[]): number {
  return comprasValidas(compras).reduce((n, c) => n + c.cantidad, 0);
}

/** Cuánto pusiste en total. */
export function invertido(compras: Compra[]): number {
  return comprasValidas(compras).reduce((n, c) => n + c.cantidad * c.precio, 0);
}

/**
 * El precio promedio, PONDERADO POR CANTIDAD.
 *
 * ⚠️ NO ES EL PROMEDIO DE LOS PRECIOS. Si compraste 100 a 10 y 1 a 200, tu
 * promedio real es 11,88 y no 105: el promedio simple daría un número que no
 * corresponde a ninguna plata que hayas puesto, y de él sale la ganancia.
 */
export function promedio(compras: Compra[]): number | null {
  const cant = cantidadTotal(compras);
  if (!(cant > 0)) return null;
  return invertido(compras) / cant;
}

/** Cuánto valen hoy, al precio que sea. `null` si no hay precio. */
export function valorHoy(compras: Compra[], precio: number | null): number | null {
  if (precio == null || !Number.isFinite(precio)) return null;
  return cantidadTotal(compras) * precio;
}

export type Resultado = {
  /** En plata. Positivo si ganás. */
  euros: number;
  /** En por ciento sobre lo que pusiste. */
  pct: number;
};

/**
 * Lo que llevás ganado o perdido con TODO lo que tenés de ese papel.
 *
 * `null` cuando falta el precio de hoy o cuando no compraste nada: sin uno de
 * los dos no hay resta que hacer, y **devolver 0 sería decir "estás en cero",
 * que es una afirmación** — la misma trampa del "0 de 300" en el techo de
 * gastos.
 */
export function resultado(compras: Compra[], precio: number | null): Resultado | null {
  const puesto = invertido(compras);
  const vale = valorHoy(compras, precio);
  if (vale == null || !(puesto > 0)) return null;
  return { euros: vale - puesto, pct: ((vale - puesto) / puesto) * 100 };
}

/**
 * La ganancia de CADA COMPRA por separado, en plata y en porcentaje.
 *
 * Pedido textual del 04/08: *"cuánto ganás de cada compra, no solo del
 * promedio"*. Las que están en pérdida y las que están en ganancia se ven al
 * mismo tiempo, que es información que el promedio esconde por definición.
 *
 * Vienen ordenadas de la más vieja a la más nueva: es el orden en que las
 * hiciste, y el que deja la última abajo, donde la buscás.
 *
 * ⚠️ ES GENÉRICA PARA QUE EL `id` SOBREVIVA. La pantalla necesita poder borrar
 * una compra, y con un tipo fijo `Compra` la fila que sale de acá perdía el id:
 * había que volver a encontrarla comparando cantidad, precio y fecha. Dos
 * compras iguales el mismo día —comprar dos veces al mismo precio no es raro—
 * borraban la que no era.
 */
export function porCompra<T extends Compra>(compras: T[], precio: number | null): (T & Resultado)[] {
  if (precio == null || !Number.isFinite(precio)) return [];
  return compras
    .filter(valida)
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((c) => {
      const puesto = c.cantidad * c.precio;
      const vale = c.cantidad * precio;
      return { ...c, euros: vale - puesto, pct: puesto > 0 ? ((vale - puesto) / puesto) * 100 : 0 };
    });
}

/** La última compra por fecha, o `null`. Empate de fechas: la última cargada. */
export function ultimaCompra(compras: Compra[]): Compra | null {
  const v = comprasValidas(compras);
  if (v.length === 0) return null;
  return v.reduce((ult, c) => (c.fecha.localeCompare(ult.fecha) >= 0 ? c : ult));
}

/**
 * A cuánto está HOY contra lo que pagaste la última vez, en por ciento.
 *
 * ⚠️ ESTA ES LA FUNCIÓN QUE CONTESTA SU PREGUNTA, y por eso está separada del
 * promedio aunque la cuenta se parezca. *"No sé si está más alto o más bajo"* es
 * literalmente esto y nada más.
 */
export function contraUltimaCompra(compras: Compra[], precio: number | null): number | null {
  const ult = ultimaCompra(compras);
  if (!ult || precio == null || !Number.isFinite(precio) || !(ult.precio > 0)) return null;
  return ((precio - ult.precio) / ult.precio) * 100;
}

export type Cartera = {
  /** Cuánto valen hoy los papeles que TIENEN precio. */
  valor: number;
  /** Cuánto pusiste en esos mismos papeles. */
  puesto: number;
  euros: number;
  pct: number;
  /** Cuántos papeles quedaron afuera de la cuenta por no tener precio. */
  sinPrecio: number;
};

/**
 * El total: cuánto tenés, cuánto pusiste, y cuánto va de diferencia.
 *
 * ⚠️ LOS PAPELES SIN PRECIO NO SE CUENTAN NI COMO CERO NI COMO LO QUE PAGASTE, y
 * se informa cuántos son. Si un papel no trajo precio y se lo valuara al costo,
 * el total diría "no ganaste ni perdiste con este" — que es un dato inventado.
 * Dejarlo afuera y decir que quedó afuera es lo único cierto de las tres.
 *
 * ⚠️ Y NO MIRA LA MONEDA. Es la misma trampa que mordió en el gráfico de gastos
 * el 03/08 (sumaba EUR con pesos sin avisar): quien llame a esto tiene que
 * pasarle papeles de UNA moneda. La conversión no se inventa acá.
 */
export function cartera(papeles: Papel[]): Cartera {
  let valor = 0;
  let puesto = 0;
  let sinPrecio = 0;
  for (const p of papeles) {
    const vale = valorHoy(p.compras, p.precio);
    const puse = invertido(p.compras);
    if (vale == null || !(puse > 0)) {
      if (puse > 0) sinPrecio++;
      continue;
    }
    valor += vale;
    puesto += puse;
  }
  return {
    valor,
    puesto,
    euros: valor - puesto,
    pct: puesto > 0 ? ((valor - puesto) / puesto) * 100 : 0,
    sinPrecio,
  };
}

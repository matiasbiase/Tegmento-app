/**
 * LOS CABOS SUELTOS: de qué hablaste y quedó ahí (07/08).
 *
 * Pedido de Matías: *"le hablé que iba a hacer tal cosa y después quedó la
 * conversación ahí… el mismo bot te puede preguntar: ¿el otro día hablaste de
 * esto, qué pasó, lo seguiste? Veo que no está conectado con nada, ningún
 * seguimiento"*.
 *
 * ⚠️⚠️ LO QUE HACE ÚTIL A ESTO NO ES ACORDARSE, ES CRUZAR. Que la app te
 * pregunte por un tema del que hablaste no tiene ningún mérito: ya lo tiene
 * guardado. Lo que no tiene nadie es **el cruce entre lo que dijiste y lo que
 * después hiciste con eso**. Un tema que ya es una actividad o un objetivo no es
 * un cabo suelto: es algo que agarraste, y preguntar por él sería la app
 * haciéndose la desmemoriada. El cabo suelto es el que quedó sin enganchar en
 * ninguna parte.
 *
 * ⚠️ NO DECIDE NADA NI ESCRIBE NADA. Devuelve el tema y por qué lo eligió; la
 * pantalla arma la pregunta. Vive acá y no en el JSX por lo de siempre: una
 * cadena de reglas con fechas y comparaciones de texto no se testea adentro de
 * un componente.
 */

/** Días que tienen que pasar para que un tema cuente como "quedó ahí". */
export const DIAS_PARA_SER_CABO = 3;

/**
 * ⚠️ Y UN TECHO, QUE ES LA MITAD DE LA IDEA. Un tema del que hablaste hace tres
 * meses no es un cabo suelto: es algo que dejaste, y preguntarlo se siente como
 * que la app te revuelve el cajón. Lo que duele —y lo que sirve— es lo que
 * quedó a medio camino hace poco.
 */
export const DIAS_HASTA_OLVIDARLO = 30;

export type Cabo = {
  tema: string;
  /** Cuántos días hace que no lo tocás. */
  dias: number;
};

/** Sin tildes, en minúsculas y sin espacios de más: para comparar dos títulos. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // ⚠️ Escapado y no el carácter literal: un rango de marcas combinantes
    // escrito a mano es invisible en el editor y se rompe con cualquier
    // copiar-pegar entre archivos.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿ESTE TEMA YA SE CONVIRTIÓ EN ALGO?
 *
 * ⚠️ COMPARA EN LAS DOS DIRECCIONES, y hace falta: el tema suele ser más corto
 * que lo que creaste con él ("alemán" → "Alemán B2 para diciembre") pero
 * también puede ser más largo ("buscar trabajo de cuidados" → "buscar trabajo").
 * Con una sola dirección, la mitad de los enganches no se ven y la app pregunta
 * por cosas que vos ya agarraste — que es peor que no preguntar.
 */
export function yaSeEngancho(tema: string, titulos: string[]): boolean {
  const t = normalizar(tema);
  if (!t) return true;
  return titulos.some((x) => {
    const n = normalizar(x);
    if (!n) return false;
    return n.includes(t) || t.includes(n);
  });
}

/** Días enteros entre dos fechas YYYY-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00`);
  const b = Date.parse(`${hasta}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * LOS TEMAS QUE QUEDARON COLGANDO, del más reciente al más viejo.
 *
 * `temas` son los que ya salieron de las charlas (tabla `temas`, vía `chats`),
 * con la última vez que se habló de cada uno. `enganchados` son los títulos de
 * todo lo que existe hoy: actividades, tareas y objetivos.
 */
export function cabosSueltos(
  temas: { nombre: string; ultimaVez: string }[],
  enganchados: string[],
  hoy: string,
): Cabo[] {
  const vistos = new Set<string>();
  return temas
    .map((t) => ({ tema: t.nombre, dias: diasEntre(t.ultimaVez, hoy) }))
    .filter((c) => {
      if (!c.tema.trim()) return false;
      if (c.dias < DIAS_PARA_SER_CABO || c.dias > DIAS_HASTA_OLVIDARLO) return false;
      if (yaSeEngancho(c.tema, enganchados)) return false;
      // Un mismo tema puede venir de varios chats: se queda con el más reciente,
      // que es el primero porque la lista llega ordenada.
      const clave = normalizar(c.tema);
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .sort((a, b) => a.dias - b.dias);
}

/**
 * CUÁL PREGUNTAR HOY.
 *
 * ⚠️ UNO SOLO, Y EL MISMO TODO EL DÍA. Dos preguntas juntas se leen como una
 * lista de tareas pendientes —justo lo que esta app no quiere ser— y una que
 * cambia en cada refresh es desconcertante. La elección rota por día: el índice
 * sale del día del año, así que mañana toca otro sin guardar nada.
 *
 * ⚠️ Y EMPIEZA POR EL MÁS FRESCO (`cabosSueltos` ya viene ordenado): lo de hace
 * cuatro días todavía está vivo en la cabeza; lo de hace tres semanas hay que
 * reconstruirlo antes de poder contestarlo.
 */
export function caboDelDia(cabos: Cabo[], hoy: string): Cabo | null {
  if (cabos.length === 0) return null;
  const d = new Date(`${hoy}T00:00:00`);
  const diaDelAno = Math.floor((d.getTime() - Date.parse(`${d.getFullYear()}-01-01T00:00:00`)) / 86_400_000);
  // Se mira solo entre los tres más frescos: rotar sobre veinte los convierte en
  // un archivo que se recita, no en una pregunta.
  const candidatos = cabos.slice(0, 3);
  return candidatos[diaDelAno % candidatos.length];
}

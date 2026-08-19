/**
 * Los días que una nota borrada sigue existiendo antes de irse de verdad.
 *
 * ⚠️ VIVE ACÁ Y NO EN `actions/notas.ts`, y no es una preferencia: **un archivo
 * `'use server'` solo puede exportar funciones async.** Exportar la constante
 * desde ahí compila con `tsc` y **rompe el build de Next** — lo cazó
 * `build:check` el 06/08, no el typecheck. Es la tercera forma de "pasa tsc y
 * no anda" que encontramos.
 */
export const DIAS_PAPELERA = 7;

/**
 * Las claves válidas del ícono de una nota.
 *
 * ⚠️ VIVE ACÁ Y NO EN `IconoNota.tsx` porque la necesita una server action, y
 * ese archivo trae JSX: importarlo desde el server arrastraría React adentro de
 * una acción. La lista de allá se arma con estas mismas claves.
 */
export const CLAVES_ICONO_NOTA = new Set([
  'idea',
  'trabajo',
  'plata',
  'cuerpo',
  'comida',
  'viaje',
  'estudio',
  'gente',
  'casa',
  'importante',
]);

/**
 * Notas: el lugar donde se escribe SIN que nada lea de vuelta (30/07).
 *
 * Todo lo de acá es puro y sin base de datos: la pantalla y las acciones lo
 * usan, y los tests lo prueban sin levantar nada.
 *
 * La decisión que gobierna el archivo: **el título es el primer renglón**, como
 * en Notas de Apple. No hay campo de título aparte, así que "partir" el texto es
 * la operación central y todo lo demás (listar, buscar, ordenar) cuelga de ella.
 */

export type Nota = {
  id: number;
  titulo: string;
  cuerpo: string;
  carpeta: string | null;
  /** Identificador visual, uno solo y opcional (04/08). Ver `notas.emoji` en el
   *  schema: es identidad, no clasificación. */
  emoji?: string | null;
  /**
   * VARIAS, y las ponés vos (04/08, §0.12c). No confundir con `carpeta`, que es
   * UNA y dice dónde vive la nota: estas dicen de qué es. Ni con `temas`, que lo
   * pone el modelo — ver el docstring de la tabla `etiquetas` en el schema, que
   * guarda por qué no se reusó.
   */
  etiquetas?: string[];
  /** La IA la lee, la pantalla no la muestra. Ver la nota de `notas.privada` en
   *  el schema. */
  privada?: boolean;
  creado: string;
  actualizado: string;
};

/** Lo que se muestra en lugar del título cuando la nota está bajo llave. */
export const TITULO_PRIVADO = 'Nota privada';

/**
 * ¿Esta nota se puede mostrar en pantalla ahora mismo?
 *
 * ⚠️ UNA SOLA FUNCIÓN PARA TODAS LAS SUPERFICIES, y es a propósito: la lista, la
 * búsqueda y cualquier lugar futuro que muestre notas tienen que preguntar acá.
 * Si cada pantalla decide por su cuenta, alcanza con que una se olvide para que
 * lo privado aparezca — y una promesa de privacidad que falla una vez ya no vale
 * nada.
 */
export function seMuestra(nota: Pick<Nota, 'privada'>, desbloqueado: boolean): boolean {
  return !nota.privada || desbloqueado;
}

/** Lo que se muestra cuando la nota todavía no tiene primer renglón. */
export const SIN_TITULO = 'Sin título';

/**
 * Parte el texto crudo del editor en título (primer renglón) y cuerpo (el resto).
 *
 * ⚠️ El cuerpo conserva los renglones vacíos del medio y solo se le saca el
 * salto que lo separa del título. Si se hiciera `.trim()` al cuerpo entero, una
 * nota que arranca con un renglón en blanco a propósito (para despegar el título
 * del texto) perdería ese aire en cada guardado — y como se guarda mientras se
 * escribe, el texto se movería solo abajo del cursor.
 */
export function partirNota(texto: string): { titulo: string; cuerpo: string } {
  const salto = texto.indexOf('\n');
  if (salto === -1) return { titulo: texto.trim(), cuerpo: '' };
  return { titulo: texto.slice(0, salto).trim(), cuerpo: texto.slice(salto + 1) };
}

/** Vuelve a armar el texto del editor a partir de lo guardado. */
export function unirNota(titulo: string, cuerpo: string): string {
  if (!cuerpo) return titulo;
  return `${titulo}\n${cuerpo}`;
}

/** El título para mostrar en una lista: nunca vacío. */
export function tituloVisible(nota: Pick<Nota, 'titulo' | 'privada'>, desbloqueado = false): string {
  // ⚠️ El título de una nota privada NO se muestra ni aunque sea inocente: es el
  // primer renglón que escribió, o sea justo lo que la vuelve reconocible.
  if (nota.privada && !desbloqueado) return TITULO_PRIVADO;
  return nota.titulo.trim() || SIN_TITULO;
}

/**
 * El renglón de vista previa de la lista: el cuerpo aplastado a una línea.
 *
 * Aplastar los saltos importa porque la lista corta a dos líneas por CSS: sin
 * esto, una nota que arranca con tres renglones cortos ocupaba las dos líneas
 * con dos palabras y no se veía nada de lo que decía.
 */
export function resumenNota(cuerpo: string, max = 140): string {
  const plano = cuerpo.replace(/\s+/g, ' ').trim();
  if (plano.length <= max) return plano;
  return `${plano.slice(0, max).replace(/[\s,;.]+\S*$/, '')}…`;
}

/** ¿La nota está vacía del todo? Las así no se guardan. */
export function notaVacia(texto: string): boolean {
  return !texto.trim();
}

export type Orden = 'recientes' | 'alfabetico';

/**
 * Ordena para la lista.
 *
 * `alfabetico` compara con `localeCompare` en español para que las tildes y la
 * ñ caigan donde corresponde: con una comparación cruda, "Ánimo" se iba después
 * de "Zapatos" y "ñoquis" al final de todo.
 */
export function ordenarNotas<T extends Pick<Nota, 'titulo' | 'actualizado'>>(notas: T[], orden: Orden): T[] {
  const copia = [...notas];
  if (orden === 'alfabetico') {
    return copia.sort((a, b) => tituloVisible(a).localeCompare(tituloVisible(b), 'es', { sensitivity: 'base' }));
  }
  // Más nueva primero. El desempate por título deja el orden estable cuando dos
  // notas se guardaron en el mismo milisegundo (pasa al crear varias seguidas).
  return copia.sort((a, b) => b.actualizado.localeCompare(a.actualizado) || tituloVisible(a).localeCompare(tituloVisible(b)));
}

/** Días que cuentan como "reciente" en el filtro de la barra de funciones. */
const DIAS_RECIENTE = 7;

export function esReciente(iso: string, ahora: Date = new Date()): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return ahora.getTime() - t <= DIAS_RECIENTE * 86_400_000;
}

export type Filtro = {
  texto?: string;
  carpeta?: string | null;
  soloRecientes?: boolean;
  /** Nombre de una etiqueta. `undefined` = no filtrar por etiqueta (04/08). */
  etiqueta?: string;
  /** Si la llave está abierta en esta sesión. Sin esto, las privadas quedan
   *  fuera de la búsqueda. */
  desbloqueado?: boolean;
};

/**
 * Aplica los filtros de la barra de funciones.
 *
 * La búsqueda mira título Y cuerpo, sin distinguir mayúsculas ni tildes: acá se
 * escribe rápido y sin acentos, así que buscar "animo" tiene que encontrar
 * "ánimo" o la función no sirve para nada.
 */
export function filtrarNotas(notas: Nota[], filtro: Filtro, ahora: Date = new Date()): Nota[] {
  const aguja = normalizar(filtro.texto ?? '');
  return notas.filter((n) => {
    if (filtro.soloRecientes && !esReciente(n.actualizado, ahora)) return false;
    // `undefined` es "no filtrar por carpeta"; `null` es "las que no tienen".
    if (filtro.carpeta !== undefined && (n.carpeta ?? null) !== filtro.carpeta) return false;
    // ⚠️ LA ETIQUETA SE COMPARA NORMALIZADA, igual que al ponerla: si acá se
    // compara literal y allá con `claveTema`, filtrar por "Trabajo" no encuentra
    // la nota que quedó guardada como "trabajo" — y la etiqueta parecería vacía.
    if (filtro.etiqueta !== undefined && !(n.etiquetas ?? []).some((e) => normalizar(e) === normalizar(filtro.etiqueta!))) {
      return false;
    }
    if (!aguja) return true;
    // ⚠️ LO PRIVADO NO SE BUSCA MIENTRAS ESTÁ BAJO LLAVE, y es el agujero menos
    // obvio de toda la función: si el buscador la encontrara, el solo hecho de
    // que aparezca al tipear una palabra ya cuenta lo que dice adentro — aunque
    // el título salga tapado. Con la llave abierta se busca como cualquier otra.
    if (n.privada && !filtro.desbloqueado) return false;
    return normalizar(`${n.titulo} ${n.cuerpo}`).includes(aguja);
  });
}

/** Minúsculas y sin tildes, para comparar lo que se escribe con lo guardado. */
export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Las carpetas que existen, con cuántas notas tiene cada una.
 *
 * Salen de las notas y no de una tabla de carpetas: una carpeta sin ninguna nota
 * adentro no tiene por qué seguir existiendo, y así borrar la última nota la
 * limpia sola. (Es lo contrario de lo que pasó con las carpetas de chats, donde
 * quedaban vacías y hubo que agregar un botón para borrarlas.)
 */
export function carpetasDe(notas: Nota[]): { nombre: string; cuantas: number }[] {
  const cuenta = new Map<string, number>();
  for (const n of notas) {
    const c = n.carpeta?.trim();
    if (!c) continue;
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([nombre, cuantas]) => ({ nombre, cuantas }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/**
 * EL ARRANQUE DE OBJETIVOS: la pregunta del Home y lo que la app ya ve.
 *
 * Es la pieza 3 de `docs/maquetas/2026-07-30-objetivos.html`, la única que
 * quedaba sin escribir. Hace dos cosas, y la segunda es la que importa:
 *
 *   1. La pregunta ("¿hay algo grande en lo que venís, sin fecha de entrega?").
 *   2. **Lo que ya detecta en lo que Matías viene haciendo**, para volverlo
 *      objetivo con un toque. Preguntar sin proponer le deja todo el trabajo al
 *      usuario: "alemán, desde marzo" ya es un objetivo esperando nombre.
 *
 * ── LA TEMPERATURA, Y POR QUÉ NO SE CUENTAN LAS VECES ────────────────────────
 *
 * ⚠️ **NADA DE "96 VECES DESDE MARZO".** La maqueta lo decía así y Matías lo
 * marcó el 30/07: *"no me gusta el noventa y seis veces, veinte veces; me gusta
 * más activo, caliente. No decir 'estás haciendo poco', pero 'está frío' ya te
 * da una pauta y no te castiga"*.
 *
 * Tiene razón por dos motivos distintos, y los dos ya están escritos en otra
 * parte de la app:
 *
 *   - **Un número con denominador se lee como una medición.** Es exactamente lo
 *     que se resolvió el 29/07 en `lib/cuerpo.ts` con `nivelSenal()`: la energía
 *     se sigue guardando del 1 al 5 y se muestra Alto / Medio / Bajo. Acá igual:
 *     las marcas se siguen contando —el arco las necesita— pero afuera va una
 *     palabra.
 *   - **"Estás haciendo poco" juzga a la persona; "está frío" describe la
 *     cosa.** Es la regla de "nada de arengas" de `lib/objetivos.ts` mirada del
 *     otro lado: una app que no puede felicitarte tampoco puede retarte. La
 *     temperatura habla del objetivo, no de vos, y sin embargo da la pauta.
 *
 * La escala tiene CUATRO posiciones y ningún porcentaje, por lo mismo que la
 * barrita de Relaciones tiene tres: un número exacto suena a medición cuando
 * esto es una lectura gruesa.
 */

import { asociaA } from '@/lib/objetivos-auto';
import { diasEntre, type Movimiento } from '@/lib/objetivos';

/** Días hacia atrás que se miran para tomarle la temperatura a algo. */
const VENTANA = 30;
/** Hasta acá, lo de "recién". Más viejo que esto ya no calienta nada. */
const RECIENTE = 10;
/** Cuántos movimientos recientes hacen falta para que sea "caliente". */
const PARA_CALIENTE = 3;

/**
 * La clave de config que apaga la pregunta del Home para siempre.
 *
 * ⚠️ VIVE ACÁ Y NO EN `actions/objetivos.ts`, que sería su lugar natural: un
 * archivo `'use server'` SOLO puede exportar funciones async, y una constante
 * de más ahí rompe el build entero. No lo ve `tsc` ni lo ven los tests — salta
 * recién en `next build`.
 */
export const CLAVE_ARRANQUE = 'objetivos_arranque';

export type Temperatura = 'caliente' | 'activo' | 'templado' | 'frío';

/**
 * Qué tan viva está una cosa AHORA. Null cuando nunca se movió: sin un solo
 * movimiento no hay nada que describir, y "frío" sonaría a reproche por algo
 * que todavía no empezó.
 *
 * ⚠️ "Caliente" pide DENSIDAD, no solo que sea reciente. Si alcanzara con un
 * movimiento, tocar algo una vez después de seis meses quietos lo pintaría de
 * caliente, y esa es justo la clase de exageración que hace desconfiar del
 * resto de la pantalla.
 */
export function temperatura(movimientos: Pick<Movimiento, 'fecha'>[], hoy: string): Temperatura | null {
  if (movimientos.length === 0) return null;

  const enVentana = movimientos.filter((m) => m.fecha <= hoy && diasEntre(m.fecha, hoy) <= VENTANA);
  if (enVentana.length === 0) return 'frío';

  const recientes = enVentana.filter((m) => diasEntre(m.fecha, hoy) <= RECIENTE);
  if (recientes.length >= PARA_CALIENTE) return 'caliente';
  if (recientes.length > 0) return 'activo';
  return 'templado';
}

/**
 * La temperatura dicha como se dice en voz alta.
 *
 * ⚠️ Ninguna de las cuatro manda a hacer nada, y eso es el punto entero. "Está
 * frío" es una descripción; "retomalo" sería una orden, y en el momento en que
 * la app da órdenes deja de ser un diario y pasa a ser una app de hábitos con
 * culpa incorporada.
 */
export function temperaturaEnPalabras(t: Temperatura): string {
  switch (t) {
    case 'caliente':
      return 'viene caliente';
    case 'activo':
      return 'viene activo';
    case 'templado':
      return 'viene bajando';
    case 'frío':
      return 'está frío';
  }
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * "desde marzo", o "desde marzo del año pasado" si cruzó de año.
 *
 * El mes y no la fecha exacta a propósito: lo que hace que algo parezca un
 * objetivo es el largo del arco, y "12/03/2026" obliga a hacer la cuenta de
 * cabeza para entender que son meses.
 */
export function desdeMes(iso: string, hoy: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const h = new Date(`${hoy}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const mes = MESES[d.getMonth()];
  const anios = h.getFullYear() - d.getFullYear();
  if (anios === 0) return `desde ${mes}`;
  if (anios === 1) return `desde ${mes} del año pasado`;
  return `desde ${mes} de ${d.getFullYear()}`;
}

// ── LO QUE LA APP YA VE ──────────────────────────────────────────────────────

/**
 * Cuántos días tiene que abarcar algo para sonar a objetivo y no a costumbre de
 * la semana pasada.
 *
 * Seis semanas, y el número sale de la frase que se muestra: la sugerencia dice
 * "desde marzo", y para que un mes signifique algo tiene que haber quedado
 * atrás. Con veinte días de arco, un 30 de julio, la fila diría "desde julio",
 * que se lee como "hace unos días" y le saca a la propuesta lo único que la
 * sostiene. No es la frontera de `granularidad` (esa está en 60 y decide otra
 * cosa: cuándo el gráfico pasa de semanas a meses).
 */
const ARCO_MINIMO = 42;
/**
 * Y cuántas veces. Un arco largo con tres marcas sueltas no es algo "en lo que
 * venís", es algo que probaste tres veces en dos meses.
 */
const MARCAS_MINIMAS = 12;

export type Candidato = {
  /** El título de la actividad, tal cual: es el nombre que él le puso. */
  titulo: string;
  /** Primera marca, YYYY-MM-DD. */
  desde: string;
  /** Para ordenar y para el texto. NUNCA se muestra como número. */
  dias: number;
  temperatura: Temperatura;
  /** "desde marzo, y viene caliente" */
  frase: string;
};

/**
 * Lo que ya viene haciendo y todavía no es un objetivo.
 *
 * ⚠️ **SALE DE LAS MARCAS, SIN IA Y SIN INVENTAR NADA.** Es el mismo criterio
 * que `movimientosAutomaticos`: se cruza por nombre y listo. Matías puso el
 * límite él mismo el 30/07 (que la app no deduzca que una película en alemán
 * cuenta), y acá pesa todavía más: esto no cuenta horas, propone un objetivo. Si
 * propusiera mal, la propuesta se descarta sola con un toque; si contara mal,
 * el número quedaría mintiendo adentro de la pantalla para siempre.
 *
 * ⚠️ **Y SE SACA LO QUE YA ESTÁ CUBIERTO.** Proponer "Alemán" cuando ya existe
 * el objetivo "Aprender alemán" es la app ofreciéndole al usuario duplicar sus
 * propios datos — y encima los movimientos automáticos irían a los dos.
 */
export function candidatos(
  actividades: { titulo: string; marcas: { fecha: string }[] }[],
  titulosDeObjetivos: string[],
  hoy: string,
  cuantos = 2,
): Candidato[] {
  const salida: Candidato[] = [];

  for (const act of actividades) {
    if (titulosDeObjetivos.some((t) => asociaA(t, act.titulo))) continue;

    const fechas = act.marcas.map((m) => m.fecha).filter((f) => f <= hoy).sort();
    if (fechas.length < MARCAS_MINIMAS) continue;

    const desde = fechas[0];
    const dias = diasEntre(desde, hoy);
    if (dias < ARCO_MINIMO) continue;

    const temp = temperatura(act.marcas, hoy);
    if (temp === null) continue;

    salida.push({
      titulo: act.titulo,
      desde,
      dias,
      temperatura: temp,
      frase: `${desdeMes(desde, hoy)}, y ${temperaturaEnPalabras(temp)}`,
    });
  }

  // El arco más largo primero: es lo que más se parece a un objetivo. Y se
  // muestran DOS, no la lista entera — una pantalla de arranque con ocho
  // sugerencias es un formulario disfrazado de sugerencia.
  return salida.sort((a, b) => b.dias - a.dias).slice(0, cuantos);
}

import { ymd } from '@/lib/marcas';

/**
 * QUÉ DÍAS SOSTIENEN LA RACHA.
 *
 * ⚠️ ESTO ERA UN `for` DE TRES LÍNEAS ADENTRO DE `chat/page.tsx`, y **estuvo mal
 * durante cinco días sin que nada lo avisara**. Por eso ahora vive acá: es una
 * regla del producto, no plomería de una página.
 *
 * ── LA REGLA, QUE ES DE MATÍAS ───────────────────────────────────────────────
 *
 * 05/08: *"Solo suma racha cuando entra a la aplicación y escribe algo: escribe,
 * chatea con el bot, avisa un poco cómo está o hace un resumen del día"*.
 *
 * Y su corolario, que contestó la pregunta abierta de si el sueño del reloj
 * cuenta: **no**. La racha mide que hayas venido a contar algo, y un dato que
 * entra por HealthKit mientras dormís no es eso. Sin esa acotación, la racha se
 * sostendría sola con el reloj prendido y dejaría de significar nada.
 *
 * ── ⚠️⚠️ EL BUG QUE ORIGINÓ ESTE ARCHIVO (10/08) ────────────────────────────
 *
 * Matías: *"la abrí todos los días y anoté algo, y así y todo los fueguitos se
 * fueron"*. Medido contra su base: el **08/08 cargó el sueño a mano, con calidad
 * y todo**, y la racha se cortó igual. Le mostraba **2 días donde había 22**.
 *
 * **La regla no estaba mal: el dato no alcanzaba para aplicarla.** `cuerpo` no
 * tenía cómo distinguir lo que tipeaba él de lo que traía Apple Salud, así que
 * el código excluía la tabla entera — y de paso se llevaba puesto lo que él sí
 * había venido a contar.
 *
 * ⚠️⚠️ **Una regla correcta aplicada sobre un dato que no alcanza para
 * distinguir da un resultado incorrecto**, y encima uno que parece deliberado:
 * la racha desaparece en silencio y nunca dice por qué. Es la lección más cara
 * de todo esto.
 *
 * ── ⚠️ MARCAR UNA ACTIVIDAD TAMBIÉN SUMA (11/08) ────────────────────────────
 *
 * El 10/08 quedó afuera, entre tres opciones. Matías lo cambió al ver el journey
 * map: *"si tocaste que hiciste una actividad, sigue la racha; si escribiste,
 * sigue la racha"*.
 *
 * ⚠️ Y CORRIGE UNA INCOHERENCIA QUE EL MAPA DEJÓ A LA VISTA: el Home puso "hoy,
 * de un toque" como la acción **más a mano de la pantalla**, y era justo la única
 * que no sostenía la llama. **La app invitaba a hacer lo que no contaba.**
 *
 * ⚠️⚠️ LO QUE NO CAMBIA es la regla de fondo del 05/08: *"un dato que entra solo
 * del reloj no sostiene la racha"*. Marcar es un toque TUYO; el sueño que manda
 * Apple Salud mientras dormís, no. Por eso `cuerpo` sigue filtrando por
 * `origen === 'manual'` y las marcas entran enteras — **no hay marcas
 * automáticas**.
 */
export type DiaDeUso = {
  /** ISO completo o YYYY-MM-DD. */
  creado: string;
};

/** Una marca de actividad. Solo importa el día. */
export type MarcaDeActividad = { fecha: string };

export type RegistroCuerpo = DiaDeUso & {
  /** 'manual' = lo cargaste vos · 'salud' = lo trajo Apple Salud. */
  origen: string;
};

/**
 * Los días (YYYY-MM-DD) que cuentan para la racha.
 *
 * ⚠️ Devuelve un `Set` y no un array: de acá sale directo a `diasDeRacha` de
 * `lib/marcas`, que hace la caminata hacia atrás. Separar "qué días cuentan" de
 * "cuántos seguidos van" es lo que permite testear las dos cosas por separado —
 * y el bug del 10/08 estaba en la primera, no en la segunda.
 */
export function diasQueSuman({
  mensajes = [],
  animo = [],
  cuerpo = [],
  marcas = [],
}: {
  /** Mensajes escritos por él (rol 'user'). */
  mensajes?: DiaDeUso[];
  /** Check-ins de ánimo generales (sin área). */
  animo?: DiaDeUso[];
  /** Registros de cuerpo. Solo los `origen: 'manual'` suman. */
  cuerpo?: RegistroCuerpo[];
  /** Actividades marcadas. Llegan como `YYYY-MM-DD`, no como ISO. */
  marcas?: MarcaDeActividad[];
}): Set<string> {
  const dias = new Set<string>();
  const sumar = (iso: string) => dias.add(ymd(new Date(iso)));

  for (const m of mensajes) sumar(m.creado);
  for (const a of animo) sumar(a.creado);
  // ⚠️ ACÁ ESTÁ TODO EL ARREGLO DEL 10/08, Y ES UNA SOLA CONDICIÓN.
  for (const c of cuerpo) if (c.origen === 'manual') sumar(c.creado);
  // ⚠️ LAS MARCAS YA VIENEN COMO `YYYY-MM-DD` (la columna es una fecha, no un
  // timestamp), así que van derecho al set: pasarlas por `new Date()` las
  // correría un día en cualquier huso al oeste de Greenwich.
  for (const m of marcas) if (m.fecha) dias.add(m.fecha);

  return dias;
}

'use client';

import { grillaDias, type DiaGrilla } from '@/lib/marcas';

// EL MES EN QUE USASTE LA APP — la actividad diaria de la app es la app.
//
// ── ⚠️⚠️ FUE AL PIE Y VOLVIÓ ARRIBA — EL RECORRIDO COMPLETO ─────────────────
//
// **07/08:** se partió en dos. Esta tarjeta cargaba TRES cosas en una caja —el
// calendario, qué anotaste hoy y la racha— y eso la había obligado a rehacerse
// dos veces (06/08: *"el texto aparece abajo del fueguito, está roto"*). La
// llama se fue al lado del saludo y el bloque bajó al pie, con el argumento de
// medir el uso: 47 días, marcó 43 y escribió 17, o sea que **todo lo que había
// arriba pedía y nada devolvía**.
//
// **10/08:** Matías lo devolvió arriba, con la racha en la esquina: *"¿podés
// subir el apartado que marca el seguimiento del home arriba de todo, abajo del
// título, y poner la racha en la esquina superior de esa parte?"*.
//
// ⚠️ **Y ES SU LLAMADA, NO UN RETROCESO.** El argumento del 07/08 era sobre el
// ORDEN de la pantalla, y sigue en pie para el bot y la relectura, que quedaron
// arriba. Lo que él corrige es otra cosa: **la racha y el mes le sirven de un
// vistazo al abrir**, y para eso el pie es donde no se miran.
//
// ⚠️ LO QUE **NO** VUELVE es el `absolute` de la racha, que es lo que rompió la
// tarjeta dos veces. Ver la nota larga al lado del componente: tres columnas en
// flujo normal, nada flotando.
//
// ⚠️ **Y TAMPOCO VUELVE LA CAJA DE VIDRIO.** Al subirlo se la devolví por mi
// cuenta, y él lo corrigió enseguida: *"me lo imaginaba como lo estaba hecho
// abajo, que no estaba hecho en un rectángulo de color, sino que había una
// rayita y estaba ahí abajo directamente en la pantalla"*. Sube de LUGAR, no de
// jerarquía — que son dos cosas distintas y yo las mezclé. Ver la nota del
// `return`.
//
// Idea de Matías (27/07): que usar esto sea una actividad de seguimiento más,
// con sus cuadraditos, "como los de Claude Code". Con una diferencia que la hace
// mejor que las otras: **no hay nada que marcar**. El cuadradito se pinta solo,
// así que es el único seguimiento de la app que no puede mentir ni olvidarse.
//
// ⚠️ CUENTA TODO LO QUE HACÉS, NO SOLO ESCRIBIR (29/07). Antes contaba
// únicamente los mensajes del chat, y eso lo volvía un contador MENTIROSO en la
// dirección más cara: Matías había usado la app 28 días de los últimos 29 y la
// tarjeta le decía 11, porque los días que entraba, marcaba el alemán y cargaba
// el sueño **no existían para este dibujo**. Lo primero que veía al abrir era
// que le venía fallando a la app cuando en realidad la usaba todos los días.
// Su racha real era de 18 días y le mostraba 10.
//
// **Una métrica que mide la conducta minoritaria y la presenta como LA medida
// no informa: desmoraliza.**
//
// ── POR QUÉ ES CHICO (27/07, pedido suyo) ────────────────────────────────────
// CHICO, **más chico que el calendario de Seguimiento**, por una razón concreta:
// ese se toca —cada cuadradito es un día que podés marcar— y este NO SE TOCA
// NUNCA. Un dibujo que no es un botón no necesita tamaño de botón: le alcanza
// con leerse. Por eso la grilla va al costado y el texto al lado, en vez de
// ocupar el ancho entero.
//
// ⚠️ LO DE "Y VA ARRIBA" DE ESTE MISMO TÍTULO YA NO CORRE: era del 27/07 y lo
// reemplaza la mudanza al pie de acá arriba. Se deja anotado en vez de borrado
// porque el argumento de entonces —*es lo primero que dice cómo venís con la
// app*— era bueno, y lo que lo tumbó no fue el gusto sino la medición del 07/08.

/**
 * Cuánto pinta el día según CUÁNTAS COSAS hiciste ese día (pedido de Matías,
 * 29/07: "dependiendo cuánto, se va a poner más oscuro o más claro, para que no
 * estén todos rellenos del mismo color").
 * Índice = cantidad de registros. Un día de un solo toque se ve, pero un día
 * completo se ve MÁS: el dibujo cuenta una historia y no solo un sí o no.
 */
const INTENSIDAD = [0, 0.3, 0.45, 0.6, 0.75, 0.88, 1];

/**
 * Lado del cuadradito, en px. El de Seguimiento mide más del triple.
 *
 * ⚠️ VOLVIÓ A 11 (10/08). Había bajado a 9 cuando el bloque se mudó al pie, con
 * el argumento de que ahí es un cierre y no una cabecera. Matías lo devolvió
 * arriba, así que el argumento se cae con él: en la cabecera, 9 se lee como una
 * textura y no como un calendario.
 */
// ⚠️ CATORCE Y NO OTRO NÚMERO: son dos semanas justas, así que la tira siempre
// muestra los mismos días de la semana en la misma posición relativa y comparar
// "esta semana contra la anterior" se hace de un vistazo. Con 10 o con 15 la
// tira se corre un día por jornada y esa lectura se pierde.
const DIAS_TIRA = 14;


export function MesDeUso({ porDia, hechoHoy = [] }: {
  porDia: Record<string, number>;
  /**
   * QUÉ COSAS ANOTASTE HOY, ya en palabras ("ánimo", "sueño", "2 comidas").
   *
   * Pedido de Matías (06/08): *"añadiría una listita de qué cosas ya anotaste;
   * si el texto va a estar más arriba, tenemos más espacio para agregar eso"*.
   *
   * ⚠️ VIENE ARMADA DE AFUERA Y NO SE CALCULA ACÁ. Esta tarjeta recibe
   * `porDia`, que son CUÁNTAS cosas por día, no cuáles: para saber qué son
   * habría que volver a consultar lo que la página ya consultó. Es la misma
   * regla que hizo que `diasDeRacha` llegue como prop.
   */
  hechoHoy?: string[];
}) {
  const ahora = new Date();
  // ── ⚠️⚠️ LOS ÚLTIMOS 14 DÍAS, NO EL MES (18/08) ───────────────────────────
  //
  // Matías: *"que el uso se vea como en esa tarjetita, en fila"*. Achatar la
  // grilla de cinco semanas a un renglón obligaba a elegir, y él eligió 14 días
  // sobre los 31 del mes.
  //
  // 👉 **EL MOTIVO ES DE ANCHO, Y NO TIENE VUELTA.** Un mes en un renglón son 31
  // celdas en ~330px de teléfono: **7px cada una**, más finas que el gap que las
  // separa. Deja de leerse como días y pasa a leerse como una barra de progreso,
  // que es exactamente lo que esta pieza nunca quiso ser (ver la nota del 29/07
  // sobre no retar con una métrica).
  //
  // ⚠️ Y AL PERDER EL MES CALENDARIO SE PIERDE LA ALINEACIÓN POR DÍA DE SEMANA,
  // que era la razón de ser de los huecos grises del principio y del final
  // (07/08, *"que se entienda que son días de otros meses"*). En una tira que
  // termina hoy no hay nada que alinear: el último cuadradito ES hoy, siempre.
  // Los huecos se fueron con la grilla, y `grillaMes` dejó de usarse acá.
  //
  // ⚠️ TAMPOCO HAY MÁS FUTURO QUE PINTAR. La grilla del mes mostraba los días
  // que faltaban en lila clarito (*"que te dé la idea de que hay que
  // llenarlos"*); una ventana que termina hoy no tiene ninguno. Se va la rama y
  // se va la distinción que la sostenía — que era buena, y deja de aplicar sola.
  const dias: DiaGrilla[] = grillaDias(ahora, DIAS_TIRA);

  // ⚠️ EL CONTEO ES DE LA TIRA Y NO DEL MES, y tenía que cambiar con ella: la
  // ventana puede empezar en el mes anterior, así que "anotaste 12 días" al lado
  // de una tira que arranca el 5 de agosto contaría días que no están dibujados.
  // La regla de esta línea sigue siendo la de siempre: **dice lo que se ve.**
  const anotados = dias.filter((d) => (porDia[d.fecha] ?? 0) > 0).length;
  // El nombre del mes, que es lo que ubica la tira sin tener que subtitularla.
  const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(ahora);

  return (
    /* ── ⚠️⚠️ SIN CAJA, ARRIBA: UNA RAYITA Y NADA MÁS (10/08) ────────────────
       Matías: *"me lo imaginaba como lo estaba hecho abajo, que no estaba hecho
       en un rectángulo de color, sino que había una rayita y estaba ahí abajo
       directamente en la pantalla"*.

       ⚠️ AL SUBIRLO SE LE HABÍA DEVUELTO LA CAJA DE VIDRIO **POR DECISIÓN MÍA,
       QUE ÉL NO PIDIÓ**, con el argumento de que un bloque suelto al lado de una
       tarjeta parecería un error de maquetado. Estaba mal, y el motivo es
       interesante: **subir algo de lugar no es lo mismo que cambiarle la
       jerarquía**. Yo leí "va arriba" como "es más importante" y le puse el
       envase de las piezas importantes; él quería lo de siempre, más a mano.

       Y su versión es mejor por algo concreto: **el bot y la relectura son las
       piezas de la pantalla, y las piezas llevan caja**. Este bloque no se toca
       nunca — es un dibujo para mirar de reojo. Encajonarlo lo ponía a competir
       con lo que sí hay que atender.

       ⚠️ `items-start`: las tres columnas alineadas ARRIBA. Es lo que pone la
       racha en la **esquina superior**, que es donde él la pidió, sin necesidad
       de sacarla del flujo. Es además lo que ya pedía el 06/08 para el texto
       (*"lo de anotaste podría estar donde empieza el cuadradito"*).

       El `gap-3.5` se queda: sale de una corrección suya del 29/07 (*"haría un
       poco más de espacio entre los cuadraditos y ese texto"*) y el motivo no
       cambió — la grilla es un bloque de puntos muy denso y pegada al texto se
       lee como desalineada aunque esté perfecta. */
    <div className="mb-5 border-t border-iris-borde pt-3.5">
      {/* ⚠️⚠️ LA TIRA VA EN SU PROPIO RENGLÓN Y NO COMO PRIMERA COLUMNA.
          Con la grilla de 7 de ancho (95px) entraban las tres cosas en una fila:
          cuadraditos · texto · racha. Catorce celdas cómodas ocupan el ancho
          entero, así que al texto le quedaban ~68px y "Agosto · anotaste 12
          días" no entra ahí.

          👉 **PERO LAS TRES SIGUEN EN FLUJO NORMAL, QUE ES LO QUE IMPORTABA.**
          La nota de la racha, más abajo, cuenta que esto se rompió dos veces por
          un `absolute` con un `pr-[62px]` puesto a mano (*"el texto aparece
          abajo del fueguito, está roto"*). Acá no flota nada: es un renglón
          arriba y dos columnas abajo. Un renglón más no puede meterse debajo de
          nada.

          ⚠️ LAS CELDAS SON `flex-1` Y NO `LADO` FIJO: la tira tiene que llegar
          justo de borde a borde, y con ancho fijo o sobraba a la derecha o se
          pasaba según el teléfono. El alto SÍ es fijo — si también flexeara,
          en una tablet quedarían ladrillos. */}
      <div className="mb-2.5 flex gap-[3px]" aria-hidden="true">
        {dias.map((d) => {
          const cuantas = porDia[d.fecha] ?? 0;
          const fuerza = INTENSIDAD[Math.min(cuantas, INTENSIDAD.length - 1)];
          return (
            <span
              key={d.fecha}
              // ⚠️ `aspect-square` Y NO UN ALTO FIJO (18/08, Matías: *"los
              // rectángulos prefiero que sean cuadrados"*). Con alto fijo y
              // ancho flexible, cada celda salía más ancha que alta y la tira se
              // leía como barras. Atado al ancho, son cuadrados en cualquier
              // teléfono — y el alto de la tira pasa a depender del ancho, que
              // es lo correcto: catorce cuadrados en el ancho que haya.
              className="aspect-square flex-1 rounded-[5px]"
              style={{
                // Sin rama de futuro: la tira termina hoy. Queda la distinción
                // que sí sigue viva — un día que pasó y no anotaste es
                // información, y se ve como relleno vacío, no como ausencia.
                background: cuantas > 0 ? `oklch(0.58 0.16 288 / ${fuerza})` : 'rgba(108,120,238,.13)',
                // ⚠️ EL CONTORNO DE "HOY" SOLO CUANDO ESTÁ VACÍO (01/08, Matías:
                // *"que no se vea el borde cuando está relleno"*). Apenas lo
                // llenás, el color ya dice que es hoy — y encima hoy es siempre
                // el último de la tira, que es una pista que la grilla del mes
                // no tenía.
                outline: d.esHoy && cuantas === 0 ? '1.5px solid var(--color-iris)' : undefined,
                outlineOffset: '-1.5px',
              }}
            />
          );
        })}
      </div>

      <div className="flex items-start gap-3.5">
      <div className="min-w-0 flex-1">
        {/* ── ⚠️ AL PIE, LA LÍNEA VUELVE A SER FACTUAL (07/08) ────────────────
            Arriba decía *"Hoy ya anotaste" / "Hoy todavía no"*, que es una
            línea que TE HABLA. Eso tenía sentido cuando abría la pantalla; al
            pie, después de que el bot ya te habló y la relectura ya te devolvió
            algo, una tercera voz diciéndote cómo venís es de más.
            Acá dice **qué mes es y cuántos días llevás**, y nada más. La regla
            de la casa se cumple igual y mejor: *lo que falta se ve solo, por
            ausencia* — los cuadraditos vacíos de al lado ya lo dicen sin que la
            app lo nombre.
            ⚠️ El conteo del mes volvió (se había sacado el 06/08 para que la
            tarjeta no creciera). Acá no hay tarjeta que crezca, y sin el
            "anotaste N" la grilla al pie queda sin ninguna palabra que la
            ubique. */}
        {/* ⚠️ EL MES VUELVE AL RÓTULO (18/08, Matías: *"no dice agosto ni
            nada"*). Se había ido con la grilla, y tenía sentido irse —la tira
            puede arrancar en el mes anterior, así que "Agosto" ya no nombra
            todo lo dibujado—. Pero sin ninguna palabra que la ubique, una tira
            de catorce cuadraditos no dice de cuándo es.
            👉 Por eso el mes va como CONTEXTO y el conteo dice el alcance real:
            "Agosto · anotaste 13 de los últimos 14". El mes ubica, el número no
            miente. */}
        <p className="font-mono text-[11px] font-medium leading-[1.4] text-niebla">
          <span className="capitalize">{mesLargo}</span>
          {anotados > 0 && ` · anotaste ${anotados} de los últimos ${DIAS_TIRA}`}
        </p>

        {/* ── QUÉ ANOTASTE HOY (06/08) ──────────────────────────────────────
            *"Añadiría una listita de qué cosas ya anotaste."*

            ⚠️ ES LA DIFERENCIA ENTRE UN CONTADOR Y UN RESUMEN. "Hoy ya
            anotaste" dice que pasó algo; esto dice QUÉ pasó, y de paso se ve
            solo lo que falta sin que la app lo nombre como falta — que es la
            regla de esta tarjeta desde el 29/07 (nada de retar).
            En chips y no en lista: son dos o tres palabras cada uno y una
            lista vertical comería toda la altura que acabamos de ganar. */}
        {hechoHoy.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {hechoHoy.map((q) => (
              <span
                key={q}
                className="rounded-[7px] bg-iris-soft px-[7px] py-[2px] font-mono text-[10px] font-semibold text-iris-deep"
              >
                {q}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── ⚠️⚠️ LA RACHA SE FUE A LA ESQUINA DE LA PANTALLA (18/08) ──────────
          Matías: *"subir la racha posicionándola por arriba del botón de menú de
          hamburguesa"*. O sea que ya no vive acá.

          ⚠️ ESTO REVIERTE EL 10/08, que la trajo a este bloque con su pedido de
          entonces (*"poner la racha en la esquina superior de esa parte"*). Lo
          que cambió es qué hay alrededor: aquel día este bloque estaba al pie y
          era lo único con lo que la racha podía convivir. Hoy está arriba de
          todo y la esquina de la pantalla quedó libre.

          ⚠️ LO QUE SÍ SOBREVIVE ES LA LECCIÓN DE CÓMO, y por eso allá arriba
          tampoco flota con un padding puesto a mano: la nota vieja contaba que
          un `absolute` con `pr-[62px]` se rompió dos veces (*"el texto aparece
          abajo del fueguito, está roto"*). Ver `AsistenteEntrada`. */}
      </div>
    </div>
  );
}

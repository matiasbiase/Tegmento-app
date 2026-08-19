'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  anotarMovimiento,
  cerrarObjetivo,
  editarObjetivo,
  pausarObjetivo,
  ponerIconoObjetivo,
  reanudarObjetivo,
  reciclarObjetivo,
} from '@/lib/actions/objetivos';
import { quitarPortadaObjetivo, subirPortadaObjetivo } from '@/lib/actions/objetivo-plata';
import { cerrarYReflexionar, type ContextoDeCierre } from '@/lib/actions/cierre-objetivo';
import { CierreObjetivo } from '@/components/objetivos/CierreObjetivo';
import { GlifoObjetivo, ICONOS_OBJETIVO, IconoObjetivo } from '@/components/objetivos/IconoObjetivo';
import { iconoDeObjetivo } from '@/lib/objetivos-iconos';
import { GLIFO_SEGUIMIENTO } from '@/components/ui/glifos';
import { colgarDeObjetivo, descolgarDeObjetivo } from '@/lib/actions/objetivo-lineas';
import { temperaturaEnPalabras, type Temperatura } from '@/lib/objetivos-arranque';
import { COLOR_TEMPERATURA } from '@/components/objetivos/color-temperatura';

/**
 * Un objetivo, en su tarjeta.
 *
 * ⚠️ LO QUE MUESTRA DEPENDE DEL TIPO, y la regla está en `lib/objetivos.ts`:
 *  - ABIERTO (`progreso` y `proyeccion` en null): tiempo acumulado y el arco.
 *    Sin porcentaje, porque no hay total. Sin "falta poco", porque nadie sabe
 *    cuánto falta.
 *  - CON META: barra de progreso real y la proyección, que YA VIENE con el ritmo
 *    adentro de la frase.
 *
 * Este componente no decide nada de eso: recibe lo ya calculado. Si decidiera
 * acá, la regla viviría en un componente y no se podría testear.
 */
export type VistaObjetivo = {
  id: number;
  titulo: string;
  area: string | null;
  arranco: string;
  arco: string;
  estado: string;
  cerrado: string | null;
  meta: string | null;
  fechaMeta: string | null;
  /** La clave elegida a mano, o null para que salga del título. Ver `objetivos.icono`. */
  icono: string | null;
  /** El adjunto de la portada, o null. Le gana al ícono en el cuadradito. */
  portada: string | null;
  /**
   * Cómo viene un objetivo de rueda o de hábito, ya en palabras. `null` en los
   * de siempre, que se dibujan exactamente igual que antes.
   * ⚠️ `llego` NO cierra nada: es un veredicto para mostrar. Ver la nota en
   * `ObjetivosSeccion`.
   */
  avance: { texto: string; llego: boolean } | null;
  /**
   * LOS ÚLTIMOS 28 DÍAS, UNO POR RAYITA (06/08, pedido de Matías: *"que se vea
   * más como el seguimiento, la rayita verde es cuando se hizo ese día"*).
   *
   * ⚠️ REEMPLAZÓ A `columnas`/`ejes`, LA TIRA DEL ARCO, y los dos campos se
   * borraron con ella. Se calculaban en cada render de cada tarjeta y ya no los
   * dibujaba nadie — un cálculo vivo alimentando un campo que nadie mira es la
   * forma silenciosa de que la pantalla siga costando lo que ya no muestra.
   *
   * ⚠️ Y NO MIDEN LO MISMO: el arco agrupaba por semana o por mes, así que un
   * objetivo de nueve meses se leía entero de un vistazo. Esto son 28 días.
   * **Se gana la lectura diaria y se pierde la de largo plazo** — decisión suya
   * con las dos a la vista.
   */
  dias: { fecha: string; hecho: boolean }[];
  horas: number | null;
  horasEstimadas: boolean;
  movimientos: number;
  automaticos: number;
  seSumoSolo: { fuente: string; cuantos: number; horas: number | null }[];
  /**
   * LO QUE COLGASTE DE ESTE OBJETIVO, y todo lo que se podría colgar (06/08).
   *
   * ⚠️ ES LA PUERTA QUE FALTABA. Medido en la base el 06/08: 2 objetivos, 7
   * actividades activas y **0 vínculos**. El campo existía desde antes y la
   * única forma de usarlo era un desplegable del chat — y las actividades nacen
   * en Seguimiento, no en el chat. Acá se cuelga **desde el objetivo**, que es
   * el momento en que uno sabe para qué era: al crear una actividad todavía no.
   */
  colgables: { id: number; titulo: string; diaria: boolean; colgada: boolean }[];
  /** Si es un objetivo de PLATA: cuánto llevás, cuánto falta y a qué ritmo.
   *  null = es de tiempo, y entonces manda el arco de siempre. */
  plata: { llevo: number; meta: number; moneda: string; porcentaje: number; porSemana: number | null } | null;
  progreso: { porcentaje: number; hechas: number; totales: number } | null;
  proyeccion: { llega: boolean; texto: string } | null;
  /** Los días que faltan hasta la fecha límite, contados de verdad. */
  /** ⚠️ YA NO SE DIBUJA (11/08): la cuenta regresiva se sacó porque repetía la
   *  fecha límite, que la tarjeta ya muestra en palabras. Se deja el campo
   *  porque `ObjetivosSeccion` lo calcula y puede servir para otra cosa, pero
   *  **hoy no lo lee nadie**: si en un mes sigue así, se va. */
  diasQueFaltan: number | null;
  /** La cifra general ("suele estimarse en unas 750 horas") con quién la dice.
   *  ⚠️ NO es un dato de Matías: es una cita del modelo, sin verificar. Ver
   *  `lib/estimacion-general.ts`. null = no la sabe, que es lo más común. */
  estimacionGeneral: { texto: string; fuente: string; verificada: boolean } | null;
  /**
   * Qué tan viva está la cosa AHORA (pedido 1.4, del 30/07).
   *
   * ⚠️ NO ES PROGRESO Y NO HAY QUE LEERLA COMO TAL. Que un objetivo esté
   * caliente dice que lo venís moviendo, no que estés llegando: "buscar trabajo"
   * puede estar caliente nueve meses seguidos. Por eso va en la línea de
   * contexto y NUNCA cerca de la barra de progreso, donde se leería como que
   * falta poco.
   *
   * `null` cuando nunca se movió (no hay nada que describir, y "frío" sonaría a
   * reproche por algo que no empezó) y en los cerrados: ahí ya no hay nada que
   * mover. La calcula la page con `temperatura()`, que existía desde el 30/07 y
   * hasta el 03/08 solo se dibujaba en el Home.
   */
  temperatura: Temperatura | null;
};

export function TarjetaObjetivo({ o, areas = [] }: { o: VistaObjetivo; areas?: { id: number; nombre: string }[] }) {
  // ⚠️ LA PANTALLA DE CIERRE VIVE ACÁ Y NO EN EL BOTÓN. El botón se desmonta
  // apenas el objetivo pasa a cerrado (la tarjeta se redibuja plegada), así que
  // un overlay montado adentro se iría con él antes de que Matías lea nada.
  const [cierre, setCierre] = useState<ContextoDeCierre | null>(null);
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pensandoFecha, setPensandoFecha] = useState(false);
  const [guardando, empezar] = useTransition();
  // ⚠️ PAUSADO NO ES CERRADO (1.2, del 03/08). Antes esto era
  // `o.estado !== 'activo'`, así que cualquier estado nuevo caía del lado de los
  // terminados: se dibujaba en gris, decía "lo dejaste" y escondía "anotar algo".
  // Un pausado sigue vivo — lo único que no está es en marcha.
  const pausado = o.estado === 'pausado';
  const cerrado = o.estado === 'logrado' || o.estado === 'abandonado';
  const enMarcha = !cerrado && !pausado;
  /** Los días que faltan, o null si este objetivo no tiene cuenta regresiva. */

  return (
    // ⚠️ VIDRIO, NO BLANCO PLANO (06/08, pedido de Matías: *"darle un fondo tipo
    // brilloso con vidrio, como el que tenemos en el home para 'hoy ya
    // anotaste'"*). Es la misma `.glass-tinte` de ahí, no una copia: el degradé
    // y el rim blanco de arriba viven en `globals.css` y ningún componente pone
    // el suyo inline — la regla que ya tenían los chips.
    // ⚠️ Y SE LE SACÓ EL `shadow-[...]` PROPIO: `.glass-tinte` trae su sombra, y
    // las dos juntas apagaban el brillo que es justo lo que se pidió.
    <div
      className={`tarjeta border glass-tinte ${
        // Recién empezado va con borde punteado: se lee como "esto está naciendo"
        // sin necesidad de un rótulo que lo diga.
        o.movimientos === 0 && !cerrado ? 'border-dashed border-iris' : 'border-iris-borde'
      } ${cerrado ? 'opacity-[.92]' : ''}`}
    >
      {/* ── EL CUADRADITO CON EL ÍCONO (06/08) ───────────────────────────────
          Matías, comparando con la maqueta: *"no tiene el rectangulito con el
          ícono, como estaba en el show widget"*.
          ⚠️ NO ES DECORACIÓN: es lo que hace que un objetivo se reconozca de un
          vistazo en una lista, igual que el ícono de una nota. Sale del área o
          del título, sin pedirle nada — un objetivo no se crea para elegirle un
          dibujo.
          ⚠️ Y AHORA SE TOCA (06/08, misma tarde): *"hacé que cuando lo toques
          puedas cambiarlo, porque quizás no querés cambiarlo, o poner una foto
          en realidad"*. Lo que NO cambió es de dónde sale por defecto: se sigue
          adivinando y el selector es para corregir, no un casillero para
          llenar. */}
      {/* ── LA CABECERA, IGUAL A LA MAQUETA (06/08) ──────────────────────────
          Matías: *"quiero que se vea así y por ahora se ve muy mal"*, con el
          widget al lado. Lo que faltaba no era estilo: **la tarjeta dibujaba un
          objetivo de PLATA como si fuera de tiempo.**

          Ahora el cuadradito, el título, la fecha, la barra y la cifra van
          juntos, en un bloque, como estaban dibujados. Y si el objetivo es de
          plata, la barra es de plata: es la única que se puede mover apartando. */}
      {/* ── LA CABECERA, UNA SOLA PARA TODAS LAS TARJETAS (06/08) ───────────
          Matías: *"no puede ser que en todo sea distinto, tiene que ser
          estandarizado… en una queda lleno, otro vacío"*, y *"si es una etiqueta
          de salud no puede ser la misma tipografía que cuántas semanas estás en
          esto, porque si no confunde"*.

          ⚠️⚠️ LA REGLA QUE FALTABA: **cosas distintas, morfologías distintas.**
          El área y "8 semanas en esto" venían las dos como chip mono en negrita
          sobre fondo lila, así que una ETIQUETA (qué es esto) y una MEDIDA
          (cuánto llevás) se leían como dos items de la misma lista. Ahora:
            · el área es un chip con fondo — una etiqueta;
            · la medida es texto sans, sin fondo, con la cifra en negrita;
            · la cuenta regresiva es una cifra grande en la esquina.
          Tres cosas, tres formas.

          ⚠️ Y LA ESTRUCTURA ES SIEMPRE LA MISMA: cuadradito · (título + fila de
          etiquetas + medida) · esquina. Lo único que cambia entre un objetivo de
          plata y uno de tiempo es qué se dibuja ABAJO —barra o tira—, que es la
          diferencia real entre los dos. Antes cada tipo acomodaba la cabecera a
          su manera y por eso a uno le quedaba el hueco de abajo del ícono vacío
          y a otro no. */}
      <div className="flex items-start gap-3">
        <ElegirIcono o={o} />

        <div className="min-w-0 flex-1">
          {/* ⚠️ SE ACHICA SI ES LARGO, PARA NO PARTIRSE EN DOS (07/08). Matías:
              *"el título queda en dos filas y genera un espacio raro; si es muy
              largo que se achique un poco para que siempre quede en una sola"*.
              ⚠️ Y el corte importa: un título de dos renglones empuja hacia
              abajo TODO lo que sigue, así que la misma tarjeta mide distinto
              según cómo se llame el objetivo — que es la mitad del "en una queda
              lleno y en otra vacío". Tres tamaños, no una fórmula: a 16.5 entran
              ~26 caracteres, a 15 ~30, a 13.5 ~34. */}
          <h3
            className={`truncate font-semibold leading-[1.25] tracking-[-0.2px] text-tinta ${
              o.titulo.length > 34 ? 'text-[13.5px]' : o.titulo.length > 26 ? 'text-[15px]' : 'text-[16.5px]'
            }`}
            title={o.titulo}
          >
            {o.titulo}
          </h3>

          {/* Las ETIQUETAS: qué es esto. Todas con fondo, todas mono, y la fecha
              al lado —no debajo— para que no se pisen (pedido suyo). */}
          <div className="mt-[var(--sp-2)] flex flex-wrap items-center gap-1.5">
            {o.area && (
              <span className="rounded-[6px] bg-iris-soft px-[7px] py-[2px] font-mono text-[9.5px] font-bold tracking-[0.3px] text-iris-deep">
                {o.area}
              </span>
            )}
            {cerrado && (
              <span className="rounded-[6px] bg-gris-tint px-[7px] py-[2px] font-mono text-[9.5px] font-bold tracking-[0.3px] text-niebla">
                {o.estado === 'logrado' ? 'logrado' : 'lo dejaste'}
              </span>
            )}
            {/* ⚠️ "en pausa", no "pausado": el participio describe al objetivo
                como si le hubiera pasado algo. Vos lo pausaste, y va a volver. */}
            {pausado && (
              <span className="rounded-[6px] bg-oro-tint px-[7px] py-[2px] font-mono text-[9.5px] font-bold tracking-[0.3px] text-[#8a5a12]">
                en pausa
              </span>
            )}
            {/* ⚠️ LA FECHA, AL LADO DE LA ETIQUETA Y SIN FONDO. Matías la leyó
                como "cuándo lo creaste" y no como el plazo, así que ahora dice
                de qué habla: "hasta el 10 de agosto". Sin rótulo era un dato
                suelto que cada uno interpretaba como quería. */}
            {o.fechaMeta && !cerrado && (
              <span className="font-mono text-[9.5px] text-niebla">hasta el {fechaLarga(o.fechaMeta)}</span>
            )}
            {cerrado && o.cerrado && (
              <span className="font-mono text-[9.5px] text-niebla">
                cerrado el {o.cerrado.split('-').reverse().join('/')}
              </span>
            )}
          </div>

        </div>

        {/* ── LA CUENTA REGRESIVA, DE VUELTA EN LA ESQUINA (06/08) ───────────
            Matías: *"restan los días, yo lo pondría un numerito a la esquina,
            como estaba antes"*.

            ⚠️ PERO AHORA DICE LA UNIDAD, que era lo que faltaba la vez pasada
            (*"¿faltan siete qué?"*). Cifra grande y "días" debajo: la palabra
            que va abajo tiene que ser la unidad, no el verbo — el verbo se
            deduce de que es una cuenta regresiva, la unidad no se deduce de
            nada.

            ⚠️ SOLO SI HAY FECHA. Un objetivo sin plazo no tiene la pregunta que
            este número contesta. */}
        {/* ⚠️ DICE "RESTAN" ARRIBA, EXPLÍCITO (07/08). Matías: *"no entiendo
            que son tres días que vengo en esto, tres días faltan… tendríamos
            que escribirlo explícitamente"*. Y era ambiguo de verdad: la medida
            de abajo también se cuenta en días, así que **el mismo número podía
            aparecer dos veces con dos significados opuestos** y nada decía cuál
            era cuál. Tres renglones chiquitos —RESTAN / 3 / DÍAS— resuelven las
            dos mitades: el verbo y la unidad.
            ⚠️ Y SE PONE ROJO CUANDO APRIETA (≤7 días), no siempre: un rojo
            permanente deja de avisar nada. */}
        {/* ── ⚠️⚠️ ACÁ ESTABA "RESTAN 26 DÍAS" Y SE FUE (11/08) ────────────
            Matías: *"arriba dice veintiséis solos, que no sé qué significa
            veintiséis solos; no hace falta"*.

            ⚠️ Y NO ERA QUE FALTARAN LAS ETIQUETAS —las tenía, "restan" y "días"—
            **sino que estaban en 8,5px al 80% de opacidad**, o sea ilegibles a
            la distancia de lectura. Un número grande con dos rótulos que no se
            leen ES un número solo.

            ⚠️⚠️ PERO EL MOTIVO DE FONDO ES OTRO Y ES MEJOR: **la fecha límite ya
            estaba en la tarjeta**, unas líneas más arriba, en palabras ("hasta el
            6 de septiembre"). Esto era **el mismo dato dos veces**, una como
            fecha y otra como cuenta regresiva. Es exactamente la repetición que
            él venía señalando —*"es muy irrelevante que aparezca tantas veces"*—
            y que la auditoría del 11/08 no encontró porque buscaba frases del
            tipo "hace…", no un número con etiqueta.

            👉 **Lección para la próxima auditoría: el mismo dato repetido no
            tiene por qué tener la misma FORMA.** Buscar por forma encuentra la
            mitad. */}
      </div>

      {/* ── LA MEDIDA, A LO ANCHO Y ARRANCANDO DONDE ARRANCA LA TARJETA ─────
          Matías: *"lo que más molesta son los espacios, y también que el texto
          empiece abajo del título en vez de empezar abajo de la imagen; ahí ese
          espacio no queda nada bien"*.

          ⚠️ Y ES EXACTAMENTE EL HUECO QUE VENÍA MARCANDO HACE RATO. Esta línea
          vivía adentro de la columna del título, o sea sangrada 64px, **y cae
          más abajo que el cuadradito** — así que el sangrado no esquivaba nada:
          dejaba el rectángulo de abajo del ícono vacío y empujaba el texto a la
          derecha sin motivo. Es el mismo argumento por el que la barra de plata
          salió de la columna esta mañana. */}
      <p className="mt-[var(--sp-4)] text-[12.5px] leading-none text-tinta-soft">
        <span className="font-semibold text-tinta">{o.arco}</span>
        {cerrado ? ' de punta a punta' : ' en esto'}
      </p>

      {/* ⚠️ Y ARRANCA UN POCO CORRIDA, NO PEGADA AL BORDE (06/08, corrección de
          Matías sobre lo de arriba: *"empieza muy a la izquierda… los redondeos
          hacen que parezca que empieza más atrás de lo que en realidad
          empieza"*). Es un efecto real de la punta redondeada: el `rounded-full`
          come el primer píxel de color, así que a ojo el relleno arranca antes
          que el riel. Los 2px la vuelven a alinear con el texto de arriba sin
          devolverle el sangrado de 58px que se le sacó. */}
      {o.plata && (
        <>
          <div className="ml-0.5 mr-0.5 mt-[var(--sp-4)] h-[7px] overflow-hidden rounded-full bg-gris-tint">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${o.plata.porcentaje}%`,
                background: 'linear-gradient(90deg,var(--color-iris),var(--color-iris-2))',
              }}
            />
          </div>
          <p className="ml-0.5 mt-2.5 font-mono text-[12px] text-tinta-soft">
            {`${o.plata.llevo.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${o.plata.moneda} de ${o.plata.meta.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${o.plata.moneda}`}
            {o.plata.porSemana != null && (
              <span className="text-niebla">
                {` · ${Math.round(o.plata.porSemana).toLocaleString('es-AR')} ${o.plata.moneda} por semana`}
              </span>
            )}
          </p>
        </>
      )}

      {/* ── LA TIRA DE DÍAS, COMO EN SEGUIMIENTO (06/08) ─────────────────────
          Matías: *"podríamos hacerlo más chico y que se vea más como el
          seguimiento… la rayita verde es cuando se hizo ese día"*.

          ⚠️ REEMPLAZA A LA TIRA ALTA DEL ARCO, que medía otra cosa: aquella
          agrupaba por semana o por mes y la altura era densidad. Esta es **un
          día, una rayita**, y es la lectura que él ya reconoce de los
          seguimientos — el mismo verde y el mismo "está o no está".

          ⚠️ EL DÍA VACÍO ES GRIS Y FINITO, NUNCA ROJO. Es la regla que la tira
          vieja ya tenía y que hay que conservar: un día que no tocaste algo es
          un dato, no un reto.

          ⚠️ Y TERMINA EN HOY, no en la última marca: si terminara en el último
          movimiento, un objetivo abandonado hace un mes se vería igual de lleno
          que uno que venís sosteniendo. El hueco del final es información. */}
      {/* ⚠️ MÁS AIRE ARRIBA Y RAYITAS MÁS ALTAS (11/08). Matías: *"quizás que
          sean un poquito más altas, y darle un poco más espacio de arriba;
          está como muy apretadito ahí"*. La tira quedaba pegada a la línea de la
          medida y con 14px de alto se leía como una textura, no como días.

          ⚠️⚠️ Y SEGUNDA VUELTA DEL MISMO PEDIDO (12/08), textual: *"deberían ser
          un poquito más altas y dejar un poco más de espacio… todavía un poquito
          más"*. El salto de la primera vuelta (14 → 18px) fue real pero corto.
          Ahora 18 → 22px las marcadas y 7 → 9px las vacías: la proporción entre
          las dos se mantiene, que es lo que hace legible el contraste
          marcado/vacío.

          El aire pasa de `--sp-5` (24px) a `--sp-6` (32px). Sigue siendo la
          escala del kit, no un número suelto: --sp-6 es "entre secciones", y la
          tira de días es lo más cerca de una sección que hay dentro de la
          tarjeta. */}
      {!o.plata && (
        <div className="mt-[var(--sp-6)]">
          <div>
            <div className="flex items-end gap-[2px]">
              {o.dias.map((d) => (
                <div
                  key={d.fecha}
                  title={`${d.fecha.split('-').reverse().join('/')}${d.hecho ? ' · lo tocaste' : ''}`}
                  className={`flex-1 rounded-[1.5px] ${d.hecho ? 'h-[22px] bg-verde' : 'h-[9px] bg-niebla-2/45'}`}
                />
              ))}
            </div>
            {/* ── ⚠️⚠️ ACÁ ESTABA EL EJE "hace 4 semanas … hoy" Y SE FUE (11/08)
                Matías: *"aparece la fecha 'hace cuatro semanas' abajo de los
                puntitos; eso lo sacaría. Arriba ya aparece 'hace dos semanas
                estás trabajando en esto'. Es muy irrelevante que aparezca tantas
                veces"*.

                ⚠️ Y TENÍA RAZÓN AUNQUE **NO ERAN EL MISMO DATO**: arriba está
                `o.arco`, que es hace cuánto venís con esto; acá abajo era el eje
                FIJO del gráfico, que siempre dice cuatro semanas porque el
                gráfico siempre dibuja cuatro. Dos números distintos con la misma
                forma —"hace N semanas"— **se leen como el mismo dato mal
                puesto**, y el que sobra es el que no cambia nunca.

                ⚠️ NO SE PIERDE NADA: cada barrita ya tiene la fecha exacta en su
                `title`, y el "hoy" del extremo derecho lo dice la posición. */}
          </div>

        </div>
      )}

      {/* SOLO CON META: la barra de progreso real. */}
      {o.progreso && !o.plata && (
        <>
          <div className="mb-[7px] mt-3 h-2 overflow-hidden rounded-[4px] bg-gris-tint">
            <div
              className="h-full rounded-[4px]"
              style={{ width: `${o.progreso.porcentaje}%`, background: 'linear-gradient(90deg,var(--color-iris),var(--color-iris-2))' }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-tinta-soft">
            <span>{`${o.progreso.hechas} de ~${o.progreso.totales} h estimadas`}</span>
            <span>{`${o.progreso.porcentaje}%`}</span>
          </div>
        </>
      )}

      {/* LO QUE LA APP DICE. Un hecho contado, o una cuenta con su premisa
          adelante. Nunca las dos cosas a la vez: sería decir lo mismo dos veces. */}
      {/* ⚠️ ACÁ ESTABA EL REENCUADRE (*"arrancó hace tres días, en un par de
          semanas empieza a verse la forma"*). Lo cortó el 06/08: *"eso no es
          relevante, hace que se vea mucho más grande la tarjeta al pedo"*.
          Y es cierto: **le explicaba al usuario por qué la tarjeta todavía no
          dice nada**, que es una disculpa de la app ocupando cuatro renglones.
          La proyección SÍ se queda: esa es una cuenta con su premisa adelante. */}
      {o.proyeccion && (
        <p className="mt-3 border-t border-iris-borde pt-[11px] text-[13.5px] leading-[1.45] text-tinta text-pretty">
          {o.proyeccion.texto}
        </p>
      )}

      {/* ── LO QUE SUMA A ESTO (06/08) ────────────────────────────────────────
          Matías: *"qué cosas de seguimiento pertenecen a ese objetivo"*.
          Arriba lo colgado, abajo la puerta para colgar más. Los seguimientos
          llevan la llamita y las tareas el cuadradito, que es como se
          distinguen en toda la app. */}
      <LoQueSuma objetivoId={o.id} colgables={o.colgables} />

      {/* ── ⚠️⚠️ ACÁ VIVÍA "ESTA SEMANA SE SUMÓ SOLO", Y SE FUE CON EL CHIP DE
          "N solos" (12/08) ───────────────────────────────────────────────────
          Matías: *"esos veintiséis solos habría que sacarlo, y esto de 'esta
          semana se sumó solo Fútbol y Bouldern' también… no tiene relevancia,
          parece dos veces. Arriba ya tenés lo que sumó. Todo ese apartadito no
          suma nada"*.

          ⚠️ LOS DOS SE VAN JUNTOS Y ESO ES LO IMPORTANTE. El comentario que
          estaba acá decía *"sin esto el número sería magia"*: este bloque existía
          para explicar el chip "N solos". Sacar solo el chip habría dejado una
          explicación de algo que ya no está; sacar solo el bloque habría dejado
          el número sin explicación, que es exactamente de lo que él se quejó
          (*"no sé ni siquiera qué son"*). **Eran una sola pieza en dos partes.**

          ⚠️ Y LA REPETICIÓN QUE MARCÓ ES REAL: `LoQueSuma`, unas líneas arriba,
          ya lista las actividades colgadas a este objetivo. Esto volvía a
          nombrarlas —Fútbol, Bouldern— con otra forma. Es el mismo caso del 11/08
          con la cuenta regresiva: **el mismo dato repetido no tiene por qué
          tener la misma forma.** Tercera vez que aparece este patrón.

          El dato no se toca: `seSumoSolo` y `automaticos` los sigue calculando
          `ObjetivosSeccion`. Lo que se sacó es el dibujo. */}

      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {/* Las horas solo aparecen si se saben. Si no, se dicen los movimientos:
            es la verdad en vez de un número lindo salido de un promedio. */}
        {o.horas != null ? (
          <span className="rounded-[8px] bg-iris-soft px-2.5 py-[5px] font-mono text-[10.5px] font-bold text-iris-deep">
            {`${o.horasEstimadas ? '~' : ''}${o.horas} h puestas`}
          </span>
        ) : null}
        {/* ⚠️ ACÁ ESTABA "1 movimiento" (06/08, Matías: *"sacarlo también, no
            tiene ninguna relevancia"*). Y es cierto: **contar movimientos no
            dice nada sobre el objetivo** — uno de tres horas y uno de tres
            minutos suman igual. Lo que importa ya está arriba: el tiempo
            acumulado, en grande.

            ⚠️⚠️ Y EL 12/08 SE FUE TAMBIÉN "N solos", QUE ERA EL ÚLTIMO
            SOBREVIVIENTE DE ESA MISMA FAMILIA. Matías lo leyó en la tarjeta de
            "Subir de 3 a 4 en Salud física" y no lo entendió: *"dice veintiséis
            solos… no sé ni siquiera qué son"*.

            ⚠️ Y TENÍA RAZÓN POR UN MOTIVO DE FORMA, no de dato: "26 solos" es
            **una cifra con un adjetivo, sin sustantivo**. Los otros chips de la
            fila dicen "26 h puestas" —cifra, unidad y verbo—; este decía cuántos
            de algo que nunca se nombra. La explicación existía, pero vivía
            veinte líneas más abajo en otro bloque, y ese orden no se lee: para
            cuando llegabas al "de dónde salió", ya habías decidido que el número
            no significaba nada.

            La justificación vieja era *"explican de dónde salió tiempo que él no
            cargó a mano"*. El problema es que eso lo explicaba el bloque, no el
            chip — y el bloque se fue con él, arriba. */}
        {!o.fechaMeta && !cerrado && (
          // TOCABLE, y no un rótulo muerto (30/07, pedido de Matías: *"donde dice
          // sin fecha límite podría preguntar: ¿querés reflexionar acerca de
          // ponerle una fecha a esto?"*). Sigue diciendo lo mismo de un vistazo;
          // el que quiera pensarlo, lo toca.
          <button
            type="button"
            onClick={() => setPensandoFecha((v) => !v)}
            aria-expanded={pensandoFecha}
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-niebla underline decoration-niebla-2 decoration-dotted underline-offset-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[12px]">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4.5l3 2" />
            </svg>
            sin fecha límite
          </button>
        )}
      </div>

      {pensandoFecha && !cerrado && (
        <PensarLaFecha
          objetivoId={o.id}
          titulo={o.titulo}
          onCerrar={() => setPensandoFecha(false)}
          onListo={() => { setPensandoFecha(false); router.refresh(); }}
        />
      )}

      {/* ── RECICLAR (1.3, del 30/07) ─────────────────────────────────────────
          *"Los que no terminan nunca: hoy la app solo sabe cerrarlos."*
          Conseguiste el laburo, y seis meses después estás buscando otra vez.

          ⚠️ VA EN LOS CERRADOS Y NO EN LOS ACTIVOS, que era la trampa fácil.
          Un objetivo en marcha no se recicla: se sigue. Reciclar es lo que hacés
          cuando esta vuelta ya terminó y arranca otra, y por eso el botón vive
          justo donde estás mirando la vuelta vieja.

          ⚠️ Y NO REINICIA ESTA FILA: abre una nueva y deja esta entera. El arco
          viejo es el único dato que dice cuánto te llevó la vez pasada. */}
      {cerrado && (
        <div className="mt-3 border-t border-iris-borde pt-[11px]">
          <button
            type="button"
            disabled={guardando}
            onClick={() => empezar(async () => { await reciclarObjetivo(o.id); router.refresh(); })}
            className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-iris disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M20 11.5A8 8 0 1 0 18.5 16" />
              <path d="M20 5.5V11h-5.5" />
            </svg>
            {guardando ? '…' : 'Volver a empezar esto'}
          </button>
          <p className="mt-1 text-[11.5px] leading-snug text-niebla">
            Abre una vuelta nueva desde hoy. Esta queda como está, con su arco entero.
          </p>
        </div>
      )}

      {/* EN PAUSA: una sola salida, y es volver. Nada de "anotar algo" ni de
          cerrarlo desde acá — si está frenado, la única decisión pendiente es
          si lo retomás. Todo lo demás vuelve a estar cuando lo reanudes. */}
      {pausado && (
        <div className="mt-3 border-t border-iris-borde pt-3">
          <p className="mb-2 text-[12.5px] leading-[1.45] text-niebla text-pretty">
            Lo frenaste vos. Sigue acá, con todo lo que le pusiste, esperando que lo retomes.
          </p>
          <button
            type="button"
            disabled={guardando}
            onClick={() => empezar(async () => { await reanudarObjetivo(o.id); router.refresh(); })}
            className="grad-iris w-full rounded-[12px] px-2.5 py-2 font-mono text-[11px] font-bold text-white disabled:opacity-50"
          >
            {guardando ? '…' : 'Retomarlo'}
          </button>
        </div>
      )}

      {enMarcha && (
        <>
          {/* ── EL BOTÓN DE EDITAR: UN RECTANGULITO, A LA DERECHA (07/08) ────
              Matías: *"no sé por qué tiene una flecha; estaría bueno que sea un
              rectangulito y quede del otro lado, el lado derecho, para que no
              aparezca con eso de veinticuatro solo… y ese rectangulito usarlo
              como estándar"*.

              ⚠️ LA FLECHA MENTÍA. Un chevrón que gira dice "acá abajo hay más
              para leer", y lo que hay abajo son ACCIONES —anotar, pausar,
              cerrar—. Sacada la palabra "editar" la vez pasada, la flecha quedó
              siendo el único rótulo, y era el equivocado.

              ⚠️ Y VA A LA DERECHA porque es lo único tocable de esa altura: solo
              en el borde izquierdo quedaba enfrentado a la cifra de la esquina,
              que no es un botón, y los dos juntos se leían como un par.
              La forma —26px, `rounded-[8px]`, fondo `iris-soft`— es la misma que
              usan el ícono de la foto y el del reloj de la fecha: es el
              rectangulito estándar que él pidió. */}
          {/* ── ⚠️ SIN RECTÁNGULO, MÁS CHICO Y MÁS ARRIBA (11/08) ────────────
              Matías: *"no hace falta que lo remarque en rectángulo, que aparezca
              el lapicito solo está bien; y está en una esquina abajo con
              demasiado espacio… subilo un poco para que no haya tanto espacio
              vacío"*.

              ⚠️ ESTO SE APARTA DEL "RECTANGULITO ESTÁNDAR" QUE ÉL MISMO PIDIÓ EL
              07/08, y conviene decirlo: aquel día el rectángulo servía para
              **reemplazar una flecha que mentía** y para separar el botón de la
              cifra de la esquina, con la que se leía como un par. **Las dos
              razones se cayeron**: la flecha no existe más, y la cifra ("restan
              26 días") se fue justo arriba. Sin nada al lado con qué confundirse,
              el rectángulo solo agrega peso.

              ⚠️ El aire de arriba baja de `--sp-4` a `--sp-2`: lo que lo separaba
              tanto era el hueco pensado para bloques distintos, y el lápiz no es
              un bloque — es el remate de la tarjeta. La regla del kit sigue
              valiendo para el ícono de la foto y el del reloj, que **sí** conviven
              con otras cosas. */}
          <div className="mt-[var(--sp-2)] flex justify-end">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-label={abierto ? 'Cerrar la edición' : 'Editar este objetivo'}
              className={`grid size-[26px] place-items-center rounded-[8px] transition-colors ${
                abierto ? 'bg-iris text-white' : 'text-iris'
              }`}
            >
              {ICO_LAPIZ}
            </button>
          </div>

          {abierto && <Anotar objetivoId={o.id} onListo={() => { setAbierto(false); router.refresh(); }} />}

          {/* ── LA FECHA LÍMITE, ADENTRO DE EDITAR (06/08) ────────────────────
              Matías: *"ahí dice fecha límite, en editar tendría que aparecer
              eso… después tiene que aparecer la fecha límite, ahí también como
              para modificar la fecha"*.

              ⚠️ ERA UNA PUERTA DE UNA SOLA DIRECCIÓN. El chip "sin fecha
              límite" abría el diálogo para ponerla, pero **una vez puesta no
              había forma de cambiarla ni de sacarla desde la tarjeta**: la
              fecha pasaba a ser un dato de solo lectura en la línea de
              contexto. `editarObjetivo` ya sabía hacerlo desde siempre; lo que
              faltaba era el campo. */}
          {abierto && <FechaLimite o={o} areas={areas} onListo={() => router.refresh()} />}

          {abierto && (
            <>
              {/* ⚠️ PAUSAR VA ARRIBA DE LOS DOS CIERRES, SOLO, Y NO ES ESTÉTICA:
                  es la salida BARATA. Si estuviera en la misma fila que "Esto ya
                  no va", frenar dos semanas y abandonar para siempre se leerían
                  como decisiones del mismo peso, y con las dos juntas la gente
                  elige la definitiva. Separado, primero se ofrece lo reversible. */}
              <div className="mt-3 border-t border-iris-borde pt-3">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => empezar(async () => { await pausarObjetivo(o.id); router.refresh(); })}
                  className="w-full rounded-[12px] border border-iris-borde bg-white px-2.5 py-2 font-mono text-[11px] font-semibold text-tinta-soft disabled:opacity-60"
                >
                  {guardando ? '…' : 'Ponerlo en pausa'}
                </button>
              </div>

              <div className="mt-1.5 flex gap-1.5">
                <BotonCerrarObjetivo
                  id={o.id}
                  como="logrado"
                  etiqueta="Lo logré"
                  guardando={guardando}
                  empezar={empezar}
                  onListo={() => router.refresh()}
                  onLogrado={setCierre}
                />
                <BotonCerrarObjetivo
                  id={o.id}
                  como="abandonado"
                  etiqueta="Esto ya no va"
                  guardando={guardando}
                  empezar={empezar}
                  onListo={() => router.refresh()}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* ── LA PANTALLA DE CIERRE (11/08) ─────────────────────────────────────
          Se abre sola al tocar "Lo logré", y solo ahí. Ver `CierreObjetivo`:
          ocupa la pantalla entera porque esto pasa una vez cada varios meses, y
          una tarjeta más se descartaría con el pulgar como cualquier otra. */}
      {cierre && <CierreObjetivo ctx={cierre} onCerrar={() => setCierre(null)} />}
    </div>
  );
}

/**
 * "¿Querés pensar si esto tiene una fecha?"
 *
 * ⚠️ ES UNA PREGUNTA, NO UN EMPUJÓN. Ponerle fecha a un objetivo cambia lo que la
 * app puede decir sobre él (pasa a poder proyectar; ver `lib/objetivos.ts`), y eso
 * es una decisión de Matías, no una mejora que haya que aplicar. Por eso la
 * primera opción visible es **"no tiene fecha, y está bien"**: si la única salida
 * fuera poner una, la pregunta sería una presión disfrazada de ayuda.
 *
 * Y por eso tampoco aparece sola ni insiste: se abre solo si él toca "sin fecha
 * límite". Una app que te pregunta esto cada vez que entrás es una app que te
 * está diciendo que te falta algo.
 */
function PensarLaFecha({
  objetivoId,
  titulo,
  onCerrar,
  onListo,
}: {
  objetivoId: number;
  titulo: string;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const [fecha, setFecha] = useState('');
  const [meta, setMeta] = useState('');
  const [horas, setHoras] = useState('');
  const [guardando, empezar] = useTransition();

  return (
    <div className="mt-3 tarjeta border border-iris-borde bg-papel-2">
      <p className="text-[13.5px] leading-[1.45] text-tinta text-pretty">¿Querés pensar si esto tiene una fecha?</p>
      <p className="mt-1.5 text-[12.5px] leading-[1.45] text-niebla text-pretty">
        Con una fecha puedo decirte cuánto falta y si al ritmo que llevás llegás. Sin fecha te muestro el tiempo que le
        pusiste, que para muchas cosas es lo único que importa.
      </p>

      <div className="mt-2.5 flex flex-col gap-2">
        <input
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="Qué contaría como llegar"
          className="w-full rounded-[12px] border border-iris-borde bg-white px-3 py-2 text-[12.5px] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-label={`Fecha para ${titulo}`}
            className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-2.5 py-2 text-[12.5px] text-tinta outline-none focus:border-iris"
          />
          <input
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            inputMode="decimal"
            placeholder="horas"
            aria-label="Horas que calculás en total"
            className="w-[72px] flex-none rounded-[12px] border border-iris-borde bg-white px-2 py-2 text-center text-[12.5px] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
          />
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        {/* PRIMERO la salida sin fecha: es una respuesta válida, no un "cancelar". */}
        <button
          type="button"
          onClick={onCerrar}
          className="flex-1 rounded-[12px] border border-iris-borde bg-white px-2.5 py-2 font-mono text-[11px] font-semibold text-tinta-soft"
        >
          No tiene fecha, y está bien
        </button>
        <button
          type="button"
          disabled={guardando || !fecha}
          onClick={() =>
            empezar(async () => {
              await editarObjetivo(objetivoId, { fechaMeta: fecha, meta, horasEstimadas: horas });
              onListo();
            })
          }
          className="grad-iris flex-1 rounded-[12px] px-2.5 py-2 font-mono text-[11px] font-bold text-white disabled:opacity-50"
        >
          {guardando ? '…' : 'Ponerle esta fecha'}
        </button>
      </div>
    </div>
  );
}

/** Anotar un movimiento: una línea y las horas a ojo. Sin cronómetro. */
/**
 * LA FECHA LÍMITE: ponerla, cambiarla o sacarla, desde la tarjeta.
 *
 * ⚠️ NO ES UN CAMPO MÁS: la fecha es lo que define el TIPO de objetivo (ver
 * `lib/objetivos.ts`), o sea qué le está permitido decir a la app después. Con
 * fecha hay cuenta regresiva y proyección; sin fecha hay tiempo acumulado y
 * nada más. Por eso "sacarla" existe y está a la vista: es un cambio de tipo,
 * no un borrar.
 *
 * ⚠️ Y NO PISA LO QUE YA HABÍA: `editarObjetivo` recibe solo la fecha, así que
 * el título, el área y las horas se quedan como estaban.
 */
function FechaLimite({ o, areas, onListo }: { o: VistaObjetivo; areas: { id: number; nombre: string }[]; onListo: () => void }) {
  const [fecha, setFecha] = useState(o.fechaMeta ?? '');
  const [guardando, empezar] = useTransition();

  function guardar(valor: string | null) {
    empezar(async () => {
      await editarObjetivo(o.id, { fechaMeta: valor, meta: o.meta });
      onListo();
    });
  }

  return (
    <>
    {/* ⚠️ EL ÁREA, CUANDO LE FALTA (06/08). Matías, mirando la tarjeta: *"el de
        Viaje Argentina Octubre no tiene ninguna etiqueta, podría ser finanzas,
        podría ser ocio, podría ser salud mental"*.
        Y no es solo la etiqueta: **sin área ese objetivo no cuenta para el foco
        que caduca ni para nada que mire la rueda**. Los que nacieron de Finanzas
        y del formulario viejo están todos así. Solo se ofrece si falta: a los
        que ya la tienen, este bloque no les dice nada. */}
    {!o.area && areas.length > 0 && (
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10.5px] text-niebla">¿de qué área es?</span>
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={guardando}
            onClick={() =>
              empezar(async () => {
                await editarObjetivo(o.id, { areaId: a.id, fechaMeta: o.fechaMeta, meta: o.meta });
                onListo();
              })
            }
            className="rounded-full border border-iris-borde bg-white/70 px-2.5 py-1 font-mono text-[10.5px] font-semibold text-iris-deep disabled:opacity-60"
          >
            {a.nombre}
          </button>
        ))}
      </div>
    )}
    <div className="mt-2.5 flex items-center gap-2">
      <span aria-hidden className="grid size-[26px] flex-none place-items-center rounded-[8px] bg-iris-soft text-iris-deep">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[13px]">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5l3 2" />
        </svg>
      </span>
      <input
        type="date"
        value={fecha}
        onChange={(e) => {
          setFecha(e.target.value);
          guardar(e.target.value || null);
        }}
        aria-label="Fecha límite"
        className="min-w-0 flex-1 rounded-[12px] px-2 py-[9px] text-[12.5px] text-tinta outline-none"
      />
      {o.fechaMeta && (
        <button
          type="button"
          disabled={guardando}
          onClick={() => {
            setFecha('');
            guardar(null);
          }}
          aria-label="Sacarle la fecha límite"
          className="grid size-[26px] flex-none place-items-center rounded-[8px] text-niebla disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[13px]">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
    </>
  );
}

function Anotar({ objetivoId, onListo }: { objetivoId: number; onListo: () => void }) {
  const [nota, setNota] = useState('');
  const [horas, setHoras] = useState('');
  const [guardando, empezar] = useTransition();

  return (
    <div className="mt-2.5 flex gap-[7px]">
      <input
        autoFocus
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Qué hiciste hoy con esto…"
        className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-[11px] py-[9px] text-[12.5px] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
      />
      <input
        value={horas}
        onChange={(e) => setHoras(e.target.value)}
        inputMode="decimal"
        placeholder="h"
        aria-label="Horas, a ojo"
        className="w-[46px] flex-none rounded-[12px] border border-iris-borde bg-papel-2 px-2 py-[9px] text-center text-[12.5px] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
      />
      <button
        type="button"
        disabled={guardando || (!nota.trim() && !horas.trim())}
        onClick={() =>
          empezar(async () => {
            await anotarMovimiento(objetivoId, { nota, horas });
            setNota('');
            setHoras('');
            onListo();
          })
        }
        className="grad-iris flex-none rounded-[12px] px-[13px] font-mono text-[12px] font-bold text-white disabled:opacity-50"
      >
        {guardando ? '…' : 'Anotar'}
      </button>
    </div>
  );
}

/**
 * Cerrar el objetivo, con confirmación en el lugar. Mismo patrón que el resto de
 * la app: nada de `confirm()` del navegador, que dentro de la app nativa se ve
 * como una alerta de web.
 */
function BotonCerrarObjetivo({
  id,
  como,
  etiqueta,
  guardando,
  empezar,
  onListo,
  onLogrado,
}: {
  id: number;
  como: 'logrado' | 'abandonado';
  etiqueta: string;
  guardando: boolean;
  empezar: (fn: () => Promise<void>) => void;
  onListo: () => void;
  /** Solo se llama al LOGRAR: abre la pantalla de reflexión. Ver
   *  `CierreObjetivo` — abandonar no la abre, y es una decisión. */
  onLogrado?: (ctx: ContextoDeCierre) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const logrado = como === 'logrado';

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        // ⚠️ "ESTO YA NO VA" AHORA VA EN ROJO (06/08, Matías: *"el de lo logré
        // está bien, el de esto ya no va en rojo, faltaría"*). Estaba en gris
        // niebla, igual que un botón secundario cualquiera, y **es la única
        // acción de la tarjeta que no se deshace**: cerrar algo como abandonado
        // no tiene botón de volver.
        // ⚠️ El rojo es `--color-rosa` (#c25571), el ladrillo de la casa, y no
        // un rojo de sistema: es el mismo que usa la app para lo sensible.
        className={`flex-1 rounded-[12px] border px-2.5 py-2 font-mono text-[11px] font-semibold ${
          logrado ? 'border-verde/40 text-verde' : 'border-rosa/40 text-rosa'
        }`}
      >
        {etiqueta}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={guardando}
      onClick={() =>
        empezar(async () => {
          // ⚠️ DOS CAMINOS, Y NO ES DUPLICACIÓN. Abandonar cierra y listo.
          // Lograr cierra Y devuelve con qué armar la pantalla de reflexión, en
          // una sola llamada: si fueran dos, entre una y otra el objetivo ya
          // está cerrado, y si la segunda falla el momento se pierde sin que
          // nadie se entere. Ver `cerrarYReflexionar`.
          if (logrado && onLogrado) {
            const ctx = await cerrarYReflexionar(id);
            onListo();
            if (ctx) onLogrado(ctx);
            return;
          }
          await cerrarObjetivo(id, como);
          onListo();
        })
      }
      className={`flex-1 rounded-[12px] px-2.5 py-2 font-mono text-[11px] font-bold text-white disabled:opacity-60 ${
        logrado ? 'bg-verde' : 'bg-rosa'
      }`}
    >
      {guardando ? '…' : '¿Seguro? Tocá de nuevo'}
    </button>
  );
}


/**
 * Lo colgado de este objetivo, y el desplegable para colgar más.
 *
 * ⚠️ PLEGADO SALVO QUE HAYA ALGO. Un objetivo recién creado no tiene nada
 * colgado: mostrar la lista entera de tus siete actividades abierta convertiría
 * la tarjeta en un formulario apenas la creás.
 */
function LoQueSuma({
  objetivoId,
  colgables,
}: {
  objetivoId: number;
  colgables: { id: number; titulo: string; diaria: boolean; colgada: boolean }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [, arrancar] = useTransition();
  const colgadas = colgables.filter((c) => c.colgada);
  const sueltas = colgables.filter((c) => !c.colgada);

  function alternar(id: number, colgada: boolean) {
    arrancar(async () => {
      if (colgada) await descolgarDeObjetivo(objetivoId, id);
      else await colgarDeObjetivo(objetivoId, id);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-iris-borde pt-[11px]">
      {/* ⚠️ EL "+" EN LA ESQUINA, NO UN TEXTO ABAJO (06/08, Matías: *"en vez de
          'colgar algo que ya tenés' pondría un más, al lado derecho, en la
          esquina de arriba"*). El rótulo dice qué es y el `+` dice qué podés
          hacer: es el mismo par que ya usan las pastillas de Cuerpo, y ocupa un
          renglón menos que la frase que reemplaza. */}
      {/* ⚠️ EL RÓTULO SOLO, Y LA PUERTA ABAJO A LO ANCHO (06/08). Estuvo un rato
          como un `+` en la esquina —él lo había pedido así— y al ver la maqueta
          al lado eligió la otra: *"quiero que se vea así"*. Y la maqueta tiene
          razón por una cosa concreta: **el botón punteado a lo ancho se lee como
          el último renglón de la lista, o sea "y acá podés sumar otro"**, que es
          justo lo que es. Un `+` en la esquina del rótulo se lee como una opción
          del título. */}
      <p className="mb-1 font-mono text-[10.5px] font-bold tracking-[0.3px] text-niebla">
        Lo que suma a esto
      </p>

      {colgadas.length === 0 && !abierto && (
        <p className="mb-1.5 text-[12.5px] leading-snug text-niebla">
          Todavía no colgaste nada. Lo que cuelgues suma su tiempo acá.
        </p>
      )}

      {colgadas.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => alternar(c.id, true)}
          aria-label={`Descolgar ${c.titulo}`}
          className="flex w-full items-center gap-2.5 border-b border-[#f4f3fa] py-2 text-left text-[13.5px] text-tinta last:border-none"
        >
          <span className="flex-none text-iris">{c.diaria ? ICO_SEGUIMIENTO : ICO_TAREA}</span>
          <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
          {/* A la derecha, lo que aporta: los seguimientos cuántas veces, las
              tareas solo su tipo. Es lo que la maqueta ponía como "+180 €",
              "tarea" y "6 de 8 sem." — el valor de cada fila, no un "quitar". */}
          <span className="flex-none font-mono text-[11px] text-niebla">
            {c.diaria ? 'seguimiento' : 'tarea'}
          </span>
        </button>
      ))}

      {abierto &&
        sueltas.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => alternar(c.id, false)}
            className="flex w-full items-center gap-2.5 border-b border-[#f4f3fa] py-2 text-left text-[13.5px] text-niebla last:border-none"
          >
            <span className="flex-none text-niebla-2">{c.diaria ? ICO_SEGUIMIENTO : ICO_TAREA}</span>
            <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
            <span className="flex-none font-mono text-[11px] text-iris">colgar</span>
          </button>
        ))}

      {sueltas.length > 0 && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-niebla-2 py-2.5 font-mono text-[12px] font-semibold text-iris-deep"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[14px]">
            {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M12 5.5v13M5.5 12h13" />}
          </svg>
          {abierto ? 'Listo' : 'Colgar algo que ya tenés'}
        </button>
      )}


    </div>
  );
}

/** La llamita de los seguimientos y el cuadradito de las tareas: los mismos que
 *  los distinguen en Seguimiento. */
// ⚠️ ERA LA CUARTA COPIA A MANO DE LAS TRES BARRITAS (06/08), y ya se había
// desincronizado: medía `x=2.6 y=11 h=9.5` contra el `x=2.2 y=8.5 h=12` del
// glifo, o sea que la primera barra arrancaba más abajo y más corta que en el
// menú y en la barra de abajo. El mismo dibujo diciendo dos cosas distintas
// según la pantalla. Ahora sale de `glifos.tsx`, como las otras tres.
const ICO_SEGUIMIENTO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
    {GLIFO_SEGUIMIENTO}
  </svg>
);

const ICO_TAREA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
  </svg>
);

/**
 * EL CUADRADITO, QUE AHORA SE TOCA (06/08).
 *
 * ⚠️ LOS DIBUJOS YA NO VIVEN ACÁ. Estaban escritos a mano en este archivo y
 * también en `IconoNota.tsx`, los mismos paths copiados — por eso el avión roto
 * aparecía en los dos lados. Ahora salen de `ICONOS_OBJETIVO` y la regla de
 * adivinar de `lib/objetivos-iconos.ts`, que además se puede testear.
 *
 * ⚠️ EL DESPLEGABLE ABRE CONTRA EL BORDE IZQUIERDO (`left-0`), y no es
 * arbitrario: mide 236px, y el mismo desplegable pegado al borde DERECHO se
 * salía de la pantalla en el teléfono — el bug que Matías marcó el 06/08 con el
 * ícono de la nota (*"del lado derecho queda como cortado, se ve afuera"*). Acá
 * el cuadradito ya está a la izquierda de la tarjeta, así que entra siempre.
 */
function ElegirIcono({ o }: { o: VistaObjetivo }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const [, empezarIcono] = useTransition();

  const actual = iconoDeObjetivo(o.icono, o.titulo, o.area);

  function elegir(clave: string | null) {
    setAbierto(false);
    empezarIcono(async () => {
      await ponerIconoObjetivo(o.id, clave);
      router.refresh();
    });
  }

  async function subirFoto(archivoElegido: File) {
    setSubiendo(true);
    const datos = new FormData();
    datos.set('foto', archivoElegido);
    await subirPortadaObjetivo(o.id, datos);
    setSubiendo(false);
    setAbierto(false);
    router.refresh();
  }

  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`Cambiar cómo se ve “${o.titulo}”`}
        className="grid size-[52px] place-items-center overflow-hidden rounded-[15px] bg-iris-soft text-iris-deep"
      >
        <IconoObjetivo titulo={o.titulo} area={o.area} icono={o.icono} portada={o.portada} />
      </button>

      {abierto && (
        <div className="absolute left-0 top-[58px] z-20 w-[236px] rounded-[18px] border border-iris-borde bg-white p-2 shadow-[0_8px_28px_rgba(50,50,90,.16)]">
          <div className="flex flex-wrap gap-1">
            {/* ⚠️ "Del título" ES LA PRIMERA OPCIÓN Y NO UN BORRAR ESCONDIDO:
                volver a que lo adivine tiene que costar lo mismo que elegirlo.
                Misma decisión que "Sin ícono" en el editor de notas. */}
            <button
              type="button"
              onClick={() => elegir(null)}
              className={`flex h-8 flex-none items-center rounded-lg px-2 font-mono text-[11px] font-semibold ${
                o.icono == null ? 'bg-iris-soft text-iris-deep' : 'text-niebla'
              }`}
            >
              Del título
            </button>
            {ICONOS_OBJETIVO.map((i) => (
              <button
                key={i.clave}
                type="button"
                onClick={() => elegir(i.clave)}
                aria-label={i.nombre}
                className={`grid size-8 flex-none place-items-center rounded-lg ${
                  i.clave === actual && !o.portada ? 'bg-iris-soft text-iris-deep' : 'text-niebla'
                }`}
              >
                <GlifoObjetivo clave={i.clave} className="size-[17px]" />
              </button>
            ))}
          </div>

          {/* ── LA FOTO ──────────────────────────────────────────────────────
              ⚠️ NO SE CONSTRUYÓ NADA NUEVO: `subirPortadaObjetivo` y
              `quitarPortadaObjetivo` existen desde el 04/08 y hasta hoy solo
              tenían puerta en Finanzas. La columna `objetivos.portada` es la
              misma. Esto es la puerta que faltaba, no una función. */}
          <div className="mt-1.5 border-t border-iris-borde pt-1.5">
            <input
              ref={archivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirFoto(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => archivo.current?.click()}
              disabled={subiendo}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-[13px] text-tinta disabled:opacity-60"
            >
              <span className="grid size-8 flex-none place-items-center rounded-lg text-niebla">{ICO_FOTO}</span>
              {subiendo ? 'Subiendo…' : o.portada ? 'Cambiar la foto' : 'Ponerle una foto'}
            </button>
            {o.portada && (
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  empezarIcono(async () => {
                    await quitarPortadaObjetivo(o.id);
                    router.refresh();
                  });
                }}
                className="flex h-8 items-center rounded-lg px-2 font-mono text-[11px] font-semibold text-niebla"
              >
                Sacar la foto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ⚠️ EL GLIFO CRECE, EL BOTÓN NO (12/08). Matías: *"está sin el recuadro, pero
   está rechiquito; tenelo un poquito más grande"*.

   El botón nunca se achicó: sigue en 26px, que es el área de toque mínima que
   queremos. Lo que bajó al sacar el rectángulo el 11/08 fue el PESO VISUAL —el
   fondo `iris-soft` ocupaba los 26px y el lápiz solo 11—, así que agrandar el
   botón habría agrandado el blanco, no el lápiz. Sube el dibujo: 11 → 15px.

   ⚠️ Se queda por debajo de los 18px de `ICO_FOTO` y del reloj a propósito:
   esos dos SÍ tienen rectángulo, y un glifo suelto del mismo tamaño que uno
   enmarcado pesa más que él. */
const ICO_LAPIZ = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
);

const ICO_FOTO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M3.5 17l4.7-4.2 3.4 3 2.6-2.3L20.5 18" />
  </svg>
);


/** "15 de octubre", como en la maqueta: la fecha en palabras y sin el año, que
 *  a menos de un año es ruido. */
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function fechaLarga(iso: string): string {
  const dia = Number(iso.slice(8, 10));
  const mes = MESES_LARGOS[Number(iso.slice(5, 7)) - 1] ?? '';
  return `${dia} de ${mes}`;
}

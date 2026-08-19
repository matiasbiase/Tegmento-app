import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aportes, areas, config, eventos, lineas, marcas, objetivoLineas, objetivoMovimientos, objetivos } from '@/lib/db/schema';
import { juntado, ritmoNecesario } from '@/lib/objetivo-plata';
import { TarjetaObjetivo, type VistaObjetivo } from '@/components/objetivos/TarjetaObjetivo';
import { ObjetivoDesdeRueda } from '@/components/objetivos/ObjetivoDesdeRueda';
import { FocoCumplido } from '@/components/objetivos/FocoCumplido';
import { llegoLaRueda, progresoHabito } from '@/lib/objetivos-onboarding';
import { CLAVE_FOCO_CUMPLIDO, focosCumplidos, huboLogro } from '@/lib/foco-caduca';
import {
  arcoEnPalabras,
  diasEntre,
  estimarDeCerrados,
  horasPuestas,
  progresoDeMeta,
  proyeccion,
  ritmoReciente,
  type Movimiento,
} from '@/lib/objetivos';
import { movimientosAutomaticos, resumenAutomatico } from '@/lib/objetivos-auto';
import { temperatura } from '@/lib/objetivos-arranque';

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Objetivos: el arco largo de lo grande (30/07). Ver `lib/objetivos.ts` para la
// regla de los dos tipos, que es lo que gobierna toda la pantalla, y
// `docs/maquetas/2026-07-30-objetivos.html` para el porqué de cada decisión.
// `?nuevo=1` llega desde el "Sí, anotarlo" del Home y abre el formulario ya
// desplegado. Sin esto, el botón prometía anotar algo y te dejaba mirando una
// lista vacía con un botón más para tocar.
/**
 * TODO OBJETIVOS, COMO UN BLOQUE QUE SE PUEDE PONER EN CUALQUIER LADO (06/08).
 *
 * ⚠️ SE EXTRAJO DE `app/(app)/objetivos/page.tsx` PORQUE AHORA VIVE EN DOS
 * LUGARES: su pantalla de siempre y la pestaña "Objetivos" de Seguimiento
 * (pedido de Matías: *"arriba ese menú de tres, sacá cerradas y cambialo por
 * objetivos, cosa que se vea que en seguimiento está todo"*).
 *
 * Es un **componente de servidor asíncrono**: hace sus propias consultas y se
 * pasa ya renderizado a `ActividadesUI`, que es cliente. Así la pantalla de
 * Seguimiento no tiene que repetir las cien líneas de consultas de Objetivos —
 * que era la otra opción, y la que garantizaba que los dos lados se
 * desincronizaran en el primer retoque.
 */
export async function ObjetivosSeccion({ abrirNuevo = false }: { abrirNuevo?: boolean }) {
  const nuevo = abrirNuevo ? '1' : undefined;
  const hoy = hoyISO();

  const [filas, areasRows] = await Promise.all([
    db.select().from(objetivos).orderBy(desc(objetivos.estado), desc(objetivos.arranco)),
    // ⚠️ Se traen también el puntaje y el foco: son la materia prima del
    // onboarding desde la rueda (`ObjetivoDesdeRueda`), que propone "subir de 2
    // a 3" sin pedirte que escribas nada y ordena las áreas por lo que te
    // importa, no por lo que tenés más bajo.
    db
      // ⚠️ También el `color`: es el de la rueda, y es lo que hace que el paso 1
      // se lea como la rueda y no como una lista cualquiera de ocho palabras.
      .select({ id: areas.id, nombre: areas.nombre, scoreActual: areas.scoreActual, foco: areas.foco, color: areas.color })
      .from(areas)
      .where(eq(areas.activa, true))
      .orderBy(areas.orden),
  ]);

  const nombreArea = new Map(areasRows.map((a) => [a.id, a.nombre]));
  // El puntaje de HOY de cada área, para saber si un objetivo de rueda ya llegó.
  const scoreArea = new Map(areasRows.map((a) => [a.id, a.scoreActual]));
  // De qué área es cada objetivo. `VistaObjetivo` guarda el NOMBRE del área para
  // dibujarlo, no el id, así que para cruzar por área hace falta este mapa.
  const idArea = new Map(filas.map((o) => [o.id, o.areaId]));

  // Los movimientos anotados a mano. `inArray` con lista vacía es SQL inválido.
  const manuales = filas.length
    ? await db
        .select()
        .from(objetivoMovimientos)
        .where(
          inArray(
            objetivoMovimientos.objetivoId,
            filas.map((o) => o.id),
          ),
        )
    : [];

  // ── LAS FUENTES DE LOS MOVIMIENTOS AUTOMÁTICOS ────────────────────────────
  // Se traen UNA vez para todos los objetivos, no una consulta por tarjeta.
  // Ver `lib/objetivos-auto.ts`: se cruzan por nombre, sin IA, y no se guardan.
  const actividades = await db
    .select({
      id: lineas.id,
      titulo: lineas.titulo,
      objetivoId: lineas.objetivoId,
      diaria: lineas.diaria,
      estado: lineas.estado,
    })
    .from(lineas)
    .where(eq(lineas.tipo, 'actividad'));
  const actividadesVivas = actividades.filter((a) => a.estado === 'activa');
  const marcasRows = actividades.length
    ? await db
        .select({ lineaId: marcas.lineaId, fecha: marcas.fecha })
        .from(marcas)
        .where(
          inArray(
            marcas.lineaId,
            actividades.map((a) => a.id),
          ),
        )
    : [];
  const eventosRows = await db.select({ titulo: eventos.titulo, inicio: eventos.inicio, fin: eventos.fin }).from(eventos);

  // ── LO QUE COLGASTE A MANO (06/08) ────────────────────────────────────────
  // Una consulta para todos, igual que las marcas: `objetivo_lineas` es chica y
  // se cruza en memoria. Ver la nota de la tabla en el schema.
  const colgadas = await db.select().from(objetivoLineas);
  // ⚠️ LOS APORTES, PARA LOS OBJETIVOS DE PLATA (06/08). Hasta hoy esta pantalla
  // solo sabía de HORAS, así que "Viaje a Argentina" —que es de plata— se
  // dibujaba con el arco del tiempo y su barra nunca se movía. Matías lo vio al
  // toque comparándolo con la maqueta: *"se ve muy mal"*.
  const todosLosAportes = await db.select().from(aportes);

  const fuentesActividad = actividades.map((a) => ({
    titulo: a.titulo,
    marcas: marcasRows.filter((m) => m.lineaId === a.id).map((m) => ({ fecha: m.fecha })),
    objetivoId: a.objetivoId,
    objetivosColgados: colgadas.filter((c) => c.lineaId === a.id).map((c) => c.objetivoId),
  }));

  const haceUnaSemana = new Date(Date.now() - 7 * 86_400_000);
  const desdeSemana = `${haceUnaSemana.getFullYear()}-${String(haceUnaSemana.getMonth() + 1).padStart(2, '0')}-${String(
    haceUnaSemana.getDate(),
  ).padStart(2, '0')}`;

  const vistas: VistaObjetivo[] = filas.map((o) => {
    const hasta = o.cerrado ?? hoy;

    const propios: Movimiento[] = manuales
      .filter((m) => m.objetivoId === o.id)
      .map((m) => ({ fecha: m.fecha, horas: m.horas, nota: m.nota, origen: 'manual' as const }));
    // Se le pasa el id para que las actividades que Matías colgó a mano de este
    // objetivo cuenten aunque el nombre no se parezca — y para que las que colgó
    // de OTRO no cuenten acá aunque se parezca. Ver `cuentaPara`.
    const autos = movimientosAutomaticos(o.titulo, fuentesActividad, eventosRows, o.id);
    // Los automáticos se recortan al arco del objetivo: una marca de "Alemán" de
    // antes de arrancarlo (o de después de cerrarlo) no es tiempo puesto en esto.
    const autosEnArco = autos.filter((m) => m.fecha >= o.arranco && m.fecha <= hasta);
    const todos = [...propios, ...autosEnArco].sort((a, b) => a.fecha.localeCompare(b.fecha));

    const { horas, movimientos, estimadas } = horasPuestas(todos, o.horasPorVez);
    const progreso = progresoDeMeta(o, horas);
    const ritmo = ritmoReciente(todos, o.horasPorVez, hoy);

    return {
      id: o.id,
      titulo: o.titulo,
      area: o.areaId ? (nombreArea.get(o.areaId) ?? null) : null,
      arranco: o.arranco,
      arco: arcoEnPalabras(o.arranco, hasta),
      estado: o.estado,
      cerrado: o.cerrado,
      meta: o.meta,
      fechaMeta: o.fechaMeta,
      icono: o.icono,
      portada: o.portada,
      // Los últimos 28 días, uno por rayita. Cuatro semanas entran cómodas en el
      // ancho de la tarjeta sin que cada día quede de un pixel.
      dias: ultimosDias(new Set(todos.map((m) => m.fecha)), hoy, 28),
      /**
       * CÓMO VIENE, SEGÚN QUÉ CLASE DE OBJETIVO ES (06/08).
       *
       * ⚠️ NO REEMPLAZA NADA DE LO QUE YA MOSTRABA LA TARJETA: es una línea más
       * para los dos tipos que antes no tenían forma de medirse. Los de siempre
       * (`tipo` en null) devuelven null acá y se dibujan exactamente igual.
       *
       * ⚠️ Y NINGUNO CIERRA SOLO. `llego` es un veredicto para mostrar, no una
       * acción: dar por terminado algo tuyo mirando un número sería la app
       * decidiendo por vos. La regla de cierre quedó anotada sin definir, así
       * que se mide y se dice.
       */
      avance:
        o.tipo === 'rueda' && o.scoreDesde != null && o.scoreHasta != null
          ? (() => {
              const ahora = o.areaId ? (scoreArea.get(o.areaId) ?? null) : null;
              const llego = llegoLaRueda(o, ahora);
              return {
                llego,
                texto: llego
                  ? `Llegó: ${nombreArea.get(o.areaId!) ?? 'el área'} está en ${ahora}`
                  : `De ${o.scoreDesde} a ${o.scoreHasta}${ahora != null ? ` · hoy vas en ${ahora}` : ''}`,
              };
            })()
          : o.tipo === 'habito'
            ? (() => {
                const p = progresoHabito(
                  todos.map((m) => m.fecha),
                  hoy,
                );
                return {
                  llego: p.llego,
                  texto: p.llego
                    ? `Sostenido ${p.semanas} semanas: ya te sale solo`
                    : `Sostenido ${p.semanas} ${p.semanas === 1 ? 'semana' : 'semanas'} · faltan ${p.falta}`,
                };
              })()
            : null,
      // ⚠️ EL REENCUADRE SE FUE DE LA TARJETA EL 06/08 y con él esta cuenta:
      // dejar el cálculo vivo alimentando un campo que nadie dibuja es la
      // forma silenciosa de que una pantalla siga costando lo que ya no muestra.
      // (El original iba solo en los activos: en uno cerrado, "dos semanas sin
      //  moverlo" no significa nada, porque ya no hay nada que mover.)
      horas,
      horasEstimadas: estimadas,
      movimientos,
      automaticos: autosEnArco.length,
      seSumoSolo: o.estado === 'activo' ? resumenAutomatico(todos, desdeSemana) : [],
      // ⚠️ Solo las ACTIVAS: colgar una cerrada de un objetivo abierto no suma
      // nada y llenaría la lista de cosas que ya no existen.
      /**
       * ⚠️ SI EL OBJETIVO ES DE PLATA, LA TARJETA CAMBIA DE FORMA. No es un
       * detalle de estilo: **un objetivo de plata no avanza con horas**, avanza
       * con lo que apartaste. Dibujarle el arco del tiempo y la barra de horas
       * era mostrarle un progreso que nunca se iba a mover.
       */
      plata:
        o.montoMeta != null && o.montoMeta > 0
          ? (() => {
              const suyos = todosLosAportes
                .filter((a) => a.objetivoId === o.id)
                .map((a) => ({ monto: a.monto, creado: a.creado }));
              const llevo = juntado(suyos);
              const ritmo = ritmoNecesario(suyos, { montoMeta: o.montoMeta! }, o.fechaMeta);
              return {
                llevo,
                meta: o.montoMeta!,
                moneda: o.moneda ?? '€',
                porcentaje: Math.min(100, Math.round((llevo / o.montoMeta!) * 100)),
                porSemana: ritmo && !ritmo.cumplido && ritmo.porSemana > 0 ? ritmo.porSemana : null,
              };
            })()
          : null,
      colgables: actividadesVivas.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        diaria: a.diaria,
        colgada: colgadas.some((c) => c.objetivoId === o.id && c.lineaId === a.id),
      })),
      progreso,
      proyeccion: o.estado === 'activo' ? proyeccion(o, horas, ritmo, hoy) : null,
      // ⚠️⚠️ LOS DÍAS DE VERDAD, NO SEMANAS REDONDEADAS POR SIETE (06/08). Acá
      // había `round(días / 7)` y la tarjeta lo multiplicaba por 7 otra vez para
      // dibujar "faltan N días": o sea que **la cifra estaba cuantizada a
      // semanas y se mostraba como días**. Con 4 días reales decía 7, y con 3
      // decía **0** — que es lo que Matías vio: *"restan cero días, acá está
      // mal"*. El redondeo entraba y salía por la misma puerta y nadie lo veía
      // porque el número seguía siendo plausible.
      diasQueFaltan: o.fechaMeta && o.estado === 'activo' ? Math.max(0, diasEntre(hoy, o.fechaMeta)) : null,
      // La cifra general que dejó el worker (`lib/estimador.ts`). Solo en los
      // activos: en uno ya cerrado, cuánto suele llevarle a la gente es una
      // curiosidad, y lo que importa es cuánto le llevó a él.
      estimacionGeneral:
        o.estado === 'activo' && o.estimacionTexto && o.estimacionFuente
          ? { texto: o.estimacionTexto, fuente: o.estimacionFuente, verificada: o.estimacionVerificada }
          : null,
      // La temperatura (1.4). Misma regla que `reencuadre` y `proyeccion`: solo
      // en los activos. En uno cerrado, "está frío" no describe nada — ya no hay
      // nada que mover, y se leería como un reproche sobre algo terminado.
      //
      // ⚠️ Se le pasan `todos`, no solo los manuales: si una actividad que cuelga
      // de este objetivo se marcó ayer, el objetivo SE MOVIÓ ayer. Con los
      // manuales solos, algo que venís sosteniendo por la vía automática
      // aparecería frío.
      temperatura: o.estado === 'activo' ? temperatura(todos, hoy) : null,
    };
  });

  const activos = vistas.filter((v) => v.estado === 'activo');
  // ⚠️ LOS PAUSADOS VAN EN SU PROPIO GRUPO (1.2, del 03/08), ni con los activos
  // ni con los cerrados. Con los activos, algo que frenaste a propósito se
  // mezcla con lo que estás sosteniendo y ensucia la lectura de la pantalla.
  // Con los cerrados, queda enterrado abajo con lo que ya terminó — y entonces
  // pausar sería una forma elegante de abandonar, que es justo lo que 1.2 vino
  // a evitar.
  const pausados = vistas.filter((v) => v.estado === 'pausado');
  const cerrados = vistas.filter((v) => v.estado === 'logrado' || v.estado === 'abandonado');

  // "Los 3 que cerraste te llevaron entre 5 y 8 semanas." Sale de los cerrados de
  // Matías y se dice como RANGO: con un solo caso, `estimarDeCerrados` devuelve
  // null y no se muestra nada.
  const estimacion = estimarDeCerrados(filas.filter((o) => o.estado === 'logrado'));

  // ── EL FOCO QUE SE QUEDÓ SIN TRABAJO (06/08) ────────────────────────────────
  // ⚠️ Se calcula con `vistas` y no con `filas` porque necesita el `avance.llego`:
  // un objetivo de rueda o de hábito que ya llegó cuenta como terminado aunque
  // siga 'activo' —la app mide sola y no cierra—, y sin eso el foco no caducaría
  // nunca por culpa de algo que la propia app da por cumplido.
  const objetivosParaFoco = vistas.map((v) => ({
    areaId: idArea.get(v.id) ?? null,
    estado: v.estado,
    llego: v.avance?.llego,
  }));
  const cumplidos = focosCumplidos(
    areasRows,
    objetivosParaFoco,
  );
  // ⚠️ El "ahora no" guarda CONTRA QUÉ ÁREAS se dijo que no, no un "visto": el
  // día que cumplas otra, la pregunta vuelve porque es una pregunta nueva.
  const [pospuesto] = await db.select().from(config).where(eq(config.clave, CLAVE_FOCO_CUMPLIDO));
  const firma = cumplidos
    .map((a) => a.id)
    .sort((a, b) => a - b)
    .join(',');
  const focosParaPreguntar = pospuesto?.valor === firma ? [] : cumplidos;

  return (
    // ⚠️ ESTE `<div>` NO ES DECORACIÓN: SIN ÉL, SEGUIMIENTO TIRA UN ERROR EN
    // CONSOLA (06/08). Acá había un `<>fragment</>`, y era la causa del
    // *"Each child in a list should have a unique key prop — check the render
    // method of `ActividadesUI`, it was passed a child from `ActividadesPage`"*
    // que Matías veía al ENTRAR a Seguimiento.
    //
    // ⚠️ Y NINGÚN `.map()` estaba sin `key`: se escanearon los 155 `.tsx` con el
    // parser de TypeScript y están todos bien. **El array no lo hacía un map, lo
    // hacía el fragment al cruzar de server a cliente.** Esta función es un
    // Server Component; cuando devuelve un fragment con varios hijos y el
    // resultado se le pasa COMO PROP a un componente cliente (`ActividadesUI`
    // recibe `objetivos={<ObjetivosSeccion />}`), del otro lado del serializado
    // llega **una lista de hijos sueltos**, no un elemento. Y una lista de hijos
    // quiere `key` en cada uno. Devolviendo un solo elemento llega un solo hijo,
    // y no hay lista que validar.
    //
    // ⚠️ POR ESO SE VEÍA EN SEGUIMIENTO Y NO EN `/objetivos`, con el mismo
    // componente: en `/objetivos` esto lo dibuja un server component (no hay
    // frontera que cruzar) y el fragment sigue siendo un fragment.
    //
    // ⚠️ Y POR ESO SALTABA AL ENTRAR, aun parado en la pestaña Tareas: la página
    // arma `<ObjetivosSeccion />` SIEMPRE para pasarlo como prop, mire uno la
    // pestaña que mire.
    //
    // Sin clases a propósito: un div pelado no corta el colapso de márgenes, así
    // que los `mt-5`/`mt-6` de acá adentro siguen midiendo exactamente igual.
    <div className="pila">
      {/* ⚠️ VA PRIMERO, ARRIBA DE LA LISTA. Es una pregunta sobre a qué le estás
          poniendo la cabeza, y eso se decide ANTES de mirar los objetivos: al
          pie, debajo de todo lo que ya cumpliste, se leería como un resumen de
          lo hecho y no como algo para contestar. */}
      <FocoCumplido
        areas={focosParaPreguntar.map((a) => ({ id: a.id, nombre: a.nombre }))}
        conLogro={huboLogro(focosParaPreguntar.map((a) => a.id), objetivosParaFoco)}
      />

      {activos.length === 0 && pausados.length === 0 && cerrados.length === 0 && (
        <div className="tarjeta border border-dashed border-niebla-2 bg-white/60">
          <p className="text-[14px] leading-[1.45] text-tinta-soft text-pretty">
            Acá va lo grande y sin fecha de entrega: buscar trabajo, aprender un idioma, volver a entrenar. No mide
            rachas: mide el tiempo que le vas poniendo, para que dos semanas flojas no te tapen nueve meses de trabajo.
          </p>
        </div>
      )}

      {activos.map((o) => (
        <TarjetaObjetivo key={o.id} o={o} areas={areasRows} />
      ))}

      {/* ── ⚠️ LOS DOS CAMINOS DE ALTA, AGRUPADOS (07/08) ────────────────────
          Matías, mirando la app: *"los botones para crear objetivos están como
          demasiado separados uno del otro"*.

          Y la causa era exacta: como hijos sueltos de `.pila` se llevaban los
          **24px de `--sp-5`**, el mismo hueco que separa dos objetivos
          distintos. Pero estos dos no son dos temas — son **dos maneras de
          hacer lo mismo**, y la escala ya decía qué les toca: `--sp-2`, *"entre
          cosas que son la misma idea"*.

          El `.grupo` los junta a 8px y, como el grupo entero sigue siendo un
          hijo de la pila, contra lo de afuera conserva sus 24px. ⚠️ El agujero
          era del kit y se tapó ahí (ver `.grupo` en globals.css): `.pila` no
          tenía forma de decir "estas dos van juntas", así que cualquier pantalla
          que agrupara cosas parecidas iba a romperse igual. */}
      <div className="grupo">
        {/* ── UNA SOLA PUERTA DE ALTA (06/08) ────────────────────────────────
            Matías: *"cuando apretás un objetivo nuevo, te tiene que preguntar…
            me tenés que hacer el onboarding de eso también"*.

            ⚠️ ERAN DOS BOTONES QUE CREABAN LA MISMA COSA DE DOS MANERAS: uno te
            preguntaba área, tipo y qué lo va a mover; el otro era un formulario
            en blanco. Y el segundo no era "la versión rápida", era **la versión
            que produce objetivos sin área y sin tipo** — justo los dos campos de
            los que dependen la tarjeta, el foco que caduca y la medida. Los dos
            objetivos viejos de la base no tienen área por eso.

            Ahora la puerta es una y pregunta siempre. `?nuevo=1` (el "Sí,
            anotarlo" del Home) la abre ya desplegada, como antes. */}
        <ObjetivoDesdeRueda
          areas={areasRows}
          actividades={actividadesVivas.map((a) => ({ id: a.id, titulo: a.titulo, diaria: a.diaria }))}
          abrirYa={nuevo === '1'}
        />

        {/* ── Y EL OTRO CAMINO: UNO PROPIO, SIN PARTIR DE LA RUEDA (06/08) ───
            Matías: *"falta agregar uno de armar un objetivo propio que tenga que
            ver con otras cosas, con un hábito o con otras cosas"*.

            ⚠️ NO ES EL FORMULARIO EN BLANCO QUE SE BORRÓ. Aquel no preguntaba
            nada; este es **el mismo flujo de tres pasos**, salteando el paso del
            área. Pregunta lo mismo —tipo, título, fecha, qué lo va a mover— y por
            eso no vuelve a producir objetivos que la tarjeta no sabe medir. Lo
            único que no tiene es de dónde sacar la propuesta "subir de 2 a 3". */}
        <ObjetivoDesdeRueda
          areas={areasRows}
          actividades={actividadesVivas.map((a) => ({ id: a.id, titulo: a.titulo, diaria: a.diaria }))}
          sinArea
        />
      </div>

      {/* EN PAUSA: entre lo activo y lo cerrado, que es exactamente lo que son.
          Sin encabezado si no hay ninguno: un título "En pausa" sobre la nada
          le recuerda una función a alguien que no la está usando. */}
      {pausados.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10.5px] font-bold tracking-[0.3px] text-niebla">
            En pausa
          </p>
          {pausados.map((o) => (
            <TarjetaObjetivo key={o.id} o={o} areas={areasRows} />
          ))}
        </div>
      )}

      {estimacion && (
        <div className="tarjeta border border-iris-borde bg-white">
          <p className="mb-1 font-mono text-[10.5px] font-bold tracking-[0.3px] text-niebla">
            Cuánto suele llevarte
          </p>
          <p className="text-[13.5px] leading-[1.45] text-tinta text-pretty">{estimacion}</p>
          {/* De dónde sale: es un dato de él, no un promedio de nadie más. */}
          <p className="mt-1.5 font-mono text-[10.5px] text-niebla">sale de lo tuyo, no de un promedio de nadie</p>
        </div>
      )}

      {/* ── LOS CERRADOS, PLEGADOS AL PIE (06/08) ────────────────────────────
          Matías: *"cerré algunas de objetivos y me siguen apareciendo y me
          confunden"*.

          ⚠️ Y NO ERA UNA IMPRESIÓN: se dibujaban como tarjetas enteras, del
          mismo tamaño que las vivas, apenas más pálidas y con un `<h2>` arriba.
          En una pantalla donde lo que importa es qué tenés abierto, **lo
          cerrado ocupaba tanto lugar como lo abierto**.

          ⚠️ NO SE ARCHIVAN NI DESAPARECEN, y eso no cambió: son la materia
          prima de "cuánto suele llevarte" de arriba. Lo que cambió es que ahora
          hay que abrirlos para verlos — la misma forma que ya tenían las
          actividades cerradas al pie de Seguimiento, así las dos pantallas
          esconden lo terminado de la misma manera. */}
      {cerrados.length > 0 && (
        <details className="rounded-[18px] border border-iris-borde bg-white/70">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-[12px_14px] font-mono text-[12px] font-semibold text-niebla">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px] flex-none text-verde">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Cerrados
            <span className="ml-auto font-mono text-[11px] text-niebla-2">{cerrados.length}</span>
          </summary>
          <div className="border-t border-[#f1f0f7] p-[10px_10px_2px]">
            {cerrados.map((o) => (
              <TarjetaObjetivo key={o.id} o={o} areas={areasRows} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * LOS ÚLTIMOS `cuantos` DÍAS, del más viejo al más nuevo, diciendo cuáles tienen
 * movimiento.
 *
 * ⚠️ TERMINA EN HOY Y NO EN LA ÚLTIMA MARCA: si la tira terminara en el último
 * día que tocaste algo, un objetivo abandonado hace un mes se vería igual de
 * lleno que uno que venís sosteniendo. El hueco del final es información.
 */
function ultimosDias(conMovimiento: Set<string>, hoy: string, cuantos: number): { fecha: string; hecho: boolean }[] {
  const salida: { fecha: string; hecho: boolean }[] = [];
  const d = new Date(`${hoy}T00:00:00`);
  d.setDate(d.getDate() - (cuantos - 1));
  for (let i = 0; i < cuantos; i += 1) {
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    salida.push({ fecha, hecho: conMovimiento.has(fecha) });
    d.setDate(d.getDate() + 1);
  }
  return salida;
}


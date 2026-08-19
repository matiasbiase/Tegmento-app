/**
 * The home screen, and the reason the app is shaped the way it is.
 *
 * It's a chat, not a dashboard: you write what happened and the app files it —
 * expenses, activities, mood, notes, goals. Everything this page assembles is
 * in service of the next thing you might want to say, never of grading you on
 * what you already did.
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { analisis, animoCheckins, chatMensajes, chats, config, cuerpo, gastos, hechos as hechosTabla, lineas, marcas, aportes, objetivos, sugerencias, temas } from '@/lib/db/schema';
import { mismoHecho } from '@/lib/cerebro-hechos';
import { candidatos, CLAVE_ARRANQUE, type Candidato } from '@/lib/objetivos-arranque';
import { fraseMetaAlta, metaDemasiadoAlta, semanasDe } from '@/lib/meta-alta';
import { leerEstadoRitual } from '@/lib/actions/ritual';
import type { TarjetaBot } from '@/components/chat/TarjetasBot';
import { estimarDeCerrados } from '@/lib/objetivos';
import { AsistenteEntrada, type Spotlight, type QuickChip } from '@/components/chat/AsistenteEntrada';
import type { LoQueFalta } from '@/components/cuerpo/TarjetaQueFrena';
import { queTeFrena, progresoDelDia } from '@/lib/frena';
import { armarDisparadores } from '@/lib/disparadores';
import { diasDeRacha as contarRacha, grillaDias, vecesEsteDia, ymd } from '@/lib/marcas';
import { acomodar, chipsDeHoy } from '@/lib/chips-hoy';
import { diasQueSuman } from '@/lib/racha';
import { titular } from '@/lib/titulos';
import { ABIERTAS, aperturaActividad, aperturaCabo, aperturaTema, elegirApertura } from '@/lib/aperturas';
import { caboDelDia, cabosSueltos } from '@/lib/cabos-sueltos';
// ⚠️ `animoDesde` y `textoDelCruce` siguen existiendo en `lib/relectura` con
// sus tests: el cruce está APAGADO, no borrado. Volver a prenderlo es una línea.
import { candidatas, haceCuanto, idRelectura, relecturasDelDia } from '@/lib/relectura';
import { diasDeExperimento, limpiarExperimento } from '@/lib/experimentos';
import { confianzaSegunEvidencia, limpiarObservacion } from '@/lib/observacion-valida';
import { COOKIE_DESCARTADAS, leerDescartadas } from '@/lib/tarjetas-descartadas';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';


// El chat es la pantalla principal. Formatos mezclados para no cansar:
//  - un destacado grande "che, mirá esto" (rota entre features, descartable),
//  - chips de entrada rápida (formato chico),
//  - pocos disparadores de conversación.
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hace14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const desdeSemana = grillaDias()[0].fecha;
  const desde8Semanas = ymd(new Date(Date.now() - 56 * 86_400_000));
  // ⚠️ NO DESDE EL 1° DEL MES, AUNQUE LA GRILLA MUESTRE EL MES (01/08).
  //
  // La tarjeta dibuja el mes corriente, así que traer desde el día 1 parecía lo
  // justo. Pero de los MISMOS datos sale la RACHA, y la racha camina hacia atrás
  // día por día: si julio no está cargado, se corta en el 1° de agosto aunque
  // vengas de cuarenta días seguidos.
  //
  // O sea que la racha se reiniciaba sola el primero de cada mes, y el peor caso
  // era justo el de alguien que la venía sosteniendo. Lo pescó Matías el día 1,
  // que es el único día del mes en que se nota: *"no me aparecen los días en la
  // esquina, ¿se perdieron los meses anteriores?"*. No se perdió nada — nunca se
  // habían leído.
  //
  // 70 días cubren cualquier racha que la tarjeta pueda mostrar con sentido y
  // siguen siendo cuatro consultas chicas. Lo que se DIBUJA no cambia: la grilla
  // busca cada día por fecha exacta y el contador del mes filtra por prefijo.
  const desdeUso = ymd(new Date(Date.now() - 70 * 86_400_000));

  const [nombreCfg, confirmados, diarias, marcasSemana, marcasHistoricas, factoresCrudos, ultimoSueno, pendientes, checkinHoy, suenoHoy, comidaHoy, senalHoy, ultimoCheckin, ultimoTema, actividadesAbiertas, ultimoAnalisis, gastosHoy, mensajesMes, marcasMes, animoMes, cuerpoMes, veredictosDados, hechosDelCerebro] = await Promise.all([
    db.select().from(config).where(eq(config.clave, 'nombre')),
    // patrones que Matías confirmó ("me pasa"), lo más suyo que tenemos
    db
      .select({ contenido: sugerencias.contenido })
      .from(sugerencias)
      .where(and(eq(sugerencias.tipo, 'observacion'), eq(sugerencias.estado, 'anotada')))
      .orderBy(desc(sugerencias.creado))
      .limit(3),
    // actividades con seguimiento y su meta, para preguntar cómo viene contra ella
    db
      .select({ id: lineas.id, titulo: lineas.titulo, metaSemanal: lineas.metaSemanal })
      .from(lineas)
      .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'), eq(lineas.diaria, true))),
    // días pintados de la semana visible, para saber cuánto lleva de cada meta
    db.select({ lineaId: marcas.lineaId, fecha: marcas.fecha }).from(marcas).where(gte(marcas.fecha, desdeSemana)),
    // ocho semanas de marcas: de acá sale QUÉ DÍA TOCA cada actividad. No hay un
    // campo de "los martes"; se infiere de en qué día de la semana la marcaste.
    db.select({ lineaId: marcas.lineaId, fecha: marcas.fecha }).from(marcas).where(gte(marcas.fecha, desde8Semanas)),
    // factores de los últimos check-ins: si uno se repite, es tema
    db
      .select({ factores: animoCheckins.factores })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, hace14)))
      .orderBy(desc(animoCheckins.creado))
      .limit(14),
    // último registro de sueño, para notar el hueco
    db.select({ creado: cuerpo.creado }).from(cuerpo).where(eq(cuerpo.tipo, 'sueno')).orderBy(desc(cuerpo.creado)).limit(1),
    db.select().from(sugerencias).where(eq(sugerencias.estado, 'pendiente')).orderBy(desc(sugerencias.creado)).limit(2),
    // El check-in de hoy entero: el estado da el color del anillo de Ánimo y
    // factores/palabras dicen cuánto lo llenaste (el anillo mide eso, no si te
    // fue bien).
    db
      .select({
        id: animoCheckins.id,
        estado: animoCheckins.estado,
        factores: animoCheckins.factores,
        palabras: animoCheckins.palabras,
      })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, inicioHoy.toISOString())))
      .orderBy(desc(animoCheckins.creado))
      .limit(1),
    db
      .select({ id: cuerpo.id, valor: cuerpo.valor, calidad: cuerpo.calidad })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, inicioHoy.toISOString())))
      .limit(1),
    db
      .select({ id: cuerpo.id })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'comida'), gte(cuerpo.creado, inicioHoy.toISOString())))
      .limit(1),
    // energía/libido de hoy: para marcar el chip "Cómo venís" como hecho
    db
      .select({ tipo: cuerpo.tipo, valor: cuerpo.valor })
      .from(cuerpo)
      .where(and(inArray(cuerpo.tipo, ['energia', 'libido']), gte(cuerpo.creado, inicioHoy.toISOString()))),
    // último check-in de ánimo (cualquier día) y último tema hablado: para el saludo contextual
    db
      .select({ estado: animoCheckins.estado, creado: animoCheckins.creado })
      .from(animoCheckins)
      .where(isNull(animoCheckins.areaId))
      .orderBy(desc(animoCheckins.creado))
      .limit(1),
    db
      .select({ nombre: temas.nombre })
      .from(chats)
      .innerJoin(temas, eq(chats.temaId, temas.id))
      .orderBy(desc(chats.ultimaActividad))
      .limit(1),
    // actividades abiertas (lo que está haciendo/buscando): alimentan saludo + tarjeta.
    // `diaria` viene para poder separar lo que se sostiene día a día de las
    // TAREAS (las de una sola vez), que son las que el Home recuerda aparte.
    db
      .select({ id: lineas.id, titulo: lineas.titulo, diaria: lineas.diaria, notas: lineas.notas, ultima: lineas.ultimaActividad })
      .from(lineas)
      .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa')))
      .orderBy(desc(lineas.ultimaActividad)),
      // ⚠️ SIN LÍMITE. Tenía `limit(5)` y el 29/07 ya había SIETE activas: las
      // dos más viejas no existían para el Home ni para la cajita, así que un
      // experimento aceptado podía no preguntarse nunca. Son las actividades
      // abiertas de una persona: nunca van a ser miles, y recortarlas rompía
      // funciones enteras en silencio. Lo que sí se recorta es lo que se
      // MUESTRA, y eso se decide abajo, no en la consulta.
    db.select({ fecha: analisis.fecha, hiloCentral: analisis.hiloCentral, resultado: analisis.resultado }).from(analisis).orderBy(desc(analisis.id)).limit(1),
    // Gastos cargados hoy: el chip de Ticket se marcaba NUNCA, porque no se
    // miraba si habías cargado alguno. Matías cargó gastos por chat, entraron a
    // Finanzas, y el chip seguía en gris (27/07). Se miran por `creado` y no por
    // `fecha`: `fecha` es la del ticket, que puede ser de otro día.
    db
      .select({ id: gastos.id })
      .from(gastos)
      .where(gte(gastos.creado, inicioHoy.toISOString()))
      .limit(1),
    // Los mensajes TUYOS del mes: de acá sale el calendario de "Escribiste".
    // Solo rol 'user' — que la app te conteste no es que hayas escrito vos.
    db
      .select({ creado: chatMensajes.creado })
      .from(chatMensajes)
      .where(and(eq(chatMensajes.rol, 'user'), gte(chatMensajes.creado, desdeUso))),
    // ── El resto de lo que contás como USO del día ────────────────────────────
    // Marcar una actividad, registrar el ánimo o cargar algo del cuerpo son usar
    // la app tanto como escribir. Sin esto el calendario contaba solo el chat, y
    // le decía a Matías 11 días donde había 28 (29/07).
    db.select({ fecha: marcas.fecha }).from(marcas).where(gte(marcas.fecha, desdeUso)),
    db
      .select({ creado: animoCheckins.creado })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, desdeUso))),
    // ⚠️ `origen` viene para la RACHA (10/08): solo lo cargado a mano la
    // sostiene. Los cuadraditos del mes siguen contando todo — un dato del
    // reloj es uso de la app, simplemente no es haber venido a contar algo.
    // ⚠️ `tipo` se sumó el 13/08: esta consulta ya traía las filas del mes para
    // el calendario de uso, y la tarjeta que pide la captura de pantalla necesita
    // saber de qué tipo son. Una columna más en una consulta que ya se hacía.
    db.select({ creado: cuerpo.creado, origen: cuerpo.origen, tipo: cuerpo.tipo }).from(cuerpo).where(gte(cuerpo.creado, desdeUso)),
    // TODO lo que ya contestaste sobre las relaciones: confirmado Y descartado.
    // Sin límite y sin filtrar por estado, porque la pregunta acá es "¿esta ya
    // la contestó?" y un "no es así" cuenta tanto como un "sí, me pasa".
    // (`confirmados`, arriba, es otra cosa: las tres últimas que confirmó, que
    // alimentan los disparadores del chat.)
    db
      .select({ contenido: sugerencias.contenido, estado: sugerencias.estado })
      .from(sugerencias)
      .where(and(eq(sugerencias.tipo, 'observacion'), inArray(sugerencias.estado, ['anotada', 'descartada']))),
    // Los hechos del cerebro, para poder atar una tarjeta al hecho que pregunta.
    db.select().from(hechosTabla),
  ]);

  // CUÁNTAS COSAS hiciste cada día del mes: de acá sale el calendario de arriba,
  // y la intensidad de cada cuadradito. Cuenta todo, no solo los mensajes: un
  // día en que marcaste el alemán y cargaste el sueño es un día de uso.
  const usoPorDia: Record<string, number> = {};
  const sumar = (f: string) => {
    usoPorDia[f] = (usoPorDia[f] ?? 0) + 1;
  };
  for (const m of mensajesMes) sumar(ymd(new Date(m.creado)));
  for (const m of marcasMes) sumar(m.fecha);
  for (const a of animoMes) sumar(ymd(new Date(a.creado)));
  for (const c of cuerpoMes) sumar(ymd(new Date(c.creado)));

  // ── LOS DÍAS QUE CUENTAN PARA LA RACHA (05/08) ────────────────────────────
  //
  // ⚠️⚠️ NO ES `usoPorDia`, Y ESA ES LA CORRECCIÓN DE MATÍAS. Primero se
  // implementó contando todo —mensajes, marcas, ánimo y cuerpo— y él lo acotó:
  //
  //   *"Solo suma racha cuando entra a la aplicación y escribe algo: escribe,
  //   chatea con el bot, avisa un poco cómo está o hace un resumen del día."*
  //
  // Entonces cuenta lo que ESCRIBIÓ (mensajes suyos en el chat) y lo que CONTÓ
  // (el check-in de ánimo). No cuentan las marcas de actividad ni los registros
  // de cuerpo.
  //
  // ⚠️ Y ESTO CONTESTA SOLO LA PREGUNTA QUE HABÍA QUEDADO ABIERTA: *"si el sueño
  // llega del reloj, ¿ese día suma?"*. **No.** La racha mide que hayas venido a
  // contar algo, y un dato que entra por HealthKit mientras dormís no es eso.
  // Sin esta acotación, la racha se sostendría sola con el reloj prendido y
  // dejaría de significar nada.
  //
  // Medido con sus datos el 05/08: contando todo daba 25 días; con esto, 16.
  // El segundo es el número honesto.
  //
  // ── ⚠️⚠️ Y EL CUERPO CARGADO A MANO TAMBIÉN SUMA (10/08) ──────────────────
  //
  // Lo reportó Matías mirando la app: *"la abrí todos los días y anoté algo, y
  // así y todo los fueguitos se fueron"*. Tenía razón, y medido contra su base:
  // el **08/08 cargó el sueño a mano, con calidad y todo**, y la racha se cortó
  // igual. Le mostraba **2 días donde había 22**.
  //
  // ⚠️ LA REGLA DE ARRIBA NO ESTABA MAL — el código no alcanzaba para aplicarla.
  // Él dijo *"un dato que entra solo del reloj no sostiene la racha"*, y eso
  // sigue siendo cierto. Pero `cuerpo` **no tenía cómo distinguir** lo que
  // tipeaba él de lo que traía Apple Salud, así que se excluía la tabla ENTERA y
  // de paso se llevaba puesto lo que sí había venido a contar.
  //
  // **Una regla correcta aplicada sobre un dato que no alcanza para distinguir
  // da un resultado incorrecto** — y encima uno que parece deliberado, porque
  // la racha desaparece en silencio y nunca dice por qué.
  //
  // Ahora la columna `origen` lo separa: 'manual' suma, 'salud' no. Cargar el
  // sueño a mano ES venir a contar algo; que el reloj lo mande mientras dormís,
  // no.
  //
  // ⚠️ MARCAR UNA ACTIVIDAD SIGUE SIN SUMAR, y es decisión suya del 10/08 entre
  // tres opciones. Vale anotarlo porque el Home nuevo puso "hoy, de un toque"
  // como lo más a mano de la pantalla: **la acción más barata de la app no es la
  // que sostiene la llama**, y si algún día eso molesta, acá está la palanca.
  // La regla vive en `lib/racha` y tiene tests: acá solo se le pasan los datos.
  const diasDeRacha = diasQueSuman({ mensajes: mensajesMes, animo: animoMes, cuerpo: cuerpoMes, marcas: marcasMes });

  // ⚠️ LA CUENTA SE HACE UNA SOLA VEZ, ACÁ (07/08). Antes la lista de días
  // viajaba hasta `MesDeUso` y la racha se contaba allá adentro, porque la llama
  // vivía en esa tarjeta. Desde que la llama se separó y subió al lado del
  // saludo, tener la cuenta adentro del componente del mes sería dejar el número
  // en un lugar que ya no lo muestra. Con un día no hay racha: `contarRacha`
  // devuelve vacío abajo de 2, y la llama no se dibuja.
  const racha = contarRacha(diasDeRacha, new Date()).length;

  // ── EL RITUAL, PARA EL AVISO DEL HOME (05/08) ────────────────────────────
  // ⚠️ SE LEE EL MISMO ESTADO QUE USA LA NOTIFICACIÓN, no uno paralelo: si el
  // aviso de adentro y el de afuera pudieran estar prendidos por separado,
  // apagarlo en Perfil dejaría la mitad andando.
  const estadoRitual = await leerEstadoRitual();

  const sinCheckin = checkinHoy.length === 0;
  const sinSueno = suenoHoy.length === 0;
  const sinComida = comidaHoy.length === 0;
  const sinSenal = senalHoy.length === 0;
  const sinGasto = gastosHoy.length === 0;

  /**
   * ── QUÉ ANOTASTE HOY, EN PALABRAS (06/08) ─────────────────────────────────
   * Para la listita de la tarjeta del mes. Matías: *"añadiría una listita de qué
   * cosas ya anotaste"*.
   *
   * ⚠️ NO HACE NI UNA CONSULTA NUEVA: los cinco `sinX` de acá arriba ya estaban
   * calculados para decidir qué preguntar en el chat. Lo único que se agrega es
   * ponerles nombre. Traer esto de la base otra vez habría sido pagar dos veces
   * por el mismo dato.
   *
   * ⚠️ DICE LO QUE HAY, NUNCA LO QUE FALTA. Es la regla de esta tarjeta desde el
   * 29/07: lo que falta se ve solo, por ausencia, sin que la app lo nombre.
   */
  const marcadasHoy = marcasMes.filter((m) => m.fecha === ymd(new Date())).length;
  const hechoHoy = [
    !sinCheckin && 'ánimo',
    !sinSueno && 'sueño',
    !sinComida && `${comidaHoy.length} ${comidaHoy.length === 1 ? 'comida' : 'comidas'}`,
    !sinSenal && 'energía',
    !sinGasto && `${gastosHoy.length} ${gastosHoy.length === 1 ? 'gasto' : 'gastos'}`,
    marcadasHoy > 0 && `${marcadasHoy} ${marcadasHoy === 1 ? 'actividad' : 'actividades'}`,
  ].filter((x): x is string => typeof x === 'string');

  // ── DÍAS SIN APORTAR A UN OBJETIVO DE PLATA (0.11, del 04/08) ─────────────
  // Alimenta el cuarto candidato de `queTeFrena`. `null` si no hay ningún
  // objetivo de plata activo: sin objetivo no hay nada que reclamar, y frenar
  // por algo que no te propusiste sería inventar una deuda.
  //
  // ⚠️ SIN APORTES TODAVÍA CUENTA DESDE QUE ARRANCÓ EL OBJETIVO. Si no, uno
  // recién creado daría `null` y nunca frenaría — que es al revés de lo que
  // importa: los primeros días son justo cuando se abandona.
  const objetivosPlataActivos = await db
    .select({ id: objetivos.id, arranco: objetivos.arranco })
    .from(objetivos)
    .where(and(isNotNull(objetivos.montoMeta), eq(objetivos.estado, 'activo')));

  let diasSinAportar: number | null = null;
  if (objetivosPlataActivos.length > 0) {
    const ids = objetivosPlataActivos.map((o) => o.id);
    const ultimos = await db
      .select({ creado: aportes.creado })
      .from(aportes)
      .where(inArray(aportes.objetivoId, ids))
      .orderBy(desc(aportes.creado))
      .limit(1);
    const desde = ultimos[0]?.creado ?? `${objetivosPlataActivos[0].arranco}T00:00:00`;
    const ms = Date.now() - Date.parse(desde);
    diasSinAportar = Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null;
  }
  // El hilo central de la última lectura del Analista: asoma en el saludo como
  // insight real (no un cartelito genérico). Se recorta para el subtítulo.
  const hilo = ultimoAnalisis[0]?.hiloCentral?.trim() || null;
  const hiloCorto = hilo ? (hilo.length > 96 ? `${hilo.slice(0, 94)}…` : hilo) : null;
  const hayRelaciones = pendientes.length > 0 || !!hiloCorto;

  const cfgMap = new Map(nombreCfg.map((r) => [r.clave, r.valor]));
  const nombre = cfgMap.get('nombre') ?? 'Matías';

  // Saludo grande por hora (estilo Claude) + fecha larga, arriba de todo.
  const ahora = new Date();
  const h = ahora.getHours();
  const franja = h >= 5 && h < 12 ? 'Buenos días' : h >= 12 && h < 20 ? 'Buenas tardes' : 'Buenas noches';
  // EL RITUAL (decisión de Matías: "al final es lo más importante"). La Casa
  // cambia según la hora en vez de ofrecer siempre el mismo tablero:
  //   mañana → cuánto dormiste (es el dato más fresco y el que más explica el día)
  //   noche  → cerrás el día
  // Fase 1: la pantalla se acomoda sola. Fase 2 (pendiente): la notificación que
  // te trae, que es lo que lo convierte en ritual de verdad.
  const momento: 'manana' | 'dia' | 'noche' = h >= 5 && h < 12 ? 'manana' : h >= 20 || h < 5 ? 'noche' : 'dia';
  const greeting = `${franja}, ${nombre}.`;
  const fechaLarga = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
    .format(ahora)
    .replaceAll('.', '');
  // ── LA RELECTURA (07/08) ─────────────────────────────────────────────────
  // Lo que él escribió hace entre dos semanas y tres meses, devuelto, con el
  // cruce de cómo vino el ánimo desde entonces. Ver `lib/relectura`: la regla
  // que decide qué se puede releer —y sobre todo qué NO— vive ahí y tiene tests.
  // ⚠️ ACÁ SE TRAÍA TAMBIÉN **TODA** LA TABLA `animo_checkins` —sin `where` ni
  // `limit`— y era solo para el cruce que se apagó el 11/08. Se sacó con él: una
  // consulta que barre una tabla entera para alimentar algo que ya no se dibuja
  // es de las cosas que se quedan años sin que nadie note.
  const mensajesViejos = await db
    .select({ texto: chatMensajes.contenido, creado: chatMensajes.creado, adjunto: chatMensajes.adjuntoTipo })
    .from(chatMensajes)
    .where(eq(chatMensajes.rol, 'user'))
    .orderBy(desc(chatMensajes.creado))
    .limit(300);
  const hoyRelectura = ymd(new Date());
  // Van TODAS las de hoy y no solo la primera (09/08): "Otro recuerdo" cambia de
  // recuerdo sin ir al server, que es lo que lo hace instantáneo. Son cinco
  // frases y su cruce, no una lista que valga la pena paginar.
  const elegidas = relecturasDelDia(
    candidatas(
      mensajesViejos.map((m) => ({ texto: m.texto, fecha: m.creado.slice(0, 10), conAdjunto: !!m.adjunto })),
      hoyRelectura,
    ),
    hoyRelectura,
  );
  // ⚠️ EL "CERRAR POR HOY" DE LA COOKIE SE SACÓ (12/08, temporal). Mientras se
  // itera esta tarjeta recién nacida, Matías la quiere SIEMPRE que haya algo
  // para mostrar — el cierre de un día entero se sentía como "se rompió" y no
  // como "la cerré". La lógica de `lib/relectura-oculta` sigue ahí con sus
  // tests, apagada y no borrada: volver a prenderla es una línea (ver
  // `Relectura.tsx`, que ya no escribe la cookie tampoco).
  const relecturas = elegidas.map((e) => {
    // ── ⚠️⚠️ EL CRUCE CON EL ÁNIMO SE APAGÓ (11/08) ──────────────────
    // Matías: *"abajo dice, por ejemplo, 'desde que hiciste esto nunca
    // tuviste mal humor'. Es una pelotudez esa relación, no es muy buena. Y
    // además sale de un cerebro que no está bien conectado todavía. Por
    // ahora la sacaría, porque no suma nada, solo resta"*.
    //
    // ⚠️ EL ARGUMENTO DEL 07/08 ERA BUENO Y EL RESULTADO NO. Se construyó
    // con esta idea: *"devolverte una frase es memoria; ponerle al lado qué
    // pasó después es lo único que vos no podés hacer de cabeza"*. Sigue
    // siendo cierto — pero con los datos de hoy el cruce produce
    // afirmaciones pobres, y **una relación pobre en la tarjeta que más le
    // gusta le baja el valor a todo lo demás que dice**.
    //
    // ⚠️ SE APAGA LA SALIDA, NO SE BORRA LA IDEA. `animoDesde` y
    // `textoDelCruce` quedan en `lib/relectura` con sus tests: cuando el
    // cerebro esté mejor armado, esto es una línea para volver a prenderlo.
    // Borrarlos obligaría a reescribir la regla desde cero.
    // ⚠️ `fecha` VIAJA AUNQUE NO SE DIBUJE: es lo único que identifica a la
    // frase. `cuando` es un redondeo para leer ("hace un mes" son 24 días
    // distintos) y no sirve para decir cuál es cuál — ver `idRelectura`.
    return { texto: e.texto, fecha: e.fecha, cuando: haceCuanto(e.dias), cruce: null };
  });

  // ── LOS CABOS SUELTOS (07/08) ───────────────────────────────────────────
  // Los temas que ya salieron de las charlas, con la última vez que se habló de
  // cada uno, cruzados contra TODO lo que existe hoy. Ver `lib/cabos-sueltos`:
  // lo que hace útil a esto no es acordarse, es el cruce.
  const [temasHablados, titulosObjetivos] = await Promise.all([
    db
      .select({ nombre: temas.nombre, ultimaVez: chats.ultimaActividad })
      .from(chats)
      .innerJoin(temas, eq(chats.temaId, temas.id))
      .orderBy(desc(chats.ultimaActividad))
      .limit(40),
    db.select({ titulo: objetivos.titulo }).from(objetivos),
  ]);
  const cabo = caboDelDia(
    cabosSueltos(
      temasHablados.map((t) => ({ nombre: t.nombre, ultimaVez: t.ultimaVez.slice(0, 10) })),
      [...actividadesAbiertas.map((a) => a.titulo), ...titulosObjetivos.map((o) => o.titulo)],
      ymd(new Date()),
    ),
    ymd(new Date()),
  );

  const fecha = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

  // Saludo-guía (burbuja): pregunta de enganche, contextual a lo último. El "Hola"
  // ya lo dice el saludo grande, así que acá va solo la pregunta.
  const ultCheckin = ultimoCheckin[0];
  const diasDesde = ultCheckin ? (Date.now() - new Date(ultCheckin.creado).getTime()) / 86_400_000 : Infinity;
  const tema = ultimoTema[0]?.nombre;
  // Rota entre tus actividades abiertas según el día (cada vez que abrís, otra).
  const actRotada = actividadesAbiertas.length
    ? actividadesAbiertas[Math.floor(Date.now() / 86_400_000) % actividadesAbiertas.length]
    : null;
  // ⚠️ `proactivo` es lo que la app dice PRIMERO, sin que le pregunten. Solo
  // cuando sale de algo real (falta el check-in, venías flojo, una actividad
  // tuya, un tema abierto). Si el saludo cae en el genérico, `proactivo` queda
  // en null y la app NO habla: mejor callada que pesada.
  let proactivo = true;
  let saludo: string;
  if (momento === 'noche' && sinCheckin) {
    saludo = `¿Cómo estuvo el día?`;
  } else if (momento === 'manana' && sinSueno) {
    saludo = `¿Cómo dormiste?`;
  } else if (sinCheckin && ultCheckin && diasDesde < 3 && ultCheckin.estado === 'bajon') {
    saludo = `¿Cómo amaneciste? Venías medio flojo, ¿aflojó algo?`;
  } else if (cabo && Math.floor(Date.now() / 86_400_000) % 2 === 0) {
    // ⚠️ ALTERNA POR DÍA CON LA PREGUNTA POR UNA ACTIVIDAD, y no le gana
    // siempre. Un cabo suelto dura hasta 30 días, así que si tuviera prioridad
    // fija podría tapar durante semanas las preguntas por lo que SÍ estás
    // sosteniendo — y la app pasaría de acordarse a insistir.
    saludo = aperturaCabo(cabo.tema.toLowerCase());
  } else if (actRotada) {
    // La forma de preguntar rota por día (ver lib/aperturas). Estas dos ramas
    // usaban la MISMA plantilla y son las que más caen: por eso la app parecía
    // repetir siempre la misma frase.
    saludo = aperturaActividad(titular(actRotada.titulo, 38).toLowerCase());
  } else if (cabo) {
    saludo = aperturaCabo(cabo.tema.toLowerCase());
  } else if (tema && !sinCheckin) {
    saludo = aperturaTema(tema.toLowerCase());
  } else if (sinCheckin) {
    saludo = `¿Cómo venís hoy?`;
  } else {
    saludo = `¿Qué me contás?`;
    proactivo = false; // no hay nada tuyo que decir: no arranca conversación
  }

  // ── Lo que TOCA hoy ─────────────────────────────────────────────────────────
  // No hay un campo "qué días la hago" (queda pendiente decidirlo), así que se
  // infiere de en qué día de la semana la venís marcando: dos veces en el mismo
  // día ya es patrón (ver `vecesEsteDia`). Si toca y todavía no la marcaste, se
  // gana el destacado — es lo más concreto que la app puede decir hoy, mucho
  // más que "bajá un cambio con la respiración".
  const hoyStr = ymd(inicioHoy);
  const marcadasHoyIds = new Set(marcasHistoricas.filter((m) => m.fecha === hoyStr).map((m) => m.lineaId));
  const tocanHoy = diarias
    .map((a) => ({
      ...a,
      veces: vecesEsteDia(
        marcasHistoricas.filter((m) => m.lineaId === a.id).map((m) => m.fecha),
        ahora,
      ),
    }))
    .filter((a) => a.veces >= 2 && !marcadasHoyIds.has(a.id))
    .sort((a, b) => b.veces - a.veces);
  const tocaAhora = tocanHoy[0] ?? null;
  const diaSemana = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(ahora);
  // "los jueves" ya viene en plural; "sábado"/"domingo" necesitan la s.
  const diaPlural = diaSemana.endsWith('s') ? diaSemana : `${diaSemana}s`;
  const deHoy: Spotlight | null = tocaAhora
    ? {
        id: `toca-${tocaAhora.id}`,
        titulo: `Hoy toca ${titular(tocaAhora.titulo, 38).toLowerCase()}`,
        sub: `Lo venís haciendo los ${diaPlural}. Marcalo cuando lo hagas y te sigo la cuenta.`,
        cta: 'Ir a marcarlo',
        href: '/actividades',
        // ⚠️ SIN `hoja` A PROPÓSITO (29/07, Matías: *"le quiero dar que ya lo
        // hice y me dice: escribí una actividad que estés haciendo"*).
        // Con `hoja: 'hecho'` abría la hoja de registro en blanco, que pide
        // TIPEAR qué hiciste. Absurdo acá: la tarjeta ya sabe cuál es, lo dice
        // en el título. Pedirle que la escriba de nuevo es hacerle repetir un
        // dato que la app tiene.
        // Va a Seguimiento, donde la actividad ya está y se marca de un toque.
        icono: 'actividad',
        // ⚠️ Y CON ESTO YA NO HACE FALTA IR (30/07). El id habilita el botón
        // "Ya lo hice" en la propia tarjeta: la app sabe exactamente cuál es, así
        // que mandarte a buscarla a una lista era hacerte el trabajo a vos. El
        // `href` queda como salida secundaria, para cuando querés ver la grilla.
        lineaId: tocaAhora.id,
      }
    : null;

  // ── El destacado ────────────────────────────────────────────────────────────
  // DOS LISTAS, no una (27/07, Matías: *"esa tarjeta le podíamos agregar
  // dependiendo si agregaste las cosas del día o no"*).
  //  · FALTANTES: lo que todavía no cargaste hoy. Es una recomendación de
  //    verdad, sale de tu día.
  //  · FEATURES: "bajá un cambio con la respiración" y compañía. Está bien
  //    ofrecerlas cuando ya cargaste todo; ofrecerlas mientras todavía no
  //    contaste cómo estás es la app hablando de sí misma.
  // Los faltantes ROTAN entre ellos por día: si no, el destacado sería siempre
  // el ánimo y las otras dos no existirían nunca.
  const faltantes: Spotlight[] = [];
  if (sinCheckin)
    faltantes.push({ id: 'checkin', titulo: 'Registrá cómo estuvo tu día', sub: 'Cómo venís y qué hiciste, en 30 segundos. Yo te devuelvo una lectura.', cta: 'Hacer mi check-in', href: '/chat', hoja: 'animo', icono: 'checkin' });
  if (sinSueno)
    faltantes.push({ id: 'sueno', titulo: 'Anotá cómo dormiste anoche', sub: 'El sueño es de lo que más explica tu ánimo. Un toque y listo.', cta: 'Anotar acá mismo', href: '/cuerpo', hoja: 'sueno', icono: 'sueno' });
  if (sinSenal)
    faltantes.push({ id: 'senal', titulo: 'Marcá cómo venís de energía', sub: 'Dos toques. Es lo que después explica por qué un día rindió y otro no.', cta: 'Marcarlo', href: '/cuerpo', hoja: 'cuerpo', icono: 'cuerpo' });

  // ── LO QUE FRENA (1.8 del 26/07, ampliado el 04/08 con 0.11) ──────────────
  // La decisión vive en `lib/frena.ts`, pura y testeada: acá solo se juntan los
  // datos. Antes estaba escrita en esta página, y con dos apartados más habría
  // sido un encadenado de cinco ternarios sin un solo test.
  //
  // ⚠️ EL PERMISO SIGUE SIENDO UNO POR DÍA PARA TODA LA APP. `queTeFrena`
  // devuelve UN candidato o ninguno — nunca una lista. Si Alimentación y
  // Finanzas pudieran frenar por su cuenta, serían tres pantallas completas por
  // día, que es justo lo que 1.8 vino a evitar.
  const estadoDelDia = {
    cargoSueno: !sinSueno,
    cargoAnimo: !sinCheckin,
    cargoSenal: !sinSenal,
    comidasHoy: comidaHoy.length,
    hora: new Date().getHours(),
    diasSinAportar,
  };
  const candidato = queTeFrena(estadoDelDia);
  const frena: LoQueFalta | null = candidato
    ? {
        texto: candidato.texto,
        // El aporte no tiene hoja de registro propia: se carga en la tarjeta del
        // objetivo, en Finanzas. Manda a la hoja de comida solo cuando es comida.
        hoja: candidato.clave === 'comida' ? 'comida' : candidato.clave === 'animo' ? 'animo' : 'sueno',
        progreso: progresoDelDia(estadoDelDia),
      }
    : null;

  const features: Spotlight[] = [
    { id: 'respiracion', titulo: 'Bajá un cambio con la respiración', sub: 'Un minuto guiado para cuando estás acelerado o ansioso.', cta: 'Respirar un minuto', href: '/calma', icono: 'cuerpo' },
  ];
  if (hayRelaciones)
    features.push({
      id: 'relaciones',
      titulo: 'Noté algo entre tus datos',
      sub: hiloCorto ?? 'Una relación que fue apareciendo. Miralo y decime si tiene sentido.',
      cta: 'Ver lo que noté',
      href: '/cosas-chicas',
      icono: 'relaciones',
    });
  const offsetSpot = Math.floor(Date.now() / 86_400_000);
  // El ritual gana el destacado: a esa hora es lo único que importa, y no rota.
  const ritual: Spotlight | null =
    momento === 'noche' && sinCheckin
      ? {
          id: 'cierre',
          titulo: 'Cerrá el día',
          sub: 'Contame cómo estuvo y te devuelvo una lectura. No hace falta que sea largo.',
          cta: 'Cerrar el día',
          href: '/chat',
          hoja: 'animo',
          icono: 'checkin',
        }
      : momento === 'manana' && sinSueno
        ? {
            id: 'apertura',
            titulo: 'Arrancá marcando cuánto dormiste',
            sub: 'Es lo que más explica cómo te va a ir el día. Un toque y listo.',
            cta: 'Anotar el sueño',
            href: '/cuerpo',
            hoja: 'sueno',
            icono: 'sueno',
          }
        : null;
  // El orden manda: el ritual (a esa hora es lo único que importa) → lo que TOCA
  // hoy → lo que falta cargar → y recién con todo cargado, una feature.
  const spotlight =
    ritual ??
    deHoy ??
    (faltantes.length ? faltantes[offsetSpot % faltantes.length] : features[offsetSpot % features.length]) ??
    null;

  // Chips de entrada rápida: cada uno con su color, y con tilde si ya está hecho hoy.
  //
  // ⚠️ ÁNIMO, SUEÑO Y ACTIVIDADES NO VAN ACÁ (27/07, Matías: "siguen apareciendo
  // en anotar rápido, hay que sacarlo"). Esos tres SON los anillos de "Hoy": el
  // mismo registro ofrecido dos veces en la misma pantalla es la misma confusión
  // que tenía el menú lateral repitiendo la barra de abajo.
  // La regla queda: lo que se cierra UNA vez por día vive en el anillo; lo que se
  // carga cuando pinta o varias veces vive acá.
  const chips: QuickChip[] = [
    // ⚠️ ÁNIMO Y SUEÑO VOLVIERON (31/07, Matías: *"en Anotar rápido faltan sueño
    // y todas esas cosas que nunca pusiste"*).
    //
    // El 27/07 se los había sacado porque estaban DUPLICADOS: en ese momento los
    // anillos de "Hoy" vivían en el Home, dos centímetros más arriba, y ofrecer
    // el mismo registro dos veces en la misma pantalla confundía. Pero los
    // anillos se mudaron a Cuerpo, así que hoy el Home NO tiene ninguna otra
    // forma de cargarlos: la regla se quedó sin el motivo que la sostenía.
    { texto: 'Ánimo', icono: 'animo', hoja: 'animo', hecho: !sinCheckin, tint: '#eceafe', color: '#4a56c8' },
    { texto: 'Sueño', icono: 'sueno', hoja: 'sueno', hecho: !sinSueno, tint: '#faf0dd', color: '#b5762a' },
    // ── ⚠️⚠️ ALIMENTACIÓN Y GASTO SE FUERON (18/08) ───────────────────────
    //
    // Matías: *"en anotar rápido sacaría las de alimento y finanzas, que no los
    // uso nunca"*. Con la fusión de las dos filas (ver `AsistenteEntrada`) la
    // fila pasó a llevar también las actividades de hoy, así que cinco chips de
    // registro más las de hoy no entraban sin deslizar en 375pt.
    //
    // ⚠️⚠️ Y HAY QUE DEJARLO ESCRITO, PORQUE ESTAS DOS SON JUSTO LAS PAGAS.
    // Alimentación y Finanzas son los dos módulos del freemium, y el chip de
    // Gasto había entrado exactamente por eso: es el **pedido 1.6, "los chips de
    // los apartados pagos"** (03/08). Sacarlos les quita su única puerta en la
    // pantalla que se abre treinta veces por semana.
    //
    // 👉 SE LO DIJE AL PROPONERLO Y ELIGIÓ IGUAL, así que queda anotado como
    // quedaron los puntitos del 17/08: **si en un mes Finanzas o Alimentación no
    // convierten, esta es la primera causa a mirar.** Volver atrás son estas dos
    // líneas — y la salida intermedia que quedó dibujada en la maqueta
    // `docs/maquetas/2026-08-18-home-mas-aire.html` es mostrarlos solo si se
    // usaron en los últimos 7 días, o sea que se ganen el lugar en vez de
    // tenerlo puesto.
    //
    // ⚠️ `sinComida` y `sinGasto` NO se borran: los sigue usando el resto de la
    // página (los faltantes del spotlight). Lo que se fue es el chip, no el dato.
    // Energía y libido comparten hoja ('cuerpo'), así que van en UN chip y no en
    // dos. Bajaron del anillo a acá (reparto B): el anillo es lo que se cierra
    // UNA vez por día; esto se carga cuando pinta, y acá está a un toque en vez
    // de escondido atrás de ampliar la tarjeta.
    { texto: 'Cómo venís', icono: 'energia', hoja: 'cuerpo', hecho: !sinSenal, tint: '#faf0dd', color: '#b5762a' },
    // ⚠️ ACÁ ESTABA EL CHIP "TICKET" Y QUEDÓ ROTO EL 03/08: abría la cámara y
    // posteaba a `/api/ticket`, que se borró con el pipeline entero. Nadie lo
    // notó hasta el 04/08 porque la ruta devolvía 401 del middleware y parecía
    // un problema de sesión. **Al borrar una función hay que seguir a quién la
    // llamaba, no solo qué la importaba: un `fetch` a una URL no lo ve `tsc`.**
    //
    // En su lugar va GASTO, que es el pedido 1.6 (los chips de los apartados
    // pagos) y además la puerta que el ticket dejó vacía: un gasto se carga
    // varias veces por día y no tiene anillo, así que es exactamente lo que la
    // regla del 27/07 manda al chip.
    // (el chip de Gasto vivía acá; se fue el 18/08 — ver la nota de arriba)
    // ⚠️ "IDEA" SE FUE (31/07, Matías: *"Idea, por ejemplo, la sacaría"*). Era el
    // único chip que no registraba nada: abría una conversación. Al lado de seis
    // que guardan un dato de un toque, se leía como uno más y hacía otra cosa.
    // Contar una idea sigue estando a mano — se escribe en el composer, que está
    // abajo de todo y siempre.

    // ── ⚠️ ACÁ ESTABA EL CHIP DE "SEGUIMIENTO", Y SE FUE (07/08) ─────────────
    //
    // Existía como **una puerta a Seguimiento, no una actividad por chip**
    // (31/07). Matías había bajado la versión con un chip por actividad en
    // veinte minutos: *"no quiero que aparezcan las actividades por hacer, sino
    // simplemente que te mande a seguimiento"*. Los dos motivos eran buenos —
    // mezclaba dos niveles (tipos de registro contra cuál de tus cosas hiciste)
    // y la fila crecía con cada actividad nueva.
    //
    // ⚠️ LO REEMPLAZA LA FILA "HOY, DE UN TOQUE", que respeta los dos motivos:
    // va en un grupo aparte con su propio rótulo (no mezcla) y tiene tope con un
    // "+N" (no crece). Ver `lib/chips-hoy.ts`, que lo explica entero.
    //
    // Y se saca en vez de dejarlo: el "+N" de esa fila ya abre Seguimiento, así
    // que tenerlo también acá serían **dos puertas al mismo lugar en la misma
    // pantalla** — la regla que él puso el 26/07. No se pierde ningún caso: el
    // chip solo aparecía si había alguna diaria sin marcar, y siempre que eso
    // pasa la fila nueva está.
  ];

  // Los que ya cargaste hoy se van al final; los pendientes quedan adelante.
  // Comida queda como el primero de los "ya cargados" (se puede volver a sumar,
  // comés varias veces al día). El orden dentro de cada grupo se mantiene.
  // Comida y Ticket son los REPETIBLES: se cargan varias veces al día, así que
  // aunque ya tengan tilde quedan a mano, primeros entre los hechos.
  const REPETIBLES = new Set(['Alimentación', 'Gasto']);
  const pesoChip = (c: QuickChip) => (!c.hecho ? 0 : REPETIBLES.has(c.texto) ? 1 : 2);
  const chipsOrdenados = [...chips].sort((a, b) => pesoChip(a) - pesoChip(b));

  // ── "HOY, DE UN TOQUE" (07/08) ─────────────────────────────────────────────
  // Las actividades del día, para marcarlas sin salir del Home. La regla de qué
  // entra —solo las diarias, con tope, sin reordenar por hecho— vive en
  // `lib/chips-hoy` y tiene tests.
  //
  // ⚠️ NO HACE NI UNA CONSULTA NUEVA: `actividadesAbiertas` y `marcadasHoyIds`
  // ya estaban las dos calculadas más arriba, para el saludo y para la baraja
  // del bot. Es la misma regla que gobierna a `hechoHoy`: si el dato ya está en
  // la página, traerlo de la base otra vez es pagar dos veces por lo mismo.
  // ⚠️ `acomodar` reordena para que no sobre espacio a la derecha (11/08,
  // Matías: *"subí alguno de las actividades hacia arriba para que no quede ese
  // espacio"*). Va acá y no en el cliente: hacerlo después de montar sería un
  // salto visible cada vez que abre el Home. Ver `lib/chips-hoy`.
  const chipsHoy = chipsDeHoy(
    actividadesAbiertas.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      diaria: a.diaria,
      marcadaHoy: marcadasHoyIds.has(a.id),
    })),
  );
  const chipsAcomodados = { ...chipsHoy, visibles: acomodar(chipsHoy.visibles) };

  // ⚠️ El cálculo de los tres anillos se fue a la página de Cuerpo (27/07):
  // el Home es el diario, el tracker vive allá. Las consultas de hoy (check-in,
  // sueño, comida, señal) se quedan porque de ellas salen los chips y el
  // destacado con lo que te falta cargar.

  // Factores del ánimo de las últimas dos semanas, aplanados (con repetidos: lo
  // que importa es cuál se repite).
  const factoresUltimos: string[] = factoresCrudos.flatMap((f) => {
    try {
      const v = JSON.parse(f.factores ?? '[]');
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  });
  const diasSinSueno = ultimoSueno[0]?.creado
    ? Math.floor((Date.now() - new Date(ultimoSueno[0].creado).getTime()) / 86_400_000)
    : null;

  // ── LO QUE LA APP TE DICE PRIMERO ──────────────────────────────────────────
  // Acá vivía la lista de chips ("O empezá una charla" → "Contame"). SE FUE
  // ENTERA (27/07, pedido de Matías): una grilla de preguntas para elegir es un
  // menú, no una conversación — y encima siempre ofrecía lo mismo.
  // Ahora **esas mismas preguntas son lo que la app te dice al abrir**, de a UNA
  // y rotando. Mismo material, otra forma: en vez de que elijas entre cinco
  // preguntas, te hacen una.
  //
  // El orden es el que importa: primero lo que sale de TUS datos, después lo que
  // falta de hoy, después lo que veníamos hablando. Al final del todo se suman
  // las ABIERTAS —las que no dependen de ningún dato— así que la app ya no se
  // queda muda cuando no tiene nada tuyo: ver la nota en lib/aperturas.
  const aperturas: string[] = [];

  // 1. lo que sale de sus datos: un patrón que confirmó, cómo viene contra una
  //    meta que se puso, el factor que le viene pesando, un hueco en el registro.
  for (const d of armarDisparadores({
    patronesConfirmados: confirmados.map((c) => c.contenido),
    actividades: diarias.map((a) => ({
      titulo: a.titulo,
      meta: a.metaSemanal,
      hechos: marcasSemana.filter((m) => m.lineaId === a.id).length,
    })),
    factoresRecientes: factoresUltimos,
    diasSinSueno,
    // Los experimentos que aceptó probar: a los 3 días, el chat pregunta cómo
    // le fue. Es la vuelta que convierte una propuesta en una conversación.
    experimentos: actividadesAbiertas
      .map((a) => ({ titulo: a.titulo, dias: diasDeExperimento(a.notas) }))
      .filter((e): e is { titulo: string; dias: number } => e.dias !== null),
  }))
    aperturas.push(d.texto);

  // 2. lo que notó el Analista y todavía no contestó
  for (const s of pendientes) aperturas.push(`Vengo notando esto: ${titular(s.contenido, 84).toLowerCase()}. ¿Te suena?`);

  // 3. lo que falta de hoy, preguntado como pregunta y no como formulario.
  //    Sueño no está: ese dato va a llegar solo desde Salud.
  if (sinComida) aperturas.push('¿Comiste algo o venís a puro café?');
  if (sinSenal) aperturas.push('¿Cómo venís de energía hoy?');

  // 4. TRAER DE VUELTA LO QUE HABLASTE (pedido suyo: "si en el chat habló algo,
  //    que se lo vuelva a traer"). Es lo que más se parece a alguien que se
  //    acuerda de vos.
  if (tema) aperturas.push(`Quedamos en lo de ${tema.toLowerCase()}. ¿Cómo siguió?`);
  for (const a of actividadesAbiertas.filter((a) => a.id !== actRotada?.id).slice(0, 2))
    aperturas.push(`¿Cómo viene lo de ${titular(a.titulo, 38).toLowerCase()}?`);

  // La del día, rotando: mañana no repite la de hoy. El saludo contextual
  // (`saludo`) va primero cuando dice algo puntual del momento — el ritual de la
  // mañana y el de la noche mandan sobre todo lo demás.
  // ── LO QUE TE QUEDÓ ABIERTO, DICHO POR EL BOT Y NO EN UNA TARJETA ─────────
  // Antes esto era una tarjeta suelta ("Te quedan sin cerrar: …") ARRIBA del
  // mensaje del asistente. Matías lo cortó (29/07): *"que no aparezca dos veces,
  // que lo diga el bot"*. Y tiene razón: una app que primero te avisa algo en un
  // cartel y después te lo repite el asistente parece dos apps.
  // Ahora es UNA de las cosas que el bot puede decirte, alternando con la
  // pregunta del día. Las diarias quedan afuera: esas no se "deben", se pintan.
  const tareasPendientes = actividadesAbiertas.filter((a) => !a.diaria).map((a) => a.titulo);

  // ── LA RELACIÓN QUE ASOMA EN EL HOME ───────────────────────────────────────
  // Las de confianza baja no entran: misma regla que en Relaciones, no se pide
  // confirmar una corazonada.
  //
  // ⚠️ "DECIDIDAS" SON LAS CONFIRMADAS **Y LAS DESCARTADAS** (29/07). Acá se
  // usaban solo las confirmadas —y encima las tres últimas, porque esa consulta
  // se hizo para otra cosa—, así que **una relación que Matías ya había
  // descartado le seguía apareciendo en el Home**. Decirle "noté esto" sobre
  // algo a lo que él ya contestó "no es así" es lo más rápido para que deje de
  // leer la tarjeta.
  // Trimeadas de los dos lados: el veredicto se guarda con `patron.trim()`, así
  // que comparar contra el crudo dejaría pasar cualquiera con un espacio al
  // final — y el síntoma sería justamente el que estamos arreglando (una
  // descartada volviendo a aparecer).
  const decididas = new Set(veredictosDados.map((v) => v.contenido.trim()));
  const confirmadasIds = new Set(
    veredictosDados.filter((v) => v.estado === 'anotada').map((v) => v.contenido.trim()),
  );
  // Un experimento "en curso" es una actividad activa que se llama igual: así lo
  // crea `observacionAActividad` cuando tocás "+ probar". No hay otro vínculo
  // entre la observación y la actividad que el título.
  const titulosActivos = new Set(actividadesAbiertas.map((a) => a.titulo.trim().toLowerCase()));
  const yaLoEstasProbando = (exp: string) =>
    titulosActivos.has(limpiarExperimento(exp).slice(0, 90).trim().toLowerCase());
  let relacion: { texto: string; experimento?: string; yaConfirmada?: boolean } | null = null;
  let relacionCruda: { patron: string; evidencia: string } | null = null;
  try {
    const j = JSON.parse(ultimoAnalisis[0]?.resultado ?? '{}');
    const obs: { patron?: string; evidencia?: string; confianza?: string; experimento?: string }[] = Array.isArray(
      j.observaciones,
    )
      ? j.observaciones
      : [];
    const bancada = (x: { evidencia?: string; confianza?: string }) =>
      confianzaSegunEvidencia(String(x.evidencia ?? ''), String(x.confianza ?? 'baja')) !== 'baja';

    const sinContestar = obs.find((x) => x.patron && !decididas.has(String(x.patron).trim()) && bancada(x));
    // Y SI YA LAS CONTESTASTE A TODAS, la tarjeta no se apaga: pasa a lo que
    // sigue, que es PROBAR (29/07, Matías: *"ahí podríamos poner más lo de
    // probá esto, probá lo otro"*). Una relación que confirmaste y cuyo
    // experimento nunca arrancaste es exactamente eso: quedó a mitad de camino.
    const confirmadasSinProbar = obs.find(
      (x) =>
        x.patron &&
        x.experimento &&
        confirmadasIds.has(String(x.patron).trim()) &&
        !yaLoEstasProbando(String(x.experimento)),
    );
    const elegida = sinContestar ?? confirmadasSinProbar;
    if (elegida) {
      // El crudo y la evidencia hacen falta para GUARDAR el veredicto desde la
      // tarjeta del bot: `seguirObservacion` los identifica por texto exacto.
      relacionCruda = { patron: String(elegida.patron), evidencia: String(elegida.evidencia ?? '') };
      relacion = {
        // Solo para MOSTRAR: el crudo sigue siendo la identidad de la
        // observación (con él se guarda el veredicto).
        texto: limpiarObservacion(String(elegida.patron)),
        experimento: elegida.experimento ? limpiarExperimento(String(elegida.experimento)) : undefined,
        yaConfirmada: elegida === confirmadasSinProbar && !sinContestar,
      };
    }
  } catch {
    relacion = null;
  }

  // ── QUÉ TE DICE EL BOT ─────────────────────────────────────────────────────
  // Todo lo que la app podría decirte, en un solo montón y por orden de qué tan
  // tuyo es. Después `elegirApertura` saca una, y va cambiando tres veces por
  // día (ver la nota en lib/aperturas: antes rotaba una vez por día y Matías se
  // pasaba la jornada entera con la misma frase esperándolo).
  const posibles: string[] = [];
  // 1. El saludo contextual, cuando dice algo puntual del momento.
  if (proactivo) posibles.push(saludo);
  // 2. Lo que sale de sus datos, lo que falta de hoy, los temas abiertos.
  posibles.push(...aperturas);
  // 3. Lo que quedó sin cerrar. Es UNA de las cosas que puede decir, no una
  //    tarjeta aparte (29/07: *"que no aparezca dos veces, que lo diga el
  //    bot"*). Y una sola vez en el montón: una app que solo te lista
  //    pendientes deja de ser un diario.
  if (tareasPendientes.length > 0) {
    const cuales = tareasPendientes.slice(0, 2).join(' y ');
    posibles.push(
      tareasPendientes.length > 2
        ? `Te quedaron abiertas ${cuales} y ${tareasPendientes.length - 2} más. ¿Seguimos con alguna?`
        : `Te quedó abierto ${cuales}. ¿Cómo viene?`,
    );
  }
  // 4. Y las que no dependen de ningún dato, que abren a contar o a anotar.
  posibles.push(...ABIERTAS);

  const apertura = elegirApertura(posibles, ahora);

  // ── SI LO QUE DIJO EL BOT ES SOBRE ALGO MARCABLE, SE MARCA DE UN TOQUE ──────
  //
  // Pedido de Matías (30/07): *"cuando me recuerda algo que tengo que hacer, que
  // no me ponga a contestar, sino que me dé la opción de tocar y que se marque
  // solo"*. Tenía sus dos únicos botones en "Contestar" y "Ahora no": preguntarte
  // "¿pudiste con LID?" y que la única salida sea escribir "sí" es hacerte tipear
  // un dato que la app puede guardar de un toque.
  //
  // ⚠️ SE ARMA UN MAPA TEXTO → ACTIVIDAD, y no se cambia `elegirApertura`, porque
  // esa función elige entre frases de SIETE orígenes distintos (disparadores,
  // observaciones del Analista, huecos del día, temas, actividades, abiertas) y
  // la mayoría no tiene nada que marcar. Cambiarle el tipo a todas para que tres
  // lleven un id era tocar el mecanismo entero por el caso chico.
  //
  // ⚠️ SOLO LAS DIARIAS Y SOLO SI NO ESTÁN MARCADAS HOY. Una actividad que no se
  // pinta día a día no tiene qué marcar, y ofrecer "ya lo hice" sobre algo ya
  // marcado haría que el toque lo DESMARQUE (`pintarDia` alterna) — o sea, el
  // botón haría exactamente lo contrario de lo que dice.
  const marcablePorTexto = new Map<string, { lineaId: number; titulo: string }>();
  for (const a of actividadesAbiertas) {
    if (!a.diaria || marcadasHoyIds.has(a.id)) continue;
    const corto = titular(a.titulo, 38).toLowerCase();
    const entrada = { lineaId: a.id, titulo: titular(a.titulo, 38) };
    // Las tres formas en que el bot puede nombrarla, generadas más arriba.
    marcablePorTexto.set(`¿Cómo viene lo de ${corto}?`, entrada);
    if (a.id === actRotada?.id) marcablePorTexto.set(aperturaActividad(corto, ahora), entrada);
  }
  // `apertura` puede ser null: cuando la app no tiene nada tuyo que decir, se
  // calla, y entonces no hay mensaje del bot ni botón que ponerle.
  const marcarDesdeElBot = apertura ? (marcablePorTexto.get(apertura) ?? null) : null;

  // ── Y SI LA PREGUNTA ES SOBRE ALGO QUE SE REGISTRA, SE ABRE SU HOJA ────────
  //
  // Pedido de Matías (01/08), mirando la app: *"me manda a escribir o contestar
  // ahí abajo, en vez de que se abra como una pequeña tarjetita de alimentación.
  // Eso tenía que estar conectado"*.
  //
  // Tenía razón, y es la MISMA falla que ya se había arreglado con "Ya lo hice"
  // dos días antes: el bot pregunta por un dato que la app sabe guardar en dos
  // toques, y la única salida que te deja es tipearlo. La pregunta está bien —le
  // gusta que le pregunten— lo que estaba mal era a dónde te mandaba.
  //
  // ⚠️ MISMO PATRÓN QUE `marcablePorTexto`, Y POR EL MISMO MOTIVO: un mapa de
  // texto → hoja en vez de cambiarle el tipo a `elegirApertura`, que elige entre
  // frases de siete orígenes distintos y la mayoría no tiene nada que registrar.
  //
  // ⚠️ SOLO ESTAS DOS. Las preguntas abiertas ("¿te da vueltas algo en la
  // cabeza?") no tienen hoja y no deben tenerla: ahí lo que corresponde es
  // escribir, que es de lo que la pregunta se trata.
  const HOJA_POR_PREGUNTA: Record<string, { hoja: string; etiqueta: string }> = {
    '¿Comiste algo o venís a puro café?': { hoja: 'comida', etiqueta: 'Anotar lo que comí' },
    '¿Cómo venís de energía hoy?': { hoja: 'cuerpo', etiqueta: 'Anotarlo' },
  };
  const hojaDesdeElBot = apertura ? (HOJA_POR_PREGUNTA[apertura] ?? null) : null;

  // ── EL ARRANQUE DE OBJETIVOS (30/07) ───────────────────────────────────────
  // La pregunta del Home, con lo que la app ya ve. Ver
  // `docs/maquetas/2026-07-30-objetivos.html` (pieza 3) y `lib/objetivos-arranque.ts`.
  //
  // ⚠️ SE CALCULA SOLO SI HAY ALGO QUE MOSTRAR. Barrer el historial entero de
  // marcas en cada carga del Home para una tarjeta que ya está apagada sería
  // pagar la consulta más cara de la pantalla por nada.
  const [arranqueCfg, objetivosTodos] = await Promise.all([
    db.select().from(config).where(eq(config.clave, CLAVE_ARRANQUE)),
    db
      .select({
        titulo: objetivos.titulo,
        arranco: objetivos.arranco,
        estado: objetivos.estado,
        cerrado: objetivos.cerrado,
      })
      .from(objetivos),
  ]);

  // Desaparece con el primer objetivo activo: seguir preguntando si querés
  // empezar algo que ya empezaste es la app no mirando lo que tiene adelante.
  const mostrarArranque = arranqueCfg.length === 0 && !objetivosTodos.some((o) => o.estado === 'activo');

  let candidatosArranque: Candidato[] = [];
  let estimacionArranque: string | null = null;

  if (mostrarArranque) {
    const [actividadesTodas, marcasTodas] = await Promise.all([
      db
        .select({ id: lineas.id, titulo: lineas.titulo })
        .from(lineas)
        .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'))),
      db.select({ lineaId: marcas.lineaId, fecha: marcas.fecha }).from(marcas),
    ]);

    candidatosArranque = candidatos(
      actividadesTodas.map((a) => ({
        titulo: a.titulo,
        marcas: marcasTodas.filter((m) => m.lineaId === a.id),
      })),
      objetivosTodos.map((o) => o.titulo),
      hoyStr,
    );

    // Los cerrados no se archivan justamente para esto. Con uno solo devuelve
    // null: un caso no es un rango.
    estimacionArranque = estimarDeCerrados(
      objetivosTodos.filter((o) => o.cerrado != null) as { titulo: string; arranco: string; cerrado: string }[],
    );
  }

  // ── LAS TARJETAS DEL BOT (31/07) ───────────────────────────────────────────
  //
  // Todo lo que la app tiene para decirte, en UNA baraja detrás del mismo bot.
  // Antes eran tres bloques sueltos que hablaban por separado, y el "Ahora no"
  // del bot se llevaba puesto al bot entero. Ver `components/chat/TarjetasBot`.
  //
  // ⚠️ EL ORDEN NO ES CASUAL: primero lo que se resuelve de un toque y se vence
  // hoy, después lo que abre una conversación, y último lo que es para leer. Una
  // baraja que arranca con lo más largo se descarta entera sin mirarla.
  const tarjetas: TarjetaBot[] = [];

  // 1. Lo que toca hoy y todavía no marcaste: un toque y listo.
  if (tocaAhora) {
    tarjetas.push({
      id: `toca-${tocaAhora.id}-${hoyStr}`,
      tono: 'hacer',
      texto: `Hoy toca ${titular(tocaAhora.titulo, 38).toLowerCase()}.`,
      detalle: `Lo venís haciendo los ${diaPlural}.`,
      acciones: [{ tipo: 'marcar', etiqueta: 'Ya lo hice', lineaId: tocaAhora.id }],
    });
  }

  // 2. Una meta que quedó demasiado alta, con la oferta de bajarla.
  //
  // ⚠️ ES LA ÚNICA TARJETA QUE PROPONE CAMBIAR ALGO QUE ÉL SE PROPUSO, así que
  // es la que más cuidado necesita: se calla salvo que haya TRES semanas de
  // historial que lo respalden. Ver las reglas en `lib/meta-alta.ts`.
  for (const a of diarias) {
    const semanas = semanasDe(marcasHistoricas.filter((m) => m.lineaId === a.id).map((m) => m.fecha), ahora);
    const alta = metaDemasiadoAlta(a.metaSemanal, semanas);
    if (!alta) continue;
    tarjetas.push({
      id: `meta-${a.id}-${alta.sugerida}`,
      tono: 'hacer',
      texto: fraseMetaAlta(titular(a.titulo, 38).toLowerCase(), a.metaSemanal as number, alta),
      acciones: [{ tipo: 'bajar-meta', etiqueta: `Bajarla a ${alta.sugerida}`, lineaId: a.id, a: alta.sugerida }],
    });
    break; // una por vez: dos "bajá la meta" seguidos se leen como un reto
  }

  // 3. La pregunta del día. Con "Ya lo hice" si habla de algo marcable.
  if (apertura) {
    tarjetas.push({
      id: `apertura-${hoyStr}-${franja}`,
      texto: apertura,
      // El registro va primero: lo que se resuelve de un toque se toca más que
      // lo que hay que escribir.
      //
      // ⚠️⚠️ "CONTESTAR" SE FUE (13/08). Matías: *"no me gusta que aparezca el
      // botón contestar, abajo de todo; no es necesario, porque contestás ya
      // abajo"*.
      //
      // Y era exacto: `responder` no hacía más que `enfocar-composer`, o sea
      // **poner el cursor en el campo que está tres centímetros más abajo y ya
      // se ve**. Tenía sentido cuando el bot vivía en una baraja arriba del Home
      // y contestarle era irse a otro lado; desde que la tarjeta se acopló a la
      // barra (propuesta C), quedó siendo un botón que abre lo que ya está
      // abierto. **La acción sobrevivió a la mudanza; su motivo, no.**
      acciones: [
        ...(marcarDesdeElBot
          ? ([{ tipo: 'marcar', etiqueta: 'Ya lo hice', lineaId: marcarDesdeElBot.lineaId }] as const)
          : []),
        ...(hojaDesdeElBot
          ? ([{ tipo: 'hoja', etiqueta: hojaDesdeElBot.etiqueta, hoja: hojaDesdeElBot.hoja }] as const)
          : []),
      ],
    });
  }

  // 4. El arranque de Objetivos, si corresponde preguntarlo.
  if (mostrarArranque) {
    // ⚠️ SI LA APP YA VE ALGO, LO PROPONE EN VEZ DE SOLO PREGUNTAR. Preguntar sin
    // proponer le deja todo el trabajo al usuario —pensar el qué, el desde cuándo
    // y el nombre—; "Alemán, desde marzo y viene caliente" ya es un objetivo con
    // el trabajo hecho. Es la misma decisión de la maqueta del 30/07.
    const propuesta = candidatosArranque.length
      ? `Lo veo en lo que ya venís haciendo: ${candidatosArranque.map((c) => `${c.titulo}, ${c.frase}`).join(' · ')}.`
      : 'Buscar trabajo, aprender un idioma, volver a entrenar. Lo anoto y te muestro el tiempo que le vas poniendo.';
    tarjetas.push({
      id: 'objetivos-arranque',
      texto: '¿Hay algo grande en lo que venís, sin fecha de entrega?',
      // La estimación de los cerrados solo si existe: con un caso devuelve null.
      detalle: estimacionArranque ? `${propuesta} · ${estimacionArranque}` : propuesta,
      acciones: [{ tipo: 'ir', etiqueta: 'Sí, anotarlo', href: '/objetivos?nuevo=1' }],
    });
  }

  // 5. ── ⚠️ EL BOT PIDE EL DATO QUE LE FALTA PARA UNA RELACIÓN (13/08) ────────
  //
  // Sueño × pantallas es la relación que Matías más quiere, y la app **ya tiene
  // todo para calcularla**: `prompts/pantalla` lee una captura de Ajustes →
  // Tiempo en pantalla, `/api/pantalla` la procesa y `TiempoPantalla` la sube.
  //
  // ⚠️⚠️ NO SE USA POR DÓNDE VIVE, NO POR LO QUE ES. El componente está en
  // **Perfil**, adonde no entra: hay UNA sola captura, del 25/07, el día que se
  // construyó. Es su propia regla —*"el orden sigue al uso"*— cobrándose otra
  // vez: una función a dos toques de distancia en una pantalla que no se visita
  // es una función que no existe.
  //
  // 👉 Y ES EXACTAMENTE PARA LO QUE SIRVE EL BOT: en vez de mudar la pantalla,
  // que el bot pida el dato cuando le hace falta. **Las preguntas del bot son la
  // entrada del cerebro, no su salida.**
  //
  // ⚠️ SOLO SI YA HAY SUEÑO REGISTRADO. Pedir una captura para cruzarla con nada
  // sería pedir un dato sin un objetivo, que es justo lo que él dijo que nadie
  // hace. Con sueño cargado, la captura tiene contra qué cruzarse desde el día
  // uno.
  const haceUnaSemana = ymd(new Date(Date.now() - 7 * 86_400_000));
  const pantallaReciente = cuerpoMes.some((c) => c.tipo === 'pantalla' && c.creado.slice(0, 10) >= haceUnaSemana);
  const suenosCargados = cuerpoMes.filter((c) => c.tipo === 'sueno').length;
  if (!pantallaReciente && suenosCargados >= 5) {
    tarjetas.push({
      id: `pantalla-${hoyStr}`,
      tono: 'hacer',
      texto: '¿Me mandás una captura de tu tiempo en pantalla?',
      detalle: `Tengo ${suenosCargados} noches anotadas y quiero cruzarlas con esto. Va en Ajustes → Tiempo en pantalla.`,
      acciones: [{ tipo: 'ir', etiqueta: 'Mandar captura', href: '/perfil' }],
    });
  }

  // 6. Lo que notó el Analista. Va ÚLTIMA: es para leer, no para atender.
  if (relacion && relacionCruda) {
    // ⚠️ EL HECHO DEL CEREBRO QUE ESTA TARJETA PREGUNTA (13/08). Si lo encuentra,
    // **lo que Matías escriba mientras esta tarjeta está adelante se guarda como
    // su `porque`** — y ese campo es el que decide si un episodio puede llegar a
    // ser un patrón. Es lo que convierte contestarle al bot en algo que el
    // cerebro aprende, en vez de solo hablar.
    const hechoDeLaTarjeta = hechosDelCerebro.find(
      (h) => !h.porque?.trim() && mismoHecho(h.contenido, relacionCruda!.patron),
    );
    tarjetas.push({
      id: `relacion-${relacionCruda.patron.slice(0, 40)}`,
      tono: 'leer',
      hechoId: hechoDeLaTarjeta?.id,
      texto: relacion.texto,
      detalle: relacion.experimento ? `Para probar: ${relacion.experimento}` : undefined,
      acciones: relacion.yaConfirmada
        ? [{ tipo: 'ir', etiqueta: 'Ver en Relaciones', href: '/cosas-chicas' }]
        : [
            { tipo: 'relacion', etiqueta: 'Me pasa', patron: relacionCruda.patron, evidencia: relacionCruda.evidencia, veredicto: 'anotada' },
            { tipo: 'relacion', etiqueta: 'No es así', patron: relacionCruda.patron, evidencia: relacionCruda.evidencia, veredicto: 'descartada' },
          ],
    });
  }

  // ⚠️ EL DESCARTE SE APLICA ACÁ, EN EL SERVER, Y NO EN EL COMPONENTE (31/07).
  // Lo que dijiste "ahora no" viaja en una cookie, así que se puede sacar antes
  // de armar el HTML. Filtrarlo del lado del navegador —como estaba— hacía que
  // las tarjetas se vieran un instante y se fueran solas. Ver
  // ── ⚠️⚠️ LAS RELECTURAS, AL FINAL DE LA BARAJA (18/08) ────────────────────
  //
  // Matías: *"que el Home deje de mostrar 'hace tres semanas escribiste' y que
  // aparezca como en el chat, con el bot y todo, que se pueda actualizar"*. La
  // tarjeta verde del Home se fue; sus frases entran acá como tarjetas de tono
  // `recordar`.
  //
  // 👉 **"QUE SE PUEDA ACTUALIZAR" NO HUBO QUE CONSTRUIRLO.** La tarjeta tenía
  // un botón "Otro recuerdo" que cambiaba de frase con estado local; en la
  // baraja, cambiar de tarjeta ES deslizar. El botón se fue con la tarjeta y
  // nadie perdió nada — al revés: ahora las relecturas se mezclan con lo demás
  // que el bot tiene para decir en vez de vivir en su propio cajón.
  //
  // ⚠️ VAN ÚLTIMAS Y NO PRIMERAS, y es la misma discusión del 07/08 dada vuelta
  // por el lugar nuevo. En el Home la relectura iba arriba porque **era lo único
  // que no pedía nada**. Adentro de la baraja eso ya no la distingue: el bot no
  // "pide", ofrece de a una. Lo que sí importa acá es que **lo del día tiene
  // fecha de vencimiento y un recuerdo de hace tres semanas no**: si una
  // relectura fuera primera, taparía el aviso de hoy hasta que deslices.
  //
  // ⚠️⚠️ EL ID LO ARMA `idRelectura` Y NO SE ARMA ACÁ A MANO. La primera versión
  // lo hacía con `cuando` y los primeros 24 caracteres, y React tiró keys
  // repetidas: las dos piezas que había elegido son las dos que borran
  // diferencias a propósito. El porqué entero está en `lib/relectura`.
  for (const r of relecturas) {
    tarjetas.push({
      id: idRelectura(r),
      texto: r.texto,
      tono: 'recordar',
      acciones: [{ tipo: 'retomar', etiqueta: 'Volver sobre esto', texto: r.texto, cuando: r.cuando }],
    });
  }

  // `lib/tarjetas-descartadas`, que cuenta los dos bugs que originaron esto.
  const descartadas = leerDescartadas((await cookies()).get(COOKIE_DESCARTADAS)?.value);
  const tarjetasVisibles = tarjetas.filter((t) => !descartadas.includes(t.id));

  return (
    <AsistenteEntrada
      tarjetas={tarjetasVisibles}
      fecha={fecha}
      greeting={greeting}
      chips={chipsOrdenados}
      frena={frena}
      actividades={actividadesAbiertas}
      usoPorDia={usoPorDia}
      tareasPendientes={tareasPendientes}
      forzarNuevo={nuevo === '1'}
      racha={racha}
      chipsHoy={chipsAcomodados}
      hechoHoy={hechoHoy}
      ritual={estadoRitual}
      cargadoHoy={{ sueno: !sinSueno, animo: !sinCheckin }}
    />
  );
}

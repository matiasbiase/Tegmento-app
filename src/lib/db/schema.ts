import { sqliteTable, text, integer, real, primaryKey, unique, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  scoreActual: integer('score_actual'),
  scoreDeseado: integer('score_deseado'),
  color: text('color'),
  orden: integer('orden').notNull().default(0),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
  foco: integer('foco', { mode: 'boolean' }).notNull().default(false),
});

// Seguimiento de ánimo. Dos modos conviven en la misma tabla:
//  - por área (areaId no nulo, estados 'bien' | 'masomenos' | 'mal') — modelo viejo.
//  - general del día (areaId nulo, estados 'genial' | 'bien' | 'neutral' | 'bajon')
//    con factores/palabras (JSON) estilo "State of Mind" — modelo del rediseño.
export const animoCheckins = sqliteTable('animo_checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  areaId: integer('area_id').references(() => areas.id),
  estado: text('estado').notNull(),
  nota: text('nota'),
  factores: text('factores'), // JSON: string[]
  palabras: text('palabras'), // JSON: string[]
  creado: text('creado').notNull(),
});

export const areaCheckins = sqliteTable('area_checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  areaId: integer('area_id').notNull().references(() => areas.id),
  score: integer('score').notNull(),
  notas: text('notas'),
  fecha: text('fecha').notNull(),
});

export const lineas = sqliteTable('lineas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id').references((): AnySQLiteColumn => lineas.id),
  titulo: text('titulo').notNull(),
  tipo: text('tipo').notNull().default('linea'),
  estado: text('estado').notNull().default('activa'),
  objetivo: text('objetivo'),
  deadline: text('deadline'),
  notas: text('notas'),
  ultimaActividad: text('ultima_actividad'),
  // Las diarias son las que se pintan día a día en una grilla ("alemán todos los
  // días"). Las que no lo son ("buscar cancha") no tienen sentido de pintar.
  diaria: integer('diaria', { mode: 'boolean' }).notNull().default(false),
  // Cuántas veces por semana quiere hacerla. null = sin meta (pintás y ya). Con
  // meta, la app compara contra lo que él se propuso y no contra "todos los días":
  // correr 2 de 2 es un éxito, no 2 de 7.
  metaSemanal: integer('meta_semanal'),
  // ⚠️ DE QUÉ OBJETIVO CUELGA ESTA ACTIVIDAD, ELEGIDO A MANO (30/07).
  //
  // Hasta ahora la única forma de que una actividad sumara a un objetivo era que
  // se PARECIERAN DE NOMBRE (`asociaA` en `lib/objetivos-auto.ts`): "Alemán"
  // cuenta para "Aprender alemán". Eso cubre el caso obvio y deja afuera todos
  // los demás — "Duolingo" no se parece a "Aprender alemán" y sin embargo es lo
  // mismo, y "Correr" se parece a "Correr una maratón" aunque quizás no quieras
  // que cuente.
  //
  // Este campo es la decisión explícita de Matías, y **le gana al parecido**: si
  // eligió un objetivo, ese es; si eligió ninguno, sigue valiendo el cruce por
  // nombre, que es lo que ya funcionaba. Elegir "ninguno" y que igual se sume
  // por parecerse sería ignorarle la respuesta.
  objetivoId: integer('objetivo_id').references(() => objetivos.id),
});

// Un día pintado de una actividad diaria. Una fila por día marcado; despintar
// borra la fila. `unique` sobre (linea, fecha) para que no haya duplicados aunque
// se toque dos veces rápido.
export const marcas = sqliteTable(
  'marcas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lineaId: integer('linea_id')
      .notNull()
      .references(() => lineas.id),
    fecha: text('fecha').notNull(), // YYYY-MM-DD del día pintado
    // Si la marca salió de la foto de una hoja de papel, acá queda de cuál. Las
    // que se pintan tocando en la app tienen null.
    foto: text('foto'),
    creado: text('creado').notNull(),
  },
  (t) => [unique().on(t.lineaId, t.fecha)],
);

export const lineaAreas = sqliteTable(
  'linea_areas',
  {
    lineaId: integer('linea_id').notNull().references(() => lineas.id),
    areaId: integer('area_id').notNull().references(() => areas.id),
  },
  (t) => [primaryKey({ columns: [t.lineaId, t.areaId] })],
);

export const temas = sqliteTable('temas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
});

export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull(),
  temaId: integer('tema_id').references(() => temas.id),
  // Área de vida (una de las 8 de la rueda) a la que pertenece el chat. El
  // Historial agrupa por acá; el tema queda como sub-etiqueta interna.
  areaId: integer('area_id').references(() => areas.id),
  iniciado: text('iniciado').notNull(),
  ultimaActividad: text('ultima_actividad').notNull(),
  estado: text('estado').notNull().default('abierto'),
});

/**
 * EN QUÉ NOTAS ESTÁ UNA CHARLA (04/08).
 *
 * ⚠️⚠️ ESTO REEMPLAZA A `chats.notaId`, Y REVIERTE UNA DECISIÓN QUE ESTABA
 * ESCRITA ACÁ CON SU ARGUMENTO. Conviene leer el argumento viejo antes de
 * volver atrás, porque no era tonto:
 *
 * > *"Una charla vive en UNA nota. Con una tabla puente la misma charla podría
 * > estar en tres notas a la vez, y ahí 'mandarla a una nota' deja de ser
 * > mudarla para ser copiarla — nunca sabrías cuál es su lugar."*
 *
 * Matías pidió lo contrario el 04/08, y lo pidió con la palabra que importa:
 * **tildes**, no "mover a". Un tilde es la interfaz de *pertenece a varias*, así
 * que no es un descuido suyo: es que la charla dejó de ser algo que se guarda en
 * un lugar y pasó a ser algo que se referencia desde varios.
 *
 * ⚠️ **Y EL COSTO DEL ARGUMENTO VIEJO SIGUE SIENDO REAL**: "¿dónde está esta
 * charla?" ya no tiene UNA respuesta. Lo que lo hace tolerable es que la charla
 * no se copia —sigue siendo una sola fila en `chats`— y que sacarla de una nota
 * no la borra de las otras. Si algún día la pregunta "dónde está" vuelve a
 * importar, la respuesta es la lista, no una fila.
 *
 * La PK compuesta hace imposible el duplicado: tocar el tilde dos veces es
 * poner y sacar, no dos filas iguales.
 */
export const chatNotas = sqliteTable(
  'chat_notas',
  {
    chatId: integer('chat_id').notNull().references(() => chats.id),
    notaId: integer('nota_id').notNull().references(() => notas.id),
    creado: text('creado').notNull(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.notaId] })],
);

export const chatMensajes = sqliteTable('chat_mensajes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').notNull().references(() => chats.id),
  rol: text('rol').notNull(),
  contenido: text('contenido').notNull(),
  adjuntoTipo: text('adjunto_tipo'),
  adjuntoPath: text('adjunto_path'),
  creado: text('creado').notNull(),
  // Mensajes que Matías marcó con la estrellita, para volver a encontrarlos
  // (29/07). Va en la fila del mensaje y no en una tabla aparte: es un sí o no
  // sobre algo que ya existe, no una entidad nueva.
  destacado: integer('destacado', { mode: 'boolean' }).notNull().default(false),
  // A qué tema se agrupó ESTE mensaje puntual (29/07, "cristalizar": seleccionar
  // varios mensajes de una charla y juntarlos bajo un mismo tema, como un
  // papelito aparte). Reusa la misma tabla `temas` que ya clasifica charlas
  // enteras: un tema puede agrupar una charla completa (`chats.temaId`) o
  // solo un puñado de mensajes sueltos adentro de ella (esto). No hace falta
  // una tabla nueva para "de qué se habla", solo un nivel más fino.
  temaId: integer('tema_id').references(() => temas.id),
});

export const bitacora = sqliteTable('bitacora', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(),
  contenido: text('contenido').notNull(),
  fecha: text('fecha').notNull(),
  temaId: integer('tema_id').references(() => temas.id),
  areaId: integer('area_id').references(() => areas.id),
  lineaId: integer('linea_id').references(() => lineas.id),
  chatId: integer('chat_id').references(() => chats.id),
});

// Eventos: una sola tabla para las dos fuentes. Los de Google traen gcalId; los del
// calendario interno (cargados a mano o por chat) van con gcalId null. Convención de
// inicio: "YYYY-MM-DDTHH:MM" si tiene hora, "YYYY-MM-DD" si es de todo el día.
export const eventos = sqliteTable('eventos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gcalId: text('gcal_id'),
  titulo: text('titulo').notNull(),
  inicio: text('inicio').notNull(),
  fin: text('fin').notNull(),
  areaId: integer('area_id').references(() => areas.id),
  lineaId: integer('linea_id').references(() => lineas.id),
  nota: text('nota'),
  raw: text('raw'),
  syncedAt: text('synced_at'),
});

export const mails = sqliteTable('mails', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gmailId: text('gmail_id'),
  remitente: text('remitente').notNull(),
  asunto: text('asunto').notNull(),
  snippet: text('snippet'),
  importante: integer('importante', { mode: 'boolean' }).notNull().default(false),
  areaId: integer('area_id').references(() => areas.id),
  lineaId: integer('linea_id').references(() => lineas.id),
  raw: text('raw'),
  recibido: text('recibido'),
  syncedAt: text('synced_at'),
});

export const sugerencias = sqliteTable('sugerencias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(),
  contenido: text('contenido').notNull(),
  lineaId: integer('linea_id').references(() => lineas.id),
  evidencia: text('evidencia'),
  estado: text('estado').notNull().default('pendiente'),
  creado: text('creado').notNull(),
});

export const analisis = sqliteTable('analisis', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(),
  hiloCentral: text('hilo_central'),
  resultado: text('resultado'),
});

export const config = sqliteTable('config', {
  clave: text('clave').primaryKey(),
  valor: text('valor').notNull(),
});

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  instrucciones: text('instrucciones').notNull(),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
  creado: text('creado').notNull(),
});

export const conocimiento = sqliteTable('conocimiento', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull(),
  contenido: text('contenido').notNull(),
  activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
  creado: text('creado').notNull(),
});

// Ciclo menstrual: cada período registrado (inicio y, si se marcó, fin). Con las
// fechas de inicio se estima el largo del ciclo, la fase actual y el próximo.
export const periodos = sqliteTable('periodos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  inicio: text('inicio').notNull(), // YYYY-MM-DD
  fin: text('fin'), // YYYY-MM-DD o null (todavía en curso)
  nota: text('nota'),
  creado: text('creado').notNull(),
});

// Polaridad: cada análisis de contraste (modo mapa) que Matías corre queda guardado,
// para poder volver a verlo y para que el Analista sepa qué le llamó la atención.
// La tabla y la columna siguen llamándose `lupa` y `carga` (los nombres de cuando
// la pantalla era la Lupa): renombrarlas obligaría a migrar y no cambia nada.
export const lupa = sqliteTable('lupa', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entrada: text('entrada'), // el texto pegado (recortado) o 'Imagen'
  carga: integer('carga'), // 0-100: el grado de cuidado del medidor
  resultado: text('resultado').notNull(), // JSON completo de la tarjeta
  creado: text('creado').notNull(),
});

// Gastos: datos estructurados que la IA extrae de la foto de un ticket (comercio,
// total, ítems). Alimentan la vista Finanzas y le dan al Analista la pata de plata y
// comida (cruzar qué gastás/comés con cómo venís).
export const gastos = sqliteTable('gastos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  comercio: text('comercio'),
  total: real('total'),
  moneda: text('moneda'), // '€', 'ARS', etc. (lo que diga el ticket)
  fecha: text('fecha'), // fecha del ticket si aparece (ISO), sino la de carga
  categoria: text('categoria'), // 'super', 'comida', 'farmacia'…
  items: text('items'), // JSON string[] con lo comprado
  nota: text('nota'), // resumen crudo / lo que la IA leyó
  creado: text('creado').notNull(),
});

// Objetivos: lo grande y de largo aliento ("buscar trabajo"), donde importa el
// ARCO LARGO de tiempo invertido y no la racha diaria (30/07).
//
// La idea, en palabras de Matías: *"si yo vengo nueve meses buscando trabajo y
// después un par de semanas no busco, siento que abandoné todo. Miro los otros
// nueve meses y digo: che, estuve trabajando, no estoy tan lejos, voy a seguir."*
//
// ⚠️ ES OTRA COSA QUE `lineas` CON `metaSemanal`. Esa tabla trackea hábitos con
// una meta por semana, y ahí una semana sin marcar ES un incumplimiento. Acá un
// mes vacío no es nada: se sigue mostrando el total. Meter esto en `lineas`
// obligaría a que cada consulta de actividades filtre un tipo nuevo, y a que la
// racha —que en actividades es el punto— no aplique a la mitad de las filas.
//
// ── LOS DOS TIPOS, Y POR QUÉ ESTÁN EN LA MISMA TABLA ─────────────────────────
// Un objetivo es ABIERTO (sin `fechaMeta`) o CON META (con fecha). El tipo no es
// una columna: se deduce de si `fechaMeta` está o no. Y define qué le está
// permitido decir a la app:
//   - abierto  → tiempo acumulado y el arco. NUNCA un porcentaje: no hay total.
//   - con meta → barra de progreso real y cuánto falta, porque el total existe.
// Ver `lib/objetivos.ts`, que es donde vive esa regla.
export const objetivos = sqliteTable('objetivos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull(),
  // De qué área de la rueda cuelga (decisión de Matías: "puede colgar de una de
  // las áreas"). Además de ordenar, le da al Analista con qué cruzarlo.
  areaId: integer('area_id').references(() => areas.id),
  arranco: text('arranco').notNull(), // YYYY-MM-DD
  // 'activo' | 'pausado' | 'logrado' | 'abandonado'. Los cerrados NO se borran:
  // son la materia prima para estimar cuánto va a llevar el próximo parecido.
  //
  // ⚠️ 'pausado' NO ES UN CERRADO (1.2, del 03/08) y por eso deja `cerrado` en
  // null: la fecha de cierre es lo que hace que un objetivo entre en
  // `estimarDeCerrados`, y uno que vas a retomar todavía no llevó nada. Quien
  // filtre por estado tiene que decidir explícitamente de qué lado cae — un
  // `estado !== 'activo'` lo trata como terminado, que es el bug que hubo que
  // arreglar en `TarjetaObjetivo` y en `analista.ts` al agregarlo.
  estado: text('estado').notNull().default('activo'),
  cerrado: text('cerrado'), // YYYY-MM-DD o null
  // Qué cuenta como llegar ("aprobar el B2"). Solo en los que tienen meta.
  meta: text('meta'),
  /**
   * OBJETIVO DE PLATA: cuánto hay que juntar (02/08, pedido de Matías).
   *
   * ⚠️ ES LO QUE DISTINGUE UN OBJETIVO DE PLATA DE UNO COMÚN, y por eso va acá
   * y no en una tabla aparte: "juntar 2.000 para Japón" es un objetivo con todo
   * lo que ya tienen los objetivos —arco, temperatura, estado, cierre— más un
   * número. Una tabla nueva habría duplicado las cinco cosas que ya funcionan
   * para agregar una.
   * `null` es el estado normal: la mayoría de los objetivos no son de plata.
   */
  montoMeta: real('monto_meta'),
  moneda: text('moneda'),
  fechaMeta: text('fecha_meta'), // YYYY-MM-DD o null ⇒ objetivo abierto
  /**
   * LA PORTADA: el nombre del adjunto (`data/adjuntos/…`), o `null`.
   *
   * Pedido de Matías el 04/08, dibujado en `docs/maquetas/2026-08-04-finanzas-…`:
   * poder ponerle una imagen al objetivo. *"Viaje Argentina Octubre"* con una
   * foto del lugar es otra cosa que un título en un rectángulo.
   *
   * ⚠️ SIEMPRE OPCIONAL, Y CON DEGRADÉ POR DEFECTO. La maqueta lo dice con todas
   * las letras: **si una tarjeta se ve rota sin foto, ponerle foto deja de ser
   * una opción y pasa a ser una tarea**. Sin portada la cabecera es exactamente
   * la que había antes, que ya estaba bien.
   *
   * Guarda el NOMBRE, no la imagen: el archivo vive en `data/adjuntos` como
   * cualquier otro y se sirve por `/api/adjuntos/[archivo]`. Meter el base64 en
   * la fila habría hecho que cada lectura de objetivos arrastre las fotos.
   */
  portada: text('portada'),
  /**
   * EL DIBUJITO ELEGIDO A MANO, o `null` para que se siga adivinando del título.
   *
   * Pedido de Matías el 06/08: *"hacé que cuando lo toques puedas cambiarlo,
   * porque quizás no querés cambiarlo, o poner una foto en realidad"*.
   *
   * ⚠️ `null` NO ES "SIN ÍCONO", ES "EL QUE VOS DEDUZCAS", y esa diferencia es
   * lo que deja intacta la decisión original de la tarjeta: un objetivo se crea
   * en un momento de impulso y no se le pide que elija un dibujo. La app sigue
   * adivinando sola (`adivinarIconoObjetivo`); esta columna solo guarda las
   * veces que le erró y vos la corregiste. Por eso el default es null y no la
   * clave adivinada: guardar lo adivinado congelaría el dibujo de un objetivo
   * que después renombrás.
   *
   * Guarda una clave de `CLAVES_ICONO_OBJETIVO`, no un path ni un emoji: el
   * dibujo vive en el código, en un solo lugar, y se puede retocar sin migrar
   * ninguna fila. Misma decisión que `notas.emoji` desde el 06/08.
   */
  icono: text('icono'),
  /**
   * QUÉ CLASE DE OBJETIVO ES: `'rueda'` | `'llegar'` | `'habito'`, o `null`.
   *
   * Sale del onboarding desde la rueda (06/08). Los tres salieron de una
   * corrección de Matías sobre la primera maqueta, que proponía **seguimientos
   * disfrazados de objetivos**: *"volver a entrenar dos veces por semana… eso es
   * un seguimiento. El objetivo es más como cuál es lo que se quiere lograr"*.
   *
   *  · `rueda`  — mover un área de la rueda ("subir de 2 a 3 en salud física").
   *               Cierra al rehacer la rueda y ver que subió.
   *  · `llegar` — llegar a algo concreto (1.500 € para octubre). Cierra por
   *               fecha o por monto, que es lo que ya hacía `fechaMeta`.
   *  · `habito` — que algo te salga solo. Cierra cuando su seguimiento se
   *               sostuvo N semanas (ver `SEMANAS_HABITO`).
   *
   * ⚠️ `null` NO ES UN TIPO NUEVO, ES "LOS DE ANTES". Todos los objetivos que
   * existían el 06/08 lo tienen, y la tarjeta les sigue mostrando exactamente lo
   * de siempre. Esta columna agrega lecturas, no cambia las que había: quien
   * filtre por tipo tiene que decidir explícitamente de qué lado cae el null —
   * el mismo cuidado que pide `estado === 'pausado'`.
   */
  tipo: text('tipo'),
  /**
   * DE CUÁNTO A CUÁNTO, solo en los de tipo `rueda`.
   *
   * ⚠️⚠️ `scoreDesde` ES UNA FOTO Y NO SE ACTUALIZA NUNCA. Es el puntaje que
   * tenía el área **el día que creaste el objetivo**, y ahí está todo el valor:
   * `areas.scoreActual` se pisa cada vez que rehacés la rueda, así que sin esta
   * copia, el día que subas a 3 el objetivo diría "de 3 a 3" y se borraría solo
   * el punto de partida — justo la prueba de que avanzaste.
   *
   * ⚠️ Y ES LA MEDIDA QUE NO HUBO QUE INVENTAR: el objetivo ya viene con un
   * número que significa algo para Matías, en la escala que él mismo se puso.
   * `scoreHasta` es siempre `scoreDesde + 1` por ahora, y es a propósito: **el
   * salto más chico que se nota**. Un objetivo que nace posible en vez de
   * heroico.
   */
  scoreDesde: integer('score_desde'),
  scoreHasta: integer('score_hasta'),
  // ⚠️ ESTAS DOS HORAS LAS PONE MATÍAS, NO LA APP. Es lo que permite mostrar
  // horas sin inventarlas: `horasEstimadas` es cuánto cree que sale el total (y
  // sin eso no hay barra de progreso), y `horasPorVez` es cuánto le lleva cada
  // vez, para poder traducir "4 días marcados" a horas. Si están en null, la
  // pantalla muestra CANTIDAD de movimientos y ninguna hora — que es la verdad,
  // en vez de un número lindo salido de un promedio inventado.
  horasEstimadas: real('horas_estimadas'),
  horasPorVez: real('horas_por_vez'),
  // ⚠️ ESTAS TRES SON DE OTRA NATURALEZA QUE LAS DE ARRIBA, y por eso no se
  // mezclan nunca en pantalla: las de arriba las puso Matías, estas las dijo el
  // modelo de memoria ("el Goethe habla de 750 horas para un B2"). Es una CITA
  // SIN VERIFICAR, no un dato suyo. Ver `lib/estimacion-general.ts`.
  //
  // No entran en ningún cálculo: `horasEstimadas` sigue siendo la única que
  // mueve la barra de progreso. Si el número está mal, se equivoca en una frase
  // y no adentro de todo lo demás.
  estimacionTexto: text('estimacion_texto'),
  estimacionFuente: text('estimacion_fuente'),
  // ⚠️ "YA SE INTENTÓ", y sin esto el worker no sirve: "no sé" es la respuesta
  // CORRECTA y la más frecuente (todo lo que dependa de la vida de cada uno), y
  // se guarda igual de null que un error. Sin esta marca, el worker le
  // preguntaría a Gemma por "buscar trabajo" cada cinco minutos para siempre.
  estimacionHecha: integer('estimacion_hecha', { mode: 'boolean' }).notNull().default(false),
  // ⚠️ LA DIFERENCIA ENTRE "LO LEÍ EN UNA PÁGINA" Y "ME ACORDÉ". Con el SearXNG
  // local prendido, la cifra sale del texto de un resultado real y la fuente es
  // el dominio que trajo el buscador — el modelo señala cuál, no lo escribe.
  // Apagado, sale de la memoria de Gemma y puede inventar hasta la fuente. La
  // tarjeta dice cuál de las dos es; esconderlo sería vender lo segundo como lo
  // primero. Ver `lib/buscar.ts` y `lib/estimador.ts`.
  estimacionVerificada: integer('estimacion_verificada', { mode: 'boolean' }).notNull().default(false),
  creado: text('creado').notNull(),
});

// Un movimiento anotado A MANO sobre un objetivo.
//
// ⚠️ LOS AUTOMÁTICOS NO VIVEN ACÁ. Los que salen de lo que Matías ya completa
// (una actividad marcada, un evento de agenda) se calculan AL LEER cruzando por
// nombre — ver `lib/objetivos-auto.ts`. Copiarlos a esta tabla habría sido
// duplicar el dato y necesitar un proceso que los sincronice: si después borrás
// la marca de la actividad, el movimiento copiado quedaría huérfano inflando el
// total. Es la misma decisión que se tomó con las notas y el Analista.
export const objetivoMovimientos = sqliteTable('objetivo_movimientos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  objetivoId: integer('objetivo_id')
    .notNull()
    .references(() => objetivos.id),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  horas: real('horas'), // a ojo, las pone él; null = no las dijo
  nota: text('nota'),
  creado: text('creado').notNull(),
});

/**
 * QUÉ SEGUIMIENTOS Y TAREAS LE SUMAN A CADA OBJETIVO (06/08).
 *
 * ⚠️ ES UNA TABLA PUENTE Y NO UN CAMPO, Y ESA ES LA DECISIÓN. Ya existía
 * `lineas.objetivo_id` —uno a uno— y Matías lo cortó al mirarlo: *"puede
 * constituir a más de uno"*. Y tiene razón con su propio ejemplo: **escalada le
 * suma a Salud y también a un objetivo social**, y con un solo campo hay que
 * elegir cuál de los dos miente.
 *
 * ⚠️ `lineas.objetivo_id` SIGUE EXISTIENDO y se lee: es lo que guarda el
 * desplegable del chat desde el 30/07. No se migra hoy porque **no hay una sola
 * fila que migrar** (medido: cero actividades colgadas). Cuando esta tabla tome
 * el mando del todo, ese campo se puede sacar; mientras tanto, `objetivos-auto`
 * mira los dos y **la tabla gana**, para que un vínculo explícito nunca lo pise
 * el cruce por nombre.
 *
 * El par es único: colgar dos veces la misma actividad del mismo objetivo la
 * contaría dos veces en las horas puestas.
 */
export const objetivoLineas = sqliteTable(
  'objetivo_lineas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    objetivoId: integer('objetivo_id')
      .notNull()
      .references(() => objetivos.id),
    lineaId: integer('linea_id')
      .notNull()
      .references(() => lineas.id),
    creado: text('creado').notNull(),
  },
  (t) => [unique('objetivo_linea_unico').on(t.objetivoId, t.lineaId)],
);

// Notas: el lugar SIN IA de cara al usuario (30/07). Se escribe y nadie
// contesta ahí — ni el chat, ni una sugerencia, ni un botón de "analizar esto".
//
// ⚠️ PERO EL TEXTO SÍ ALIMENTA AL ANALISTA. La falta de IA es del momento de
// escribir, no significa tirar el dato: `lib/analista.ts` lee esta tabla junto
// con el resto. Es la única forma de sostener las dos cosas que pidió Matías a
// la vez ("un espacio sin IA directa" + "que el Analista las tenga en
// consideración").
//
// ⚠️ Y NO SE COPIA A `bitacora`, que era el primer plan. Una nota se edita
// muchas veces: cada guardado dejaría una fila nueva y el Analista leería la
// misma nota diez veces, cada vez a medio escribir. Con la tabla propia hay un
// solo lugar donde vive cada nota y editarla la corrige, no la duplica — la
// lección del badge 'hecho' del 30/07 (el mismo dato en dos lugares se
// desincroniza solo), aplicada antes de que muerda.
//
// El TÍTULO es el primer renglón del texto, no un campo aparte (así funciona
// Notas de Apple y así lo pidió Matías): se guarda separado para no recalcularlo
// en cada listado, pero la fuente es siempre lo que se escribió.
export const notas = sqliteTable('notas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titulo: text('titulo').notNull().default(''),
  cuerpo: text('cuerpo').notNull().default(''),
  // Nombre de la carpeta, plano y nullable (null = sin carpeta). No reusa
  // `lib/carpetas.ts` a propósito: ese estado mapea chats a carpetas dentro de
  // un JSON en `config`, y acá la nota es dueña de su carpeta. Una columna dice
  // lo mismo sin un índice que mantener sincronizado.
  carpeta: text('carpeta'),
  /**
   * CUÁNDO LA BORRASTE (ISO). `null` = viva.
   *
   * ⚠️ BORRAR UNA NOTA DEJÓ DE SER DEFINITIVO (06/08, pedido de Matías: *"tener
   * un apartado en notas de dónde están todas las que se borraron, y que duren
   * una semana"*).
   *
   * ⚠️ Y ES LA ÚNICA COSA DE LA APP CON PAPELERA, a propósito. Una marca de
   * actividad o un registro de sueño se vuelven a poner en dos toques; **una
   * nota es texto que escribiste y no se puede reescribir.** Es lo único cuyo
   * borrado es irreversible de verdad, y por eso es lo único que la necesita.
   *
   * Los siete días los limpia `purgarNotasViejas`, que corre cuando se abre la
   * pantalla: no hay cron y no hace falta uno para algo que se mira solo cuando
   * entrás.
   */
  borrada: text('borrada'),
  /**
   * EL EMOJI DE LA NOTA (04/08, pedido de Matías: *"estaría bueno asignarle algún
   * identificador a las notas, porque están como medias vacías"*).
   *
   * ⚠️ UNO SOLO Y OPCIONAL. Es identidad, no clasificación: sirve para reconocer
   * la nota de un vistazo en una lista, igual que el color de un cuaderno. Las
   * ETIQUETAS que él pidió en la misma frase son otra cosa —varias por nota, para
   * agrupar— y antes de inventarlas hay que mirar si `temas`, que ya clasifica
   * charlas y mensajes, no es exactamente eso.
   *
   * `null` es el estado normal: la mayoría de las notas no tiene ni necesita uno,
   * y forzar a elegir uno al crear convertiría "anotar algo" en un formulario.
   */
  emoji: text('emoji'),
  /**
   * PRIVADA: LA IA LA LEE, LA PANTALLA NO LA MUESTRA.
   *
   * Pedido de Matías (31/07): *"quiero que los datos sean manejados por la IA
   * interna, pero no quiero que estén a la vista… tampoco quiero que el bot
   * pregunte '¿cómo vienen tus relaciones sexuales?'"*.
   *
   * ⚠️ SEPARA DOS COSAS QUE LA APP TRATABA COMO UNA: **guardar** y **mostrar**.
   * Hoy todo lo que registrás puede aparecer en cualquier lado, y eso hace que
   * no registres cosas que sí importan para entenderte. Una nota privada entra
   * igual al Analista —el dato sirve— pero no se asoma en ninguna superficie:
   * ni el título en la lista, ni el bot, ni el Home.
   *
   * ⚠️ ES UNA CORTINA, NO UNA CAJA FUERTE, y está bien que lo sea por ahora
   * (él lo pidió "simulado"): el texto está sin cifrar en el SQLite, así que
   * cualquiera con el archivo lo lee. Protege de una mirada por encima del
   * hombro, que es el caso real. El día que esto sea de verdad hay que cifrar
   * en reposo — ver `docs/analisis-no-pedidos-2026-07-27.md`.
   */
  privada: integer('privada', { mode: 'boolean' }).notNull().default(false),
  creado: text('creado').notNull(),
  actualizado: text('actualizado').notNull(),
});

// Sección Cuerpo: datos físicos estructurados para cruzar con el ánimo.
//  - sueño: valor = minutos dormidos, calidad = 'bien' | 'regular' | 'mal'.
//  - respiración: valor = segundos de la sesión, calidad null.
export const cuerpo = sqliteTable('cuerpo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(), // 'sueno' | 'respiracion'
  valor: integer('valor'),
  calidad: text('calidad'),
  nota: text('nota'),
  creado: text('creado').notNull(),
  /**
   * ⚠️⚠️ QUIÉN CARGÓ ESTO: VOS O EL RELOJ (10/08).
   *
   * Nació de un bug que Matías reportó mirando la app: *"la abrí todos los días
   * y anoté algo, y así y todo los fueguitos se fueron"*. Y tenía razón: el
   * 08/08 abrió la app y cargó el sueño **a mano**, con su calidad y todo, y la
   * racha se cortó igual — le mostraba 2 días donde había 22.
   *
   * La causa NO era la regla, que es suya y es buena (05/08): *"un dato que
   * entra solo del reloj no sostiene la racha"*. Sin esto, la racha se
   * sostendría sola con el reloj prendido y dejaría de significar nada.
   *
   * ⚠️ LA CAUSA ERA QUE ESTA TABLA NO PODÍA DISTINGUIR LAS DOS COSAS. Como no
   * había de dónde saber si un registro lo tipeó él o lo trajo Apple Salud, el
   * código excluía la tabla ENTERA — y de paso se llevaba puesto lo que él sí
   * había venido a contar. **Una regla correcta aplicada sobre un dato que no
   * alcanza para distinguir da un resultado incorrecto**, y encima uno que
   * parece deliberado.
   *
   * 'manual' por defecto, y es el default correcto: todo lo que ya está en la
   * base se cargó a mano (el import de Salud es de después). Lo único que marca
   * 'salud' es `api/salud/importar`.
   */
  origen: text('origen').notNull().default('manual'), // 'manual' | 'salud'
});

/**
 * LO QUE APARTÁS PARA UN OBJETIVO DE PLATA.
 *
 * ⚠️ EL PROGRESO SE CARGA A MANO Y NO SE DEDUCE DE LOS GASTOS. La app conoce una
 * parte de lo que gastás y de lo que entra no sabe nada: calcular el ahorro como
 * ingresos menos gastos daría un número inventado con cara de dato. Ver el
 * comentario largo en `lib/objetivo-plata.ts`.
 *
 * Un aporte es un número y un toque. Es poco, y es lo único que la app puede
 * afirmar sin mentir.
 */
export const aportes = sqliteTable('aportes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  objetivoId: integer('objetivo_id').notNull().references(() => objetivos.id),
  monto: real('monto').notNull(),
  creado: text('creado').notNull(),
});

/**
 * LA ESTRELLITA: lo que guardaste para leer después.
 *
 * Pedido 0.6, del 03/08: *"recomendaciones que incluso puede ir guardando y
 * quedan como una estrellita dentro de la misma aplicación de finanzas o
 * alimentos"*. Es la única pieza del pedido que no existía en ninguna forma —
 * el motor de noticias estaba escrito desde el 24/07.
 *
 * ⚠️ SE GUARDA EL CONTENIDO, NO SOLO EL LINK, y no es redundancia: las noticias
 * viven en una caché de media hora (`config.noticias_cache`) y los feeds RSS
 * rotan sus items en horas. Guardar solo la URL daría una lista de títulos que
 * desaparecen: abrís tus guardados en una semana y no queda ninguno.
 *
 * ⚠️ `url` ES ÚNICA. Tocar la estrella dos veces sobre la misma nota tiene que
 * ser guardar y desguardar, no dos filas iguales.
 *
 * `area` es la del clasificador ('Finanzas', 'Contexto'…) y es lo que decide en
 * qué apartado aparece. Sin ella, un guardado no tendría dónde volver a verse.
 */
export const guardados = sqliteTable('guardados', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  titulo: text('titulo').notNull(),
  resumen: text('resumen'),
  fuente: text('fuente'),
  imagen: text('imagen'),
  area: text('area'),
  creado: text('creado').notNull(),
});

/**
 * LAS ETIQUETAS DE LAS NOTAS (04/08, §0.12c).
 *
 * ── ⚠️ POR QUÉ NO SE REUSÓ `temas`, QUE ERA LA PREGUNTA ANOTADA ─────────────
 *
 * La bitácora dejó esto sin construir a propósito, con una advertencia buena:
 * *"antes de crear un sistema de etiquetas nuevo hay que mirar si `temas`, que
 * ya clasifica charlas y mensajes, no es exactamente eso"*. Se miró, y **no lo
 * es** — por tres motivos, y cada uno alcanza solo:
 *
 *  1. **Un tema lo pone el modelo; una etiqueta la ponés vos.** Los temas nacen
 *     en `archivado.ts` cuando el clasificador nombra la charla. Matías pidió
 *     poder ponerle un identificador a la nota, no que se lo pongan.
 *  2. **Un tema es UNO** (`chats.temaId`, un solo FK). Él pidió textual *"que
 *     haya varias etiquetas"*.
 *  3. **Los temas cuelgan de charlas, no de notas.** Una nota no tiene tema y
 *     nunca lo tuvo.
 *
 * Y hay un cuarto que decide la forma: **`temas` es la clasificación interna
 * del modelo y ya se rompió una vez de forma silenciosa** (el 28/07: 52 temas
 * para 52 chats, porque comparaba mayúsculas de un solo lado). Colgarle lo que
 * el usuario escribe a mano a una tabla que un clasificador reescribe sola es
 * pedirle a las dos cosas que se pisen.
 *
 * ⚠️ Y NO SE PISA CON `notas.carpeta`, que también clasifica: una carpeta es UNA
 * y dice **dónde vive** la nota; las etiquetas son varias y dicen **de qué es**.
 * Es la misma distinción de siempre entre carpeta y etiqueta, y la razón por la
 * que las dos pueden convivir sin que sobre ninguna.
 */
export const etiquetas = sqliteTable('etiquetas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** ⚠️ ÚNICO: dos etiquetas "Trabajo" son una etiqueta que no agrupa nada. */
  nombre: text('nombre').notNull().unique(),
  creado: text('creado').notNull(),
});

/**
 * QUÉ ETIQUETAS TIENE CADA NOTA.
 *
 * Tabla puente, igual que `chat_notas`: varias por nota y la misma etiqueta en
 * muchas notas es todo el punto. Acá no aplica el argumento que hacía dudar con
 * las charlas —*"deja de ser mudarla para ser copiarla"*—: una etiqueta no vive
 * en ningún lado, describe.
 */
export const notaEtiquetas = sqliteTable(
  'nota_etiquetas',
  {
    notaId: integer('nota_id').notNull().references(() => notas.id),
    etiquetaId: integer('etiqueta_id').notNull().references(() => etiquetas.id),
  },
  (t) => [primaryKey({ columns: [t.notaId, t.etiquetaId] })],
);

/**
 * EL PLAN DE ALIMENTACIÓN QUE TE DIO ALGUIEN (04/08, §0.9c).
 *
 * ⚠️ LA FOTO ORIGINAL SE GUARDA, Y NO ES REDUNDANCIA. Lo que quedan en
 * `plan_comidas` es lo que ENTENDIÓ el modelo; el papel es lo que dijo la
 * nutricionista. Si solo guardáramos la lectura, un error del modelo sería para
 * siempre y no habría contra qué chequear. Con la foto, "volver a lo que decía
 * el papel" siempre es posible.
 *
 * ⚠️ HAY UNO ACTIVO POR VEZ, y los viejos NO se borran: cambiar de plan es
 * normal cada varios meses, y el anterior es lo que le da sentido al cruce con
 * el sueño de los meses anteriores. Borrarlo dejaría marcas apuntando a comidas
 * que ya no existen.
 */
export const planes = sqliteTable('planes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** 'foto' | 'escrito'. De dónde salió, para poder decirlo en pantalla. */
  fuente: text('fuente').notNull().default('escrito'),
  /** Nombre del adjunto con la foto del papel, o null si lo escribió a mano. */
  foto: text('foto'),
  /** Quién lo dio ("la nutricionista"). Opcional: es lo que se muestra abajo. */
  dequien: text('dequien'),
  desde: text('desde').notNull(), // YYYY-MM-DD
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creado: text('creado').notNull(),
});

/** Cada comida del plan, con su hora. El orden sale de la hora, no de una columna. */
export const planComidas = sqliteTable('plan_comidas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => planes.id),
  hora: text('hora').notNull(), // HH:MM
  que: text('que').notNull(),
  detalle: text('detalle'),
});

/**
 * QUE TILDASTE ESA COMIDA ESE DÍA.
 *
 * ⚠️ UNA FILA POR COMIDA Y DÍA, Y ES ÚNICA. Sin el índice único, tocar dos veces
 * el tilde dejaría dos filas y el "2 de 5" contaría tres — el mismo dato en dos
 * lugares, que en este proyecto ya se desincronizó dos veces.
 *
 * ⚠️ Y LO QUE COMÉS FUERA DEL PLAN NO VIVE ACÁ: sigue yendo a `cuerpo` como
 * cualquier comida. No es un caso especial ni una falta; es una comida, y
 * separarla en otra tabla la habría convertido en un registro de infracciones.
 */
export const planMarcas = sqliteTable(
  'plan_marcas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    comidaId: integer('comida_id').notNull().references(() => planComidas.id),
    fecha: text('fecha').notNull(), // YYYY-MM-DD
    creado: text('creado').notNull(),
  },
  (t) => [unique('plan_marcas_comida_fecha').on(t.comidaId, t.fecha)],
);

/**
 * LOS PAPELES QUE SEGUÍS (04/08, §0.10 y §0.13).
 *
 * ⚠️ SEGUIR NO ES TENER. Un papel puede estar acá sin una sola compra: es la
 * lista de lo que mirás. Las compras van en su tabla, y esa separación es la que
 * deja que la pantalla diga "seguís tres, tenés dos" sin inventar una posición
 * de cero acciones.
 *
 * ⚠️ EL PRECIO SE GUARDA CON SU FECHA, Y LAS DOS COSAS SE MUESTRAN JUNTAS. Un
 * precio sin fecha al lado es la forma más fácil de mentir en esta pantalla: si
 * el de afuera no contesta, lo último que se sabe puede ser de hace una semana y
 * la cuenta seguiría dando un número con toda la cara de estar al día. Ver
 * `lib/precios.ts`.
 */
export const papeles = sqliteTable('papeles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** El símbolo con su mercado, como lo usa la fuente ('AAPL', 'IBE.MC'). */
  simbolo: text('simbolo').notNull().unique(),
  nombre: text('nombre').notNull(),
  /** 'NasdaqGS', 'Madrid Stock Exchange'… solo para mostrar. */
  mercado: text('mercado'),
  /** Lo que dijo la fuente ('Technology'). No lo clasifica la app. */
  sector: text('sector'),
  /** La del papel, que puede NO ser la tuya. Ver el aviso de `cartera()`. */
  moneda: text('moneda'),
  precio: real('precio'),
  /** ISO. Cuándo se trajo ese precio. */
  precioFecha: text('precio_fecha'),
  creado: text('creado').notNull(),
});

/**
 * CADA COMPRA, POR SEPARADO.
 *
 * ⚠️ NO SE GUARDA EL PROMEDIO, SE GUARDAN LAS COMPRAS. El promedio es una cuenta
 * (`lib/acciones.ts`) y se rehace cada vez; guardarlo habría sido el mismo dato
 * en dos lugares, que en este proyecto ya se desincronizó dos veces (el badge
 * 'hecho' del 30/07). Y además hace imposible lo que él pidió textual: *"cuánto
 * ganás de cada compra, no solo del promedio"*.
 *
 * Las ventas quedan para cuando las pida: hoy `cantidad` es siempre lo que
 * entró. Corregir una compra o borrarla alcanza para el caso que él contó.
 */
export const compras = sqliteTable('compras', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  papelId: integer('papel_id').notNull().references(() => papeles.id),
  cantidad: real('cantidad').notNull(),
  /** Lo que pagaste por cada una. */
  precio: real('precio').notNull(),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  creado: text('creado').notNull(),
});

/**
 * ── EL PASO 7 DEL CEREBRO: dónde queda lo que la app aprende de él (13/08) ────
 *
 * Hasta hoy lo aprendido vivía en UNA fila de `conocimiento` titulada "Lo que
 * Tegmento aprendió": **561 caracteres que se borraban y se reescribían enteros**
 * en cada corrida del Analista. Por eso lo que él confirmó hace tres semanas no
 * llegaba al chat y la app no "sabía más" con el tiempo.
 *
 * ⚠️ LA TAXONOMÍA ES `areaId`, O SEA LA RUEDA, y no un vocabulario nuevo. Hoy ya
 * conviven tres para la misma vida —las 8 áreas, los 9 factores de ánimo y 20
 * `temas` que el clasificador inventa solo, con "Finanzas" y "Vida social"
 * repetidos en dos—. Un cuarto sería el problema de los 52 temas del 28/07 un
 * piso más arriba. Las áreas ya tienen score, foco e historia, y los objetivos
 * ya apuntan ahí.
 *
 * Las reglas (cuándo vence, cuándo un episodio sube a patrón, qué le llega al
 * chat) viven en `lib/cerebro-hechos` con 18 tests. Acá solo está la forma.
 */
export const hechos = sqliteTable('hechos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** 'episodio' · 'patron' · 'preferencia' */
  tipo: text('tipo').notNull(),
  contenido: text('contenido').notNull(),
  /**
   * ⚠️ LO QUE DIJO ÉL CUANDO EL BOT PREGUNTÓ, y es el campo que sostiene todo:
   * un episodio sin explicación NO puede subir a patrón (`cuentaParaPatron`).
   * O sea que **sin preguntas el cerebro no aprende**, por diseño.
   */
  porque: text('porque'),
  /** El área de la rueda. `null` mientras no se pueda ubicar: mejor que inventar. */
  areaId: integer('area_id').references(() => areas.id),
  /**
   * ⚠️ LO MUEVE ÉL, NO EL MODELO. Todo lo que deduce la app nace en
   * `no_confirmado`. Y `descartado` NO se borra: saber que algo no le pasa es
   * información, y borrarlo haría que el Analista lo vuelva a proponer el lunes.
   */
  estado: text('estado').notNull().default('no_confirmado'),
  /** 'chat' · 'notas' · 'marcas' · 'analista' · 'onboarding' · 'confirmados' */
  origen: text('origen').notNull(),
  /** Cuándo pasó lo que el hecho cuenta. Distinto de cuándo se guardó. */
  cuando: text('cuando').notNull(),
  /** `null` = no vence. Confirmarlo lo pone en null: deja de ser una deducción. */
  vence: text('vence'),
  /** Solo en patrones: JSON con los ids de los episodios de los que salió. */
  saleDe: text('sale_de'),
  creado: text('creado').notNull(),
});

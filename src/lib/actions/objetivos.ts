'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { areas, config, objetivoLineas, objetivoMovimientos, objetivos } from '@/lib/db/schema';
import { CLAVE_ARRANQUE } from '@/lib/objetivos-arranque';
import { CLAVES_ICONO_OBJETIVO } from '@/lib/objetivos-iconos';
import { CLAVE_FOCO_CUMPLIDO } from '@/lib/foco-caduca';
import { fechaLimitePorDefecto } from '@/lib/objetivos-onboarding';

/** YYYY-MM-DD de hoy, en hora local. */
function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function limpiarFecha(v: unknown): string | null {
  const t = String(v ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function limpiarNumero(v: unknown): number | null {
  const t = String(v ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function crearObjetivo(datos: {
  titulo: string;
  areaId?: number | null;
  arranco?: string | null;
  meta?: string | null;
  fechaMeta?: string | null;
  horasEstimadas?: number | string | null;
  horasPorVez?: number | string | null;
}): Promise<number | null> {
  const titulo = datos.titulo.trim();
  if (!titulo) return null;

  const fechaMeta = limpiarFecha(datos.fechaMeta);
  const ahora = new Date().toISOString();

  const [fila] = await db
    .insert(objetivos)
    .values({
      titulo,
      areaId: datos.areaId ?? null,
      // Se puede arrancar CON FECHA VIEJA a propósito: el objetivo suele existir
      // desde antes que la app lo sepa. Sin esto, "buscar trabajo" empezaría hoy
      // y los nueve meses que le importan a Matías no estarían en ninguna parte.
      arranco: limpiarFecha(datos.arranco) ?? hoy(),
      meta: fechaMeta ? (datos.meta?.trim() || null) : null,
      // ⚠️ La fecha es lo que define el TIPO de objetivo (ver `lib/objetivos.ts`).
      // Sin ella no hay progreso ni proyección, y eso es correcto: no hay total.
      fechaMeta,
      // Las horas estimadas solo tienen sentido con una meta: son el denominador
      // de la barra de progreso, y sin meta no hay barra.
      horasEstimadas: fechaMeta ? limpiarNumero(datos.horasEstimadas) : null,
      horasPorVez: limpiarNumero(datos.horasPorVez),
      creado: ahora,
    })
    .returning({ id: objetivos.id });

  revalidatePath('/objetivos');
  return fila.id;
}

export async function editarObjetivo(
  id: number,
  datos: {
    titulo?: string;
    areaId?: number | null;
    meta?: string | null;
    fechaMeta?: string | null;
    horasEstimadas?: number | string | null;
    horasPorVez?: number | string | null;
  },
): Promise<void> {
  const fechaMeta = limpiarFecha(datos.fechaMeta);
  await db
    .update(objetivos)
    .set({
      ...(datos.titulo?.trim() ? { titulo: datos.titulo.trim() } : {}),
      ...(datos.areaId !== undefined ? { areaId: datos.areaId } : {}),
      meta: fechaMeta ? (datos.meta?.trim() || null) : null,
      fechaMeta,
      horasEstimadas: fechaMeta ? limpiarNumero(datos.horasEstimadas) : null,
      horasPorVez: limpiarNumero(datos.horasPorVez),
    })
    .where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

/**
 * CREAR UN OBJETIVO DESDE LA RUEDA, CON SUS SEGUIMIENTOS COLGADOS (06/08).
 *
 * ⚠️⚠️ EL TERCER PASO NO ES UNA FUNCIÓN NUEVA: es `objetivo_lineas`, la misma
 * tabla que usa "Lo que suma a esto", **usada al crear en vez de después**. Y
 * ese cambio de momento es todo el punto: medido el 06/08 a la mañana había 2
 * objetivos, 7 actividades y **0 vínculos**, porque colgar algo era una segunda
 * visita que nadie hacía. Acá se cuelga cuando estás decidiendo para qué era.
 *
 * ⚠️ SI FALLA UNA LÍNEA NO SE PIERDE EL OBJETIVO. Los vínculos van después del
 * insert y cada uno por su cuenta: un `lineaId` que ya no existe se saltea y el
 * objetivo queda igual. Al revés —abortar todo porque una actividad se borró en
 * otra pestaña— le haría perder los tres pasos que acaba de contestar.
 */
export async function crearObjetivoDesdeRueda(datos: {
  areaId: number | null;
  tipo: 'rueda' | 'llegar' | 'habito';
  titulo: string;
  scoreDesde?: number | null;
  scoreHasta?: number | null;
  meta?: string | null;
  fechaMeta?: string | null;
  /** Desde cuándo venís con esto. Vacío = hoy. */
  arranco?: string | null;
  /** Cuánta plata hay que juntar, en los de "llegar a algo". */
  montoMeta?: number | string | null;
  moneda?: string | null;
  /** Cuánto se cree que sale en total, y cuánto lleva cada vez. Son el
   *  denominador de la barra de progreso: sin ellas no hay barra. */
  horasEstimadas?: number | string | null;
  horasPorVez?: number | string | null;
  lineaIds?: number[];
}): Promise<number | null> {
  const titulo = datos.titulo.trim();
  if (!titulo) return null;

  const arranco = limpiarFecha(datos.arranco) ?? hoy();
  // ⚠️⚠️ SI NO PUSO FECHA, SE PONE SOLA A 60 DÍAS (06/08, Matías: *"si no tiene
  // fecha límite le ponés sesenta; si tiene una fecha límite, la que él
  // quiera"*). Sesenta es lo que él dice que tarda en generarse un hábito.
  // ⚠️ Y SE CUENTA DESDE EL ARRANQUE, NO DESDE HOY: si el objetivo venía de hace
  // tres meses, una fecha a 60 días de hoy le daría más plazo por haber
  // empezado antes — al revés de lo que pasa en la vida.
  const fechaMeta = limpiarFecha(datos.fechaMeta) ?? fechaLimitePorDefecto(arranco);
  const ahora = new Date().toISOString();
  // ⚠️ EL MONTO SOLO EN LOS DE "LLEGAR", igual que el par de puntajes solo en
  // los de rueda: un `montoMeta` en un objetivo de hábito haría que la tarjeta
  // lo dibuje como uno de plata —con su barra y su "por semana"— y mida algo
  // que ese objetivo no tiene.
  const montoMeta = datos.tipo === 'llegar' ? limpiarNumero(datos.montoMeta) : null;

  const [fila] = await db
    .insert(objetivos)
    .values({
      titulo,
      areaId: datos.areaId ?? null,
      // ⚠️ SE PUEDE ARRANCAR CON FECHA VIEJA, igual que en `crearObjetivo`: un
      // objetivo suele existir desde antes que la app lo sepa, y sin esto
      // "buscar trabajo" empezaría hoy y los meses que le importan no estarían
      // en ninguna parte.
      arranco,
      tipo: datos.tipo,
      montoMeta,
      moneda: montoMeta != null ? (datos.moneda?.trim() || '€') : null,
      // ⚠️ Solo los de rueda guardan el par. En los otros dos, un "de 2 a 3"
      // suelto en la fila es un número que después alguien va a dibujar sin
      // saber que no significa nada ahí.
      scoreDesde: datos.tipo === 'rueda' ? (datos.scoreDesde ?? null) : null,
      scoreHasta: datos.tipo === 'rueda' ? (datos.scoreHasta ?? null) : null,
      meta: fechaMeta ? (datos.meta?.trim() || null) : null,
      fechaMeta,
      horasEstimadas: limpiarNumero(datos.horasEstimadas),
      horasPorVez: limpiarNumero(datos.horasPorVez),
      creado: ahora,
    })
    .returning({ id: objetivos.id });

  for (const lineaId of datos.lineaIds ?? []) {
    // ⚠️ `onConflictDoNothing`, la misma forma que usa `colgarDeObjetivo`, y no
    // un try/catch: el par es único en la base (índice `objetivo_linea_unico`,
    // creado el 06/08 — antes el schema lo declaraba y la base no lo tenía).
    // Un catch mudo acá también se habría tragado errores que sí importan.
    await db
      .insert(objetivoLineas)
      .values({ objetivoId: fila.id, lineaId, creado: ahora })
      .onConflictDoNothing();
  }

  revalidarObjetivos();
  return fila.id;
}

/**
 * ELEGIRLE EL DIBUJITO A MANO (06/08, pedido de Matías: *"cuando lo toques que
 * puedas cambiarlo"*).
 *
 * ⚠️ `null` VUELVE A "QUE LO ADIVINE", no deja el objetivo sin marca. Es la
 * primera opción del selector y no un borrar escondido, igual que "Sin ícono" en
 * las notas: sacar una elección tiene que costar lo mismo que ponerla.
 *
 * ⚠️ VALIDA CONTRA EL CATÁLOGO ANTES DE ESCRIBIR. Una clave que no existe se
 * guardaría igual —la columna es texto libre— y después no se dibujaría: es
 * exactamente la forma del bug del recorte a dos caracteres, que guardaba `id` y
 * `tr` en una columna que nadie validaba. Acá se rechaza y no se escribe nada.
 */
export async function ponerIconoObjetivo(id: number, clave: string | null): Promise<void> {
  if (clave != null && !CLAVES_ICONO_OBJETIVO.has(clave)) return;
  await db.update(objetivos).set({ icono: clave }).where(eq(objetivos.id, id));
  revalidarObjetivos();
}

/**
 * ⚠️ OBJETIVOS VIVE EN TRES PANTALLAS Y HAY QUE REVALIDAR LAS TRES (06/08).
 * Desde que la sección se puede poner en cualquier lado, `/objetivos` solo era
 * una de ellas: la pestaña de Seguimiento (`/actividades`) y los de plata en
 * `/finanzas` dibujan las mismas filas. Revalidar una sola deja las otras dos
 * mostrando lo de antes hasta que se recarguen solas.
 */
function revalidarObjetivos(): void {
  revalidatePath('/objetivos');
  revalidatePath('/actividades');
  revalidatePath('/finanzas');
}

/**
 * Cerrar un objetivo, de las dos formas posibles.
 *
 * ⚠️ 'abandonado' EXISTE A PROPÓSITO. Sin él, la única salida sería lograrlo o
 * dejarlo abierto para siempre — y un objetivo abierto que ya no va es otra
 * manera de hacerte sentir en falta cada vez que abrís la pantalla. Que se pueda
 * decir "esto ya no va" es parte de que la sección no castigue.
 *
 * Ninguno de los dos borra nada: los cerrados son la materia prima para estimar
 * cuánto va a llevar el próximo parecido (ver `estimarDeCerrados`).
 */
export async function cerrarObjetivo(id: number, como: 'logrado' | 'abandonado'): Promise<void> {
  await db.update(objetivos).set({ estado: como, cerrado: hoy() }).where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

export async function reabrirObjetivo(id: number): Promise<void> {
  await db.update(objetivos).set({ estado: 'activo', cerrado: null }).where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

/**
 * PAUSAR: el pedido 1.2, del 30/07. La versión reversible de abandonarlo.
 *
 * ⚠️ UN PAUSADO NO SE CIERRA, y esa es toda la diferencia. `cerrado` queda en
 * null a propósito: la fecha de cierre es lo que hace que un objetivo entre en
 * `estimarDeCerrados` como materia prima ("cuánto llevó el último parecido"), y
 * uno que vas a retomar el mes que viene todavía no llevó nada. Ponerle fecha
 * sería contar como terminado algo que está a mitad de camino, y ensuciaría la
 * estimación del próximo.
 *
 * ⚠️ Y ESTO ES LO QUE RESUELVE DE VERDAD: sin pausar, la única salida de algo
 * que hoy no podés sostener es abandonarlo, que se siente como fracasar, o
 * dejarlo activo mirándote en frío. La temperatura y el reencuadre se apagan en
 * los pausados (ver `objetivos/page.tsx`), así que "está frío" no puede
 * aparecer sobre algo que vos elegiste frenar — que sería un reproche por
 * cumplir tu propia decisión.
 */
export async function pausarObjetivo(id: number): Promise<void> {
  await db.update(objetivos).set({ estado: 'pausado', cerrado: null }).where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

/** Volver a ponerlo en marcha. Lo mismo que reabrir, con otro nombre porque el
 *  pausado nunca estuvo cerrado y "reabrir" mentiría sobre lo que pasó. */
export async function reanudarObjetivo(id: number): Promise<void> {
  await db.update(objetivos).set({ estado: 'activo', cerrado: null }).where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

/**
 * RECICLAR: el pedido 1.3, del 30/07. Los que no terminan nunca.
 *
 * *"Los que no terminan nunca: hoy la app solo sabe cerrarlos."* Buscar trabajo,
 * ponerse en forma, mantener el alemán: conseguís el laburo y seis meses después
 * estás buscando otra vez. Hasta hoy las opciones eran cerrarlo y perder el arco,
 * o dejarlo abierto para siempre y que el arco no signifique nada.
 *
 * Reciclar CIERRA la vuelta actual como lograda y ABRE una nueva con el mismo
 * título, misma área y misma meta, arrancando hoy.
 *
 * ⚠️ SON DOS FILAS Y NO UNA REINICIADA, y es la decisión que importa: la vuelta
 * vieja se queda entera —su arco, sus movimientos, su fecha— porque es
 * exactamente el dato que hace falta para estimar cuánto va a llevar esta.
 * Reiniciar el contador sobre la misma fila borraría la única evidencia de
 * cuánto te llevó la vez pasada.
 *
 * ⚠️ Y LOS MOVIMIENTOS NO SE COPIAN. La vuelta nueva arranca en cero, que es la
 * verdad: el tiempo que le pusiste el año pasado no es tiempo que le pusiste
 * ahora. El arco largo sigue existiendo en la fila vieja, a la vista.
 *
 * Devuelve el id del objetivo nuevo.
 */
export async function reciclarObjetivo(id: number): Promise<number | null> {
  const filas = await db.select().from(objetivos).where(eq(objetivos.id, id));
  const viejo = filas[0];
  if (!viejo) return null;

  await db.update(objetivos).set({ estado: 'logrado', cerrado: hoy() }).where(eq(objetivos.id, id));

  const [nuevo] = await db
    .insert(objetivos)
    .values({
      titulo: viejo.titulo,
      areaId: viejo.areaId,
      arranco: hoy(),
      estado: 'activo',
      meta: viejo.meta,
      // ⚠️ La fecha de meta NO se hereda: era la de la vuelta pasada y ya venció.
      // Heredarla abriría la vuelta nueva con una meta en el pasado y la tarjeta
      // diría "faltan -40 semanas".
      fechaMeta: null,
      // Las horas estimadas SÍ, porque son cuánto creés que sale en total y eso
      // no cambia por empezar de nuevo.
      horasEstimadas: viejo.horasEstimadas,
      horasPorVez: viejo.horasPorVez,
      creado: new Date().toISOString(),
    })
    .returning({ id: objetivos.id });

  revalidatePath('/objetivos');
  return nuevo?.id ?? null;
}

/**
 * Anotar un movimiento a mano.
 *
 * Las horas son opcionales y van a ojo: no hay cronómetro. Un cronómetro obliga
 * a acordarse de arrancarlo y de pararlo, y a la tercera vez que te lo olvidás el
 * número queda mintiendo.
 */
export async function anotarMovimiento(objetivoId: number, datos: { nota?: string; horas?: number | string | null }): Promise<void> {
  const nota = datos.nota?.trim() || null;
  const horas = limpiarNumero(datos.horas);
  if (!nota && horas == null) return;

  await db.insert(objetivoMovimientos).values({
    objetivoId,
    fecha: hoy(),
    horas,
    nota,
    creado: new Date().toISOString(),
  });
  revalidatePath('/objetivos');
}

export async function borrarMovimiento(id: number): Promise<void> {
  await db.delete(objetivoMovimientos).where(eq(objetivoMovimientos.id, id));
  revalidatePath('/objetivos');
}

export async function borrarObjetivo(id: number): Promise<void> {
  // Los movimientos primero: la FK no deja borrar el objetivo con hijos.
  await db.delete(objetivoMovimientos).where(eq(objetivoMovimientos.objetivoId, id));
  await db.delete(objetivos).where(eq(objetivos.id, id));
  revalidatePath('/objetivos');
}

// ── EL ARRANQUE, EN EL HOME ──────────────────────────────────────────────────

/**
 * "Ahora no", y no se pregunta nunca más.
 *
 * ⚠️ NO SE REPROGRAMA PARA DENTRO DE UN MES, que era la otra opción. Una
 * pregunta que vuelve sola después de que dijiste que no es una insistencia con
 * disfraz de recordatorio, y encima la app tiene un camino que ya funciona para
 * cuando cambie de idea: el botón de "+ Un objetivo nuevo" en `/objetivos`.
 */
export async function descartarArranqueObjetivos(): Promise<void> {
  await db
    .insert(config)
    .values({ clave: CLAVE_ARRANQUE, valor: 'visto' })
    .onConflictDoUpdate({ target: config.clave, set: { valor: 'visto' } });
  revalidatePath('/chat');
}

/**
 * SACARLE EL FOCO A UN ÁREA que ya cumplió lo que se había propuesto (06/08).
 *
 * ⚠️ ES LA ÚNICA FORMA EN QUE UN FOCO SE APAGA, y siempre la aprieta él. La app
 * detecta que el área se quedó sin objetivos pendientes y **pregunta**; apagarlo
 * sola sería decidir qué te importa, que es justo lo que el foco vino a evitar
 * (la rueda pregunta cómo estás, el foco pregunta qué te importa — y esa segunda
 * no se deduce de ningún número).
 */
export async function sacarFocoArea(areaId: number): Promise<void> {
  await db.update(areas).set({ foco: false }).where(eq(areas.id, areaId));
  revalidarObjetivos();
  revalidatePath('/rueda');
  revalidatePath('/descubrir');
}

/**
 * "Ahora no" a la pregunta del foco cumplido.
 *
 * ⚠️ SE GUARDA CONTRA QUÉ ÁREAS SE DIJO QUE NO, no un simple "visto". Si fuera
 * un booleano, apagar el aviso hoy por Salud física lo apagaría para siempre —
 * incluso el día que cumplas Finanzas, que es una pregunta nueva. Guarda los ids
 * y vuelve a preguntar en cuanto la lista cambie.
 */
export async function posponerFocoCumplido(areaIds: number[]): Promise<void> {
  const valor = [...areaIds].sort((a, b) => a - b).join(',');
  await db
    .insert(config)
    .values({ clave: CLAVE_FOCO_CUMPLIDO, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
  revalidarObjetivos();
}

/**
 * Convertir en objetivo algo que la app ya venía viendo.
 *
 * ⚠️ **ARRANCA EN LA PRIMERA MARCA, NO HOY.** Es la razón de ser de la
 * sugerencia: si "Alemán" empezara hoy, los meses que ya tiene encima —lo único
 * que lo vuelve un objetivo y no una tarea— quedarían afuera. Y como el título
 * se conserva tal cual, `movimientosAutomaticos` lo va a cruzar por nombre y el
 * arco aparece lleno desde el primer segundo.
 *
 * Nace ABIERTO (sin `fechaMeta`) a propósito: la pregunta era por lo grande que
 * NO tiene fecha de entrega. Ponerle una desde acá sería contestar por él la
 * única decisión que define qué le está permitido afirmar a la pantalla.
 */
export async function objetivoDesdeCandidato(titulo: string, desde: string): Promise<number | null> {
  const id = await crearObjetivo({ titulo, arranco: desde });
  revalidatePath('/chat');
  return id;
}

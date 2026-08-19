'use server';

import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { fechaLimitePorDefecto } from '@/lib/objetivos-onboarding';
import { aportes, objetivos } from '@/lib/db/schema';
import { fotoMuyGrande, guardarAdjunto } from '@/lib/adjuntos';
import { pausarObjetivo } from '@/lib/actions/objetivos';

/**
 * Crear un objetivo de plata. Es un objetivo normal con un monto.
 *
 * ⚠️ NACE `activo` Y CON LA FECHA DE HOY como arranque, igual que cualquier
 * objetivo: de ahí sale el arco, que es lo que después permite decir "venís
 * apartando 118 por mes". Sin fecha de arranque no hay ritmo que calcular.
 */
export async function crearObjetivoPlata(datos: {
  titulo: string;
  montoMeta: number;
  moneda?: string;
  /** Si no la ponés, van 60 días. Ver `fechaLimitePorDefecto`. */
  fechaMeta?: string | null;
}): Promise<number | null> {
  const titulo = datos.titulo.trim().slice(0, 90);
  if (!titulo || !(datos.montoMeta > 0)) return null;
  const hoy = new Date();
  const arranco = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const [fila] = await db
    .insert(objetivos)
    .values({
      titulo,
      montoMeta: datos.montoMeta,
      moneda: datos.moneda ?? '€',
      arranco,
      estado: 'activo',
      // ⚠️⚠️ TIPO Y FECHA, QUE ANTES NO PONÍA NINGUNO (06/08). Finanzas es una de
      // las puertas premium desde donde se crean objetivos —Matías: *"se pueden
      // crear desde finanzas y alimentación"*— y venía metiendo filas **sin
      // `tipo` y sin `fechaMeta`**, o sea objetivos que la tarjeta no sabe medir
      // y que el foco que caduca no puede contar. Era el mismo agujero que el
      // formulario en blanco que se borró de Objetivos, escondido en otro módulo.
      // Uno de plata siempre es 'llegar': tiene un número al que se llega.
      tipo: 'llegar',
      fechaMeta: datos.fechaMeta ?? fechaLimitePorDefecto(arranco),
      creado: new Date().toISOString(),
    })
    .returning({ id: objetivos.id });
  revalidatePath('/finanzas');
  revalidatePath('/objetivos');
  return fila?.id ?? null;
}

/**
 * Apartar plata para un objetivo.
 *
 * ⚠️ ACEPTA NEGATIVOS A PROPÓSITO: sacar plata de lo que juntaste es tan real
 * como ponerla, y si la app solo deja sumar, el número deja de ser cierto el
 * primer mes que tengas que echar mano. Un progreso que solo puede subir es un
 * progreso que no se corresponde con la vida.
 */
export async function agregarAporte(objetivoId: number, monto: number): Promise<void> {
  if (!Number.isFinite(monto) || monto === 0) return;
  await db.insert(aportes).values({ objetivoId, monto, creado: new Date().toISOString() });
  revalidatePath('/finanzas');
}

/**
 * Corregir el título o el monto de un objetivo de plata (03/08).
 *
 * ⚠️ EXISTE PORQUE NO HABÍA FORMA DE ARREGLAR UN ERROR. Matías: si te
 * equivocabas en el monto, quedaba así para siempre. Y un monto equivocado no es
 * un detalle cosmético: de él salen el porcentaje, el ritmo y la fecha de
 * llegada, o sea **toda la tarjeta miente**.
 *
 * No toca los aportes: lo que apartaste pasó, aunque la meta estuviera mal.
 */
export async function editarObjetivoPlata(
  id: number,
  datos: { titulo?: string; montoMeta?: number },
): Promise<void> {
  const cambios: { titulo?: string; montoMeta?: number } = {};
  const titulo = datos.titulo?.trim().slice(0, 90);
  if (titulo) cambios.titulo = titulo;
  if (datos.montoMeta != null && datos.montoMeta > 0) cambios.montoMeta = datos.montoMeta;
  if (Object.keys(cambios).length === 0) return;
  await db.update(objetivos).set(cambios).where(eq(objetivos.id, id));
  revalidatePath('/finanzas');
  revalidatePath('/objetivos');
}

/**
 * Borrar un objetivo de plata y sus aportes.
 *
 * ⚠️ ES PARA EL ERROR DE CARGA, NO PARA SOLTAR ALGO QUE EMPEZASTE. El schema
 * dice que los objetivos cerrados NO se borran porque son materia prima para
 * estimar el próximo parecido — pero eso protege a los `logrado` y
 * `abandonado`, que son historia real. Uno cargado con el monto equivocado hace
 * diez segundos no es historia: es basura que ensucia esa misma estimación.
 *
 * Para dejar algo de verdad, el camino sigue siendo cerrarlo (`abandonado`), que
 * lo conserva. La UI avisa antes de borrar si ya tiene aportes.
 *
 * Los aportes se borran a mano y primero: la FK está declarada pero SQLite no
 * fuerza `ON DELETE CASCADE` salvo que se prenda, y dejarlos huérfanos sumaría
 * plata de un objetivo que ya no existe.
 */
export async function borrarObjetivoPlata(id: number): Promise<void> {
  await db.delete(aportes).where(eq(aportes.objetivoId, id));
  await db.delete(objetivos).where(eq(objetivos.id, id));
  revalidatePath('/finanzas');
  revalidatePath('/objetivos');
}

/**
 * LA PORTADA DEL OBJETIVO (04/08). Sube la foto y la deja como imagen de fondo.
 *
 * ⚠️ VA POR SERVER ACTION Y NO POR UNA RUTA NUEVA. `/api/comida-foto` existe
 * porque ahí la foto va al modelo y vuelve con una descripción; acá no hay
 * modelo: se guarda un archivo y se escribe una columna. Una ruta habría sido
 * una superficie más para mantener —y la del ticket, borrada ayer, es el
 * recordatorio fresco de lo que cuesta cada una.
 *
 * ⚠️ Y NO BORRA LA ANTERIOR. Cambiar la portada tres veces deja tres archivos en
 * `data/adjuntos`, y eso es a propósito por ahora: son kilobytes en tu propia
 * máquina, y borrar el archivo viejo sin saber si otra fila lo referencia es
 * cómo se rompen las fotos de otro lado. Si algún día molesta, se limpia con un
 * barrido que mire TODAS las referencias, no desde acá.
 */
export async function subirPortadaObjetivo(
  id: number,
  datos: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const foto = datos.get('foto');
  if (!(foto instanceof File) || foto.size === 0) return { ok: false, error: 'Falta la foto.' };
  if (fotoMuyGrande(foto)) return { ok: false, error: 'La foto es demasiado grande (máximo 12 MB).' };

  const buffer = Buffer.from(await foto.arrayBuffer());
  const nombre = guardarAdjunto(buffer, 'jpg');
  await db.update(objetivos).set({ portada: nombre }).where(eq(objetivos.id, id));
  revalidatePath('/finanzas');
  revalidatePath('/objetivos');
  return { ok: true };
}

/** Sacarle la portada. Vuelve al degradé, que es el estado normal. */
export async function quitarPortadaObjetivo(id: number): Promise<void> {
  await db.update(objetivos).set({ portada: null }).where(eq(objetivos.id, id));
  revalidatePath('/finanzas');
  revalidatePath('/objetivos');
}

/**
 * PONERLO EN PAUSA desde Finanzas (04/08, maqueta de los tres puntitos).
 *
 * ⚠️ REUSA `pausarObjetivo` Y NO ESCRIBE EL ESTADO ACÁ. Un objetivo de plata es
 * un objetivo con un monto —esa es la decisión del schema—, así que pausarlo
 * tiene que ser la MISMA operación que pausar cualquier otro. Escribir
 * `estado: 'pausado'` de este lado habría dejado dos lugares que definen qué es
 * pausar, y el docstring de allá (la temperatura se apaga, `cerrado` queda en
 * null) es justo lo que no se puede duplicar sin que se separen.
 *
 * ⚠️ CONSECUENCIA QUE HAY QUE SABER: `leerObjetivosPlata` solo trae los activos,
 * así que al pausarlo DESAPARECE de Finanzas. No se pierde —sigue entero en
 * `/objetivos`, con su botón de reanudar—, pero acá no queda dónde retomarlo, y
 * por eso el menú lo dice.
 */
export async function pausarObjetivoPlata(id: number): Promise<void> {
  await pausarObjetivo(id);
  revalidatePath('/finanzas');
}

/** Los objetivos de plata activos, con sus aportes. */
export async function leerObjetivosPlata() {
  const filas = await db
    .select()
    .from(objetivos)
    .where(and(isNotNull(objetivos.montoMeta), eq(objetivos.estado, 'activo')))
    .orderBy(asc(objetivos.arranco));
  if (filas.length === 0) return [];
  const todos = await db.select().from(aportes);
  return filas.map((o) => ({
    id: o.id,
    titulo: o.titulo,
    montoMeta: o.montoMeta ?? 0,
    moneda: o.moneda ?? '€',
    arranco: o.arranco,
    // ⚠️ HACÍA FALTA Y NO SE TRAÍA (06/08): sin la fecha de meta, la tarjeta solo
    // podía decir "a este ritmo llegás en X" y nunca "para llegar al 15/10
    // necesitás Y por semana". El dato estaba en la tabla desde siempre.
    fechaMeta: o.fechaMeta,
    portada: o.portada,
    aportes: todos.filter((a) => a.objetivoId === o.id).map((a) => ({ monto: a.monto, creado: a.creado })),
  }));
}

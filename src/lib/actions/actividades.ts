'use server';

import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { lineas, bitacora, marcas } from '@/lib/db/schema';
import { normalizarHecho } from '@/lib/hecho';
import { puedeMarcar } from '@/lib/marcas';

// Las actividades se guardan en `lineas` con tipo='actividad'. Dos estados de vida:
//  - 'activa'  : en curso, lo que seguís en el tiempo (fútbol, cerámica).
//  - 'hecha'   : puntual, algo que pasó una vez y se terminó (mandé el mail).
// Ambas viven juntas en la pantalla Actividades. (Antes lo puntual era "hito";
// se unificó todo acá el 22/07, pedido de Matías.)

export type OrigenHecho = 'chat' | 'manual';

/**
 * Marca algo puntual como HECHO: crea una actividad en estado 'hecha' con la
 * fecha en que pasó y deja una entrada en bitácora (aparece en el Historial).
 * Devuelve el título normalizado.
 */
export async function marcarHecho(titulo: string, origen: OrigenHecho = 'manual'): Promise<string | null> {
  const limpio = normalizarHecho(titulo);
  if (!limpio) return null;
  const ahora = new Date().toISOString();

  await db.insert(lineas).values({ titulo: limpio, tipo: 'actividad', estado: 'hecha', ultimaActividad: ahora });
  await db.insert(bitacora).values({ tipo: 'hecho', contenido: limpio, fecha: ahora });

  revalidatePath('/actividades');
  revalidatePath('/historial');
  revalidatePath('/cosas-chicas');
  revalidatePath('/chat');
  return limpio;
}

/**
 * Crea una actividad EN CURSO (algo que se sostiene en el tiempo).
 * Con `diaria` en true queda lista para pintar día a día desde el momento cero:
 * es lo que se usa cuando venís de decir "esto lo hago todas las semanas".
 */
export async function crearActividad(
  titulo: string,
  objetivo?: string,
  diaria = false,
  /** De qué objetivo cuelga, si Matías lo eligió en el desplegable del chat.
   *  ⚠️ No confundir con `objetivo`, que es un texto libre viejo ("para qué la
   *  hago"). Este es el vínculo real con la tabla `objetivos`. */
  objetivoId?: number | null,
): Promise<void> {
  const t = titulo.trim().slice(0, 90);
  if (!t) return;
  await db.insert(lineas).values({
    titulo: t,
    objetivo: objetivo?.trim() || null,
    tipo: 'actividad',
    estado: 'activa',
    diaria,
    objetivoId: objetivoId ?? null,
    ultimaActividad: new Date().toISOString(),
  });
  revalidatePath('/actividades');
  revalidatePath('/chat');
  // El objetivo elegido muestra el movimiento nuevo apenas se marque la
  // actividad; sin esto, la pantalla queda con el arco viejo hasta el próximo
  // refresco entero.
  if (objetivoId) revalidatePath('/objetivos');
}

/**
 * Cambia el título (y el objetivo) de una actividad.
 *
 * No se podía: lo que escribías al crearla quedaba para siempre. Matías tenía
 * una que decía "Estoy haciendo aleman de lunes s viernes", con el typo, y la
 * única salida era borrarla y perder los días pintados.
 */
export async function renombrarActividad(id: number, titulo: string, objetivo?: string | null): Promise<void> {
  const t = titulo.trim().slice(0, 90);
  if (!t) return;
  await db
    .update(lineas)
    .set({ titulo: t, objetivo: objetivo?.trim().slice(0, 200) || null })
    .where(eq(lineas.id, id));
  revalidatePath('/actividades');
  revalidatePath('/chat');
}

/** Vuelve a poner en curso algo que habías cerrado con "Listo". */
export async function reactivarActividad(id: number): Promise<void> {
  await db.update(lineas).set({ estado: 'activa' }).where(eq(lineas.id, id));
  revalidatePath('/actividades');
  revalidatePath('/chat');
}

/**
 * ⚠️ GUARDA CUÁNDO SE CERRÓ, y no es un detalle de auditoría (05/08). De esta
 * marca de tiempo sale que la tarea tildada **siga tachada en la lista todo el
 * día** en vez de desaparecer al segundo. Sin la fecha no hay forma de saber
 * cuáles se cerraron hoy, y la línea que acabás de tocar se esfuma.
 */
export async function cerrarActividad(id: number): Promise<void> {
  await db
    .update(lineas)
    .set({ estado: 'cerrada', ultimaActividad: new Date().toISOString() })
    .where(eq(lineas.id, id));
  revalidatePath('/actividades');
  revalidatePath('/chat');
}

/** Enciende o apaga el seguimiento día a día (la grilla para pintar). */
export async function marcarDiaria(id: number, diaria: boolean): Promise<void> {
  await db.update(lineas).set({ diaria }).where(eq(lineas.id, id));
  revalidatePath('/actividades');
}

/**
 * Cuántas veces por semana quiere hacerla. null saca la meta y vuelve al conteo
 * simple. Se acota a 1..7: una meta de 0 no es una meta y más de 7 no entra en
 * la semana.
 */
export async function ponerMetaSemanal(id: number, meta: number | null): Promise<void> {
  const valor = meta == null ? null : Math.max(1, Math.min(7, Math.round(meta)));
  await db.update(lineas).set({ metaSemanal: valor }).where(eq(lineas.id, id));
  revalidatePath('/actividades');
  // El Home también: desde el 31/07 el bot puede ofrecer bajarla desde ahí, y la
  // tarjeta tiene que dejar de aparecer una vez aceptada.
  revalidatePath('/chat');
}

/**
 * Pinta o despinta un día. Devuelve si quedó pintado.
 * Solo se puede tocar hoy o ayer: si la fecha no es editable, no hace nada. Se
 * valida acá y no solo en la UI, que es lo único que no se puede saltear.
 */
export async function pintarDia(lineaId: number, fecha: string): Promise<boolean> {
  if (!puedeMarcar(fecha)) return false;

  const ya = await db
    .select()
    .from(marcas)
    .where(and(eq(marcas.lineaId, lineaId), eq(marcas.fecha, fecha)));

  if (ya.length > 0) {
    await db.delete(marcas).where(eq(marcas.id, ya[0].id));
    revalidatePath('/actividades');
    return false;
  }

  await db.insert(marcas).values({ lineaId, fecha, creado: new Date().toISOString() });
  // A propósito NO se toca `ultimaActividad`: la lista ordena por eso, y si se
  // actualizara, la tarjeta saltaría al tope justo cuando acabás de tocarla.
  // Para una actividad diaria, la grilla ya cuenta cuándo la hiciste.
  revalidatePath('/actividades');
  revalidatePath('/cosas-chicas');
  // El Home también: desde el 30/07 se puede marcar desde el destacado, y la
  // tarjeta de "hoy toca X" tiene que dejar de aparecer una vez marcada.
  revalidatePath('/chat');
  return true;
}

/**
 * Guarda las marcas que salieron de la foto de la hoja del mes, una vez que
 * Matías confirmó lo que se leyó.
 *
 * Acá NO corre la regla de "solo hoy o ayer": esa regla existe para que no
 * rellenes una semana de memoria, y si lo fuiste pintando en papel día a día el
 * dato es honesto. Lo que sí se respeta es que la fecha no sea futura (lo filtra
 * `fechasDelMes`) y que no se dupliquen días que ya estaban pintados en la app.
 *
 * Devuelve cuántas marcas nuevas entraron.
 */
export async function guardarHoja(
  filas: { lineaId: number; fechas: string[] }[],
  archivo: string | null = null,
): Promise<number> {
  const creado = new Date().toISOString();
  const valores = filas.flatMap((f) =>
    f.fechas.map((fecha) => ({ lineaId: f.lineaId, fecha, foto: archivo, creado })),
  );
  if (valores.length === 0) return 0;

  // onConflictDoNothing: un día que ya estaba pintado en la app se deja como
  // está (el índice único es sobre linea+fecha).
  const insertadas = await db.insert(marcas).values(valores).onConflictDoNothing().returning({ id: marcas.id });

  revalidatePath('/actividades');
  revalidatePath('/cosas-chicas');
  return insertadas.length;
}

export type ModoGuardado = 'sumar' | 'reemplazar';

/**
 * Guarda un mes entero transcripto de la hoja de papel.
 *
 * Dos modos, porque son dos situaciones distintas:
 *  - 'sumar' (por defecto): agrega los días que faltan y NO borra nada. Es el
 *    seguro: lo peor que puede pasar es que no sume nada.
 *  - 'reemplazar': el papel es la verdad de ese mes. Borra las marcas del mes de
 *    esas actividades y deja exactamente lo transcripto. Sirve para corregir un
 *    día que se pintó por error en la app.
 *
 * En los dos casos la regla de hoy/ayer no aplica (viene del papel), pero las
 * fechas futuras sí se descartan. Devuelve cuántos días quedaron pintados.
 */
export async function guardarMes(
  mes: string,
  filas: { lineaId: number; fechas: string[] }[],
  modo: ModoGuardado = 'sumar',
): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(mes)) return 0;

  const hoy = new Date();
  const hoyYmd = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const limpias = filas.map((f) => ({
    lineaId: f.lineaId,
    fechas: f.fechas.filter((x) => x.startsWith(`${mes}-`) && x <= hoyYmd),
  }));
  const ids = limpias.map((f) => f.lineaId);
  if (ids.length === 0) return 0;

  if (modo === 'reemplazar') {
    await db
      .delete(marcas)
      .where(
        and(
          inArray(marcas.lineaId, ids),
          gte(marcas.fecha, `${mes}-01`),
          lte(marcas.fecha, `${mes}-31`),
        ),
      );
  }

  const creado = new Date().toISOString();
  const valores = limpias.flatMap((f) => f.fechas.map((fecha) => ({ lineaId: f.lineaId, fecha, creado })));
  if (valores.length > 0) {
    await db.insert(marcas).values(valores).onConflictDoNothing();
  }

  revalidatePath('/actividades');
  revalidatePath('/cosas-chicas');
  return valores.length;
}

/** Marca que hubo movimiento (al charlar sobre ella): la sube en la lista. */
export async function tocarActividad(id: number): Promise<void> {
  await db.update(lineas).set({ ultimaActividad: new Date().toISOString() }).where(eq(lineas.id, id));
  revalidatePath('/actividades');
  revalidatePath('/chat');
}

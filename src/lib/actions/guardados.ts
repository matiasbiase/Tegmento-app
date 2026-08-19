'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { guardados } from '@/lib/db/schema';

/**
 * LA ESTRELLITA (pedido 0.6, del 03/08).
 *
 * *"Recomendaciones que incluso puede ir guardando y quedan como una estrellita
 * dentro de la misma aplicación de finanzas o alimentos."*
 *
 * ⚠️ SE GUARDA EL CONTENIDO, NO SOLO EL LINK. Las noticias viven en una caché de
 * media hora y los feeds RSS rotan sus items en horas: guardar solo la URL daría
 * una lista de títulos que se evaporan. Abrís tus guardados en una semana y no
 * queda ninguno — que es exactamente lo contrario de guardar.
 */

export type NoticiaGuardable = {
  url: string;
  titulo: string;
  resumen?: string | null;
  fuente?: string | null;
  imagen?: string | null;
  area?: string | null;
};

/**
 * Guarda o desguarda, según cómo esté. Devuelve si quedó guardada.
 *
 * ⚠️ ES UN TOGGLE Y NO DOS ACCIONES porque el botón es UNO: la estrella llena y
 * la vacía son el mismo control. Con `guardar` y `borrar` separados, el cliente
 * tendría que saber el estado antes de tocar, y dos toques rápidos podrían
 * dejar dos filas iguales. Acá el `unique` de `url` lo hace imposible.
 */
export async function alternarGuardado(n: NoticiaGuardable): Promise<{ guardada: boolean }> {
  const url = n.url?.trim();
  if (!url) return { guardada: false };

  const existe = await db.select({ id: guardados.id }).from(guardados).where(eq(guardados.url, url));
  if (existe.length > 0) {
    await db.delete(guardados).where(eq(guardados.url, url));
    revalidatePath('/finanzas');
    return { guardada: false };
  }

  await db.insert(guardados).values({
    url,
    titulo: n.titulo.trim().slice(0, 300),
    resumen: n.resumen?.trim().slice(0, 1000) || null,
    fuente: n.fuente?.trim().slice(0, 80) || null,
    imagen: n.imagen?.trim() || null,
    area: n.area?.trim() || null,
    creado: new Date().toISOString(),
  });
  revalidatePath('/finanzas');
  return { guardada: true };
}

/** Lo guardado de un área ('Finanzas'), de lo más nuevo a lo más viejo. */
export async function leerGuardados(area?: string) {
  const q = db.select().from(guardados).orderBy(desc(guardados.creado));
  const filas = await q;
  return area ? filas.filter((g) => g.area === area) : filas;
}

/** Las URLs guardadas, para que la lista sepa qué estrella dibujar llena. */
export async function urlsGuardadas(): Promise<string[]> {
  const filas = await db.select({ url: guardados.url }).from(guardados);
  return filas.map((f) => f.url);
}

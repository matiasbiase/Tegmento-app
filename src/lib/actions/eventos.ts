'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { eventos } from '@/lib/db/schema';
import { inicioDe } from '@/lib/agenda';

function rutas() {
  revalidatePath('/calendario');
  revalidatePath('/chat');
}

/** Crea un evento del calendario interno (gcalId null). Hora null = todo el día. */
export async function crearEvento(
  titulo: string,
  fecha: string,
  hora: string | null,
  areaId?: number | null,
  nota?: string | null,
): Promise<void> {
  const limpio = titulo.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!limpio || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  const inicio = inicioDe(fecha, hora);
  await db.insert(eventos).values({
    titulo: limpio,
    inicio,
    fin: inicio,
    areaId: areaId ?? null,
    nota: nota?.trim() || null,
  });
  rutas();
}

/** Edita un evento del calendario interno (los de Google no se tocan). */
export async function editarEvento(
  id: number,
  titulo: string,
  fecha: string,
  hora: string | null,
  areaId?: number | null,
  nota?: string | null,
): Promise<void> {
  const limpio = titulo.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!limpio || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  const inicio = inicioDe(fecha, hora);
  await db
    .update(eventos)
    .set({ titulo: limpio, inicio, fin: inicio, areaId: areaId ?? null, nota: nota?.trim() || null })
    .where(and(eq(eventos.id, id), isNull(eventos.gcalId)));
  rutas();
}

/** Borra un evento del calendario interno. */
export async function borrarEvento(id: number): Promise<void> {
  await db.delete(eventos).where(and(eq(eventos.id, id), isNull(eventos.gcalId)));
  rutas();
}

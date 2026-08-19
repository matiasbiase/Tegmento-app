'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { bitacora } from '@/lib/db/schema';

export async function crearEntrada(formData: FormData) {
  const contenido = String(formData.get('contenido') ?? '').trim();
  if (!contenido) throw new Error('La entrada no puede estar vacía');
  const areaId = formData.get('areaId') ? Number(formData.get('areaId')) : null;
  const lineaId = formData.get('lineaId') ? Number(formData.get('lineaId')) : null;

  await db.insert(bitacora).values({
    tipo: 'manual',
    contenido,
    fecha: new Date().toISOString(),
    areaId,
    lineaId,
  });
  revalidatePath('/bitacora');
  redirect('/bitacora');
}

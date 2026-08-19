'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { animoCheckins, bitacora, cuerpo } from '@/lib/db/schema';

export type OrigenRegistro = 'bitacora' | 'cuerpo' | 'animo';

/** Borra un registro del Historial, venga de donde venga (bitácora, cuerpo o ánimo). */
export async function borrarRegistro(origen: OrigenRegistro, id: number): Promise<void> {
  if (origen === 'bitacora') await db.delete(bitacora).where(eq(bitacora.id, id));
  else if (origen === 'cuerpo') await db.delete(cuerpo).where(eq(cuerpo.id, id));
  else await db.delete(animoCheckins).where(eq(animoCheckins.id, id));

  revalidatePath('/historial');
  revalidatePath('/cuerpo');
  revalidatePath('/cuerpo');
  revalidatePath('/chat');
}

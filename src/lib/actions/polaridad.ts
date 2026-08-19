'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { lupa } from '@/lib/db/schema';

// Borrar un análisis de Polaridad (27/07, pedido de Matías: "que te deje
// borrarlo"). Lo que mirás una vez y no te sirvió no tiene por qué quedarse
// para siempre en la lista.
//
// La tabla se llama `lupa` por razones históricas: ver la nota del schema.
export async function borrarAnalisisPolaridad(id: number): Promise<void> {
  await db.delete(lupa).where(eq(lupa.id, id));
  revalidatePath('/polaridad');
}

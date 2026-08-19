'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { sugerencias } from '@/lib/db/schema';

/**
 * Resolver una sugerencia/conexión del analista:
 *  - 'anotar'    → 'anotada'    (pasa a "confirmada por vos" en Relaciones)
 *  - 'descartar' → 'descartada' (desaparece de Hoy y de Relaciones)
 */
export async function resolverSugerencia(id: number, accion: 'anotar' | 'descartar') {
  const estado = accion === 'anotar' ? 'anotada' : 'descartada';
  await db.update(sugerencias).set({ estado }).where(eq(sugerencias.id, id));
  revalidatePath('/chat');
  revalidatePath('/cosas-chicas');
}

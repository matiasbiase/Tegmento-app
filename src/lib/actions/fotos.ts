'use server';

import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { chatMensajes } from '@/lib/db/schema';
import { ADJUNTOS_DIR } from '@/lib/adjuntos';

/** Borra una foto subida al chat: saca el archivo del disco y le quita el
 *  adjunto al mensaje (el texto de la charla queda). Sirve para limpiar fotos
 *  repetidas desde el calendario. El nombre se valida contra path traversal. */
export async function borrarFoto(nombre: string): Promise<void> {
  const base = path.basename(nombre);
  if (!/^[\w.-]+$/.test(base) || base.includes('..')) return;

  const ruta = path.join(ADJUNTOS_DIR, base);
  try {
    if (fs.existsSync(ruta)) fs.rmSync(ruta, { force: true });
  } catch {
    // si el archivo no se puede borrar igual limpiamos la referencia
  }

  await db
    .update(chatMensajes)
    .set({ adjuntoTipo: null, adjuntoPath: null })
    .where(eq(chatMensajes.adjuntoPath, base));

  revalidatePath('/calendario');
}

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { chats } from '@/lib/db/schema';
import { archivarChatPorId } from '@/lib/archivado';

export async function archivarChat(formData: FormData) {
  const chatId = Number(formData.get('chatId'));
  await archivarChatPorId(chatId);
  revalidatePath('/rueda');
  redirect('/rueda');
}

/**
 * Cambiarle el nombre a una charla.
 *
 * ⚠️ LOS TÍTULOS DE LAS CHARLAS LOS ESCRIBE EL MODELO, y hasta hoy no se podían
 * tocar: en el Historial quedaban veinte renglones nombrados por una IA que
 * resumió la primera frase, y encontrar una charla era leerlas todas. **Un
 * nombre puesto por otro y que no podés corregir deja de ser un nombre.**
 */
export async function renombrarChat(chatId: number, titulo: string): Promise<void> {
  const t = titulo.trim().slice(0, 90);
  if (!t || !Number.isInteger(chatId)) return;
  await db.update(chats).set({ titulo: t }).where(eq(chats.id, chatId));
  revalidatePath('/historial');
  revalidatePath(`/chat/${chatId}`);
}

/**
 * Archivar desde el menú de la charla, sin FormData y sin redirigir.
 *
 * `archivarChat` (arriba) nació para un `<form action>` y termina en
 * `redirect('/rueda')`. Desde los tres puntitos eso sería raro: archivás una
 * charla y la app te deposita en otra pantalla que no pediste. Acá se archiva y
 * te quedás donde estabas, viendo el cartel de "Archivado".
 */
export async function archivarChatId(chatId: number): Promise<void> {
  await archivarChatPorId(chatId);
  revalidatePath(`/chat/${chatId}`);
  revalidatePath('/historial');
}

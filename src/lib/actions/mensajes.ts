'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { chatMensajes, temas } from '@/lib/db/schema';
import { claveTema } from '@/lib/tema-clave';
import { llamarRol } from '@/lib/llm/roles';
import { ESQUEMA_AGRUPADOR, parsearPropuestaAgrupacion, type PropuestaGrupo } from '@/lib/agrupador';

/**
 * Lo que se puede hacer con UN mensaje: destacarlo o borrarlo.
 *
 * Pedido de Matías (29/07): *"los tres puntitos abren las opciones, podés poner
 * una estrellita al mensaje y después ir a buscar dentro del mismo chat"*.
 */

/** Prende o apaga la estrella. Devuelve cómo quedó. */
export async function alternarDestacado(mensajeId: number): Promise<boolean> {
  const [m] = await db.select().from(chatMensajes).where(eq(chatMensajes.id, mensajeId));
  if (!m) return false;
  const nuevo = !m.destacado;
  await db.update(chatMensajes).set({ destacado: nuevo }).where(eq(chatMensajes.id, mensajeId));
  revalidatePath(`/chat/${m.chatId}`);
  return nuevo;
}

/**
 * Borra un mensaje.
 *
 * ⚠️ BORRA DE VERDAD, y por eso la pantalla pide confirmación antes de llamar
 * acá. No hay papelera: en un diario personal, un mensaje que "se borró pero
 * sigue estando" es peor que no poder borrarlo, porque lo que uno quiere sacar
 * suele ser justo lo que no quiere que quede en ningún lado.
 */
export async function borrarMensaje(mensajeId: number): Promise<void> {
  const [m] = await db.select().from(chatMensajes).where(eq(chatMensajes.id, mensajeId));
  if (!m) return;
  await db.delete(chatMensajes).where(eq(chatMensajes.id, mensajeId));
  revalidatePath(`/chat/${m.chatId}`);
}

/**
 * Agrupar mensajes por tema ("cristalizar", 29/07): seleccionás varios
 * mensajes de la misma charla y quedan juntos bajo un tema, dibujados como un
 * rectángulo aparte en vez de burbujas sueltas (ver `lib/cristales.ts` para
 * cómo se arma el dibujo y `components/chat/Cristal.tsx` para el render).
 */

async function chatIdDe(mensajeId: number): Promise<number | null> {
  const [m] = await db.select({ chatId: chatMensajes.chatId }).from(chatMensajes).where(eq(chatMensajes.id, mensajeId));
  return m?.chatId ?? null;
}

/** Asigna un tema YA EXISTENTE a estos mensajes. */
export async function agruparMensajes(mensajeIds: number[], temaId: number): Promise<void> {
  if (!mensajeIds.length) return;
  await db.update(chatMensajes).set({ temaId }).where(inArray(chatMensajes.id, mensajeIds));
  const chatId = await chatIdDe(mensajeIds[0]);
  if (chatId) revalidatePath(`/chat/${chatId}`);
}

/**
 * Crea el tema (o reusa uno con el mismo nombre, para no terminar con
 * "Mudanza" y "mudanza" como dos temas distintos) y agrupa los mensajes bajo
 * él, en una sola pasada.
 */
export async function crearTemaYAgrupar(nombre: string, mensajeIds: number[]): Promise<{ id: number; nombre: string } | null> {
  const t = nombre.trim().slice(0, 30);
  if (!t || !mensajeIds.length) return null;

  const existentes = await db.select().from(temas);
  const existente = existentes.find((x) => claveTema(x.nombre) === claveTema(t));
  const tema = existente ?? (await db.insert(temas).values({ nombre: t }).returning())[0];

  await agruparMensajes(mensajeIds, tema.id);
  return { id: tema.id, nombre: tema.nombre };
}

/** Deshace la agrupación: los mensajes vuelven a mostrarse como burbujas sueltas. */
export async function desagruparMensajes(mensajeIds: number[]): Promise<void> {
  if (!mensajeIds.length) return;
  await db.update(chatMensajes).set({ temaId: null }).where(inArray(chatMensajes.id, mensajeIds));
  const chatId = await chatIdDe(mensajeIds[0]);
  if (chatId) revalidatePath(`/chat/${chatId}`);
}

/**
 * La IA mira los mensajes SUELTOS (sin tema) de esta charla y propone
 * juntarlos. Nunca agrupa sola: devuelve la propuesta para que la pantalla la
 * muestre punteada, y solo se aplica si tocás "Juntalos".
 */
export async function proponerAgrupacion(chatId: number): Promise<PropuestaGrupo[]> {
  const sueltos = await db
    .select({ id: chatMensajes.id, rol: chatMensajes.rol, contenido: chatMensajes.contenido })
    .from(chatMensajes)
    .where(and(eq(chatMensajes.chatId, chatId), isNull(chatMensajes.temaId)))
    .orderBy(chatMensajes.creado)
    .limit(60);

  if (sueltos.length < 2) return [];

  const listado = sueltos
    .map((m) => `[${m.id}] ${m.rol === 'user' ? 'Matías' : 'Asistente'}: ${m.contenido}`)
    .join('\n');
  const crudo = await llamarRol('agrupador', [{ rol: 'user', contenido: listado }], {
    json: true,
    esquema: ESQUEMA_AGRUPADOR,
  });
  return parsearPropuestaAgrupacion(crudo, sueltos.map((m) => m.id));
}

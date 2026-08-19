'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import {
  CLAVE_CARPETAS,
  asignarChat,
  borrarCarpeta,
  crearCarpeta,
  leerCarpetas,
  renombrarCarpeta,
  serializarCarpetas,
  type EstadoCarpetas,
} from '@/lib/carpetas';

// ⚠️ NO agregar `crearCarpetaAction` (crear una carpeta vacía, sin chat adentro):
// existió y se borró (30/07) porque no había ninguna pantalla que la llamara.
// Crear una carpeta SIEMPRE pasa por `crearYMover`, que la crea con el primer
// chat ya adentro — no hay UI para carpetas vacías, y agregar la acción sin la
// UI es el mismo bug que ya pasó con `renombrarCarpetaAction`.

// Las carpetas del historial, guardadas como JSON en `config`. Toda la lógica
// vive en `lib/carpetas.ts` (pura y con tests); acá solo se lee, se aplica y se
// escribe. Sin migración: ver la nota de ese archivo.

async function estado(): Promise<EstadoCarpetas> {
  const fila = await db.select().from(config).where(eq(config.clave, CLAVE_CARPETAS)).limit(1);
  return leerCarpetas(fila[0]?.valor ?? null);
}

async function guardar(e: EstadoCarpetas): Promise<void> {
  const valor = serializarCarpetas(e);
  const fila = await db.select().from(config).where(eq(config.clave, CLAVE_CARPETAS)).limit(1);
  if (fila.length) await db.update(config).set({ valor }).where(eq(config.clave, CLAVE_CARPETAS));
  else await db.insert(config).values({ clave: CLAVE_CARPETAS, valor });
  revalidatePath('/historial');
}

export async function moverChatACarpeta(chatId: number, carpetaId: string | null): Promise<void> {
  await guardar(asignarChat(await estado(), chatId, carpetaId));
}

export async function borrarCarpetaAction(carpetaId: string): Promise<void> {
  await guardar(borrarCarpeta(await estado(), carpetaId));
}

export async function renombrarCarpetaAction(carpetaId: string, nombre: string): Promise<void> {
  await guardar(renombrarCarpeta(await estado(), carpetaId, nombre));
}

/**
 * Crea la carpeta y mete el chat adentro, en una sola pasada. Es lo que hace el
 * botón "Nueva carpeta" desde un chat: si fueran dos acciones seguidas, la
 * segunda leería el estado antes de que la primera terminara de escribirlo.
 */
export async function crearYMover(nombre: string, chatId: number): Promise<void> {
  const antes = await estado();
  const conCarpeta = crearCarpeta(antes, nombre);
  const nueva = conCarpeta.carpetas.find((c) => !antes.carpetas.some((v) => v.id === c.id));
  await guardar(nueva ? asignarChat(conCarpeta, chatId, nueva.id) : conCarpeta);
}

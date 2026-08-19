'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { conocimiento, skills } from '@/lib/db/schema';

const RUTA = '/perfil/cerebro';

export async function crearSkill(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim().slice(0, 60);
  const instrucciones = String(formData.get('instrucciones') ?? '').trim().slice(0, 2000);
  if (!nombre || !instrucciones) throw new Error('Nombre e instrucciones son obligatorios');
  await db.insert(skills).values({ nombre, instrucciones, creado: new Date().toISOString() });
  revalidatePath(RUTA);
}

export async function alternarSkill(formData: FormData) {
  const id = Number(formData.get('id'));
  const [fila] = await db.select().from(skills).where(eq(skills.id, id));
  if (!fila) return;
  await db.update(skills).set({ activa: !fila.activa }).where(eq(skills.id, id));
  revalidatePath(RUTA);
}

export async function borrarSkill(formData: FormData) {
  await db.delete(skills).where(eq(skills.id, Number(formData.get('id'))));
  revalidatePath(RUTA);
}

export async function crearConocimiento(formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim().slice(0, 80);
  const contenido = String(formData.get('contenido') ?? '').trim().slice(0, 2000);
  if (!titulo || !contenido) throw new Error('Título y contenido son obligatorios');
  await db.insert(conocimiento).values({ titulo, contenido, creado: new Date().toISOString() });
  revalidatePath(RUTA);
}

export async function alternarConocimiento(formData: FormData) {
  const id = Number(formData.get('id'));
  const [fila] = await db.select().from(conocimiento).where(eq(conocimiento.id, id));
  if (!fila) return;
  await db.update(conocimiento).set({ activa: !fila.activa }).where(eq(conocimiento.id, id));
  revalidatePath(RUTA);
}

export async function borrarConocimiento(formData: FormData) {
  await db.delete(conocimiento).where(eq(conocimiento.id, Number(formData.get('id'))));
  revalidatePath(RUTA);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { componerPersonalidad, type Niveles, type RasgoId } from '@/lib/personalidad';

async function setConfig(clave: string, valor: string) {
  await db
    .insert(config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

/** Guarda solo los niveles (preserva el "extra") sin redirigir — para el perfil inline. */
export async function guardarPersonalidadNiveles(niveles: Niveles) {
  const fila = await db.select().from(config).where(eq(config.clave, 'personalidad_extra'));
  const extra = (fila[0]?.valor ?? '').trim();
  const base = componerPersonalidad(niveles);
  await setConfig('personalidad', extra ? `${base}\n\nAdemás: ${extra}` : base);
  await setConfig('personalidad_niveles', JSON.stringify(niveles));
  for (const id of Object.keys(niveles) as RasgoId[]) {
    await setConfig(`rasgo_${id}`, String(niveles[id]));
  }
  revalidatePath('/perfil');
}

export async function guardarPersonalidad(niveles: Niveles, extra: string) {
  const base = componerPersonalidad(niveles);
  const texto = extra.trim() ? `${base}\n\nAdemás: ${extra.trim().slice(0, 600)}` : base;
  await setConfig('personalidad', texto);
  await setConfig('personalidad_niveles', JSON.stringify(niveles));
  await setConfig('personalidad_extra', extra.trim().slice(0, 600));
  for (const id of Object.keys(niveles) as RasgoId[]) {
    await setConfig(`rasgo_${id}`, String(niveles[id]));
  }
  revalidatePath('/perfil/personalidad');
  redirect('/perfil');
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, areaCheckins, bitacora } from '@/lib/db/schema';
import { validarScores } from '@/lib/validacion';

export async function guardarCheckin(formData: FormData) {
  const filas = (await db.select().from(areas)).filter((a) => a.activa);
  const scores = filas.map((a) => ({ areaId: a.id, score: Number(formData.get(`score_${a.id}`)) }));
  const error = validarScores(scores);
  if (error) throw new Error(error);

  const ahora = new Date().toISOString();
  const resumen: string[] = [];
  for (const a of filas) {
    const score = Number(formData.get(`score_${a.id}`));
    const deseado = Number(formData.get(`deseado_${a.id}`)) || a.scoreDeseado || score;
    await db.update(areas).set({ scoreActual: score, scoreDeseado: deseado }).where(eq(areas.id, a.id));
    await db.insert(areaCheckins).values({ areaId: a.id, score, fecha: ahora });
    resumen.push(`${a.nombre} ${score}/5`);
  }
  await db.insert(bitacora).values({
    tipo: 'sistema',
    contenido: `Check-in de rueda: ${resumen.join(' · ')}.`,
    fecha: ahora,
  });
  revalidatePath('/rueda');
  redirect('/rueda');
}

export async function crearArea(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) throw new Error('El nombre es obligatorio');
  const existentes = await db.select().from(areas);
  await db.insert(areas).values({ nombre, orden: existentes.length, scoreDeseado: 3 });
  revalidatePath('/rueda');
  redirect('/rueda/checkin');
}

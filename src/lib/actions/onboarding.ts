'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';

export type OnboardingPayload = {
  nombre: string;
  notas?: string;
  areas: { nombre: string; color: string; actual: number; deseado: number }[];
  focos: { nombre: string; porque: string }[];
};

async function setConfig(clave: string, valor: string) {
  await db
    .insert(s.config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: s.config.clave, set: { valor } });
}

export async function completarOnboarding(payload: OnboardingPayload) {
  const ahora = new Date().toISOString();

  // Arrancar de cero: borrar el contenido de ejemplo (no la config base)
  for (const tabla of [
    s.sugerencias, s.analisis, s.bitacora, s.chatMensajes, s.chats, s.temas,
    s.eventos, s.mails, s.lineaAreas, s.lineas, s.areaCheckins, s.areas, s.conocimiento,
  ]) {
    await db.delete(tabla);
  }

  const nombresFoco = new Set(payload.focos.map((f) => f.nombre.trim().toUpperCase()));
  for (let i = 0; i < payload.areas.length; i++) {
    const a = payload.areas[i];
    const [area] = await db
      .insert(s.areas)
      .values({
        nombre: a.nombre.trim(),
        color: a.color,
        scoreActual: a.actual,
        scoreDeseado: a.deseado,
        orden: i,
        foco: nombresFoco.has(a.nombre.trim().toUpperCase()),
      })
      .returning();
    await db.insert(s.areaCheckins).values({ areaId: area.id, score: a.actual, fecha: ahora });
  }

  // Los "por qué" de las áreas de foco viajan como conocimiento del asistente
  for (const f of payload.focos) {
    const porque = f.porque.trim();
    if (porque) {
      await db.insert(s.conocimiento).values({
        titulo: `Por qué me importa ${f.nombre}`,
        contenido: porque.slice(0, 1000),
        activa: true,
        creado: ahora,
      });
    }
  }
  if (payload.notas?.trim()) {
    await db.insert(s.conocimiento).values({
      titulo: 'Notas de mi rueda',
      contenido: payload.notas.trim().slice(0, 1000),
      activa: true,
      creado: ahora,
    });
  }

  const foco = payload.focos.map((f) => f.nombre).join(', ') || 'sin foco definido';
  await db.insert(s.bitacora).values({
    tipo: 'sistema',
    contenido: `Abrí mi bitácora. Completé la rueda (${payload.areas.length} áreas) y elegí enfocarme en: ${foco}.`,
    fecha: ahora,
  });

  await setConfig('nombre', payload.nombre.trim() || 'Matías');
  await setConfig('onboarding', 'completado');

  revalidatePath('/');
  redirect('/chat');
}

/**
 * Rehacer SOLO la rueda: upsertea áreas, scores y focos sin tocar chats,
 * bitácora ni líneas (a diferencia de completarOnboarding, que arranca de cero).
 */
export async function guardarRueda(payload: OnboardingPayload) {
  const ahora = new Date().toISOString();
  const existentes = await db.select().from(s.areas);
  const porNombre = new Map(existentes.map((a) => [a.nombre.trim().toUpperCase(), a]));
  const nombresFoco = new Set(payload.focos.map((f) => f.nombre.trim().toUpperCase()));

  for (let i = 0; i < payload.areas.length; i++) {
    const a = payload.areas[i];
    const clave = a.nombre.trim().toUpperCase();
    const previa = porNombre.get(clave);
    const valores = {
      nombre: a.nombre.trim(),
      color: a.color,
      scoreActual: a.actual,
      scoreDeseado: a.deseado,
      orden: i,
      foco: nombresFoco.has(clave),
    };
    let areaId: number;
    if (previa) {
      await db.update(s.areas).set(valores).where(eq(s.areas.id, previa.id));
      areaId = previa.id;
    } else {
      const [nueva] = await db.insert(s.areas).values(valores).returning();
      areaId = nueva.id;
    }
    await db.insert(s.areaCheckins).values({ areaId, score: a.actual, fecha: ahora });
  }

  for (const f of payload.focos) {
    const porque = f.porque.trim();
    if (porque) {
      await db.insert(s.conocimiento).values({
        titulo: `Por qué me importa ${f.nombre}`,
        contenido: porque.slice(0, 1000),
        activa: true,
        creado: ahora,
      });
    }
  }

  const foco = payload.focos.map((f) => f.nombre).join(', ') || 'sin foco definido';
  await db.insert(s.bitacora).values({
    tipo: 'sistema',
    contenido: `Rehice mi rueda de la vida y elegí enfocarme en: ${foco}.`,
    fecha: ahora,
  });
  if (payload.nombre.trim()) await setConfig('nombre', payload.nombre.trim());

  revalidatePath('/');
  redirect('/rueda');
}

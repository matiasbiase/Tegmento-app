'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';

// Título estable del perfil vivo en `conocimiento`: así se reemplaza en vez de
// duplicarse. (No exportar: en un archivo 'use server' solo van funciones async.)
const PERFIL_TITULO = 'Perfil de la persona';

export type OnboardingCardsPayload = {
  nombre: string;
  actividades: string[];
  intenciones: string[];
  genero?: 'mujer' | 'hombre' | 'reservado';
  sigueCiclo?: boolean;
  neuro?: string[];
  lugar?: string;
};

async function setConfig(clave: string, valor: string) {
  await db
    .insert(s.config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: s.config.clave, set: { valor } });
}

/**
 * Onboarding nuevo (estilo cards): actividades + qué querés entender de vos.
 * Es ADITIVO: se puede rehacer sin perder chats, bitácora ni líneas viejas.
 * La rueda ya no vive acá: se arma después desde /rueda/editar.
 */
export async function completarOnboardingCards(payload: OnboardingCardsPayload) {
  const ahora = new Date().toISOString();

  // Cada actividad se vuelve una línea activa (si no existe ya una con ese nombre).
  const existentes = await db.select().from(s.lineas);
  const titulos = new Set(existentes.map((l) => l.titulo.trim().toUpperCase()));
  for (const cruda of payload.actividades) {
    const titulo = cruda.trim();
    if (!titulo || titulos.has(titulo.toUpperCase())) continue;
    titulos.add(titulo.toUpperCase());
    await db.insert(s.lineas).values({
      titulo,
      tipo: 'habito',
      estado: 'activa',
      objetivo: null,
      ultimaActividad: ahora,
    });
  }

  // Lo que quiere entender de sí mismo: brújula del analista y del asistente.
  const intenciones = payload.intenciones.map((i) => i.trim()).filter(Boolean);
  if (intenciones.length) await setConfig('intenciones', JSON.stringify(intenciones));

  // PERFIL VIVO: descripción de la persona que el asistente lee en cada charla
  // (via `conocimiento`). Arranca con el onboarding y el analista la enriquece.
  const nombrePerfil = payload.nombre.trim() || 'Matías';
  const acts = payload.actividades.map((a) => a.trim()).filter(Boolean);
  const perfil = [
    `${nombrePerfil} está usando Tegmento para entenderse mejor y vivir su vida más a pleno.`,
    acts.length ? `Actividades que hay en su vida: ${acts.join(', ')}.` : '',
    intenciones.length ? `Lo que quiere entender de sí: ${intenciones.join('; ')}.` : '',
    'Este perfil se va completando a medida que Tegmento conoce sus patrones (sueño, ánimo, temas que se repiten). Usalo para dar consejos personales y organizados, nunca genéricos.',
  ]
    .filter(Boolean)
    .join(' ');
  await db.delete(s.conocimiento).where(eq(s.conocimiento.titulo, PERFIL_TITULO));
  await db.insert(s.conocimiento).values({ titulo: PERFIL_TITULO, contenido: perfil.slice(0, 1500), activa: true, creado: ahora });

  await db.insert(s.bitacora).values({
    tipo: 'sistema',
    contenido: `Arranqué mi bitácora con ${payload.actividades.length} actividades para seguir.`,
    fecha: ahora,
  });

  // Sobre vos: identidad, ciclo y neurodivergencia (todo opcional).
  if (payload.genero) await setConfig('genero', payload.genero);
  await setConfig('sigue_ciclo', payload.genero !== 'hombre' && payload.sigueCiclo ? '1' : '0');
  const neuro = (payload.neuro ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 12);
  await setConfig('neurodivergencia', JSON.stringify(neuro));
  // Dónde vivís: enciende el contexto real de Descubrir. Solo si lo cargó.
  if (payload.lugar?.trim()) await setConfig('lugar', payload.lugar.trim().slice(0, 80));

  await setConfig('nombre', payload.nombre.trim() || 'Matías');
  await setConfig('onboarding', 'completado');

  revalidatePath('/');
  redirect('/chat');
}

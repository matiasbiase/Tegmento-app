'use server';

import { and, asc, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { planComidas, planMarcas, planes } from '@/lib/db/schema';
import { normalizarHora, ordenarPorHora, type ComidaDelPlan } from '@/lib/plan-alimentacion';

/**
 * GUARDAR, TILDAR Y CAMBIAR EL PLAN.
 *
 * ⚠️ TODO LO QUE ESCRIBE PASA POR ACÁ Y NUNCA POR LA RUTA DE LA FOTO. La ruta
 * lee y propone; esto guarda, y solo cuando él lo toca. Ver el docstring de
 * `api/plan-foto/route.ts`.
 */

function hoyYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Guardar el plan revisado.
 *
 * ⚠️ EL ANTERIOR SE DESACTIVA, NO SE BORRA. Cambiar de plan cada varios meses es
 * lo normal, y el plan viejo es lo que le da sentido al cruce con el sueño de
 * los meses anteriores. Borrarlo dejaría marcas apuntando a comidas que ya no
 * existen, que es cómo se rompe un historial.
 */
export async function guardarPlan(datos: {
  comidas: ComidaDelPlan[];
  foto?: string | null;
  dequien?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const limpias = ordenarPorHora(
    datos.comidas
      .map((c) => ({
        hora: normalizarHora(c.hora) ?? '',
        que: c.que.trim().slice(0, 120),
        detalle: c.detalle?.trim().slice(0, 160) || null,
      }))
      .filter((c) => c.hora && c.que),
  );
  if (limpias.length === 0) return { ok: false, error: 'El plan quedó vacío. Agregá al menos una comida.' };

  await db.update(planes).set({ activo: false }).where(eq(planes.activo, true));

  const [plan] = await db
    .insert(planes)
    .values({
      fuente: datos.foto ? 'foto' : 'escrito',
      foto: datos.foto ?? null,
      dequien: datos.dequien?.trim().slice(0, 60) || null,
      desde: hoyYmd(),
      activo: true,
      creado: new Date().toISOString(),
    })
    .returning({ id: planes.id });
  if (!plan) return { ok: false, error: 'No se pudo guardar.' };

  await db.insert(planComidas).values(limpias.map((c) => ({ planId: plan.id, ...c })));

  revalidatePath('/alimentacion');
  return { ok: true };
}

/**
 * Tildar o destildar una comida del día.
 *
 * ⚠️ ES UN INTERRUPTOR, NO UN "SUMAR". Si tocás dos veces, se destilda: marcar
 * por error es lo más fácil que hay en una lista de tildes, y sin la vuelta
 * atrás el "2 de 5" del día quedaría mal para siempre.
 */
export async function tildarComida(comidaId: number, fecha?: string): Promise<void> {
  const f = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyYmd();
  const [ya] = await db
    .select()
    .from(planMarcas)
    .where(and(eq(planMarcas.comidaId, comidaId), eq(planMarcas.fecha, f)));

  if (ya) {
    await db.delete(planMarcas).where(eq(planMarcas.id, ya.id));
  } else {
    await db.insert(planMarcas).values({ comidaId, fecha: f, creado: new Date().toISOString() });
  }
  revalidatePath('/alimentacion');
}

/** Dejar de seguir el plan. Queda guardado, apagado: se puede cargar otro. */
export async function archivarPlan(): Promise<void> {
  await db.update(planes).set({ activo: false }).where(eq(planes.activo, true));
  revalidatePath('/alimentacion');
}

export type PlanVista = {
  id: number;
  fuente: string;
  foto: string | null;
  dequien: string | null;
  desde: string;
  comidas: { id: number; hora: string; que: string; detalle: string | null }[];
};

/** El plan activo, o `null`. Que no haya ninguno es el estado normal. */
export async function leerPlanActivo(): Promise<PlanVista | null> {
  const [plan] = await db
    .select()
    .from(planes)
    .where(eq(planes.activo, true))
    .orderBy(desc(planes.creado))
    .limit(1);
  if (!plan) return null;

  const comidas = await db
    .select()
    .from(planComidas)
    .where(eq(planComidas.planId, plan.id))
    .orderBy(asc(planComidas.hora));

  return {
    id: plan.id,
    fuente: plan.fuente,
    foto: plan.foto,
    dequien: plan.dequien,
    desde: plan.desde,
    comidas: comidas.map((c) => ({ id: c.id, hora: c.hora, que: c.que, detalle: c.detalle })),
  };
}

/** Las marcas de los últimos `dias` días, para la semana y el cruce. */
export async function leerMarcas(dias = 60): Promise<{ comidaId: number; fecha: string }[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const filas = await db.select().from(planMarcas);
  return filas
    .filter((m) => m.fecha >= desde)
    .map((m) => ({ comidaId: m.comidaId, fecha: m.fecha }));
}

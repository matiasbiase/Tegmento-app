'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { gastos } from '@/lib/db/schema';

/**
 * Guarda un gasto. Dos entradas: el botón de Finanzas y la marca `[+gasto:]`
 * del chat ("gasté 40 en el súper").
 *
 * ⚠️ ERAN TRES HASTA EL 03/08. La tercera era `guardarTicketChat`, que mandaba
 * la foto de un ticket al modelo para que sacara comercio, total e ítems.
 * Se fue con el ticket entero, a pedido de Matías. Desde entonces esta es la
 * ÚNICA puerta por la que entra un gasto.
 *
 * ⚠️ Y por eso ahora `categoria` importa acá: hasta ese día la escribía el
 * parseo del ticket, así que los gastos contados hablando entraban siempre sin
 * clasificar. Ahora la trae la marca (ver `gastos-marca.ts`).
 */
export async function guardarGastoManual(datos: {
  total: number;
  comercio?: string | null;
  categoria?: string | null;
  moneda?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const total = Number(datos.total);
  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: 'Poné un monto válido.' };
  const ahora = new Date().toISOString();
  await db.insert(gastos).values({
    comercio: datos.comercio?.trim().slice(0, 120) || null,
    total,
    moneda: datos.moneda?.trim().slice(0, 8) || null,
    fecha: ahora,
    categoria: datos.categoria?.trim().slice(0, 40) || null,
    items: null,
    nota: 'Cargado a mano',
    creado: ahora,
  });
  revalidatePath('/finanzas');
  return { ok: true };
}

/** Edita comercio/total/categoría de un gasto (la IA no siempre lee perfecto). */
export async function editarGasto(
  id: number,
  campos: { comercio?: string; total?: number; categoria?: string },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (campos.comercio !== undefined) set.comercio = campos.comercio.trim().slice(0, 120) || null;
  if (campos.total !== undefined) set.total = Number.isFinite(campos.total) ? campos.total : null;
  if (campos.categoria !== undefined) set.categoria = campos.categoria.trim().slice(0, 40) || null;
  if (Object.keys(set).length === 0) return;
  await db.update(gastos).set(set).where(eq(gastos.id, id));
  revalidatePath('/finanzas');
}

/** Borra un gasto (ticket mal leído o repetido). */
export async function borrarGasto(id: number): Promise<void> {
  await db.delete(gastos).where(eq(gastos.id, id));
  revalidatePath('/finanzas');
}

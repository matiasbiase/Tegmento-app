'use server';

import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { periodos } from '@/lib/db/schema';

function hoyYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rutas() {
  revalidatePath('/cuerpo');
  revalidatePath('/calendario');
}

/** Marca el inicio de un período (hoy por defecto). Si ya hay uno abierto sin fin,
 *  no crea otro: evita duplicados por doble toque. */
export async function registrarInicioPeriodo(fecha?: string): Promise<void> {
  const inicio = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyYmd();
  const [abierto] = await db.select().from(periodos).orderBy(desc(periodos.inicio)).limit(1);
  if (abierto && abierto.fin == null && abierto.inicio === inicio) return;
  await db.insert(periodos).values({ inicio, fin: null, creado: new Date().toISOString() });
  rutas();
}

/** Marca el fin del último período (hoy por defecto). */
export async function registrarFinPeriodo(fecha?: string): Promise<void> {
  const fin = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyYmd();
  const [ultimo] = await db.select().from(periodos).orderBy(desc(periodos.inicio)).limit(1);
  if (!ultimo) return;
  if (fin < ultimo.inicio) return; // el fin no puede ser antes del inicio
  await db.update(periodos).set({ fin }).where(eq(periodos.id, ultimo.id));
  rutas();
}

/** Edita las fechas de un período registrado. */
export async function editarPeriodo(id: number, inicio: string, fin: string | null): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return;
  const finLimpio = fin && /^\d{4}-\d{2}-\d{2}$/.test(fin) && fin >= inicio ? fin : null;
  await db.update(periodos).set({ inicio, fin: finLimpio }).where(eq(periodos.id, id));
  rutas();
}

/** Borra un período (registro equivocado). */
export async function borrarPeriodo(id: number): Promise<void> {
  await db.delete(periodos).where(eq(periodos.id, id));
  rutas();
}

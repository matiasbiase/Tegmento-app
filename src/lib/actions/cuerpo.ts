'use server';

import { and, desc, eq, gte, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { cuerpo, bitacora } from '@/lib/db/schema';

export type CalidadSueno = 'bien' | 'regular' | 'mal';

const ETIQUETA_CALIDAD: Record<CalidadSueno, string> = {
  bien: 'descansé bien',
  regular: 'dormí regular',
  mal: 'dormí mal',
};

/** Registra el sueño: horas (se guardan en minutos) + calidad subjetiva.
 *  El sueño es UNO por día: si ya hay uno de hoy, se actualiza (editar no duplica). */
export async function registrarSueno(horas: number, calidad: CalidadSueno, nota?: string): Promise<void> {
  const minutos = Math.round(Math.max(0, Math.min(16, horas)) * 60);
  const ahora = new Date().toISOString();
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();

  const hs = (minutos / 60).toLocaleString('es-AR', { maximumFractionDigits: 1 });
  const contenido = `Dormí ${hs}h, ${ETIQUETA_CALIDAD[calidad]}.${nota?.trim() ? ` ${nota.trim()}` : ''}`;

  const [yaHoy] = await db
    .select({ id: cuerpo.id })
    .from(cuerpo)
    .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, inicioDia)))
    .orderBy(desc(cuerpo.creado))
    .limit(1);

  if (yaHoy) {
    await db.update(cuerpo).set({ valor: minutos, calidad, nota: nota?.trim() || null }).where(eq(cuerpo.id, yaHoy.id));
    const [entrada] = await db
      .select({ id: bitacora.id })
      .from(bitacora)
      .where(and(like(bitacora.contenido, 'Dormí %'), gte(bitacora.fecha, inicioDia)))
      .orderBy(desc(bitacora.fecha))
      .limit(1);
    if (entrada) await db.update(bitacora).set({ contenido }).where(eq(bitacora.id, entrada.id));
    else await db.insert(bitacora).values({ tipo: 'manual', contenido, fecha: ahora });
  } else {
    await db.insert(cuerpo).values({ tipo: 'sueno', valor: minutos, calidad, nota: nota?.trim() || null, creado: ahora });
    await db.insert(bitacora).values({ tipo: 'manual', contenido, fecha: ahora });
  }

  revalidatePath('/cuerpo');
  revalidatePath('/chat');
}

/** Registra una señal corporal de autoobservación: energía o libido (1 a 5).
 *  Sirve para todos; el Analista la cruza con el ánimo, el sueño y (si aplica) el ciclo. */
export async function registrarSenalCuerpo(tipo: 'energia' | 'libido', valor: number): Promise<void> {
  const v = Math.max(1, Math.min(5, Math.round(valor)));
  const ahora = new Date().toISOString();
  await db.insert(cuerpo).values({ tipo, valor: v, calidad: null, nota: null, creado: ahora });
  revalidatePath('/cuerpo');
}

/** Registra una sesión de respiración completada (segundos). */
export async function registrarRespiracion(segundos: number): Promise<void> {
  const ahora = new Date().toISOString();
  await db.insert(cuerpo).values({ tipo: 'respiracion', valor: Math.round(segundos), calidad: null, nota: null, creado: ahora });
  revalidatePath('/cuerpo');
}

/** Registra qué comió (texto libre): señal para cruzar con energía y ánimo. */
export async function registrarComida(nota: string): Promise<void> {
  const limpio = nota.trim().slice(0, 300);
  if (!limpio) return;
  const ahora = new Date().toISOString();
  await db.insert(cuerpo).values({ tipo: 'comida', valor: null, calidad: null, nota: limpio, creado: ahora });
  revalidatePath('/cuerpo');
  revalidatePath('/historial');
}

/** Edita el texto de una comida ya anotada (comés varias veces al día). */
export async function editarComida(id: number, nota: string): Promise<void> {
  const limpio = nota.trim().slice(0, 300);
  if (!limpio) return;
  await db.update(cuerpo).set({ nota: limpio }).where(and(eq(cuerpo.id, id), eq(cuerpo.tipo, 'comida')));
  revalidatePath('/cuerpo');
  revalidatePath('/historial');
}

/** Borra una comida anotada. */
export async function borrarComida(id: number): Promise<void> {
  await db.delete(cuerpo).where(and(eq(cuerpo.id, id), eq(cuerpo.tipo, 'comida')));
  revalidatePath('/cuerpo');
  revalidatePath('/historial');
}

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { animoCheckins } from '@/lib/db/schema';

const ESTADOS_GENERAL = ['genial', 'bien', 'neutral', 'bajon'];

export type AnimoGeneral = {
  estado: string;
  factores?: string[];
  palabras?: string[];
  nota?: string;
};

/** Ánimo general del día (sin área): mood de 4 niveles + factores/palabras/nota. */
export async function registrarAnimoGeneral(data: AnimoGeneral) {
  if (!ESTADOS_GENERAL.includes(data.estado)) throw new Error('Estado inválido');
  await db.insert(animoCheckins).values({
    areaId: null,
    estado: data.estado,
    nota: data.nota?.trim() || null,
    factores: data.factores?.length ? JSON.stringify(data.factores) : null,
    palabras: data.palabras?.length ? JSON.stringify(data.palabras) : null,
    creado: new Date().toISOString(),
  });
  revalidatePath('/cuerpo');
  revalidatePath('/chat');
}

'use server';

import { revalidatePath } from 'next/cache';
import { analizar } from '@/lib/analista';

export async function correrAnalisis(): Promise<{ ok: boolean }> {
  const ok = await analizar();
  revalidatePath('/chat');
  revalidatePath('/cuerpo');
  revalidatePath('/cosas-chicas');
  return { ok };
}

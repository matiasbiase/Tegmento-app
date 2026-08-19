'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { META_SUENIO_DEFECTO } from '@/lib/cuerpo';

const VOCES_PERMITIDAS = [
  'eleven:EXAVITQu4vr4xnSDxMaL',
  'eleven:onwK4e9ZLuTAKqWW03F9',
  'kokoro:ef_dora',
  'kokoro:em_alex',
  'kokoro:em_santa',
  'say:Mónica',
  'say:Paulina',
  'say:Eddy (Spanish (Spain))',
  'say:Flo (Spanish (Spain))',
  'say:Grandma (Spanish (Spain))',
  'say:Grandpa (Spanish (Spain))',
];

async function guardarClave(clave: string, valor: string) {
  await db
    .insert(config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

export async function alternarVozAuto(): Promise<boolean> {
  const fila = await db.select().from(config).where(eq(config.clave, 'voz_auto'));
  const nuevo = fila[0]?.valor === '1' ? '0' : '1';
  await guardarClave('voz_auto', nuevo);
  revalidatePath('/perfil');
  return nuevo === '1';
}

export async function guardarVoz(voz: string) {
  await guardarClave('voz', VOCES_PERMITIDAS.includes(voz) ? voz : 'kokoro:em_alex');
  revalidatePath('/perfil');
}

// Cuánto querés dormir. Antes el anillo de Sueño se llenaba contra 8h fijas:
// te medía contra un número que no elegiste vos, y si dormís bien con 7 el
// anillo nunca cerraba. Se guarda en minutos.
const META_MIN = 240; // 4h
const META_MAX = 720; // 12h

export async function guardarMetaSuenio(minutos: number): Promise<number> {
  const m = Math.round(Number(minutos) / 15) * 15; // de a cuartos de hora
  const limitado = Math.min(Math.max(Number.isFinite(m) ? m : META_SUENIO_DEFECTO, META_MIN), META_MAX);
  await guardarClave('meta_suenio', String(limitado));
  revalidatePath('/perfil');
  revalidatePath('/chat');
  revalidatePath('/cuerpo');
  return limitado;
}

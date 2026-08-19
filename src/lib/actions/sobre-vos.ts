'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';

export type Genero = 'mujer' | 'hombre' | 'reservado';

async function setConfig(clave: string, valor: string) {
  await db
    .insert(config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

/** Dónde vivís. No es un dato de adorno: es lo que hace que "Contexto" sea tu
 *  entorno real (Alemania, Europa) y no la actualidad del planeta. Se usa para
 *  sumar feeds de tu región y para poner arriba las noticias que te atraviesan. */
export async function guardarLugar(lugar: string): Promise<void> {
  await setConfig('lugar', lugar.trim().slice(0, 80));
  // Las noticias se cachean media hora. Sin esto, cargás dónde vivís y no pasa
  // nada visible hasta que vence el caché: parece que el campo no sirvió.
  await db.delete(config).where(eq(config.clave, 'noticias_fecha'));
  revalidatePath('/perfil');
  revalidatePath('/descubrir');
}

/** Guarda identidad, seguimiento de ciclo y neurodivergencia (todo opcional).
 *  Estos datos ayudan a leer mejor las señales del cuerpo y del ánimo. */
export async function guardarSobreVos(datos: {
  genero: Genero;
  sigueCiclo: boolean;
  neuro: string[];
}): Promise<void> {
  await setConfig('genero', datos.genero);
  // el toggle es la fuente de verdad; el editor solo lo ofrece para mujer/reservado
  await setConfig('sigue_ciclo', datos.sigueCiclo ? '1' : '0');
  const neuro = datos.neuro.map((n) => n.trim()).filter(Boolean).slice(0, 12);
  await setConfig('neurodivergencia', JSON.stringify(neuro));
  revalidatePath('/cuerpo');
  revalidatePath('/perfil');
}

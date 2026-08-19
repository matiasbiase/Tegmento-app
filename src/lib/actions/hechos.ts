'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { hechos } from '@/lib/db/schema';

/**
 * ── LO QUE ÉL CONTESTA CUANDO EL BOT PREGUNTA ────────────────────────────────
 *
 * Escribe `hechos.porque`, que era **la única columna del cerebro que nadie
 * llenaba** — y la más importante: `cuentaParaPatron` la exige, así que sin esto
 * ningún episodio sube nunca a patrón. El cerebro tenía la regla y no tenía cómo
 * cumplirla.
 *
 * ⚠️⚠️ DÓNDE SE CAPTURA, QUE ERA LA DECISIÓN QUE FALTABA: **en el campo de
 * escribir, el que ya está justo abajo de la pregunta.** No hace falta una hoja
 * nueva ni un botón: la propuesta C del 12/08 puso la tarjeta del bot y el
 * composer en una sola pieza para que *"contestarle al bot y anotar sean el
 * mismo gesto"*. Esto es ese gesto usado para lo que fue diseñado.
 *
 * ⚠️ Y LO QUE ESCRIBÍS TAMBIÉN VA AL CHAT, no se lo come esta función. Si
 * contestás algo y el bot no dice nada, la app se comió tu mensaje — que es
 * peor que no preguntar. Acá solo se guarda la copia que el cerebro necesita.
 *
 * ⚠️ NO PISA UNA EXPLICACIÓN QUE YA ESTÉ. Si ya contaste el porqué y después
 * escribís otra cosa cualquiera, esa otra cosa no reemplaza lo que dijiste: la
 * primera explicación es la que se dio mirando la pregunta.
 */
export async function explicarHecho(id: number, texto: string): Promise<boolean> {
  const t = texto.trim().slice(0, 500);
  if (!t || !Number.isInteger(id)) return false;

  const [fila] = await db.select().from(hechos).where(eq(hechos.id, id));
  if (!fila || fila.porque?.trim()) return false;

  await db.update(hechos).set({ porque: t }).where(eq(hechos.id, id));
  revalidatePath('/chat');
  revalidatePath('/cosas-chicas');
  return true;
}

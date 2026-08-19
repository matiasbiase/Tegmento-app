'use server';

import { and, eq, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { animoCheckins, config, cuerpo } from '@/lib/db/schema';
import { horaValida, leerRitual, type EstadoRitual, type LoCargado } from '@/lib/ritual';

/**
 * DÓNDE VIVE EL RITUAL, Y POR QUÉ ACÁ.
 *
 * ⚠️ EN `config` Y NO EN localStorage, al revés que la tarjeta que frena. Ahí la
 * decisión fue deliberada —el "una vez por día" es de ese teléfono— pero acá es
 * al revés: **a qué hora querés que te avise es tuyo, no del dispositivo**. Si
 * viviera en el teléfono, reinstalar la app te apagaría el ritual sin decírtelo,
 * y eso es justo lo que hace que un ritual se pierda.
 *
 * ⚠️ Y EL ESTADO REAL DE LOS AVISOS VIVE EN iOS, no acá. Esto guarda lo que él
 * pidió; que estén programados de verdad depende del permiso del sistema, que se
 * puede revocar desde Ajustes sin que la app se entere. Por eso la pantalla
 * vuelve a programar cada vez que se abre en vez de confiar en esta fila.
 */

const CLAVE = 'ritual';

export async function leerEstadoRitual(): Promise<EstadoRitual> {
  const [fila] = await db.select().from(config).where(eq(config.clave, CLAVE));
  return leerRitual(fila?.valor);
}

export async function guardarEstadoRitual(estado: EstadoRitual): Promise<EstadoRitual> {
  // Se sanea antes de guardar: una hora rota guardada es una hora rota que
  // vuelve en cada apertura. `leerRitual` la corregiría al leer, pero entonces
  // la pantalla mostraría una cosa y la base tendría otra.
  const limpio: EstadoRitual = {
    activo: estado.activo === true,
    manana: horaValida(estado.manana) ? estado.manana : leerRitual(null).manana,
    noche: horaValida(estado.noche) ? estado.noche : leerRitual(null).noche,
  };
  await db
    .insert(config)
    .values({ clave: CLAVE, valor: JSON.stringify(limpio) })
    .onConflictDoUpdate({ target: config.clave, set: { valor: JSON.stringify(limpio) } });
  revalidatePath('/perfil');
  return limpio;
}

/**
 * QUÉ CARGASTE HOY. Es lo que decide si un aviso se saltea.
 *
 * ⚠️ SE MIRA EL DÍA LOCAL Y NO LAS ÚLTIMAS 24 HORAS. Si cargaste el sueño ayer a
 * las 23:50, "las últimas 24 horas" diría que hoy ya está — y a las 8:30 de hoy
 * no cargaste nada. El ritual es por día, no por ventana móvil.
 */
export async function loCargadoHoy(): Promise<LoCargado> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const desde = inicio.toISOString();

  const sueno = await db
    .select({ id: cuerpo.id })
    .from(cuerpo)
    .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, desde)))
    .limit(1);

  const animo = await db
    .select({ id: animoCheckins.id })
    .from(animoCheckins)
    .where(gte(animoCheckins.creado, desde))
    .limit(1);

  return { sueno: sueno.length > 0, animo: animo.length > 0 };
}

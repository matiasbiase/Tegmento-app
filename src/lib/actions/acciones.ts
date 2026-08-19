'use server';

import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { compras, papeles } from '@/lib/db/schema';
import { buscarPapel, precioDe, type PapelBuscado } from '@/lib/precios';

/**
 * ACCIONES, LA MITAD QUE ENTRA (§0.10 / §0.13).
 *
 * ⚠️ NINGUNA DE ESTAS FUNCIONES OPINA. Guardan lo que él carga, traen un precio
 * y devuelven filas. La aritmética vive en `lib/acciones.ts` y la fuente de
 * afuera en `lib/precios.ts`; acá solo se pegan las tres cosas.
 */

/** El buscador. Devuelve lo que coincide con lo que escribió, y nada más. */
export async function buscarPapeles(consulta: string): Promise<PapelBuscado[]> {
  return buscarPapel(consulta);
}

/**
 * Empezar a seguir un papel. Idempotente: seguir dos veces el mismo no duplica.
 *
 * Trae el precio en el mismo movimiento porque es el momento en que el dato
 * sirve —acabás de elegirlo y querés verlo—, pero si no llega, el papel se
 * guarda igual: **seguirlo no puede depender de que afuera conteste.**
 */
export async function seguirPapel(datos: {
  simbolo: string;
  nombre: string;
  mercado?: string | null;
  sector?: string | null;
}): Promise<number | null> {
  const simbolo = datos.simbolo.trim().toUpperCase().slice(0, 20);
  const nombre = datos.nombre.trim().slice(0, 90) || simbolo;
  if (!simbolo) return null;

  const [ya] = await db.select().from(papeles).where(eq(papeles.simbolo, simbolo));
  if (ya) return ya.id;

  const cot = await precioDe(simbolo);
  const [fila] = await db
    .insert(papeles)
    .values({
      simbolo,
      nombre,
      mercado: datos.mercado ?? null,
      sector: datos.sector ?? null,
      moneda: cot?.moneda ?? null,
      precio: cot?.precio ?? null,
      precioFecha: cot ? new Date().toISOString() : null,
      creado: new Date().toISOString(),
    })
    .returning({ id: papeles.id });

  revalidatePath('/finanzas');
  return fila?.id ?? null;
}

/** Dejar de seguirlo. Se van también sus compras: sin papel no hay qué contar. */
export async function dejarDeSeguir(papelId: number): Promise<void> {
  // A mano y primero: la FK está declarada pero SQLite no fuerza el cascade
  // salvo que se prenda, y una compra huérfana sumaría plata de un papel que ya
  // no existe. Misma razón que en `borrarObjetivoPlata`.
  await db.delete(compras).where(eq(compras.papelId, papelId));
  await db.delete(papeles).where(eq(papeles.id, papelId));
  revalidatePath('/finanzas');
}

/** Anotar una compra: cuántas, a cuánto y qué día. */
export async function anotarCompra(datos: {
  papelId: number;
  cantidad: number;
  precio: number;
  fecha: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(datos.cantidad > 0)) return { ok: false, error: 'Poné cuántas compraste.' };
  if (!(datos.precio >= 0) || !Number.isFinite(datos.precio)) {
    return { ok: false, error: 'Poné a cuánto la compraste.' };
  }
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)
    ? datos.fecha
    : new Date().toISOString().slice(0, 10);

  await db.insert(compras).values({
    papelId: datos.papelId,
    cantidad: datos.cantidad,
    precio: datos.precio,
    fecha,
    creado: new Date().toISOString(),
  });
  revalidatePath('/finanzas');
  return { ok: true };
}

/** Borrar una compra mal cargada. */
export async function borrarCompra(id: number): Promise<void> {
  await db.delete(compras).where(eq(compras.id, id));
  revalidatePath('/finanzas');
}

/**
 * Poner el precio a mano.
 *
 * ⚠️ NO ES UN PLAN B DE SEGUNDA: es la única puerta que no depende de nadie. Si
 * la fuente de afuera se cae, cambia o él decide que no quiere que salga nada,
 * la pantalla sigue contestando su pregunta con esto. Guarda la fecha igual que
 * el automático, porque un precio a mano también envejece.
 */
export async function precioAMano(papelId: number, precio: number): Promise<void> {
  if (!Number.isFinite(precio) || precio <= 0) return;
  await db
    .update(papeles)
    .set({ precio, precioFecha: new Date().toISOString() })
    .where(eq(papeles.id, papelId));
  revalidatePath('/finanzas');
}

/**
 * Actualizar los precios de todo lo que seguís.
 *
 * ⚠️ SE DISPARA CON UN BOTÓN, NO SOLA AL ABRIR. Dos motivos, y el segundo es el
 * que importa: (1) una pantalla que sale a internet en cada render la vuelve
 * lenta y llena de esperas; (2) **salir afuera tiene que ser algo que hacés
 * vos.** El día que él prefiera que no salga nada, no tocar el botón alcanza —
 * no hay que apagar ninguna función.
 *
 * Lo que no contesta se deja con el precio y la fecha que ya tenía. Borrarlo
 * sería perder el último dato cierto por un problema de red.
 */
export async function actualizarPrecios(): Promise<{ actualizados: number; total: number }> {
  const filas = await db.select().from(papeles);
  let actualizados = 0;
  for (const p of filas) {
    const cot = await precioDe(p.simbolo);
    if (!cot) continue;
    await db
      .update(papeles)
      .set({ precio: cot.precio, moneda: cot.moneda ?? p.moneda, precioFecha: new Date().toISOString() })
      .where(eq(papeles.id, p.id));
    actualizados++;
  }
  revalidatePath('/finanzas');
  return { actualizados, total: filas.length };
}

export type PapelVista = {
  id: number;
  simbolo: string;
  nombre: string;
  mercado: string | null;
  sector: string | null;
  moneda: string | null;
  precio: number | null;
  precioFecha: string | null;
  compras: { id: number; cantidad: number; precio: number; fecha: string }[];
};

/** Todo lo que seguís, con sus compras. */
export async function leerPapeles(): Promise<PapelVista[]> {
  const filas = await db.select().from(papeles).orderBy(asc(papeles.creado));
  if (filas.length === 0) return [];
  const todas = await db.select().from(compras);
  return filas.map((p) => ({
    id: p.id,
    simbolo: p.simbolo,
    nombre: p.nombre,
    mercado: p.mercado,
    sector: p.sector,
    moneda: p.moneda,
    precio: p.precio,
    precioFecha: p.precioFecha,
    compras: todas
      .filter((c) => c.papelId === p.id)
      .map((c) => ({ id: c.id, cantidad: c.cantidad, precio: c.precio, fecha: c.fecha })),
  }));
}

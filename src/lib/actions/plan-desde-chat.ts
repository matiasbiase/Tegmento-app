'use server';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, lineas } from '@/lib/db/schema';
import { crearObjetivoDesdeRueda } from '@/lib/actions/objetivos';
import type { MarcaPlan } from '@/lib/plan-marca';

/**
 * DEJAR ANOTADO LO QUE SALIÓ DE `#plan`.
 *
 * ⚠️⚠️ OJO CON EL NOMBRE: **hay DOS "planes" en esta app y no tienen nada que
 * ver.** `actions/plan.ts` es el **plan de alimentación** del nutricionista
 * (04/08): comidas con hora, tildes, `planes`/`plan_comidas`/`plan_marcas`. Esto
 * de acá es el plan que sale del chat y termina en un OBJETIVO. Por eso este
 * archivo no se llama `plan.ts` — se intentó y habría pisado el otro.
 *
 * ⚠️⚠️ NO CONSTRUYE UNA PUERTA DE ALTA NUEVA: llama a `crearObjetivoDesdeRueda`,
 * la misma que usa la pantalla de Objetivos desde el 06/08. Un segundo camino
 * para crear objetivos es exactamente lo que se sacó ese día — había dos botones
 * que creaban la misma cosa de dos maneras, y el segundo producía objetivos
 * **sin área y sin tipo**, o sea que la tarjeta no los sabía medir. Los dos
 * objetivos viejos de la base no tienen área por eso.
 *
 * ── ⚠️ EL TIPO ES `habito`, Y ES UNA DECISIÓN ───────────────────────────────
 *
 * Los tres tipos son `rueda`, `llegar` y `habito`. Un plan que sale del chat no
 * trae un par de puntajes (eso lo da el flujo de la rueda) ni un monto (eso es
 * `llegar`), así que `habito` es el único que no le inventa un dato que no
 * tiene.
 *
 * ⚠️ Y SIGUE SIENDO `habito` AUNQUE AHORA TENGA ÁREA (11/08). El tipo y el área
 * son independientes: `tipo` dice CÓMO se mide el objetivo (con puntajes, con
 * plata, con constancia) y `areaId` dice DE QUÉ PARTE DE TU VIDA es. Ponerle
 * `rueda` solo por tener área le inventaría el par de puntajes que nadie
 * preguntó — que es justo el error que se quiere evitar. Con `areaId` alcanza
 * para que la pantalla de cierre pregunte por la rueda, que era todo el punto.
 *
 * ── LAS ACTIVIDADES ─────────────────────────────────────────────────────────
 *
 * Llegan como TÍTULOS, no como ids: el modelo escribe nombres. Se buscan entre
 * las activas y, si no existe, **se crea**. ⚠️ Crear es lo correcto y no un
 * atajo: el bot acaba de acordar con Matías que eso va a mover el objetivo, así
 * que la actividad tiene que existir. Devolver "no la encontré" lo obligaría a
 * ir a crearla a otra pantalla y volver — que es la falla que ya se arregló dos
 * veces con "Ya lo hice".
 *
 * ⚠️ SE BUSCA SIN DISTINGUIR MAYÚSCULAS, y contra las ACTIVAS: si el modelo
 * escribe "bouldern" y ya existe "Bouldern", crear una segunda **partiría el
 * historial en dos** y la grilla de Seguimiento mostraría dos filas para lo
 * mismo.
 */
export async function crearDesdePlan(marca: MarcaPlan): Promise<number | null> {
  const que = marca.que?.trim();
  if (!que) return null;

  // ── ⚠️ EL ÁREA, RESUELTA POR NOMBRE (11/08) ────────────────────────────────
  // Matías pidió que `#plan` pregunte de qué área es, **con la opción de que no
  // sea de ninguna**. El modelo escribe el NOMBRE; acá se busca el id.
  //
  // ⚠️ SI NO MATCHEA, QUEDA EN `null` Y NO SE INVENTA NADA. Colgar el objetivo
  // del área equivocada es peor que dejarlo suelto: la rueda es el único
  // instrumento con el que la app mide cómo viene cada parte de su vida, y un
  // objetivo mal colgado la ensucia sin que se note.
  //
  // ⚠️ Y CON ÁREA, LA PANTALLA DE CIERRE PREGUNTA POR LA RUEDA — que es todo el
  // punto: sin `areaId`, `cerrarYReflexionar` se saltea esa pregunta y el
  // circuito rueda → objetivo → cierre → rueda no se cierra.
  let areaId: number | null = null;
  if (marca.area) {
    const buscada = marca.area.trim().toLowerCase();
    const todas = await db.select({ id: areas.id, nombre: areas.nombre }).from(areas);
    areaId = todas.find((a) => a.nombre.trim().toLowerCase() === buscada)?.id ?? null;
  }

  const activas = await db
    .select({ id: lineas.id, titulo: lineas.titulo })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa')));

  const porTitulo = new Map(activas.map((l) => [l.titulo.trim().toLowerCase(), l.id]));

  const lineaIds: number[] = [];
  for (const titulo of marca.actividades) {
    const clave = titulo.trim().toLowerCase();
    if (!clave) continue;

    const ya = porTitulo.get(clave);
    if (ya != null) {
      lineaIds.push(ya);
      continue;
    }

    // ⚠️ `diaria: true`. Lo que mueve un objetivo es algo que se marca día a
    // día: es lo que lo hace aparecer en "Hoy, de un toque" y en la grilla de
    // Seguimiento. Una actividad no diaria no se pinta nunca, y el objetivo
    // quedaría con un seguimiento que no se puede seguir.
    const [fila] = await db
      .insert(lineas)
      .values({
        titulo: titulo.slice(0, 90),
        tipo: 'actividad',
        estado: 'activa',
        diaria: true,
        ultimaActividad: new Date().toISOString(),
      })
      .returning({ id: lineas.id });

    if (fila) {
      lineaIds.push(fila.id);
      // Para que el mismo nombre repetido en una marca no cree dos filas: el
      // modelo repite más de lo que uno esperaría.
      porTitulo.set(clave, fila.id);
    }
  }

  return crearObjetivoDesdeRueda({
    areaId,
    tipo: 'habito',
    titulo: que,
    fechaMeta: marca.fecha,
    lineaIds,
  });
}

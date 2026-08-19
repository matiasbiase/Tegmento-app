'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { objetivoLineas } from '@/lib/db/schema';

/**
 * COLGAR UN SEGUIMIENTO O UNA TAREA DE UN OBJETIVO, Y DESCOLGARLO.
 *
 * Es la puerta que faltaba (06/08). El vínculo existía en la base desde antes
 * —`lineas.objetivo_id`— y **nunca se usó ni una vez**: medido en la base de
 * Matías el 06/08, 2 objetivos y 7 actividades activas con 0 vínculos. La causa
 * no era que faltara la conexión, era que la única forma de hacerla estaba en un
 * desplegable del chat, y las actividades nacen en Seguimiento.
 *
 * ⚠️ Y SE COLGA DESDE EL OBJETIVO, NO DESDE LA ACTIVIDAD. Es lo que él propuso
 * (*"lo mismo tendría que pasar a la inversa: qué cosas de seguimiento
 * pertenecen a ese objetivo"*) y es el momento correcto: **cuando creás una
 * actividad todavía no sabés bien para qué es; cuando mirás el objetivo, sí.**
 */

export async function colgarDeObjetivo(objetivoId: number, lineaId: number): Promise<void> {
  if (!Number.isInteger(objetivoId) || !Number.isInteger(lineaId)) return;
  // `onConflictDoNothing` y no un select previo: el par es único en la base, así
  // que tocar dos veces el mismo botón no puede duplicar aunque llegue repetido.
  //
  // ⚠️⚠️ ESTE COMENTARIO FUE MENTIRA HASTA EL 06/08 A LA TARDE. El schema
  // declaraba el `unique(objetivo_id, linea_id)` desde el principio, pero **el
  // índice nunca existió en la base**: `db:push` venía fallando y las columnas
  // se habían agregado a mano con `alter table`, que no crea índices. O sea que
  // `onConflictDoNothing` no tenía ningún conflicto que atrapar y dos toques
  // habrían dejado dos filas — con la actividad contada dos veces en "Lo que
  // suma a esto". No pasó de casualidad: hasta ese día había 0 vínculos.
  // El índice ya está creado y esto ahora hace lo que dice.
  await db
    .insert(objetivoLineas)
    .values({ objetivoId, lineaId, creado: new Date().toISOString() })
    .onConflictDoNothing();
  revalidar();
}

export async function descolgarDeObjetivo(objetivoId: number, lineaId: number): Promise<void> {
  await db
    .delete(objetivoLineas)
    .where(and(eq(objetivoLineas.objetivoId, objetivoId), eq(objetivoLineas.lineaId, lineaId)));
  revalidar();
}

/** ⚠️ LAS DOS PANTALLAS, porque Objetivos vive en las dos desde el 06/08:
 *  su ruta de siempre y la pestaña Objetivos de Seguimiento. Revalidar una sola
 *  dejaría a la otra mostrando el vínculo viejo. */
function revalidar() {
  revalidatePath('/objetivos');
  revalidatePath('/actividades');
}

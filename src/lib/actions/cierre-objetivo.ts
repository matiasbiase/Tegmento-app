'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areaCheckins, areas, objetivoMovimientos, objetivos } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

/**
 * EL MOMENTO DE CERRAR UN OBJETIVO.
 *
 * Pedido de Matías (10/08):
 *
 * > *"Cuando termina un objetivo estaría bueno que se ponga la pantalla así y
 * > diga: tomate un momento para reflexionar acerca de este objetivo, a ver si
 * > cambiamos esto de la rueda y empezamos un objetivo nuevo o lo hacemos
 * > después. Preguntas cómo lo viviste, qué sentiste."*
 *
 * ── ⚠️⚠️ POR QUÉ ESTE ES EL MEJOR MOMENTO DE REFLEXIÓN DE LA APP ────────────
 *
 * Es la tercera puerta de `#reflexión`, y la única cuyo **disparador no se puede
 * equivocar**. Las otras dos tienen el problema que él mismo encontró: *"me
 * gusta leer, pero esta semana estuve con otras cosas"* — una ausencia se ve
 * igual si te está costando o si tuviste una semana ocupada, así que una tarjeta
 * que ofrezca reflexionar sobre eso **fabrica la pregunta que la app vino a
 * sacar**.
 *
 * Acá no hay nada que inferir: **cerraste un objetivo. Es un hecho.**
 *
 * ── ⚠️ Y ES LO QUE HACE VOLVER A LA RUEDA ───────────────────────────────────
 *
 * La rueda se completa en el onboarding y después **no vuelve a aparecer sola en
 * ningún lado** — era el hueco 3 del journey map. Este momento cierra el
 * circuito: **rueda → objetivo → cierre → rueda**. Matías: *"la rueda vuelve
 * cuando terminás un objetivo basado en la rueda y subís un punto"*.
 *
 * ── ⚠️ SOLO AL LOGRAR, NO AL ABANDONAR (decisión de alcance) ────────────────
 *
 * `cerrarObjetivo` acepta `logrado` y `abandonado`. Esto se dispara **solo con
 * `logrado`**. Abandonar algo también da para pensar —probablemente más—, pero
 * una pantalla completa que te para y te dice *"tomate un momento"* justo cuando
 * acabás de soltar algo es la frontera exacta entre acompañar y reprochar, y esa
 * frontera merece su propia conversación. Queda anotado como pendiente y no
 * resuelto a las apuradas.
 */

/** El puntaje de la rueda va de 1 a 5 (ver `RadarRueda`). */
const SCORE_MAX = 5;
const SCORE_MIN = 1;

export type ContextoDeCierre = {
  objetivoId: number;
  titulo: string;
  /** `null` si el objetivo no cuelga de ningún área: ahí no se pregunta por la
   *  rueda, porque no habría qué mover. */
  area: { id: number; nombre: string; score: number | null } | null;
};

/**
 * Cierra el objetivo COMO LOGRADO y devuelve con qué armar la pantalla.
 *
 * ⚠️ CIERRA Y DEVUELVE EN UNA SOLA LLAMADA, a propósito. La alternativa era
 * cerrar con la acción de siempre y después pedir el contexto: dos viajes, y
 * entre uno y otro el objetivo ya está cerrado. Si el segundo falla, la pantalla
 * no aparece y el momento se pierde sin que nadie se entere.
 */
export async function cerrarYReflexionar(id: number): Promise<ContextoDeCierre | null> {
  const [obj] = await db.select().from(objetivos).where(eq(objetivos.id, id)).limit(1);
  if (!obj) return null;

  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  await db.update(objetivos).set({ estado: 'logrado', cerrado: fecha }).where(eq(objetivos.id, id));

  let area: ContextoDeCierre['area'] = null;
  if (obj.areaId != null) {
    const [a] = await db.select().from(areas).where(eq(areas.id, obj.areaId)).limit(1);
    if (a) area = { id: a.id, nombre: a.nombre, score: a.scoreActual ?? null };
  }

  revalidatePath('/objetivos');
  revalidatePath('/actividades');
  return { objetivoId: id, titulo: obj.titulo, area };
}

/**
 * Guarda lo que salió de la reflexión.
 *
 * ⚠️ TODO ES OPCIONAL, y eso no es descuido: **que no pase nada es un final
 * válido**. Podés cerrar el objetivo, mirar la pantalla, no escribir nada, no
 * mover la rueda y salir. La app no tiene por qué sacarte algo cada vez.
 */
export async function guardarCierre(datos: {
  objetivoId: number;
  /** Cómo lo viviste, en tus palabras. */
  nota?: string | null;
  areaId?: number | null;
  /** El puntaje nuevo del área. Solo se escribe si CAMBIÓ. */
  score?: number | null;
}): Promise<void> {
  const nota = datos.nota?.trim();
  const ahora = new Date().toISOString();

  // ⚠️ LA NOTA VA COMO MOVIMIENTO DEL OBJETIVO y no a un lugar nuevo: es
  // literalmente algo que pasó con ese objetivo, y así aparece en su historia
  // cuando lo mirás. Una tabla `reflexiones` sería un lugar más donde buscar.
  if (nota) {
    await db.insert(objetivoMovimientos).values({
      objetivoId: datos.objetivoId,
      fecha: ahora.slice(0, 10),
      nota: nota.slice(0, 500),
      creado: ahora,
    });
  }

  if (datos.areaId != null && datos.score != null) {
    const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, datos.score)));
    const [a] = await db.select().from(areas).where(eq(areas.id, datos.areaId)).limit(1);
    // ⚠️ SOLO SI CAMBIÓ. Un check-in con el mismo puntaje que ya tenía no es un
    // dato: es ruido en el historial del área, y ese historial es lo que después
    // dibuja si un área viene subiendo o no.
    if (a && a.scoreActual !== score) {
      await db.update(areas).set({ scoreActual: score }).where(eq(areas.id, datos.areaId));
      await db.insert(areaCheckins).values({
        areaId: datos.areaId,
        score,
        // ⚠️ Queda escrito de dónde salió este puntaje. Es la regla de la casa:
        // *siempre se muestra de dónde salió*. Un score que aparece sin origen
        // no se puede auditar después.
        notas: 'Al cerrar un objetivo',
        fecha: ahora,
      });
    }
  }

  revalidatePath('/objetivos');
  revalidatePath('/rueda');
  revalidatePath('/chat');
}

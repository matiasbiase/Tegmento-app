'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { bitacora, hechos, lineas, sugerencias } from '@/lib/db/schema';
import { mismoHecho, trasVeredicto, type Hecho } from '@/lib/cerebro-hechos';
import { notasDeExperimento } from '@/lib/experimentos';

// Lo que el Analista nota no queda como un cartel que se lee y se olvida: Matías
// decide qué hacer con cada observación y esa decisión vuelve al análisis
// siguiente. Ese ida y vuelta es lo que hace que la app aprenda de él.
//
//  - "Me pasa"    → estado 'anotada'   : la sigue, la da por buena.
//  - "No es así"  → estado 'descartada': no le cerró, que no insista.
//  - "No sé"      → estado 'en_duda'   : todavía no puede decir. Ver abajo.
//
// Se guardan en `sugerencias` con tipo 'observacion'. El contenido (el texto del
// patrón) hace de clave: si la misma observación vuelve a aparecer en otro
// análisis, se actualiza la fila en vez de duplicarla.
//
// ⚠️ POR QUÉ EXISTE "NO SÉ" (05/08, pedido de Matías). Con dos botones, una
// observación de la que no estás seguro no tenía salida: o mentías en una
// dirección, o la salteabas y la pantalla te la volvía a preguntar para
// siempre. Y las dos mentiras cuestan caro, porque esta respuesta **vuelve al
// análisis siguiente**: un "me pasa" de compromiso se convierte en algo que la
// app da por cierto de vos.
// 'en_duda' no es un punto medio entre sí y no: es "todavía no sé", y por eso
// la observación va a Cocinándose —donde ya vive lo que la app no puede
// afirmar— en vez de desaparecer como las descartadas.
//
// ⚠️ NO HAY CAMBIO DE SCHEMA: `sugerencias.estado` es texto libre, así que el
// valor nuevo entra sin tocar `schema.ts` ni la base. Es a propósito, después
// de lo del 04/08.
export type Veredicto = 'anotada' | 'descartada' | 'en_duda';

async function decidir(patron: string, evidencia: string, estado: Veredicto): Promise<void> {
  const texto = patron.trim().slice(0, 500);
  if (!texto) return;

  const previas = await db
    .select()
    .from(sugerencias)
    .where(and(eq(sugerencias.tipo, 'observacion'), eq(sugerencias.contenido, texto)));

  if (previas.length > 0) {
    await db.update(sugerencias).set({ estado }).where(eq(sugerencias.id, previas[0].id));
  } else {
    await db.insert(sugerencias).values({
      tipo: 'observacion',
      contenido: texto,
      evidencia: evidencia.trim().slice(0, 500) || null,
      estado,
      creado: new Date().toISOString(),
    });
  }

  await marcarEnElCerebro(texto, estado);

  // ⚠️ ESTO APUNTABA A `/relaciones` (Patrones) Y NO A `/cosas-chicas`, que es
  // la pantalla que muestra estas respuestas: era un bug de verdad, contestabas
  // en Relaciones y la tarjeta se quedaba donde estaba. Con Patrones borrada el
  // 05/08, la única ruta que queda es la correcta.
  revalidatePath('/cosas-chicas');
  revalidatePath('/chat');
}

/**
 * ── ⚠️⚠️ EL VEREDICTO POR FIN LLEGA AL CHAT (13/08) ──────────────────────────
 *
 * Hasta hoy, contestar "me pasa" o "no es así" guardaba una fila en
 * `sugerencias` **y ahí moría**. Lo que el bot sabía de él se armaba aparte,
 * filtrando por la confianza que el modelo se ponía a sí mismo. Medido el 13/08:
 * **34 veredictos suyos —21 "me pasa", 8 "no me pasa", 5 "no sé"— sin influir en
 * nada.** Y la consecuencia era peor que el desperdicio: algo que él marcó "no me
 * pasa" podía estar aconsejándolo en la charla siguiente.
 *
 * Ahora el mismo veredicto mueve el estado en `hechos`, que es lo que
 * `contexto.ts` lee en cada charla. Lo descartado deja de llegar; lo confirmado
 * pasa al frente.
 *
 * ⚠️ "No sé" NO TOCA EL ESTADO, a propósito. `en_duda` significa "todavía no
 * puedo decir", y en el cerebro eso ya tiene nombre: `no_confirmado`, que es
 * donde está. Moverlo sería inventar una decisión que él no tomó.
 *
 * ⚠️ Y NO CREA EL HECHO SI NO EXISTE. Los hechos los produce el Analista; esto
 * solo responde. Crear uno acá haría que un veredicto sobre algo viejo —de un
 * análisis de hace un mes— reviva como si fuera un hallazgo nuevo.
 */
async function marcarEnElCerebro(texto: string, estado: Veredicto): Promise<void> {
  if (estado === 'en_duda') return;

  const candidatos = await db.select().from(hechos);
  const encontrado = candidatos.find((h) => mismoHecho(h.contenido, texto));
  if (!encontrado) return;

  const actualizado = trasVeredicto(
    { ...encontrado, saleDe: [] } as Hecho,
    estado === 'anotada' ? 'confirmado' : 'descartado',
  );
  await db
    .update(hechos)
    .set({ estado: actualizado.estado, vence: actualizado.vence })
    .where(eq(hechos.id, encontrado.id));
}

/** "Me pasa": la observación queda en seguimiento y el Analista la da por válida. */
export async function seguirObservacion(patron: string, evidencia = ''): Promise<void> {
  await decidir(patron, evidencia, 'anotada');
}

/** "No es así": queda registrada como descartada para que el Analista no insista. */
export async function descartarObservacion(patron: string, evidencia = ''): Promise<void> {
  await decidir(patron, evidencia, 'descartada');
}

/** "No sé": ni la confirma ni la descarta. Se va a Cocinándose y vuelve más adelante. */
export async function dudarObservacion(patron: string, evidencia = ''): Promise<void> {
  await decidir(patron, evidencia, 'en_duda');
}

/**
 * ── CUÁN RELEVANTE ES ESTO PARA VOS (06/08) ─────────────────────────────────
 *
 * Reemplaza a los tres botones de "me pasa / no me pasa / no sé" en Relaciones.
 * Matías: *"las que son poco relevantes no importa si me pasa o no; es más
 * importante saber si es relevante o no"*.
 *
 * ⚠️ Y NO SE PIERDE EL VEREDICTO, que era el riesgo. Relevancia y verdad no son
 * lo mismo: *"cuando duermo mal como peor"* puede ser ciertísimo y no importarte
 * nada. Si solo guardáramos relevancia, **el Analista perdería la señal de si
 * acertó**, que es lo único que lo hace mejorar. Por eso las dos puntas cuentan
 * como veredicto y el medio queda en duda:
 *
 *   · `nada`            → descartada  (dijo que no le importa: que no vuelva)
 *   · `poco` · `algo` · `bastante` → en_duda (sigue cocinándose)
 *   · `mucho`           → anotada     (la da por buena y la sigue)
 *
 * ⚠️ SIN CAMBIO DE SCHEMA: se sigue guardando en `sugerencias.estado`, que es
 * texto libre. La relevancia fina todavía no se persiste aparte; si algún día
 * hace falta distinguir "poco" de "bastante", ahí sí hay que agregar columna.
 */
/**
 * ⚠️ CUATRO Y NO CINCO (06/08, corrección suya). Se fue "algo", el del medio:
 * **con cinco niveles el centro es el cómodo y se toca sin decidir.** Con cuatro
 * no hay centro — dos dicen que sí y dos que no, y hay que elegir de qué lado.
 */
export type Relevancia = 'nada' | 'poco' | 'bastante' | 'mucho';

const VEREDICTO_DE: Record<Relevancia, Veredicto> = {
  nada: 'descartada',
  poco: 'en_duda',
  bastante: 'en_duda',
  mucho: 'anotada',
};

/**
 * ⚠️⚠️ SIN USUARIOS DESDE EL 11/08. La escala de relevancia duró cinco días:
 * Matías la pidió el 06/08 y la sacó el 11 (*"me equivoqué con esto de nada,
 * poco, bastante o mucho"*), reemplazada por los tres veredictos de siempre.
 *
 * Se deja porque el MAPEO que hay acá arriba —qué veredicto guarda cada nivel—
 * es lo que se aprendió esos cinco días, y borrarlo obligaría a redescubrirlo si
 * alguna vez vuelve una escala. **Si en un mes sigue sin usarse, se va.**
 */
export async function relevanciaObservacion(
  patron: string,
  evidencia: string,
  nivel: Relevancia,
): Promise<void> {
  await decidir(patron, evidencia, VEREDICTO_DE[nivel]);
}

/**
 * Convierte una observación en una actividad en curso: de "noto que te hace bien
 * caminar" a algo que aparece en Actividades y se puede pintar día a día.
 * Devuelve el título con el que quedó, o null si no se pudo.
 */
export async function observacionAActividad(titulo: string, esExperimento = false): Promise<string | null> {
  const t = titulo.trim().slice(0, 90);
  if (!t) return null;

  // Si ya existe una actividad activa con ese título, no se duplica.
  const ya = await db
    .select()
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.titulo, t), eq(lineas.estado, 'activa')));
  if (ya.length > 0) return t;

  const ahora = new Date().toISOString();
  await db.insert(lineas).values({
    titulo: t,
    tipo: 'actividad',
    estado: 'activa',
    notas: esExperimento ? notasDeExperimento(ahora) : 'Salió de algo que notó el Analista.',
    ultimaActividad: ahora,
  });

  revalidatePath('/actividades');
  revalidatePath('/cosas-chicas');
  revalidatePath('/chat');
  return t;
}

/**
 * Una nota escrita MIENTRAS el experimento está en curso, desde Relaciones.
 *
 * ── Por qué existe (29/07, Matías: *"Relaciones no deja anotar nada"*) ────────
 * El Analista proponía cosas como "anotá con quién estuviste en los check-ins" y
 * después no había dónde escribirlo: la pantalla solo dejaba contestar "me pasa"
 * o "no me pasa". **Un experimento que te pide observar algo y no te da dónde
 * anotarlo no es un experimento, es una sugerencia.**
 *
 * Va a `bitacora` y no a una tabla nueva porque es exactamente lo mismo que una
 * nota del diario, con dos datos más: de qué experimento salió (`lineaId`) y que
 * se escribió mirando algo (`tipo`). Y por ir ahí, **el Analista la lee sola**:
 * `analista.ts` levanta las entradas de los últimos 30 días. Ese es el círculo
 * completo — la app propone, vos anotás, la próxima lectura lo tiene en cuenta.
 */
export async function anotarDeExperimento(lineaId: number, texto: string): Promise<boolean> {
  const t = texto.trim().slice(0, 500);
  if (!t || !Number.isInteger(lineaId)) return false;

  const ahora = new Date().toISOString();
  await db.insert(bitacora).values({ tipo: 'experimento', contenido: t, fecha: ahora, lineaId });

  // Anotar algo sobre el experimento ES actividad del experimento: si no, uno
  // que venís observando hace días figura como abandonado.
  await db.update(lineas).set({ ultimaActividad: ahora }).where(eq(lineas.id, lineaId));

  revalidatePath('/cosas-chicas');
  revalidatePath('/historial');
  revalidatePath('/chat');
  return true;
}

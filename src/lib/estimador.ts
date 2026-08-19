/**
 * El trabajo del worker que le pone estimación general a los objetivos nuevos.
 *
 * ── POR QUÉ EN EL WORKER Y NO AL CREAR EL OBJETIVO ───────────────────────────
 *
 * Gemma corre en la Mac de Matías y una respuesta se puede ir a treinta
 * segundos. Colgar el formulario de alta ese rato para conseguir una frase
 * accesoria —que además la mayoría de las veces va a ser "no sé"— sería pagar
 * toda la espera por la parte menos importante de la pantalla. El objetivo se
 * crea al toque y la estimación aparece cuando aparece.
 *
 * ── Y POR QUÉ NO SE REINTENTA ────────────────────────────────────────────────
 *
 * ⚠️ `estimacionHecha` se marca SIEMPRE, incluso cuando el modelo dijo que no
 * sabe o cuando falló la validación. "No sé" es la respuesta correcta y la
 * esperada para casi todo ("buscar trabajo", "volver a entrenar"), y en la base
 * se guarda igual que un error: como null. Sin la marca, el worker volvería a
 * preguntar lo mismo cada cinco minutos, para siempre, por cada objetivo que no
 * tenga una cifra publicada — o sea por casi todos.
 */

import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { objetivos } from '@/lib/db/schema';
import { llamarRol } from '@/lib/llm/roles';
import {
  concuerdan,
  ESQUEMA_ESTIMACION,
  ESQUEMA_ESTIMACION_WEB,
  validarEstimacion,
  validarEstimacionWeb,
} from '@/lib/estimacion-general';
import { buscar } from '@/lib/buscar';

/** Cuántos por pasada. De a poco: cada uno es una llamada larga a Ollama, y
 *  esto compite con el chat, que sí está esperando alguien del otro lado. */
const POR_PASADA = 3;

export async function estimarObjetivosNuevos(): Promise<number> {
  const pendientes = await db
    .select({ id: objetivos.id, titulo: objetivos.titulo, meta: objetivos.meta })
    .from(objetivos)
    .where(and(eq(objetivos.estado, 'activo'), eq(objetivos.estimacionHecha, false)))
    .limit(POR_PASADA);

  let puestas = 0;

  for (const o of pendientes) {
    let texto: string | null = null;
    let fuente: string | null = null;
    let verificada = false;

    const pedido = o.meta ? `${o.titulo}. Llegar es: ${o.meta}` : o.titulo;

    try {
      // ── 1. LA COMPUERTA: ¿ESTO ES DE LAS COSAS QUE TIENEN CIFRA PUBLICADA? ─
      //
      // ⚠️ ESTE PASO PARECE UN DESPERDICIO Y ES EL QUE SALVA TODO. La primera
      // versión buscaba de entrada, y el resultado fue PEOR que no buscar
      // (probado el 30/07 con `scripts/probar-estimador.ts`): para un objetivo
      // vago no existe cifra publicada, así que el buscador devuelve páginas que
      // comparten las palabras y contestan otra pregunta, y el modelo extrae
      // obedientemente un número de ahí. "Volver a entrenar" daba 48 horas —que
      // son de descanso entre series—, "escribir un libro" daba 3 horas de
      // Reddit —que son por día—, y "buscar trabajo" daba "64 meses, promedio
      // de 64 días", contradiciéndose adentro de la misma frase.
      //
      // El modelo de memoria, en cambio, se callaba en los tres. Sabe cuándo NO
      // sabe; lo que no tiene es el número exacto ni la fuente real. Así que
      // primero se le pregunta a él si esto es de las cosas que tienen una cifra
      // publicada, y solo si dice que sí se sale a buscarla.
      const crudoMemoria = await llamarRol('estimador', [{ rol: 'user', contenido: pedido }], {
        json: true,
        esquema: ESQUEMA_ESTIMACION,
      });
      const deMemoria = validarEstimacion(JSON.parse(crudoMemoria));

      if (deMemoria) {
        texto = deMemoria.texto;
        fuente = deMemoria.fuente;

        // ── 2. AHORA SÍ, A BUSCAR EL NÚMERO DE VERDAD ──────────────────────
        // ⚠️ Lo único que sale de la máquina es el título del objetivo más una
        // frase fija. Nada de sus registros. Ver la nota en `lib/buscar.ts`.
        const resultados = await buscar(`${o.titulo} cuántas horas suele llevar`);

        if (resultados && resultados.length > 0) {
          const lista = resultados
            .map((r, i) => `${i + 1}. [${r.dominio}] ${r.titulo}\n${r.texto}`)
            .join('\n\n');
          const crudo = await llamarRol(
            'estimador-web',
            [{ rol: 'user', contenido: `Título: ${pedido}\n\nResultados:\n${lista}` }],
            { json: true, esquema: ESQUEMA_ESTIMACION_WEB },
          );
          const est = validarEstimacionWeb(JSON.parse(crudo), resultados);

          // ⚠️ LA BÚSQUEDA CONFIRMA, NO PISA. Probado el 30/07: para el B2 trajo
          // 1200 horas de sprachschule.org, que es la cifra de C2 —lo decía en
          // su propia frase—, mientras que la memoria daba las 750 del Goethe,
          // que es la correcta. El buscador encuentra la tabla y el modelo se
          // equivoca de fila; y las fuentes que devuelve son blogs de SEO, no
          // el organismo que publica el dato.
          //
          // Así que solo se reemplaza cuando los dos números dicen lo mismo. Ahí
          // la búsqueda aporta lo único que la memoria no puede dar: una página
          // que existe de verdad. Cuando se contradicen, queda la cifra con
          // nombre y apellido, marcada "sin verificar" — que es la verdad.
          if (est && concuerdan(deMemoria, est)) {
            texto = est.texto;
            fuente = est.fuente;
            verificada = true;
          }
        }
      }

      if (texto) puestas += 1;
    } catch {
      // Ollama apagado, JSON roto, lo que sea: se marca como intentado igual.
      // Un objetivo sin la frase se ve perfecto; lo que no se puede es que el
      // worker se quede reintentando en loop contra un Ollama que no está.
    }

    await db
      .update(objetivos)
      .set({
        estimacionTexto: texto,
        estimacionFuente: fuente,
        estimacionHecha: true,
        estimacionVerificada: verificada,
      })
      .where(eq(objetivos.id, o.id));
  }

  return puestas;
}

/** Para volver a preguntar por uno puntual (cambió el título, o se quiere
 *  reintentar después de prender Ollama). No hay UI todavía; existe para que
 *  reintentar sea una línea y no un UPDATE a mano contra la base. */
export async function reabrirEstimacion(id: number): Promise<void> {
  await db
    .update(objetivos)
    .set({
      estimacionTexto: null,
      estimacionFuente: null,
      estimacionHecha: false,
      estimacionVerificada: false,
    })
    .where(eq(objetivos.id, id));
}

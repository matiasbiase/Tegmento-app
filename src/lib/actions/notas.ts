'use server';

import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { chatNotas, etiquetas, notaEtiquetas, notas } from '@/lib/db/schema';
import { CLAVES_ICONO_NOTA, DIAS_PAPELERA } from '@/lib/notas';
import { notaVacia, partirNota } from '@/lib/notas';
import { claveTema } from '@/lib/tema-clave';
import { ETIQUETA_IDEA, ETIQUETA_RELACION } from '@/lib/idea-marca';

// ⚠️ ACÁ NO SE LLAMA A NINGÚN ROL DE IA, Y ES A PROPÓSITO. Notas es el lugar que
// se tiene que SENTIR sin IA mientras se escribe: nada de título automático
// (como hacen los chats), nada de clasificar el tema, nada de sugerir. El texto
// llega igual al Analista, pero por el otro lado: él lee la tabla `notas` cuando
// corre su lectura (ver lib/analista.ts). Si algún día se agrega algo de IA acá,
// se rompe lo único que esta pantalla promete.

/**
 * Guarda la nota y devuelve su id.
 *
 * Es una sola acción para crear y para actualizar porque el editor no sabe (ni
 * tiene por qué saber) si la nota ya existe: se abre en blanco, se escribe, y en
 * el primer guardado nace. Con dos acciones separadas, el autoguardado tenía que
 * decidir cuál llamar antes de que la primera terminara y creaba dos notas.
 *
 * ⚠️ VACIARLA ES BORRARLA, como en Notas de Apple. Sin esto, entrar a "nueva
 * nota", arrepentirse y salir dejaba una fila vacía en la lista para siempre.
 * Devuelve null cuando no quedó nada guardado.
 */
export async function guardarNota(datos: { id: number | null; texto: string; carpeta?: string | null }): Promise<number | null> {
  const ahora = new Date().toISOString();
  const { titulo, cuerpo } = partirNota(datos.texto);

  if (notaVacia(datos.texto)) {
    if (datos.id !== null) {
      await db.delete(notas).where(eq(notas.id, datos.id));
      revalidatePath('/notas');
    }
    return null;
  }

  if (datos.id === null) {
    const [fila] = await db
      .insert(notas)
      .values({
        titulo,
        cuerpo,
        carpeta: datos.carpeta?.trim() || null,
        creado: ahora,
        actualizado: ahora,
      })
      .returning({ id: notas.id });
    revalidatePath('/notas');
    return fila.id;
  }

  // `carpeta` se pisa solo si vino en la llamada: el autoguardado del texto no
  // manda carpeta, y con un `?? null` pelado cada tecleada sacaba la nota de su
  // carpeta.
  await db
    .update(notas)
    .set({
      titulo,
      cuerpo,
      actualizado: ahora,
      ...(datos.carpeta !== undefined ? { carpeta: datos.carpeta?.trim() || null } : {}),
    })
    .where(eq(notas.id, datos.id));
  revalidatePath('/notas');
  return datos.id;
}

/**
 * BORRAR = MANDAR A LA PAPELERA (06/08). Se marca la fecha y la nota sale de la
 * lista; a los siete días se va de verdad.
 *
 * ⚠️ NO SE BORRA LA FILA. Era `db.delete` y no había vuelta atrás: **una nota es
 * texto que escribiste y no se puede reescribir**, que es lo que la separa de
 * una marca de actividad o un registro de sueño (esos se vuelven a poner en dos
 * toques). Es lo único de la app cuyo borrado es irreversible de verdad.
 */
export async function borrarNota(id: number): Promise<void> {
  await db.update(notas).set({ borrada: new Date().toISOString() }).where(eq(notas.id, id));
  revalidatePath('/notas');
}

/** Sacarla de la papelera. */
export async function restaurarNota(id: number): Promise<void> {
  await db.update(notas).set({ borrada: null }).where(eq(notas.id, id));
  revalidatePath('/notas');
}

/** Borrarla de verdad, desde la papelera. Esta sí no vuelve. */
export async function borrarNotaDefinitivo(id: number): Promise<void> {
  await db.delete(notas).where(eq(notas.id, id));
  revalidatePath('/notas');
}

/**
 * Limpia lo que pasó los siete días. Corre al abrir Notas.
 *
 * ⚠️ SIN CRON Y A PROPÓSITO: la papelera solo importa cuando estás mirando tus
 * notas. Un trabajo de fondo para esto sería infraestructura para nada — y esta
 * app corre en la Mac de Matías, que no siempre está prendida, así que un cron
 * tampoco garantizaría nada.
 */
export async function purgarNotasViejas(): Promise<void> {
  const limite = new Date(Date.now() - DIAS_PAPELERA * 86_400_000).toISOString();
  await db.delete(notas).where(and(isNotNull(notas.borrada), lt(notas.borrada, limite)));
}

/** Mover a una carpeta, o sacarla de la que tenía (`null`). */
export async function moverNota(id: number, carpeta: string | null): Promise<void> {
  await db
    .update(notas)
    .set({ carpeta: carpeta?.trim() || null, actualizado: new Date().toISOString() })
    .where(eq(notas.id, id));
  revalidatePath('/notas');
}

/**
 * Poner o sacar la llave de una nota.
 *
 * ⚠️ NO SE PIDE EL PIN ACÁ. Poner la llave no necesita permiso (estás mirando la
 * nota, ya la tenés abierta); sacarla sí lo pide, y eso lo hace la pantalla antes
 * de llamar. La acción es tonta a propósito: la regla vive en un solo lugar.
 */
export async function marcarNotaPrivada(id: number, privada: boolean): Promise<void> {
  await db.update(notas).set({ privada }).where(eq(notas.id, id));
  revalidatePath('/notas');
  revalidatePath(`/notas/${id}`);
}

/**
 * MANDAR UNA CHARLA A UNA NOTA (31/07, pedido de Matías).
 *
 * *"en el mismo chat, una flechita compartir a una nota"*. La charla se
 * REFERENCIA desde la nota y se dibuja adentro; sigue existiendo en Historial.
 *
 * ⚠️ DESDE EL 04/08 PUEDE ESTAR EN VARIAS. Antes era `chats.notaId`, un solo FK,
 * y "mandar a una nota" MUDABA. Ahora es un tilde por nota: poner y sacar. Ver
 * la nota larga de `chatNotas` en el schema, que guarda el argumento viejo —
 * seguía siendo bueno, y conviene leerlo antes de volver atrás.
 *
 * Devuelve si quedó adentro, para que el tilde no tenga que adivinarlo.
 *
 * ⚠️ ES UN TOGGLE Y NO DOS ACCIONES porque el control es UNO. Con `poner` y
 * `sacar` separados, dos toques rápidos podrían intentar insertar dos veces; acá
 * la PK compuesta lo hace imposible y el cliente no necesita saber el estado
 * antes de tocar.
 */
export async function alternarChatEnNota(chatId: number, notaId: number): Promise<{ dentro: boolean }> {
  const existe = await db
    .select({ chatId: chatNotas.chatId })
    .from(chatNotas)
    .where(and(eq(chatNotas.chatId, chatId), eq(chatNotas.notaId, notaId)));

  if (existe.length > 0) {
    await db.delete(chatNotas).where(and(eq(chatNotas.chatId, chatId), eq(chatNotas.notaId, notaId)));
  } else {
    await db.insert(chatNotas).values({ chatId, notaId, creado: new Date().toISOString() });
  }

  revalidatePath('/notas');
  revalidatePath('/historial');
  revalidatePath(`/notas/${notaId}`);
  return { dentro: existe.length === 0 };
}

/** En qué notas está una charla. Es lo que dibuja los tildes del menú. */
export async function notasDeChat(chatId: number): Promise<number[]> {
  const filas = await db.select({ notaId: chatNotas.notaId }).from(chatNotas).where(eq(chatNotas.chatId, chatId));
  return filas.map((f) => f.notaId);
}

/**
 * El emoji de la nota (04/08). `null` o vacío lo saca.
 *
 * ⚠️ ES SU PROPIA ACCIÓN Y NO UN CAMPO MÁS DE `guardarNota`, y no es capricho:
 * `guardarNota` corre en cada tecleada por el autoguardado del texto. Si el emoji
 * viajara ahí, cada letra lo reescribiría — y el mismo bug ya pasó con `carpeta`,
 * que necesitó un `!== undefined` para no borrarse sola al escribir (ver arriba).
 * Una acción aparte no puede caer en eso.
 *
 * ⚠️ Se recorta a dos "caracteres" contados por segmentos y no por `.length`:
 * un emoji con modificador de tono ("👍🏽") o una bandera son varios code units,
 * y `slice(0, 2)` los parte al medio dejando basura que no se dibuja.
 */
/**
 * ⚠️⚠️ ACÁ ESTABA EL BUG QUE ÉL VIO COMO *"aparece ID, t r"* (06/08).
 *
 * Esta función recortaba el valor a **dos grafemas** con `Intl.Segmenter` —
 * perfecto cuando lo que entraba era un emoji, que ocupa uno o dos—. El 06/08
 * los emojis pasaron a ser claves de ícono (`idea`, `trabajo`) **y esta poda
 * siguió ahí**: guardaba `id` y `tr`. Después `IconoNota` no reconocía esas
 * claves y las dibujaba como texto, tal cual él las leyó en la pantalla.
 *
 * **Es la trampa de cambiar el SIGNIFICADO de una columna sin mirar quién la
 * escribe.** El tipo no cambió —sigue siendo `text`— así que `tsc` no tenía nada
 * que decir, los tests no tocan esta acción y el build compila perfecto. Lo
 * encontró él usando la app, otra vez.
 *
 * Ahora se valida contra la lista real de íconos, y se dejan pasar los emojis
 * viejos (uno o dos grafemas) para no romper las notas que ya los tienen.
 */
export async function ponerEmojiNota(id: number, valorCrudo: string | null): Promise<void> {
  const limpio = valorCrudo?.trim() ?? '';
  let valor: string | null = null;
  if (limpio) {
    if (CLAVES_ICONO_NOTA.has(limpio)) {
      valor = limpio;
    } else {
      // Emoji viejo: se sigue guardando como antes, recortado a dos grafemas.
      const segs = Array.from(new Intl.Segmenter().segment(limpio), (s) => s.segment);
      valor = segs.slice(0, 2).join('') || null;
    }
  }
  await db.update(notas).set({ emoji: valor }).where(eq(notas.id, id));
  revalidatePath('/notas');
}

/**
 * PONER O SACAR UNA ETIQUETA DE UNA NOTA (04/08, §0.12c).
 *
 * ⚠️ LA ETIQUETA SE CREA SI NO EXISTE, en la misma llamada. Un flujo de "primero
 * creá la etiqueta, después ponésela" convierte anotar en administrar: nadie
 * abre un gestor de etiquetas para poder etiquetar una nota. Escribís el nombre
 * y ya está.
 *
 * ⚠️ SE COMPARA NORMALIZANDO LOS DOS LADOS, y esto no es teoría: es exactamente
 * el bug del 28/07 en `archivado.ts`, donde `t.nombre.toUpperCase() === nombre`
 * ponía en mayúsculas UN SOLO lado y cada chat archivado creaba un tema nuevo —
 * 52 temas para 52 chats, con "Finanzas" repetido tres veces. Sin esto,
 * "Trabajo" y "trabajo" serían dos etiquetas y el filtro no agruparía nada.
 *
 * ⚠️ Y ES UN TOGGLE, igual que `alternarChatEnNota`: el control es uno solo (el
 * chip), así que dos acciones separadas dejarían al cliente adivinando el estado
 * antes de tocar. La PK compuesta hace imposible el insert doble.
 */
export async function alternarEtiqueta(notaId: number, nombre: string): Promise<{ puesta: boolean }> {
  const limpio = nombre.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!limpio) return { puesta: false };

  // ⚠️ SE REUSA `claveTema` Y NO SE ESCRIBE UNA TERCERA NORMALIZACIÓN. Ya hay
  // dos en el proyecto (`normalizar` en lib/notas y esta), y la que arregló el
  // bug de los 52 temas es justo esta: una copia nueva es una copia que se
  // olvida de arreglar la próxima vez.
  const todas = await db.select().from(etiquetas);
  let et = todas.find((e) => claveTema(e.nombre) === claveTema(limpio));
  if (!et) {
    [et] = await db.insert(etiquetas).values({ nombre: limpio, creado: new Date().toISOString() }).returning();
  }
  if (!et) return { puesta: false };

  const ya = await db
    .select({ notaId: notaEtiquetas.notaId })
    .from(notaEtiquetas)
    .where(and(eq(notaEtiquetas.notaId, notaId), eq(notaEtiquetas.etiquetaId, et.id)));

  if (ya.length > 0) {
    await db
      .delete(notaEtiquetas)
      .where(and(eq(notaEtiquetas.notaId, notaId), eq(notaEtiquetas.etiquetaId, et.id)));
  } else {
    await db.insert(notaEtiquetas).values({ notaId, etiquetaId: et.id });
  }

  // ⚠️ UNA ETIQUETA QUE NO LE QUEDÓ A NADIE SE VA. Sin esto, cada nombre mal
  // tipeado queda para siempre en la lista de sugerencias y en tres semanas
  // elegir una etiqueta es peor que escribirla.
  await limpiarEtiquetasHuerfanas();

  revalidatePath('/notas');
  revalidatePath(`/notas/${notaId}`);
  return { puesta: ya.length === 0 };
}

async function limpiarEtiquetasHuerfanas(): Promise<void> {
  const usadas = new Set((await db.select({ id: notaEtiquetas.etiquetaId }).from(notaEtiquetas)).map((f) => f.id));
  for (const e of await db.select().from(etiquetas)) {
    if (!usadas.has(e.id)) await db.delete(etiquetas).where(eq(etiquetas.id, e.id));
  }
}

/** Todas las etiquetas que existen hoy, por nombre. Son las sugerencias. */
export async function leerEtiquetas(): Promise<string[]> {
  const filas = await db.select().from(etiquetas);
  return filas.map((e) => e.nombre).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

/**
 * GUARDAR UNA IDEA CONTADA AL CHAT (§2.2, hecho el 04/08).
 *
 * ⚠️⚠️ UNA IDEA ES UNA NOTA CON LA ETIQUETA "Idea". No hay tabla nueva, ni
 * pantalla nueva, ni cajita. Y no es economía: el 29/07 se construyó una cajita
 * y él fue tajante al verla —*"sacá la cajita, no tiene ningún sentido"*—; la
 * conclusión que quedó escrita ese día fue *"la próxima solución tiene que
 * atacar eso sin agregar un lugar nuevo"*. Esto es esa solución.
 *
 * ⚠️ Y CONTESTA LO QUE §2.2 DEJÓ ABIERTO —*"cómo evitar que se vuelva un
 * cementerio"*—: un cementerio es un lugar donde solo van cosas muertas. Entre
 * tus notas, una idea es una nota más, y la ves cuando mirás Notas por
 * cualquier otro motivo.
 *
 * ⚠️ NO REUSA `guardarNota`: esa acción corre en cada tecleada del autoguardado
 * y su contrato es "el editor manda todo el texto". Acá la nota nace entera de
 * un toque, y mezclarlas obligaría a `guardarNota` a distinguir dos orígenes.
 */
export async function guardarIdea(texto: string): Promise<{ ok: boolean; id?: number }> {
  const limpio = texto.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!limpio) return { ok: false };

  const ahora = new Date().toISOString();
  const [fila] = await db
    .insert(notas)
    .values({ titulo: limpio, cuerpo: '', creado: ahora, actualizado: ahora })
    .returning({ id: notas.id });
  if (!fila) return { ok: false };

  await alternarEtiqueta(fila.id, ETIQUETA_IDEA);
  revalidatePath('/notas');
  return { ok: true, id: fila.id };
}

/**
 * MANDAR UNA RELACIÓN A UNA NOTA (05/08, pedido de Matías).
 *
 * *"Todas tenían los tres puntitos para poder mandarlas a notas. Lo que
 * confirmaste también podría tener esos tres puntitos, para que te muestre que
 * la podés compartir."*
 *
 * ⚠️ ES UNA NOTA CON LA ETIQUETA "Relación", el mismo mecanismo que las ideas.
 * No hay tabla nueva ni pantalla nueva: es la misma decisión del 04/08 —*"la
 * próxima solución tiene que atacar eso sin agregar un lugar nuevo"*—, y encima
 * deja las relaciones guardadas junto a todo lo demás que te importa.
 *
 * ⚠️ Y VA CON CUERPO, NO SOLO TÍTULO. Una relación es una frase larga
 * ("cada vez que marcás Amigos, el ánimo que registrás es bien o genial"): como
 * título solo, la lista de Notas mostraría un renglón cortado. El título es el
 * cruce ("Gente → Ánimo") y la frase entera va adentro.
 */
export async function guardarRelacionEnNota(datos: {
  titulo: string;
  frase: string;
  evidencia?: string | null;
}): Promise<{ ok: boolean; id?: number }> {
  const titulo = datos.titulo.trim().replace(/\s+/g, ' ').slice(0, 90);
  const frase = datos.frase.trim();
  if (!titulo || !frase) return { ok: false };

  const cuerpoNota = datos.evidencia?.trim()
    ? `${frase}\n\n${datos.evidencia.trim()}`
    : frase;

  const ahora = new Date().toISOString();
  const [fila] = await db
    .insert(notas)
    .values({ titulo, cuerpo: cuerpoNota, creado: ahora, actualizado: ahora })
    .returning({ id: notas.id });
  if (!fila) return { ok: false };

  await alternarEtiqueta(fila.id, ETIQUETA_RELACION);
  revalidatePath('/notas');
  return { ok: true, id: fila.id };
}

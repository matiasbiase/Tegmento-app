import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, bitacora, chatMensajes, chats, temas } from '@/lib/db/schema';
import { llamarRol } from '@/lib/llm/roles';
import { limpiarTitulo } from '@/lib/titulo-chat';
import { claveTema } from '@/lib/tema-clave';
import { MINUTOS_CHAT_VIVO } from '@/lib/ventana-chat';
import { ESQUEMA_HECHOS, parsearHechos } from '@/lib/hechos-sueltos';

export async function archivarChatPorId(chatId: number): Promise<void> {
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
  if (!chat) throw new Error('Chat inexistente');

  const mensajes = await db
    .select()
    .from(chatMensajes)
    .where(eq(chatMensajes.chatId, chatId))
    .orderBy(asc(chatMensajes.creado));
  const transcript = mensajes.map((m) => `${m.rol === 'user' ? 'Matías' : 'Asistente'}: ${m.contenido}`).join('\n');

  const resumen = await llamarRol('cronista', [{ rol: 'user', contenido: `Transcripción:\n${transcript}` }]);

  // Hechos sueltos (29/07): lo que Matías cuenta al pasar y no tiene pantalla
  // propia ("dormí una siesta"). Sale de la charla ENTERA, una sola vez al
  // cerrarla, sin lista fija de categorías. Si falla, el chat se archiva igual
  // sin ellos: no es motivo para perder el resumen ni el título.
  let hechos: string[] = [];
  try {
    const crudoHechos = await llamarRol(
      'hechos',
      [{ rol: 'user', contenido: `Transcripción:\n${transcript}` }],
      { json: true, esquema: ESQUEMA_HECHOS },
    );
    hechos = parsearHechos(crudoHechos);
  } catch {
    // sin hechos sueltos esta vez
  }

  const [areasRows, temasRows] = await Promise.all([db.select().from(areas), db.select().from(temas)]);
  let temaId: number | null = null;
  let areaId: number | null = null;
  try {
    const crudo = await llamarRol(
      'clasificador',
      [
        {
          rol: 'user',
          contenido: `ÁREAS: ${areasRows.map((a) => a.nombre).join(', ')}\nTEMAS: ${temasRows.map((t) => t.nombre).join(', ') || '(ninguno)'}\n\nTEXTO:\n${transcript.slice(0, 3000)}`,
        },
      ],
      { json: true },
    );
    const parsed = JSON.parse(crudo) as { tema?: string; area?: string | null };
    if (parsed.tema) {
      const nombre = parsed.tema.trim().slice(0, 30);
      // ⚠️ SE COMPARA NORMALIZANDO LOS DOS LADOS. Acá decía
      // `t.nombre.toUpperCase() === nombre`, que pone en mayúsculas UN SOLO
      // lado: comparaba "VIDA SOCIAL" contra "Vida social" y nunca coincidía.
      // Consecuencia: **cada chat archivado creaba un tema nuevo**. El 28/07,
      // 52 de 52 temas tenían exactamente un chat, con "Finanzas" repetido 3
      // veces y "Planificación" 4. El Historial dice que agrupa por tema y
      // había tantos grupos como chats: la función existía y no agrupaba nada.
      const existente = temasRows.find((t) => claveTema(t.nombre) === claveTema(nombre));
      temaId = existente?.id ?? (await db.insert(temas).values({ nombre }).returning())[0].id;
    }
    if (parsed.area) {
      areaId = areasRows.find((a) => a.nombre.toUpperCase() === parsed.area!.toUpperCase())?.id ?? null;
    }
  } catch {
    // clasificación fallida: el chat se archiva igual, sin tema
  }

  // Al cerrar, el título se rehace con la charla ENTERA. El que puso el modelo
  // al arrancar salió de la primera línea; acá ya sabemos de qué se trató.
  let titulo: string | null = null;
  try {
    titulo = limpiarTitulo(await llamarRol('titulo', [{ rol: 'user', contenido: transcript.slice(0, 1500) }])) || null;
  } catch {
    // se queda el que tenía
  }

  const ahora = new Date().toISOString();
  await db.insert(bitacora).values({ tipo: 'chat', contenido: resumen.trim(), fecha: ahora, temaId, areaId, chatId });
  for (const h of hechos) {
    await db.insert(bitacora).values({ tipo: 'detectado', contenido: h, fecha: ahora, temaId, areaId, chatId });
  }
  await db
    .update(chats)
    .set({
      estado: 'archivado',
      titulo: titulo ?? chat.titulo,
      temaId: temaId ?? chat.temaId,
      areaId: areaId ?? chat.areaId,
      ultimaActividad: ahora,
    })
    .where(eq(chats.id, chatId));
}

/**
 * Archiva los chats que llevan `minutos` sin actividad: les saca el resumen, los
 * clasifica y les rehace el título con la charla entera.
 *
 * ⚠️ El default vive en `lib/ventana-chat.ts` y el worker lo pasa desde ahí. No
 * pongas un número acá: si este y el del reciclaje del Home se desincronizan,
 * la app archiva chats que ella misma va a reabrir (pasó: 30 min contra 6 h).
 */
export async function cerrarChatsInactivos(minutos = MINUTOS_CHAT_VIVO): Promise<number> {
  const limite = new Date(Date.now() - minutos * 60_000).toISOString();
  const abiertos = await db.select().from(chats).where(eq(chats.estado, 'abierto'));
  const vencidos = abiertos.filter((c) => c.ultimaActividad < limite);
  let cerrados = 0;
  for (const c of vencidos) {
    try {
      await archivarChatPorId(c.id);
      cerrados++;
    } catch {
      // si Gemma está caída, se reintenta en el próximo ciclo
    }
  }
  return cerrados;
}

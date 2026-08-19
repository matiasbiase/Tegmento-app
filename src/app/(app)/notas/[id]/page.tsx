import { asc, eq, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { chatMensajes, chatNotas, chats, etiquetas, notaEtiquetas, notas } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { EditorNota } from '@/components/notas/EditorNota';
import { leerEtiquetas } from '@/lib/actions/notas';
import type { MensajeEnNota } from '@/components/notas/ChatEnNota';

export const dynamic = 'force-dynamic';

export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();

  const [fila] = await db.select().from(notas).where(eq(notas.id, n)).limit(1);
  if (!fila) notFound();

  // Las charlas que viven en esta nota, con sus mensajes. Van en DOS consultas y
  // no en un join: un join repetiría el título de la charla en cada mensaje y
  // habría que volver a agruparlo acá igual. Son dos lecturas de una tabla chica.
  const susChats = await db
    .select({
      id: chats.id,
      titulo: chats.titulo,
      iniciado: chats.iniciado,
      ultimaActividad: chats.ultimaActividad,
    })
    .from(chats)
    .innerJoin(chatNotas, eq(chatNotas.chatId, chats.id))
    .where(eq(chatNotas.notaId, n))
    .orderBy(asc(chats.ultimaActividad));

  const ids = susChats.map((c) => c.id);
  const mensajes = ids.length
    ? await db
        .select({
          id: chatMensajes.id,
          chatId: chatMensajes.chatId,
          rol: chatMensajes.rol,
          contenido: chatMensajes.contenido,
        })
        .from(chatMensajes)
        .where(inArray(chatMensajes.chatId, ids))
        .orderBy(asc(chatMensajes.creado))
    : [];

  const porChat = new Map<number, MensajeEnNota[]>();
  for (const m of mensajes) {
    if (!porChat.has(m.chatId)) porChat.set(m.chatId, []);
    porChat.get(m.chatId)!.push({ id: m.id, rol: m.rol, contenido: m.contenido });
  }

  // Las etiquetas de ESTA nota, y todas las que existen para sugerir.
  const susEtiquetas = await db
    .select({ nombre: etiquetas.nombre })
    .from(etiquetas)
    .innerJoin(notaEtiquetas, eq(notaEtiquetas.etiquetaId, etiquetas.id))
    .where(eq(notaEtiquetas.notaId, n));
  const todas = await leerEtiquetas();

  return (
    <div className="flotar px-[22px] pt-2">
      {/* El título de la PANTALLA dice "Nota" y no el título de la nota: ese ya se
          está viendo, grande y en negro, dos centímetros más abajo. Repetirlo era
          leer lo mismo dos veces con dos tipografías distintas. */}
      {/* ⚠️ SIN `cerrarHref`: la cruz se mudó adentro del editor, junto al tilde y al tacho (06/08). Dejarla acá arriba también daría dos cruces. */}
      <TituloFijo titulo="Nota" />
      <div className="mt-4" />
      {/* ⚠️ Ya no se le pasan las etiquetas sugeridas: el bloque para escribirlas
          se sacó el 06/08 (*"solo si lo pone la IA"*). `leerEtiquetas` sigue acá
          arriba a propósito — cuando el Analista las ponga solo, el dato ya está
          y no hay que volver a armar la consulta. */}
      <EditorNota
        nota={{
          id: fila.id,
          titulo: fila.titulo,
          cuerpo: fila.cuerpo,
          privada: fila.privada,
          // ⚠️ FALTABA, Y ERA UN BUG DEL 04/08: el emoji se guardaba bien pero
          // esta página nunca lo pasaba, así que `ElegirEmoji` arrancaba siempre
          // en null y al volver a abrir la nota el emoji elegido no se veía.
          // `tsc` no lo puede ver: el campo es opcional, así que no pasarlo es
          // válido. Es el mismo tipo de agujero que el chip del ticket.
          emoji: fila.emoji,
          etiquetas: susEtiquetas.map((e) => e.nombre),
        }}
        chats={susChats.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          ultimaActividad: c.ultimaActividad,
          mensajes: porChat.get(c.id) ?? [],
        }))}
      />
    </div>
  );
}

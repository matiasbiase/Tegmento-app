import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chats, chatMensajes } from '@/lib/db/schema';
import { llamarRol } from '@/lib/llm/roles';
import { ollamaDisponible, type MensajeLLM } from '@/lib/llm/proveedor';
import { contextoAsistente } from '@/lib/contexto';
import { leerEntradaChat } from '@/lib/chatEntrada';
import { completarMarca, detectarActividad } from '@/lib/detector-actividad';
import { sacarPromesasFalsas } from '@/lib/promesas';
import { sacarComoloveSinOtro } from '@/lib/comolove';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chatId = Number(id);
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
  if (!chat) return NextResponse.json({ error: 'Chat inexistente' }, { status: 404 });

  const entrada = await leerEntradaChat(req);
  if (!entrada) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'Asistente offline, Ollama no está corriendo' }, { status: 503 });
  }

  const ahora = new Date().toISOString();
  // ⚠️ SE DEVUELVEN LOS IDS, y no es un detalle (29/07). El menú de los tres
  // puntitos de cada mensaje se dibuja solo si el mensaje tiene `id` —lo
  // necesita para destacar o borrar—, y los mensajes que el cliente agrega al
  // vuelo después de mandar no lo tenían. Resultado: los tres puntitos
  // aparecían en los mensajes viejos (los que llegan del server con id) y
  // NUNCA en los que acababas de escribir, hasta recargar la página.
  const [guardadoUser] = await db
    .insert(chatMensajes)
    .values({
      chatId,
      rol: 'user',
      contenido: entrada.contenido,
      adjuntoTipo: entrada.adjuntoTipo,
      adjuntoPath: entrada.adjuntoPath,
      creado: ahora,
    })
    .returning({ id: chatMensajes.id });

  const historial = await db
    .select()
    .from(chatMensajes)
    .where(eq(chatMensajes.chatId, chatId))
    .orderBy(asc(chatMensajes.creado));
  const mensajes: MensajeLLM[] = historial.slice(-20).map((m, i, arr) => ({
    rol: m.rol as 'user' | 'assistant',
    contenido: m.contenido,
    // solo la imagen del mensaje recién enviado viaja al modelo; las viejas quedan como texto
    imagenes: i === arr.length - 1 ? entrada.imagenes : undefined,
  }));

  // Igual que al abrir un chat: el detector corre al lado y solo completa la
  // marca si el asistente no la puso.
  const [cruda, deteccion] = await Promise.all([
    llamarRol('asistente', mensajes, { contexto: await contextoAsistente()}),
    detectarActividad(entrada.contenido),
  ]);
  // sacarPromesasFalsas va DESPUÉS de completarMarca: si la marca la puso el
  // detector, el texto igual puede estar afirmando que ya lo guardó.
  // `sacarComoloveSinOtro` mira EL MENSAJE DE MATÍAS, no la respuesta: quién está
  // involucrado lo dice él. Le sacamos el botón de "ver cómo lo puede haber
  // leído" cuando no hay ningún otro en lo que escribió.
  const respuesta = sacarComoloveSinOtro(
    sacarPromesasFalsas(completarMarca(cruda, deteccion)),
    entrada.contenido,
  );
  const [guardadoBot] = await db
    .insert(chatMensajes)
    .values({ chatId, rol: 'assistant', contenido: respuesta, creado: new Date().toISOString() })
    .returning({ id: chatMensajes.id });
  await db.update(chats).set({ ultimaActividad: new Date().toISOString(), estado: 'abierto' }).where(eq(chats.id, chatId));

  return NextResponse.json({ respuesta, idUser: guardadoUser?.id ?? null, idBot: guardadoBot?.id ?? null });
}

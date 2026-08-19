import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { chats, chatMensajes } from '@/lib/db/schema';
import { llamarRol } from '@/lib/llm/roles';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { contextoAsistente } from '@/lib/contexto';
import { leerEntradaChat } from '@/lib/chatEntrada';
import { completarMarca, detectarActividad } from '@/lib/detector-actividad';
import { sacarPromesasFalsas } from '@/lib/promesas';
import { sacarComoloveSinOtro } from '@/lib/comolove';
import { ponerTituloChat, tituloProvisorio } from '@/lib/titulo-chat';
import { expandirHerramienta } from '@/lib/herramientas-chat';
import { MINUTOS_MISMA_CHARLA } from '@/lib/ventana-chat';

export async function POST(req: Request) {
  const entrada = await leerEntradaChat(req);
  if (!entrada) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  if (!(await ollamaDisponible())) {
    return NextResponse.json({ error: 'Asistente offline, Ollama no está corriendo' }, { status: 503 });
  }

  const ahora = new Date().toISOString();

  // ── RECICLAR EN VEZ DE ABRIR UNO NUEVO (29/07, pedido de Matías) ──────────
  // Cada mensaje desde el Home creaba un chat. En dos semanas eso dio 53 chats
  // con 2,6 mensajes de promedio: 40 de ellos eran un mensaje tuyo y una
  // respuesta, y se acabó. **No es que hubiera 53 conversaciones: es que una
  // sola charla partida quedaba registrada como cuatro.**
  // Ahora, si venías hablando hace poco, se sigue ahí. El chat deja de ser un
  // ticket de una respuesta y pasa a ser algo a lo que volvés.
  //
  // El estado no importa: un chat archivado se reabre y listo. La ventana es la
  // misma que usa el archivador (HORAS_CHAT_VIVO), así que ya no pasa lo de
  // antes: cerrar a los 30 minutos algo que se iba a reabrir durante seis horas.
  // `continuar: false` (el botón "Nuevo chat" del menú) siempre abre uno limpio.
  let chat: { id: number } | undefined;
  let esNuevo = true;
  if (entrada.continuar !== false) {
    // ⚠️ LA VENTANA DE "MISMA CHARLA", NO LA DE "CHAT VIVO" (07/08). Eran el
    // mismo número y por eso seguir hablando a la tarde metía el tema de la
    // mañana en la misma conversación. Ver la nota larga en `ventana-chat.ts`.
    const limite = new Date(Date.now() - MINUTOS_MISMA_CHARLA * 60_000).toISOString();
    const [reciente] = await db
      .select({ id: chats.id, ultimaActividad: chats.ultimaActividad })
      .from(chats)
      .orderBy(desc(chats.ultimaActividad))
      .limit(1);
    if (reciente && reciente.ultimaActividad >= limite) {
      chat = { id: reciente.id };
      esNuevo = false;
      await db.update(chats).set({ ultimaActividad: ahora, estado: 'abierto' }).where(eq(chats.id, reciente.id));
    }
  }

  if (!chat) {
    // Provisorio: corta donde termina la idea, no en el carácter 60. Dura los
    // segundos que tarda el modelo en escribir el de verdad (abajo).
    const titulo = tituloProvisorio(entrada.contenido, entrada.adjuntoTipo === 'imagen');
    [chat] = await db.insert(chats).values({ titulo, iniciado: ahora, ultimaActividad: ahora }).returning();
  }
  await db.insert(chatMensajes).values({
    chatId: chat.id,
    rol: 'user',
    contenido: entrada.contenido,
    adjuntoTipo: entrada.adjuntoTipo,
    adjuntoPath: entrada.adjuntoPath,
    creado: ahora,
  });

  // El detector corre en paralelo con la respuesta: usa el modelo rápido y solo
  // completa la marca [+actividad:]/[+hecho:] si al asistente se le pasó.
  const [cruda, deteccion] = await Promise.all([
    // ⚠️ EL MODELO RECIBE LA INSTRUCCIÓN, LA BASE GUARDA EL HASHTAG (05/08).
    // Si el mensaje arranca con `#polaridad`, `expandirHerramienta` lo cambia
    // por el prompt largo de esa herramienta — pero SOLO acá, en el viaje al
    // modelo. Arriba, en el `insert`, ya quedó guardado lo que él escribió.
    // Ver `lib/herramientas-chat.ts`.
    llamarRol(
      'asistente',
      [{ rol: 'user', contenido: expandirHerramienta(entrada.contenido), imagenes: entrada.imagenes }],
      { contexto: await contextoAsistente() },
    ),
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
  await db
    .insert(chatMensajes)
    .values({ chatId: chat.id, rol: 'assistant', contenido: respuesta, creado: new Date().toISOString() });

  // El título de verdad lo escribe el modelo, y va SIN await a propósito: es
  // una llamada más y el usuario ya está esperando para entrar al chat. Mientras
  // tanto se ve el provisorio, y en un par de segundos se reemplaza solo.
  // El `.catch` no es decorativo: una promesa suelta que falla tumba el proceso
  // de Node.
  // Solo si el chat es nuevo: si estás continuando uno, el título ya lo escribió
  // el archivador mirando la charla ENTERA, y rehacerlo con el último mensaje lo
  // empeoraría (una conversación sobre el alemán pasaría a llamarse "tengo hambre").
  if (esNuevo) void ponerTituloChat(chat.id, entrada.contenido, respuesta).catch(() => {});

  return NextResponse.json({ chatId: chat.id });
}

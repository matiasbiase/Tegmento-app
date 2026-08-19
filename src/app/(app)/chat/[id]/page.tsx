import { asc, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { chatMensajes, chats, config, notas, objetivos, temas } from '@/lib/db/schema';
import { renombrarChat } from '@/lib/actions/chats';
import { ChatUI } from '@/components/chat/ChatUI';
import { CabeceraChat } from '@/components/chat/CabeceraChat';
import { notasQueRecibenChats } from '@/lib/notas-contenido';
import { tituloVisible } from '@/lib/notas';

export const dynamic = 'force-dynamic';

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hablar?: string }>;
}) {
  const { id } = await params;
  const { hablar } = await searchParams;
  const chatId = Number(id);
  const [chat] = await db.select().from(chats).where(eq(chats.id, chatId));
  if (!chat) notFound();

  const [mensajes, tema, cfgVozAuto, temasRows, objetivosAbiertos] = await Promise.all([
    db.select().from(chatMensajes).where(eq(chatMensajes.chatId, chatId)).orderBy(asc(chatMensajes.creado)),
    chat.temaId ? db.select().from(temas).where(eq(temas.id, chat.temaId)) : Promise.resolve([]),
    db.select().from(config).where(eq(config.clave, 'voz_auto')),
    // Para el selector de "agrupar mensajes": la lista completa de temas, para
    // elegir uno ya existente antes de escribir uno nuevo.
    db.select().from(temas),
    // Para el desplegable de "¿cuenta para algún objetivo?" al sumar una
    // actividad desde el chat. Solo los activos: colgar algo nuevo de uno ya
    // cerrado no significa nada, y le ensuciaría el arco al que sirve de
    // referencia para estimar el próximo.
    db
      .select({ id: objetivos.id, titulo: objetivos.titulo })
      .from(objetivos)
      .where(eq(objetivos.estado, 'activo'))
      .orderBy(desc(objetivos.arranco)),
  ]);
  const vozAuto = cfgVozAuto[0]?.valor === '1';

  // A qué notas se puede mandar esta charla. ⚠️ Las privadas quedan afuera desde
  // el server, igual que en el Historial: esta pantalla tampoco tiene llave, así
  // que si viajaran, los títulos privados estarían en el HTML de una pantalla
  // sin candado. Ver `notasQueRecibenChats`.
  const notasElegibles = notasQueRecibenChats(
    await db.select({ id: notas.id, titulo: notas.titulo, privada: notas.privada }).from(notas).orderBy(desc(notas.actualizado)),
    false,
  ).map((n) => ({ id: String(n.id), nombre: tituloVisible(n), cuantas: 0 }));

  return (
    // ⚠️ El margen negativo NO es un truco sucio: el layout de la app ya empuja
    // todo por debajo del notch (`pt-[env(safe-area-inset-top)]`), y el
    // encabezado fijo necesita ese espacio ADENTRO para que su vidrio tape la
    // franja del reloj cuando scrolleás. Sin esto, el safe-area se contaba dos
    // veces y quedaba un hueco blanco enorme arriba (lo vio Matías, 27/07).
    <div style={{ marginTop: 'calc(env(safe-area-inset-top) * -1)' }}>
      {/* ENCABEZADO FIJO (27/07, pedido de Matías): antes scrolleaba con la
          conversación, así que en un chat largo tenías que volver arriba de todo
          para archivar o para volver. Ahora se queda.
          ⚠️ `sticky` y no `fixed`: el chat vive dentro del contenedor centrado
          de la app (max-w-md), y un `fixed` acá se saldría de esa columna. Y
          `sticky` tampoco rompe el desplazamiento del menú lateral.
          El vidrio es para que el texto que pasa por debajo no se lea a medias. */}
      <div className="glass-ios sticky top-0 z-20 px-[22px] py-2.5 pt-[calc(env(safe-area-inset-top)+10px)]">
        <CabeceraChat
          chatId={chat.id}
          titulo={chat.titulo}
          archivado={chat.estado === 'archivado'}
          tema={tema[0]?.nombre ?? null}
          notas={notasElegibles}
          onRenombrarAction={renombrarChat.bind(null, chat.id)}
        />
      </div>
      <ChatUI
        chatId={chat.id}
        vozAuto={vozAuto}
        hablarInicial={hablar === '1'}
        temas={temasRows}
        objetivosAbiertos={objetivosAbiertos}
        iniciales={mensajes.map((m) => ({
          id: m.id,
          destacado: m.destacado,
          rol: m.rol,
          contenido: m.contenido,
          adjuntoTipo: m.adjuntoTipo,
          adjuntoPath: m.adjuntoPath,
          // La fecha viaja para poder plegar por día lo de las charlas
          // anteriores (ver lib/sesiones). Sin esto, un chat reciclado es un
          // scroll infinito donde lo de hoy queda enterrado.
          creado: m.creado,
          // A qué tema quedó agrupado ("cristalizar"), si a alguno.
          temaId: m.temaId,
        }))}
      />
    </div>
  );
}

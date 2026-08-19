import Link from 'next/link';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatMensajes, chats } from '@/lib/db/schema';
import { etiquetaFecha } from '@/lib/fechas';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { CampoBuscar } from '@/components/buscar/CampoBuscar';

export const dynamic = 'force-dynamic';

/**
 * BUSCAR EN LO QUE HABLASTE.
 *
 * Pedido de Matías (29/07): *"un buscador dentro del chat en general, cuando
 * abrís la hamburguesa. Podés buscar por estrellitas, o alguna información en
 * particular"*.
 *
 * Es la otra mitad de la estrella: destacar un mensaje sin poder volver a
 * encontrarlo no sirve de nada.
 *
 * Busca en el TEXTO de los mensajes y no en los títulos de los chats: los
 * títulos los escribe el modelo y son un resumen, así que lo que uno recuerda
 * ("le había dicho algo del alquiler") casi nunca está ahí.
 */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; destacados?: string; chat?: string }>;
}) {
  const { q, destacados, chat } = await searchParams;
  const texto = (q ?? '').trim();
  const soloDestacados = destacados === '1';

  /**
   * ⚠️ BUSCAR DENTRO DE UNA CHARLA (05/08, pedido de Matías: *"que aparezca una
   * lupa para buscar… dentro del mismo chat también"*). Con `?chat=12` la
   * búsqueda se acota a esa charla, y arriba aparece una pastilla que dice en
   * cuál estás y deja salir a buscar en todas.
   *
   * ⚠️ NO ES UNA PANTALLA NUEVA, y es a propósito: buscar en una charla y buscar
   * en todas son la misma pregunta con distinto alcance. Dos buscadores
   * distintos habrían sido dos cajas de texto que se comportan casi igual — el
   * error que esta app ya cometió con las dos pantallas de relaciones.
   */
  const chatId = Number(chat);
  const soloEsteChat = Number.isInteger(chatId) && chatId > 0;

  // Sin texto y sin filtro no se lista todo: sería volcar la conversación entera
  // en una pantalla de búsqueda. Con la estrella sí, porque eso ya es un filtro.
  // Acotado a una charla también: ahí "todo" es una charla, no la app entera.
  const buscar = texto.length >= 2 || soloDestacados || soloEsteChat;

  const filas = buscar
    ? await db
        .select({
          id: chatMensajes.id,
          chatId: chatMensajes.chatId,
          rol: chatMensajes.rol,
          contenido: chatMensajes.contenido,
          creado: chatMensajes.creado,
          destacado: chatMensajes.destacado,
          titulo: chats.titulo,
        })
        .from(chatMensajes)
        .innerJoin(chats, eq(chats.id, chatMensajes.chatId))
        .where(
          and(
            soloEsteChat ? eq(chatMensajes.chatId, chatId) : undefined,
            soloDestacados ? eq(chatMensajes.destacado, true) : undefined,
            texto.length >= 2 ? or(like(chatMensajes.contenido, `%${texto}%`)) : undefined,
          ),
        )
        .orderBy(desc(chatMensajes.creado))
        .limit(50)
    : [];

  const tituloDelChat = soloEsteChat
    ? ((await db.select({ t: chats.titulo }).from(chats).where(eq(chats.id, chatId)))[0]?.t ?? null)
    : null;

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Buscar" />
      <CampoBuscar valorInicial={texto} soloDestacados={soloDestacados} />

      {/* La pastilla del alcance: dice dónde estás buscando y es la salida. Sin
          esto, buscar acotado y no encontrar nada se lee como "no existe en la
          app" cuando puede estar en la charla de al lado. */}
      {soloEsteChat && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="min-w-0 truncate rounded-full bg-iris-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-iris-deep">
            Solo en {tituloDelChat ?? 'esta charla'}
          </span>
          <Link
            href={`/buscar${texto ? `?q=${encodeURIComponent(texto)}` : ''}`}
            className="flex-none font-mono text-[11px] font-semibold text-iris"
          >
            Buscar en todas
          </Link>
        </div>
      )}

      {!buscar ? (
        <p className="mt-4 tarjeta border border-iris-borde bg-white text-[14px] leading-relaxed text-niebla text-pretty">
          Escribí al menos dos letras, o tocá la estrella para ver solo lo que destacaste.
        </p>
      ) : filas.length === 0 ? (
        <p className="mt-4 tarjeta border border-iris-borde bg-white text-[14px] leading-relaxed text-niebla text-pretty">
          {soloDestacados && !texto
            ? 'Todavía no destacaste ningún mensaje. Se hace desde los tres puntitos, en cualquier mensaje del chat.'
            : `No encontré nada con “${texto}”.`}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="font-mono text-[11px] text-niebla">
            {filas.length}
            {filas.length === 50 ? '+' : ''} {filas.length === 1 ? 'resultado' : 'resultados'}
          </p>
          {filas.map((f) => (
            <Link
              key={f.id}
              href={`/chat/${f.chatId}`}
              className="block rounded-[16px] border border-iris-borde bg-white p-[13px_15px]"
            >
              <div className="mb-1 flex items-center gap-1.5">
                {f.destacado && (
                  <svg viewBox="0 0 24 24" className="size-[12px] flex-none text-oro-2" fill="currentColor" aria-hidden="true">
                    <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />
                  </svg>
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] font-semibold tracking-[0.2px] text-iris-deep">
                  {f.titulo}
                </span>
                <span className="flex-none font-mono text-[10.5px] text-niebla-2">{etiquetaFecha(f.creado)}</span>
              </div>
              {/* Tres renglones y corta: alcanza para reconocerlo, y el mensaje
                  entero está a un toque de distancia. */}
              <p className="line-clamp-3 text-[14px] leading-snug text-tinta text-pretty">
                {f.rol === 'user' ? '' : '· '}
                {f.contenido}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

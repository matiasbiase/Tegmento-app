'use client';

import { useState } from 'react';
import { etiquetaFecha } from '@/lib/fechas';
import { alternarChatEnNota } from '@/lib/actions/notas';
import { useRouter } from 'next/navigation';

/**
 * UNA CHARLA ADENTRO DE UNA NOTA: RECTÁNGULO, TÍTULO Y PALOMITA.
 *
 * Diseño de Matías (31/07): *"los chats dentro de notas se vean como un
 * rectángulo con el título del chat y con una palomita que despliegue el chat, y
 * que cuando salís y ves ese rectángulo se vea con este fondo de vidrio"*.
 *
 * ── POR QUÉ SE DESPLIEGA ACÁ Y NO TE LLEVA AL CHAT ───────────────────────────
 *
 * Porque la nota es el contenedor: si tocar la charla te sacara a otra pantalla,
 * la nota volvería a ser una lista de links y no un lugar donde las cosas están.
 * El texto de arriba y el de abajo siguen ahí mientras leés la charla, que es lo
 * que hace que se entienda por qué la guardaste en ESTA nota.
 *
 * ── ⚠️ CERRADO ES DE VIDRIO, ABIERTO ES BLANCO ───────────────────────────────
 *
 * No es decoración: es lo que dice cuál está abierto. El vidrio es el envoltorio
 * ("acá hay algo guardado") y el blanco es el contenido ("esto lo estás
 * leyendo") — la misma división que ya usan la tarjeta de anillos y las tarjetas
 * del bot en toda la app. Si los dos fueran iguales habría que mirar la palomita,
 * que mide 16 píxeles.
 *
 * ── LOS MENSAJES VIENEN DEL SERVER, TODOS ────────────────────────────────────
 *
 * No se piden al desplegar. Una charla son unas decenas de mensajes de texto:
 * pedirlos aparte agrega un estado de carga, un error posible y un parpadeo, a
 * cambio de ahorrar unos kilobytes en una pantalla que ya cargó la nota entera.
 */

export type MensajeEnNota = { id: number; rol: string; contenido: string };

export function ChatEnNota({
  chat,
  notaId,
}: {
  chat: { id: number; titulo: string; ultimaActividad: string; mensajes: MensajeEnNota[] };
  notaId: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [sacando, setSacando] = useState(false);
  const router = useRouter();

  async function sacar() {
    if (sacando) return;
    setSacando(true);
    // No hace falta confirmación: la charla no se borra, vuelve al Historial
    // donde ya vivía. Un diálogo para algo reversible es ruido.
    // ⚠️ La saca de ESTA nota y de ninguna otra (04/08). Antes `null` la sacaba
    // de la única que podía tener; ahora el toggle es por nota, así que si la
    // charla está también en otras, ahí se queda.
    await alternarChatEnNota(chat.id, notaId);
    router.refresh();
  }

  return (
    <div
      className={`mb-2.5 overflow-hidden rounded-[18px] border border-iris-borde ${
        abierto ? 'bg-white' : 'glass-tinte'
      }`}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2.5 p-[11px_12px] text-left"
      >
        <span className="flex size-[26px] flex-none items-center justify-center rounded-[8px] bg-iris-soft text-iris-deep">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
            <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-tinta">{chat.titulo}</span>
          {/* El ícono repite el globito a propósito: el número solo ("12 · martes")
              no dice de qué son doce. Es la reducción que pidió Matías, sin perder
              qué se está contando. */}
          <span className="mt-px flex items-center gap-1 font-mono text-[10.5px] text-niebla">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[10px] flex-none">
              <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
            </svg>
            {chat.mensajes.length} · {etiquetaFecha(chat.ultimaActividad)}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          className={`size-4 flex-none text-niebla transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="border-t border-[#ececf6] bg-white px-3 pb-3 pt-0.5">
          {chat.mensajes.map((m) => (
            <div
              key={m.id}
              className={`mt-2.5 max-w-[84%] rounded-[13px] p-[8px_11px] text-[12.5px] leading-[1.4] ${
                m.rol === 'user'
                  ? 'ml-auto rounded-br-[5px] bg-iris-soft text-tinta'
                  : 'rounded-bl-[5px] border border-[#ececf6] bg-papel-2 text-tinta'
              }`}
            >
              {m.contenido}
            </div>
          ))}
          {chat.mensajes.length === 0 && (
            <p className="mt-2.5 text-[12.5px] text-niebla">Esta charla no tiene mensajes.</p>
          )}
          {/* Sacarla vive ADENTRO, con la charla desplegada: es una acción sobre
              algo que estás mirando. Arriba, al lado del título, competiría con
              la palomita — que es lo que se toca todo el tiempo. */}
          <button
            type="button"
            onClick={sacar}
            disabled={sacando}
            className="mt-3 font-mono text-[11px] font-semibold text-niebla-2 disabled:opacity-50"
          >
            Sacar de esta nota
          </button>
        </div>
      )}
    </div>
  );
}

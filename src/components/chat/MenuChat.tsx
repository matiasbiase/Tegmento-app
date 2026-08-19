'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MenuFlotante, FilaMenu } from '@/components/ui/MenuFlotante';
import { HojaElegirOCrear } from '@/components/ui/HojaElegirOCrear';
import { guardarNota, alternarChatEnNota, notasDeChat } from '@/lib/actions/notas';
import { archivarChatId } from '@/lib/actions/chats';

/**
 * LOS TRES PUNTITOS DE LA CONVERSACIÓN ENTERA.
 *
 * Pedido de Matías (01/08): *"quiero que en cada chat haya tres puntitos y te
 * deje compartir. También la estrellita, cuando querés buscar los destacados,
 * que te aparezca ahí. Y el lápiz para editar los títulos, también adentro de
 * los tres puntitos"*.
 *
 * ⚠️ ES UNA MUDANZA, NO UNA SUMA. Las tres acciones ya existían, sueltas y cada
 * una con su forma: el lápiz aparecía al tocar el título (invisible hasta que lo
 * descubrías), los destacados solo desde el buscador del menú lateral, y mandar
 * una charla a una nota únicamente desde el Historial. La cabecera además tenía
 * un botón "Archivar" con forma de pastilla al lado de una flecha redonda, que
 * es la mitad del problema de alineación que él marcó.
 *
 * ⚠️ EL LÁPIZ NO DESAPARECE DEL TÍTULO: el menú DISPARA la misma edición en el
 * renglón. Son dos puertas a lo mismo, no dos formas de renombrar. Si el menú
 * abriera un diálogo aparte habría dos maneras distintas de cambiar un título y
 * la app volvería al problema que resolvió `TituloEditable`.
 */

const Ico = {
  lapiz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px] text-iris">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
    </svg>
  ),
  compartir: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px] text-iris">
      <path d="M12 15.5V3.5M8.5 7l3.5-3.5L15.5 7" />
      <path d="M5.5 12.5v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" />
    </svg>
  ),
  estrella: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" className="size-[15px] text-oro-2">
      <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />
    </svg>
  ),
  // La misma lupa del menú lateral: un concepto, un dibujo.
  lupa: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[15px] text-iris">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  archivar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px] text-verde">
      <rect x="3" y="4" width="18" height="4.5" rx="1.4" />
      <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4" />
    </svg>
  ),
};

export type NotaElegible = { id: string; nombre: string; cuantas: number };

export function MenuChat({
  chatId,
  archivado,
  notas = [],
  onRenombrar,
}: {
  chatId: number;
  archivado: boolean;
  notas?: NotaElegible[];
  /** Enciende la edición del título en el renglón, que es donde ya vive. */
  onRenombrar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [eligiendoNota, setEligiendoNota] = useState(false);
  // En qué notas ya está la charla. Se pide al abrir la hoja, no al montar el
  // menú: es una consulta por una charla que quizás nunca mandes a ningún lado.
  const [enNotas, setEnNotas] = useState<Set<number>>(new Set());
  const [, empezar] = useTransition();
  const boton = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  async function abrirElegir() {
    setEligiendoNota(true);
    try {
      setEnNotas(new Set(await notasDeChat(chatId)));
    } catch {
      setEnNotas(new Set());
    }
  }

  /**
   * ⚠️ NO NAVEGA, Y ESE ES EL CAMBIO ENTERO (04/08). Antes esto MUDABA la charla
   * y te llevaba a la nota, lo cual tenía sentido cuando solo podía estar en una:
   * elegiste, listo. Con varias, irse después del primer tilde hace imposible
   * marcar el segundo.
   *
   * La hoja queda abierta y el tilde cambia en el acto (optimista, como la
   * estrellita de las noticias): si el server falla, se revierte.
   */
  async function alternar(notaId: number) {
    const antes = new Set(enNotas);
    setEnNotas((prev) => {
      const c = new Set(prev);
      if (c.has(notaId)) c.delete(notaId);
      else c.add(notaId);
      return c;
    });
    try {
      await alternarChatEnNota(chatId, notaId);
      router.refresh();
    } catch {
      setEnNotas(antes);
    }
  }

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Opciones de la charla"
        aria-expanded={abierto}
        // ⚠️ MISMA CAJA QUE LA FLECHA DE VOLVER (size-9, redonda, blanca con la
        // misma sombra). Antes acá había una pastilla rectangular de otra altura
        // y los dos extremos de la fila no se leían como un par.
        className="grid size-9 flex-none place-items-center rounded-full bg-white text-niebla shadow-[0_4px_14px_rgba(50,50,90,.06)]"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-[17px]">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      <MenuFlotante abierto={abierto} anclaRef={boton} onCerrar={() => setAbierto(false)} ancho={208}>
        <FilaMenu
          primera
          icono={Ico.lapiz}
          onClick={() => {
            setAbierto(false);
            onRenombrar();
          }}
        >
          Cambiarle el nombre
        </FilaMenu>

        <FilaMenu
          icono={Ico.compartir}
          onClick={() => {
            setAbierto(false);
            setEligiendoNota(true);
          }}
        >
          Mandar a una nota
        </FilaMenu>

        {/* ⚠️ BUSCAR, DESDE ADENTRO DE LA CHARLA (05/08, pedido de Matías: *"en
            los tres puntos de arriba, que aparezca una lupa para buscar… dentro
            del mismo chat también"*). El buscador existía desde el 29/07 pero
            solo se llegaba por el menú lateral, o sea **saliendo de la charla en
            la que estabas buscando**. Arranca acotado a esta charla y la pantalla
            ofrece salir a buscar en todas. */}
        <FilaMenu
          icono={Ico.lupa}
          onClick={() => {
            setAbierto(false);
            router.push(`/buscar?chat=${chatId}`);
          }}
        >
          Buscar en esta charla
        </FilaMenu>

        <FilaMenu
          icono={Ico.estrella}
          onClick={() => {
            setAbierto(false);
            router.push('/buscar?destacados=1');
          }}
        >
          Ver los destacados
        </FilaMenu>

        {!archivado && (
          <FilaMenu
            icono={Ico.archivar}
            onClick={() => {
              setAbierto(false);
              empezar(async () => {
                await archivarChatId(chatId);
                router.refresh();
              });
            }}
          >
            Archivar la charla
          </FilaMenu>
        )}
      </MenuFlotante>

      {eligiendoNota && (
        <HojaElegirOCrear
          titulo="En qué notas va"
          subtitulo="Puede estar en varias. Tocá para poner o sacar; la charla se sigue viendo acá."
          items={notas}
          placeholderNuevo="Nombre de la nota nueva"
          textoNuevo="Crear la nota y mandarla ahí"
          renderFinal={(n) =>
            enNotas.has(Number(n.id)) ? (
              // El tilde reemplaza al número cuando la charla está adentro: el
              // dato importante pasa a ser "está o no", no cuántas tiene la nota.
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[14px] flex-none text-iris">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="flex-none font-mono text-[11px] text-niebla-2">{n.cuantas > 0 ? n.cuantas : ''}</span>
            )
          }
          onElegir={(n) => alternar(Number(n.id))}
          onCrear={async (nombre) => {
            const id = await guardarNota({ id: null, texto: nombre });
            // `guardarNota` devuelve null con el texto vacío (vaciarla es
            // borrarla): sin nota no hay a dónde mandarla.
            if (id) await alternar(id);
            else setEligiendoNota(false);
          }}
          onCerrar={() => setEligiendoNota(false)}
        />
      )}
    </>
  );
}

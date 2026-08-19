'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TituloEditable } from '@/components/ui/TituloEditable';
import { MenuChat, type NotaElegible } from '@/components/chat/MenuChat';

/**
 * LA FILA DE ARRIBA DEL CHAT: volver, el título, y los tres puntitos.
 *
 * ⚠️ EXISTE PARA QUE LOS TRES EXTREMOS SE ALINEEN (01/08, Matías: *"están
 * desalineados los íconos, hay muchísimos errores de alineación"*).
 *
 * Antes esto vivía suelto en la página: a la izquierda una flecha redonda de
 * 36px, a la derecha un botón "Archivar" con forma de pastilla rectangular de
 * otra altura, y el título en el medio con su propia caja. Tres alturas
 * distintas en una fila de tres elementos — no había forma de que se leyeran
 * como una barra.
 *
 * Ahora los dos extremos son **la misma caja** (`size-9`, redonda, blanca, misma
 * sombra) y el bloque del medio es el único que crece. Archivar se fue adentro
 * del menú, que es donde va lo que se usa una vez cada mucho.
 *
 * Y es cliente porque el lápiz del menú tiene que encender la edición del
 * título: son dos componentes que comparten un estado, y ese estado necesita un
 * dueño común.
 */
export function CabeceraChat({
  chatId,
  titulo,
  archivado,
  tema,
  notas,
  onRenombrarAction,
}: {
  chatId: number;
  titulo: string;
  archivado: boolean;
  tema?: string | null;
  notas?: NotaElegible[];
  /** La server action ya con el id puesto (`renombrarChat.bind`). */
  onRenombrarAction: (nuevo: string) => void | Promise<void>;
}) {
  // Sube de a uno cada vez que tocás "Cambiarle el nombre". Ver `senalEditar`.
  const [senal, setSenal] = useState(0);

  return (
    <div className="mb-3 flex items-center gap-2.5">
      <Link
        href="/chat"
        aria-label="Volver"
        className="grid size-9 flex-none place-items-center rounded-full bg-white shadow-[0_4px_14px_rgba(50,50,90,.06)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#1c1c2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>

      <div className="min-w-0 flex-1">
        <TituloEditable
          valor={titulo}
          onGuardar={onRenombrarAction}
          etiqueta="Cambiarle el nombre a la charla"
          className="text-[16px] font-semibold text-tinta"
          senalEditar={senal}
          // El lápiz vive en los tres puntitos, no al lado del título: dos
          // lápices para lo mismo en la misma fila.
          conLapiz={false}
        />
        {/* Las etiquetas solo si hay alguna: un `div` vacío con `mt` igual
            empujaba el título hacia arriba y lo descentraba contra los botones
            de los costados. */}
        {(tema || archivado) && (
          <div className="mt-0.5 flex items-center gap-2">
            {tema && (
              <span className="rounded-lg bg-iris-soft px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-iris-deep">
                {tema}
              </span>
            )}
            {archivado && (
              <span className="rounded-lg bg-verde-tint px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-verde">
                Archivado
              </span>
            )}
          </div>
        )}
      </div>

      <MenuChat
        chatId={chatId}
        archivado={archivado}
        notas={notas}
        onRenombrar={() => setSenal((n) => n + 1)}
      />
    </div>
  );
}

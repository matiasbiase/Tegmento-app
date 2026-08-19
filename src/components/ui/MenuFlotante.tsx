'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * UN DESPLEGABLE QUE SE DIBUJA ENCIMA DE TODO, DE VERDAD.
 *
 * ⚠️ EXISTE POR UN BUG CONCRETO Y REPETIDO (01/08). Matías: *"cuando tocás los
 * tres puntitos de cada conversación, [el menú] aparece debajo del mensaje
 * anterior o el siguiente"*.
 *
 * La causa es la MISMA que dejó la cruz de cerrar flotando en el medio de la
 * pantalla de Nota, y vale entenderla una vez porque va a volver a aparecer:
 *
 * Cada burbuja del chat lleva la clase `.flotar`, que es
 * `animation: flotar .3s both`. El `both` deja aplicado el `transform` del
 * último frame **para siempre**, y un elemento con transform:
 *   1. crea un CONTEXTO DE APILADO propio, y
 *   2. se convierte en el marco de referencia de sus hijos `position: fixed`.
 *
 * Por (1), un `z-index: 50` puesto adentro de una burbuja solo compite contra
 * los hermanos DE ESA burbuja. Contra las otras burbujas no puede: el orden lo
 * decide quién va después en el DOM, así que el menú del mensaje 3 siempre
 * queda debajo del mensaje 4. Subir el z-index no arregla nada — el número no
 * sale de su caja.
 *
 * La única salida es sacar el menú de esa caja: se dibuja por portal en
 * `document.body` y se posiciona con coordenadas de pantalla, medidas del botón
 * que lo abrió.
 *
 * ── LO QUE HACE ADEMÁS ───────────────────────────────────────────────────────
 *
 * - **Se da vuelta solo** si el botón está cerca del pie: un menú que se abre
 *   hacia abajo en el último mensaje queda tapado por la barra de escribir.
 * - **Se cierra al scrollear**, porque al ir por portal ya no viaja pegado a su
 *   botón: si te movés, el menú se quedaría flotando sobre otra cosa.
 * - Cierra con `Escape` y tocando afuera.
 */

const MARGEN = 8;

export function MenuFlotante({
  abierto,
  anclaRef,
  onCerrar,
  ancho = 176,
  children,
}: {
  abierto: boolean;
  /** El botón que lo abre. De ahí salen las coordenadas. */
  anclaRef: React.RefObject<HTMLElement | null>;
  onCerrar: () => void;
  ancho?: number;
  children: React.ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

  // `useLayoutEffect` y no `useEffect`: mide y coloca ANTES de pintar. Con el
  // efecto normal, el menú aparece un frame en la esquina y salta a su lugar.
  useLayoutEffect(() => {
    if (!abierto || !anclaRef.current) return;
    const r = anclaRef.current.getBoundingClientRect();
    const alto = caja.current?.offsetHeight ?? 160;
    const cabeAbajo = r.bottom + alto + MARGEN < window.innerHeight;
    setPos({
      top: cabeAbajo ? r.bottom + 6 : Math.max(MARGEN, r.top - alto - 6),
      // Alineado a la derecha del botón, sin salirse de la pantalla.
      left: Math.min(Math.max(MARGEN, r.right - ancho), window.innerWidth - ancho - MARGEN),
    });
  }, [abierto, anclaRef, ancho]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (caja.current?.contains(e.target as Node)) return;
      if (anclaRef.current?.contains(e.target as Node)) return;
      onCerrar();
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', onCerrar, true);
    window.addEventListener('resize', onCerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('touchstart', fuera);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', onCerrar, true);
      window.removeEventListener('resize', onCerrar);
    };
  }, [abierto, anclaRef, onCerrar]);

  if (!montado || !abierto) return null;

  return createPortal(
    <div
      ref={caja}
      role="menu"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: ancho,
        // Por encima de la barra de escribir y del menú lateral, que es lo único
        // que puede quedar arriba de un mensaje.
        zIndex: 60,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="overflow-hidden rounded-[13px] border border-iris-borde bg-white shadow-[0_8px_28px_rgba(50,50,90,.16)]"
    >
      {children}
    </div>,
    document.body,
  );
}

/** Una fila del menú. Existe para que todas midan y se alineen igual: el ícono
 *  en una caja fija de 15px y el texto arrancando siempre en el mismo x. */
export function FilaMenu({
  icono,
  children,
  onClick,
  tono = 'normal',
  primera = false,
}: {
  icono: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  tono?: 'normal' | 'alerta';
  primera?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] ${
        primera ? '' : 'border-t border-[#f1f0f7]'
      } ${tono === 'alerta' ? 'text-alerta' : 'text-tinta'}`}
    >
      <span className="grid size-[15px] flex-none place-items-center">{icono}</span>
      {children}
    </button>
  );
}

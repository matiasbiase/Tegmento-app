'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { alternarDestacado, borrarMensaje } from '@/lib/actions/mensajes';
import { MenuFlotante } from '@/components/ui/MenuFlotante';

/**
 * Los tres puntitos de un mensaje: destacar y borrar.
 *
 * Pedido de Matías (29/07). La estrella es para volver a encontrarlo después
 * (el buscador del menú filtra por destacados).
 *
 * ⚠️ Borrar PIDE CONFIRMACIÓN en el mismo menú, sin diálogo del sistema: el
 * botón se convierte en "¿Seguro?" y recién el segundo toque borra. Un
 * `confirm()` corta la pantalla y en la PWA se ve como un cartel de navegador;
 * un menú que se transforma se siente parte de la app y evita el borrado por
 * dedo gordo, que es lo único que hay que evitar acá.
 */
export function MenuMensaje({
  mensajeId,
  destacado,
  onCambio,
  onAgrupar,
}: {
  mensajeId: number;
  destacado: boolean;
  onCambio: (cambio: { destacado?: boolean; borrado?: boolean }) => void;
  /** Entra al modo selección con este mensaje como primero elegido (29/07,
   *  "cristalizar": agrupar mensajes por tema). Opcional: los mensajes de la
   *  "escribiendo…" u otros usos del menú sin selección no lo necesitan. */
  onAgrupar?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [, empezar] = useTransition();
  const boton = useRef<HTMLButtonElement>(null);


  return (
    <div className="flex-none">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Opciones del mensaje"
        aria-expanded={abierto}
        className="grid size-7 place-items-center rounded-full text-niebla-2"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      <MenuFlotante
        abierto={abierto}
        anclaRef={boton}
        onCerrar={() => {
          setAbierto(false);
          setConfirmando(false);
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              empezar(async () => {
                const ahora = await alternarDestacado(mensajeId);
                onCambio({ destacado: ahora });
              });
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] text-tinta"
          >
            <svg viewBox="0 0 24 24" className="size-[15px] flex-none text-oro-2" fill={destacado ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
              <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />
            </svg>
            {destacado ? 'Quitar estrella' : 'Destacar'}
          </button>

          {onAgrupar && (
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                onAgrupar();
              }}
              className="flex w-full items-center gap-2.5 border-t border-[#f1f0f7] px-3.5 py-2.5 text-left text-[14px] text-tinta"
            >
              <svg viewBox="0 0 24 24" className="size-[15px] flex-none text-iris" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="17" cy="12" r="2.4" />
                <path d="M8 7.2L15.2 11M8 16.8L15.2 13" />
              </svg>
              Agrupar
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!confirmando) {
                setConfirmando(true);
                return;
              }
              setAbierto(false);
              setConfirmando(false);
              empezar(async () => {
                await borrarMensaje(mensajeId);
                onCambio({ borrado: true });
              });
            }}
            className="flex w-full items-center gap-2.5 border-t border-[#f1f0f7] px-3.5 py-2.5 text-left text-[14px] text-alerta"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px] flex-none">
              <path d="M4 7h16M9 7V5h6v2M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.8h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
            </svg>
            {confirmando ? '¿Seguro? Tocá de nuevo' : 'Borrar'}
          </button>
        </div>
      </MenuFlotante>
    </div>
  );
}

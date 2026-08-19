'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// La hoja para "elegir algo de una lista, o crear uno nuevo al toque": guardar
// un chat en una carpeta, agrupar mensajes bajo un tema. Mismo trabajo en los
// dos casos — hasta el 30/07 estaba escrito DOS VECES, carácter por carácter
// (acá y en `Charlas.tsx`), con el riesgo real de que un bug se arreglara en
// una copia y no en la otra: pasó con `renombrarCarpetaAction`, que existió
// sin ningún botón que lo llamara durante días porque nadie volvió a mirar
// esta hoja después de escribirla la primera vez.
//
// Va por PORTAL al body: quien la usa vive dentro de `.flotar`, que aplica un
// `transform`, y un ancestro con transform se vuelve el contenedor de sus
// hijos `fixed` — la hoja se dibujaría fuera de la vista. (Pasó con la hoja
// de registro en Cuerpo, el 27/07.)

export type ItemElegible = { id: string | number; nombre: string };

export function HojaElegirOCrear<T extends ItemElegible>({
  titulo,
  subtitulo,
  items,
  renderFila,
  renderFinal,
  quitar,
  placeholderNuevo,
  textoNuevo,
  maxLength = 30,
  onElegir,
  onCrear,
  onCerrar,
}: {
  titulo: string;
  subtitulo?: string;
  items: T[];
  /** Lo que va ANTES del nombre en cada fila: un ícono, un puntito de color. */
  renderFila?: (item: T) => ReactNode;
  /** Lo que va DESPUÉS del nombre: un contador, por ejemplo. */
  renderFinal?: (item: T) => ReactNode;
  /** Si lo que estás editando ya tiene algo asignado, la opción para sacarlo. */
  quitar?: { etiqueta: string; accion: () => void | Promise<void> };
  placeholderNuevo: string;
  textoNuevo: string;
  maxLength?: number;
  onElegir: (item: T) => void | Promise<void>;
  onCrear: (nombre: string) => void | Promise<void>;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [guardando, empezar] = useTransition();

  function elegir(item: T) {
    if (guardando) return;
    empezar(async () => {
      await onElegir(item);
      onCerrar();
    });
  }

  function quitarAccion() {
    if (!quitar || guardando) return;
    empezar(async () => {
      await quitar.accion();
      onCerrar();
    });
  }

  function crear() {
    const t = nombre.trim();
    if (!t || guardando) return;
    empezar(async () => {
      await onCrear(t);
      onCerrar();
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[rgba(28,28,43,.4)]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[24px] bg-white p-[18px_18px_max(22px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(28,28,43,.22)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0e0ee]" />
        <p className="mb-1 font-serif text-[17px] font-semibold text-tinta">{titulo}</p>
        {subtitulo && <p className="mb-3 truncate font-mono text-[12.5px] text-niebla">{subtitulo}</p>}

        {(items.length > 0 || quitar) && (
          <div className="max-h-[40vh] overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={guardando}
                onClick={() => elegir(item)}
                className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-3 text-left text-[14px] text-tinta disabled:opacity-60"
              >
                {renderFila?.(item)}
                <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                {renderFinal?.(item)}
              </button>
            ))}

            {quitar && (
              <button
                type="button"
                disabled={guardando}
                onClick={quitarAccion}
                className="flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-3 text-left text-[14px] text-niebla disabled:opacity-60"
              >
                <span className="text-niebla-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[17px]">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
                {quitar.etiqueta}
              </button>
            )}
          </div>
        )}

        {creando ? (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
              placeholder={placeholderNuevo}
              maxLength={maxLength}
              className="h-11 min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3 text-[14px] text-tinta outline-none"
            />
            <button
              type="button"
              disabled={guardando || !nombre.trim()}
              onClick={crear}
              className="h-11 flex-none rounded-[12px] bg-iris px-4 font-mono text-[13px] font-bold text-white disabled:opacity-50"
            >
              Crear
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="mt-1 flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-3 text-left text-[14px] font-medium text-iris"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[17px]">
              <path d="M12 6v12M6 12h12" />
            </svg>
            {textoNuevo}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

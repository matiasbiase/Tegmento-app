'use client';

import { useState } from 'react';
import { etiquetaSesion, type Sesion } from '@/lib/sesiones';

/**
 * Una charla de otro día, plegada como un papelito.
 *
 * Idea de Matías (29/07), y la palabra es suya: al reciclar un chat, lo de
 * antes tiene que quedar *"todo en un rectangulito junto, marcando de un lado
 * al otro quién habló, y que diga: este fue de tal día"*. La sensación que
 * buscaba es la de guardar papelitos, no la de un scroll infinito.
 *
 * Cerrado muestra el día, cuántos mensajes y cómo empezó. Abierto muestra la
 * charla entera, más compacta que la del día en curso: lo viejo se relee, no se
 * lee. Por eso el texto es más chico y las burbujas más apretadas.
 */
type M = { rol: string; contenido: string; creado?: string | null };

export function SesionPlegada({ sesion }: { sesion: Sesion<M> }) {
  const [abierta, setAbierta] = useState(false);
  const n = sesion.mensajes.length;
  const primero = sesion.mensajes.find((m) => m.rol === 'user') ?? sesion.mensajes[0];

  return (
    <div className="mb-3 overflow-hidden rounded-[18px] border border-iris-borde bg-white/70">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <span className="flex-none font-mono text-[11px] font-semibold tracking-[0.2px] text-iris-deep">
          {etiquetaSesion(sesion.dia)}
        </span>
        {!abierta && (
          <span className="min-w-0 flex-1 truncate text-[13px] text-niebla">{primero?.contenido}</span>
        )}
        <span className={`flex-none font-mono text-[10.5px] text-niebla-2 ${abierta ? 'ml-auto' : ''}`}>
          {n} {n === 1 ? 'mensaje' : 'mensajes'}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[14px] flex-none text-niebla-2 transition-transform duration-200"
          style={{ transform: abierta ? 'rotate(90deg)' : 'none' }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {abierta && (
        <div className="flex flex-col gap-1.5 border-t border-iris-borde px-3 py-3">
          {sesion.mensajes.map((m, i) => (
            <p
              key={i}
              className={`max-w-[85%] rounded-[12px] px-2.5 py-1.5 text-[13.5px] leading-[1.35] text-pretty ${
                m.rol === 'user'
                  ? 'self-end bg-iris-soft text-tinta'
                  : 'self-start border border-iris-borde bg-white text-tinta-soft'
              }`}
            >
              {m.contenido}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

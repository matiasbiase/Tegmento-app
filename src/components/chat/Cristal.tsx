'use client';

import { useState, useTransition } from 'react';
import { colorDeTema } from '@/lib/cristales';
import { desagruparMensajes } from '@/lib/actions/mensajes';

// Varios mensajes agrupados bajo un mismo tema, dibujados como UN rectángulo
// en vez de burbujas sueltas. Idea de Matías (29/07): *"todo en un
// rectangulito junto, marcando de un lado al otro quién habló"*.
//
// Cerrado: el color y el nombre del tema, más una vista previa. Abierto: los
// mensajes enteros, chiquitos y alineados izquierda/derecha según quién
// escribió — el mismo lenguaje visual que `SesionPlegada` usa para los días
// viejos, porque cumple el mismo trabajo: algo que ya leíste y no hace falta
// que ocupe el lugar de una conversación en curso.

export type MensajeCristal = { id?: number; rol: string; contenido: string };

export function Cristal({
  temaId,
  temaNombre,
  mensajes,
  onDesagrupado,
}: {
  temaId: number;
  temaNombre: string;
  mensajes: MensajeCristal[];
  /** Los ids que quedaron sin tema, para que ChatUI actualice su estado local. */
  onDesagrupado: (ids: number[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, empezar] = useTransition();
  const color = colorDeTema(temaId);
  const primero = mensajes[0];

  function desagrupar() {
    const ids = mensajes.map((m) => m.id).filter((x): x is number => x != null);
    if (!ids.length || guardando) return;
    empezar(async () => {
      await desagruparMensajes(ids);
      onDesagrupado(ids);
    });
  }

  return (
    <div
      className="mb-1.5 overflow-hidden rounded-[18px] border border-iris-borde bg-white/75"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          className="size-2 flex-none rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 16%, transparent)` }}
        />
        <span className="flex-none font-mono text-[11px] font-bold tracking-[0.2px]" style={{ color }}>
          {/* ⚠️ Sin `.toUpperCase()` (17/08, regla de Matías: *"ningún texto,
              ningún título debería quedar en todo mayúscula"*). El nombre del
              tema ya viene capitalizado de `titulo-chat`. */}
          {temaNombre}
        </span>
        {!abierto && <span className="min-w-0 flex-1 truncate text-[12px] text-niebla">{primero?.contenido}</span>}
        <span className={`flex-none font-mono text-[10px] text-niebla-2 ${abierto ? 'ml-auto' : ''}`}>{mensajes.length}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[13px] flex-none text-niebla-2 transition-transform duration-200"
          style={{ transform: abierto ? 'rotate(90deg)' : 'none' }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {abierto && (
        <div className="flex flex-col gap-1.5 border-t border-iris-borde px-3 py-2.5">
          {mensajes.map((m, i) => (
            <p
              key={m.id ?? i}
              className={`max-w-[85%] rounded-[12px] px-2.5 py-1.5 text-[12.5px] leading-[1.35] text-pretty ${
                m.rol === 'user'
                  ? 'self-end bg-iris-soft text-tinta'
                  : 'self-start border border-iris-borde bg-white text-tinta-soft'
              }`}
            >
              {m.contenido}
            </p>
          ))}
          <button
            type="button"
            onClick={desagrupar}
            disabled={guardando}
            className="mt-1 self-start font-mono text-[10.5px] text-niebla underline decoration-niebla-2 underline-offset-2 disabled:opacity-50"
          >
            {guardando ? 'Desagrupando…' : 'Desagrupar'}
          </button>
        </div>
      )}
    </div>
  );
}

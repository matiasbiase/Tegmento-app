'use client';

import { useState, useTransition } from 'react';
import { crearTemaYAgrupar } from '@/lib/actions/mensajes';
import type { PropuestaGrupo } from '@/lib/agrupador';

// Lo que la IA propone agrupar, punteado, ANTES de que exista de verdad.
//
// ⚠️ NUNCA AGRUPA SOLA (29/07, pedido de Matías). Esto es una vista previa: los
// mensajes de acá adentro siguen siendo, cada uno, la burbuja suelta que ya
// estabas viendo más abajo. Recién cuando tocás "Juntalos" se guarda el tema de
// verdad, y ahí sí esas burbujas se convierten en un `Cristal`.

export function CristalPropuesto({
  propuesta,
  mensajes,
  onResuelto,
}: {
  propuesta: PropuestaGrupo;
  /** El texto de cada mensaje propuesto, para mostrarlo sin ir a buscarlo. */
  mensajes: { id: number; rol: string; contenido: string }[];
  /** Se llama tanto si se acepta (con el tema que quedó, ya creado o reusado)
   *  como si se descarta: en los dos casos, esta propuesta deja de mostrarse. */
  onResuelto: (aceptada: boolean, tema?: { id: number; nombre: string }) => void;
}) {
  const [guardando, empezar] = useTransition();
  const [resuelta, setResuelta] = useState(false);

  if (resuelta) return null;

  function aceptar() {
    if (guardando) return;
    empezar(async () => {
      const tema = await crearTemaYAgrupar(propuesta.tema, propuesta.mensajeIds);
      setResuelta(true);
      onResuelto(true, tema ?? undefined);
    });
  }

  function descartar() {
    setResuelta(true);
    onResuelto(false);
  }

  return (
    <div className="mb-2.5 overflow-hidden rounded-[18px] border border-dashed border-niebla-2 bg-white/50">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="size-2 flex-none rounded-full bg-niebla-2" />
        <span className="flex-none font-mono text-[11px] font-bold tracking-[0.2px] text-niebla">
          {/* Sin `.toUpperCase()`: ver la regla del 17/08 en `Cristal`. */}
          ¿{propuesta.tema}?
        </span>
        <span className="ml-auto flex-none font-mono text-[10px] text-niebla-2">{mensajes.length}</span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-dashed border-niebla-2 px-3 py-2.5">
        {mensajes.map((m) => (
          <p
            key={m.id}
            className={`max-w-[85%] rounded-[12px] px-2.5 py-1.5 text-[12.5px] leading-[1.35] text-pretty ${
              m.rol === 'user'
                ? 'self-end bg-iris-soft text-tinta'
                : 'self-start border border-iris-borde bg-white text-tinta-soft'
            }`}
          >
            {m.contenido}
          </p>
        ))}
        <p className="mt-1 text-[11.5px] leading-snug text-niebla text-pretty">Esto parece hablar de lo mismo. ¿Los junto?</p>
        <div className="mt-0.5 flex gap-2">
          <button
            type="button"
            onClick={aceptar}
            disabled={guardando}
            className="h-8 flex-1 rounded-[10px] bg-iris font-mono text-[11.5px] font-bold text-white disabled:opacity-60"
          >
            {guardando ? 'Juntando…' : 'Juntalos'}
          </button>
          <button
            type="button"
            onClick={descartar}
            disabled={guardando}
            className="h-8 flex-1 rounded-[10px] border border-iris-borde bg-white font-mono text-[11.5px] font-bold text-niebla disabled:opacity-60"
          >
            Así está bien
          </button>
        </div>
      </div>
    </div>
  );
}

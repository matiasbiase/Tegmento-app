'use client';

import { useState, useTransition } from 'react';
import { RASGOS, PRESETS, type Niveles } from '@/lib/personalidad';
import { guardarPersonalidadNiveles } from '@/lib/actions/personalidad';

const IRIS = 'var(--color-iris)';

export function PersonalidadPerfil({ inicial }: { inicial: Niveles }) {
  const [niveles, setNiveles] = useState<Niveles>(inicial);
  const [, startTransition] = useTransition();

  function aplicar(next: Niveles) {
    setNiveles(next);
    startTransition(() => {
      void guardarPersonalidadNiveles(next);
    });
  }

  const presetActivo = PRESETS.find((p) => RASGOS.every((r) => p.niveles[r.id] === niveles[r.id]))?.nombre;

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <p className="mb-3.5 text-[15px] leading-relaxed text-tinta-soft text-pretty">
        Cómo querés que te hable. Elegí un estilo o afiná cada rasgo.
      </p>

      {/* presets */}
      <div className="mb-[22px] flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const activo = presetActivo === p.nombre;
          return (
            <button
              key={p.nombre}
              type="button"
              onClick={() => aplicar(p.niveles)}
              className="cursor-pointer rounded-[12px] px-3 py-2.5 font-mono text-[12px] font-semibold"
              style={{
                background: activo ? IRIS : 'var(--color-lavanda)',
                color: activo ? '#fff' : 'var(--color-tinta-soft)',
                border: `1.5px solid ${activo ? IRIS : 'transparent'}`,
              }}
            >
              {p.nombre}
            </button>
          );
        })}
      </div>

      {/* rasgos */}
      <div className="flex flex-col gap-5">
        {RASGOS.map((r) => {
          const val = niveles[r.id];
          const pct = ((val - 1) / 4) * 100;
          return (
            <div key={r.id}>
              <p className="mb-2.5 font-mono text-[12px] font-semibold tracking-[0.4px] text-tinta">{r.nombre}</p>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={val}
                aria-label={r.nombre}
                onChange={(e) => aplicar({ ...niveles, [r.id]: Number(e.target.value) })}
                className="tg-slider mb-2.5"
                style={{ background: `linear-gradient(to right, ${IRIS} ${pct}%, #e6e6f2 ${pct}%)` }}
              />
              <div className="flex justify-between gap-2">
                <span className="font-mono text-[12px]" style={{ color: val <= 2 ? IRIS : 'var(--color-niebla-3)', fontWeight: val <= 2 ? 600 : 400 }}>
                  {r.bajo}
                </span>
                <span className="text-right font-mono text-[12px]" style={{ color: val >= 4 ? IRIS : 'var(--color-niebla-3)', fontWeight: val >= 4 ? 600 : 400 }}>
                  {r.alto}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

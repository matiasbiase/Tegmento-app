'use client';

import { useState } from 'react';
import { NIVELES_DEFAULT, PRESETS, RASGOS, type Niveles } from '@/lib/personalidad';
import { guardarPersonalidad } from '@/lib/actions/personalidad';

export function PersonalidadEditor({ inicial, extraInicial }: { inicial: Niveles; extraInicial: string }) {
  const [niveles, setNiveles] = useState<Niveles>(inicial);
  const [extra, setExtra] = useState(extraInicial);
  const [guardando, setGuardando] = useState(false);

  const presetActivo = PRESETS.find((p) =>
    RASGOS.every((r) => p.niveles[r.id] === niveles[r.id]),
  )?.nombre;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[19px] font-semibold text-crema">Personalidad del asistente</h1>
        <p className="mt-1 text-[15px] text-muted">Elegí un estilo de arranque o ajustá cada rasgo a tu gusto.</p>
      </div>

      <section className="rounded-app border border-borde bg-surface p-4">
        <h2 className="mb-3 font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">Estilos rápidos</h2>
        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => {
            const activo = presetActivo === p.nombre;
            return (
              <button
                key={p.nombre}
                type="button"
                onClick={() => setNiveles(p.niveles)}
                className={`flex items-center gap-3 rounded-app border p-3 text-left ${activo ? 'border-ambar bg-bg' : 'border-borde'}`}
              >
                <span className={`size-2.5 shrink-0 rounded-full ${activo ? 'bg-ambar' : 'bg-borde'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-crema">{p.nombre}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted">{p.descripcion}</span>
                </span>
                {activo && <span className="shrink-0 font-mono text-[12px] text-ambar">Activo</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-app border border-borde bg-surface p-4">
        <h2 className="mb-3 font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">Ajuste fino</h2>
        <div className="flex flex-col gap-4">
          {RASGOS.map((r) => {
            const val = niveles[r.id];
            const pct = ((val - 1) / 4) * 100;
            return (
              <div key={r.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold text-crema">{r.nombre}</span>
                  <span className="font-mono text-[12px] text-muted">{val}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={val}
                  aria-label={r.nombre}
                  onChange={(e) => setNiveles((v) => ({ ...v, [r.id]: Number(e.target.value) }))}
                  className="tg-slider mb-2"
                  style={{ background: `linear-gradient(to right, var(--color-iris) ${pct}%, #e6e6f2 ${pct}%)` }}
                />
                <p className="flex justify-between text-[11px] text-muted">
                  <span>{r.bajo}</span>
                  <span>{r.alto}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">
          Algo más que querés pedirle <span className="text-muted/60">(opcional)</span>
        </span>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          rows={3}
          placeholder="Ej: tratame de vos, nada de signos de exclamación, que me recuerde mis objetivos cuando me desvío."
          className="rounded-[4px] border border-borde bg-surface px-4 py-2 text-[15px] leading-relaxed text-crema placeholder:text-muted"
        />
      </label>

      <button
        type="button"
        disabled={guardando}
        onClick={() => {
          setGuardando(true);
          guardarPersonalidad(niveles, extra).catch(() => setGuardando(false));
        }}
        className="rounded-app relieve-cta bg-ambar py-3 font-mono text-[15px] font-semibold tracking-[0.3px] text-[#412402] disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar personalidad'}
      </button>

      <button
        type="button"
        onClick={() => {
          setNiveles(NIVELES_DEFAULT);
          setExtra('');
        }}
        className="font-mono text-[12px] text-muted"
      >
        restablecer
      </button>
    </div>
  );
}

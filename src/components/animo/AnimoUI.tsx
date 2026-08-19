'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOODS, FACTORES_ANIMO, PALABRAS_ANIMO, moodDe, type MoodKey } from '@/lib/animo';
import { registrarAnimoGeneral } from '@/lib/actions/animo';
import { sonarExito } from '@/lib/sonido';
import { IconLapiz } from '@/components/ui/iconos';

const IRIS = '#6c78ee';

export type AnimoInicial = { estado: MoodKey; factores: string[]; palabras: string[]; nota: string } | null;

function MoodFace({ k, color, size = 26 }: { k: MoodKey; color: string; size?: number }) {
  const ring = <circle cx="12" cy="12" r="9.3" />;
  const eyes = (
    <>
      <circle cx="9" cy="10.2" r="0.95" fill={color} stroke="none" />
      <circle cx="15" cy="10.2" r="0.95" fill={color} stroke="none" />
    </>
  );
  const boca: Record<MoodKey, React.ReactNode> = {
    genial: (
      <>
        <path d="M7.3 10.8c.5-.9 1.7-.9 2.2 0" />
        <path d="M14.5 10.8c.5-.9 1.7-.9 2.2 0" />
        <path d="M7.6 13.8c1.1 2 7.7 2 8.8 0" />
      </>
    ),
    bien: (
      <>
        {eyes}
        <path d="M8.4 13.8c1 1.3 6.2 1.3 7.2 0" />
      </>
    ),
    neutral: (
      <>
        {eyes}
        <path d="M8.6 14.6h6.8" />
      </>
    ),
    bajon: (
      <>
        {eyes}
        <path d="M8.4 15c1-1.3 6.2-1.3 7.2 0" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ring}
      {boca[k]}
    </svg>
  );
}

export function AnimoUI({ inicial }: { inicial: AnimoInicial }) {
  const router = useRouter();
  const [mood, setMood] = useState<MoodKey | null>(inicial?.estado ?? null);
  const [factores, setFactores] = useState<string[]>(inicial?.factores ?? []);
  const [palabras, setPalabras] = useState<string[]>(inicial?.palabras ?? []);
  const [nota, setNota] = useState(inicial?.nota ?? '');
  const [panel, setPanel] = useState<'factores' | 'palabras' | 'nota' | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const def = moodDe(mood);

  function toggle(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
    setGuardado(false);
  }

  async function guardar() {
    if (!mood) return;
    setGuardando(true);
    try {
      await registrarAnimoGeneral({ estado: mood, factores, palabras, nota });
      setGuardado(true);
      setPanel(null);
      sonarExito(); // recompensa al registrar
      router.refresh();
    } catch {
      // si falla, dejamos el estado para reintentar
    } finally {
      setGuardando(false);
    }
  }

  // --- sin elegir: las 4 tarjetas grandes ---
  if (!def) {
    return (
      <div>
        <p className="mb-3 mt-7 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">¿Cómo venís hoy?</p>
        <div className="flex flex-col gap-3">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMood(m.key);
                setGuardado(false);
              }}
              className="flex w-full items-center gap-3.5 tarjeta border-2 border-transparent"
              style={{ background: m.tint }}
            >
              <span className="flex size-[46px] flex-none items-center justify-center rounded-[18px] bg-white">
                <MoodFace k={m.key} color={m.color} />
              </span>
              <span className="flex-1 text-left text-[19px] font-semibold" style={{ color: m.deep }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- elegido: héroe + chips + datos ---
  return (
    <div>
      <p className="mb-3 mt-7 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">¿Cómo venís hoy?</p>
      <div className="flex flex-col gap-4">
        {/* héroe */}
        <div
          className="relative overflow-hidden rounded-[18px] p-[22px]"
          style={{ background: `linear-gradient(135deg, ${def.color}, oklch(0.66 ${def.c} ${def.h - 8}))` }}
        >
          <div className="flex items-center gap-4">
            <span className="flex size-14 flex-none items-center justify-center rounded-[18px] bg-white/[.18]">
              <MoodFace k={def.key} color="#fff" size={32} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-semibold tracking-[0.3px] text-white/80">Hoy te sentís</p>
              <p className="mt-0.5 font-serif text-[32px] font-semibold tracking-[-0.3px] text-white">{def.label}</p>
            </div>
          </div>
        </div>

        {/* cambiar */}
        <div>
          <p className="mb-2.5 font-mono text-[11px] font-semibold tracking-[0.3px] text-[#b8b8c8]">
            ¿Otra cosa? tocá para cambiar
          </p>
          <div className="flex gap-2">
            {MOODS.map((m) => {
              const sel = m.key === mood;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMood(m.key);
                    setGuardado(false);
                  }}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl p-[11px_4px]"
                  style={{ background: sel ? m.color : '#fff', border: `1.5px solid ${sel ? m.color : 'rgba(108,120,238,.12)'}` }}
                >
                  <MoodFace k={m.key} color={sel ? '#fff' : m.color} size={22} />
                  <span className="font-mono text-[11px] font-semibold tracking-[0.4px]" style={{ color: sel ? '#fff' : '#6d6d87' }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* agregar más datos */}
        <div>
          <p className="mb-2.5 mt-1.5 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">
            ¿Querés agregar más datos?
          </p>
          <div className="flex flex-col gap-2.5">
            <Acordeon
              id="factores"
              titulo="¿Qué influye más en cómo te sentís?"
              hint="Elegí lo que más pesa hoy."
              opciones={FACTORES_ANIMO}
              elegidas={factores}
              onToggle={(v) => toggle(factores, setFactores, v)}
              abierto={panel === 'factores'}
              onAbrir={() => setPanel((p) => (p === 'factores' ? null : 'factores'))}
              def={def}
            />
            <Acordeon
              id="palabras"
              titulo="¿Qué palabra lo describe mejor?"
              hint="Podés elegir varias."
              opciones={PALABRAS_ANIMO}
              elegidas={palabras}
              onToggle={(v) => toggle(palabras, setPalabras, v)}
              abierto={panel === 'palabras'}
              onAbrir={() => setPanel((p) => (p === 'palabras' ? null : 'palabras'))}
              def={def}
            />

            {/* nota libre */}
            <div
              className="overflow-hidden rounded-[18px] bg-white shadow-[0_3px_14px_rgba(50,50,90,.05)]"
              style={{ border: `1.5px solid ${panel === 'nota' ? 'rgba(108,120,238,.2)' : 'transparent'}` }}
            >
              <button
                type="button"
                onClick={() => setPanel((p) => (p === 'nota' ? null : 'nota'))}
                className="flex w-full items-center gap-3 p-[15px_16px] text-left"
              >
                <span
                  className="flex size-9 flex-none items-center justify-center rounded-[12px]"
                  style={{ color: def.deep, background: def.soft }}
                >
                  <IconLapiz className="size-[19px]" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-tinta">Escribilo en tus palabras</span>
                {nota.trim().length > 0 && <span className="size-2 rounded-full" style={{ background: IRIS }} />}
                <svg viewBox="0 0 24 24" fill="none" stroke="#c4c4d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] transition-transform" style={{ transform: panel === 'nota' ? 'rotate(90deg)' : 'none' }}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              {panel === 'nota' && (
                <div className="p-[0_16px_16px]">
                  <textarea
                    value={nota}
                    onChange={(e) => {
                      setNota(e.target.value);
                      setGuardado(false);
                    }}
                    rows={3}
                    placeholder="Lo que se te venga sobre cómo estás hoy."
                    className="w-full resize-none rounded-[12px] border border-iris-borde bg-papel-2 p-[12px_14px] text-[15px] leading-relaxed text-tinta outline-none placeholder:text-niebla"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* guardar */}
        {/* CTA primario siempre iris: el mood tiñe el héroe, no la acción */}
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] p-[15px] font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))',
            boxShadow: '0 8px 20px rgba(108,120,238,.35)',
          }}
        >
          {guardado && (
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
          {guardando ? 'Guardando…' : guardado ? 'Guardado' : 'Guardar ánimo'}
        </button>
      </div>
    </div>
  );
}

function Acordeon({
  titulo,
  hint,
  opciones,
  elegidas,
  onToggle,
  abierto,
  onAbrir,
  def,
}: {
  id: string;
  titulo: string;
  hint: string;
  opciones: string[];
  elegidas: string[];
  onToggle: (v: string) => void;
  abierto: boolean;
  onAbrir: () => void;
  def: { color: string; deep: string; soft: string };
}) {
  return (
    <div
      className="overflow-hidden rounded-[18px] bg-white shadow-[0_3px_14px_rgba(50,50,90,.05)]"
      style={{ border: `1.5px solid ${abierto ? 'rgba(108,120,238,.2)' : 'transparent'}` }}
    >
      <button type="button" onClick={onAbrir} className="flex w-full items-center gap-3 p-[15px_16px] text-left">
        <span className="flex size-9 flex-none items-center justify-center rounded-[12px]" style={{ color: def.deep, background: def.soft }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-tinta text-pretty">{titulo}</span>
        {elegidas.length > 0 && (
          <span className="font-mono text-[12px] font-bold" style={{ color: def.deep }}>
            {elegidas.length}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="#c4c4d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] transition-transform" style={{ transform: abierto ? 'rotate(90deg)' : 'none' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {abierto && (
        <div className="p-[0_16px_16px]">
          <p className="mb-2.5 text-[13px] text-niebla">{hint}</p>
          <div className="flex flex-wrap gap-2">
            {opciones.map((v) => {
              const on = elegidas.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onToggle(v)}
                  className="rounded-full px-3.5 py-2 text-[13px] font-medium"
                  style={{
                    background: on ? def.color : '#fff',
                    color: on ? '#fff' : '#56566c',
                    border: `1.5px solid ${on ? def.color : 'rgba(108,120,238,.14)'}`,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

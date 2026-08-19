'use client';

import { useEffect, useRef, useState } from 'react';

const RC = 2 * Math.PI * 116; // circunferencia del anillo
const PRESETS = [15, 25, 45, 60]; // minutos elegibles

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Pantalla completa lila oscura para una sesión de foco. Cuenta regresiva desde
// el tiempo elegido. Se usa desde /foco y desde las tarjetas En foco.
export function FocoOverlay({
  titulo = 'Foco',
  subtitulo = 'Sostené la atención en una sola cosa.',
  duracionMin = 25,
  onSalir,
}: {
  titulo?: string;
  subtitulo?: string;
  duracionMin?: number;
  onSalir: () => void;
}) {
  const [metaMin, setMetaMin] = useState(duracionMin);
  const [restante, setRestante] = useState(duracionMin * 60);
  const [corriendo, setCorriendo] = useState(false); // arranca al elegir tiempo
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = metaMin * 60;

  useEffect(() => {
    if (!corriendo) return;
    timer.current = setInterval(() => setRestante((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [corriendo]);

  useEffect(() => {
    if (restante === 0) setCorriendo(false);
  }, [restante]);

  function elegir(min: number) {
    setMetaMin(min);
    setRestante(min * 60);
    setCorriendo(true);
  }

  const progreso = total > 0 ? 1 - restante / total : 0;

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col px-[26px] pb-[max(30px,env(safe-area-inset-bottom))] pt-[max(60px,calc(env(safe-area-inset-top)+26px))] text-white"
      style={{ background: 'radial-gradient(125% 85% at 50% 0%, #2c2a55 0%, #16142b 58%, #0e0d1c 100%)' }}
    >
      <div className="flex items-center gap-2.5 self-center rounded-full border border-white/10 bg-white/[.09] px-[15px] py-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="#b9bdff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
        <span className="text-[13px] font-semibold text-[#d6d8ff]">No molestar · notificaciones en pausa</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="mb-[26px] font-mono text-[12px] font-semibold tracking-[0.4px] text-[#8f93c8]">En foco ahora</p>
        <div className="relative size-64">
          <svg viewBox="0 0 260 260" className="size-full -rotate-90">
            <circle cx="130" cy="130" r="116" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
            <circle
              cx="130"
              cy="130"
              r="116"
              fill="none"
              stroke="#8a7cf0"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(Math.min(1, progreso) * RC).toFixed(1)} ${RC.toFixed(1)}`}
              style={{ transition: 'stroke-dasharray .9s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <span className="font-mono text-[56px] font-semibold tracking-[-1px]">{fmt(restante)}</span>
            <span className="font-mono text-[12px] tracking-[0.2px] text-[#8f93c8]">de {metaMin} min</span>
          </div>
        </div>
        <h2 className="mt-7 text-center text-[24px] font-bold tracking-[-0.4px] text-balance">{titulo}</h2>
        <p className="mt-1.5 text-[15px] text-[#9a9ec9]">{subtitulo}</p>

        {/* elegir cuánto foco */}
        <div className="mt-6 flex gap-2">
          {PRESETS.map((m) => {
            const sel = m === metaMin;
            return (
              <button
                key={m}
                type="button"
                onClick={() => elegir(m)}
                className={`rounded-full px-4 py-2 font-mono text-[13px] font-semibold transition-colors ${
                  sel ? 'bg-white text-tinta' : 'border border-white/15 bg-white/[.06] text-[#d6d8ff]'
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setCorriendo((r) => !r)}
          className="flex-1 tarjeta bg-white font-mono text-[16px] font-semibold text-tinta"
        >
          {corriendo ? 'Pausar' : restante === total ? 'Empezar' : 'Reanudar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setCorriendo(false);
            onSalir();
          }}
          className="flex-none rounded-[18px] border border-white/20 bg-white/[.06] px-6 py-4 font-mono text-[16px] font-semibold text-white"
        >
          Terminar
        </button>
      </div>
    </div>
  );
}

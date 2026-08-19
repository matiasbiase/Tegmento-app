'use client';

import { useEffect, useRef, useState } from 'react';
import { registrarRespiracion } from '@/lib/actions/cuerpo';

// Respiración guiada: inhalá (crece) · sostené corto · exhalá (se achica).
// Exhalación más larga = más calma, y el círculo se mueve casi todo el tiempo.
type Fase = { nombre: string; segundos: number; escala: number };
const CICLO: Fase[] = [
  { nombre: 'Inhalá', segundos: 4, escala: 1.35 },
  { nombre: 'Sostené', segundos: 2, escala: 1.35 },
  { nombre: 'Exhalá', segundos: 6, escala: 0.5 },
];

// Pantalla completa lila oscura para respirar. Mismo lenguaje visual que el
// modo foco. Se usa desde Hoy y desde /calma. Registra la sesión al salir.
export function CalmaOverlay({
  titulo = 'Un minuto para vos',
  onSalir,
}: {
  titulo?: string;
  onSalir: () => void;
}) {
  const [faseIdx, setFaseIdx] = useState(0);
  const [cuenta, setCuenta] = useState(4);
  const [transcurrido, setTranscurrido] = useState(0);
  const inicio = useRef<number>(Date.now());

  const fase = CICLO[faseIdx];

  useEffect(() => {
    let restante = fase.segundos;
    setCuenta(restante);
    const tick = setInterval(() => {
      restante -= 1;
      if (restante <= 0) {
        setFaseIdx((i) => (i + 1) % CICLO.length);
      } else {
        setCuenta(restante);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [faseIdx, fase.segundos]);

  useEffect(() => {
    const t = setInterval(() => setTranscurrido(Math.round((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  function terminar() {
    const seg = Math.round((Date.now() - inicio.current) / 1000);
    if (seg >= 8) registrarRespiracion(seg).catch(() => {});
    onSalir();
  }

  const min = Math.floor(transcurrido / 60);
  const seg = transcurrido % 60;

  return (
    <div
      className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col px-[26px] pb-[max(30px,env(safe-area-inset-bottom))] pt-[max(60px,calc(env(safe-area-inset-top)+26px))] text-white"
      style={{ background: 'radial-gradient(125% 85% at 50% 0%, #2c2a55 0%, #16142b 58%, #0e0d1c 100%)' }}
    >
      <div className="flex items-center gap-2.5 self-center rounded-full border border-white/10 bg-white/[.09] px-[15px] py-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="#b9bdff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
        <span className="text-[13px] font-semibold text-[#d6d8ff]">Modo calma · notificaciones en pausa</span>
      </div>

      {/* título + tiempo arriba, para no cargar de texto alrededor del círculo */}
      <div className="mt-10 text-center">
        <h2 className="font-serif text-[26px] font-semibold tracking-[-0.3px] text-balance">{titulo}</h2>
        <p className="mt-1.5 font-mono text-[13px] text-[#8f93c8]">
          {min > 0 ? `${min}:${String(seg).padStart(2, '0')}` : `${seg}s`} respirando
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="relative flex h-[280px] w-[280px] items-center justify-center">
          {/* halo que respira junto al círculo, suave y sin borde duro */}
          <div
            className="absolute size-[210px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(124,124,240,.28) 0%, rgba(124,124,240,0) 68%)',
              animation: 'respirar 12s ease-in-out infinite',
            }}
          />
          <div
            className="flex size-[176px] flex-col items-center justify-center rounded-full text-white"
            style={{
              background: 'radial-gradient(circle at 36% 30%, #948ff4 0%, var(--color-iris) 56%, #5a63d6 100%)',
              animation: 'respirar 12s ease-in-out infinite',
              boxShadow: '0 12px 44px rgba(90,99,214,.4)',
            }}
          >
            <p className="font-sans text-[24px] font-semibold tracking-[-0.2px]">{fase.nombre}</p>
            <p className="mt-1 font-mono text-[15px] text-white/75">{cuenta}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={terminar}
        className="w-full tarjeta bg-white font-mono text-[16px] font-semibold text-tinta"
      >
        Terminar
      </button>
    </div>
  );
}

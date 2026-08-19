'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fmtHoras, type AppUso } from '@/lib/pantalla';

export type PantallaHoy = { totalMin: number; apps: AppUso[]; hora: string } | null;

export function TiempoPantalla({ ultimo }: { ultimo: PantallaHoy }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<'idle' | 'subiendo' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File) {
    setEstado('subiendo');
    setError(null);
    try {
      const form = new FormData();
      form.append('foto', file, 'pantalla.jpg');
      const res = await fetch('/api/pantalla', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setEstado('idle');
        router.refresh();
      } else {
        setError(data?.error ?? 'No se pudo leer.');
        setEstado('error');
      }
    } catch {
      setError('No se pudo enviar.');
      setEstado('error');
    }
  }

  return (
    <div className="tarjeta bg-white sombra-card">
      {ultimo ? (
        <div className="mb-3">
          <p className="font-serif text-[24px] font-semibold tracking-[-0.5px] text-tinta">{fmtHoras(ultimo.totalMin)}</p>
          <p className="mt-0.5 text-[12px] text-niebla">Última captura · {ultimo.hora}</p>
          {ultimo.apps.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1">
              {ultimo.apps.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-tinta-soft">{a.nombre}</span>
                  <span className="font-mono text-[12px] tabular-nums text-niebla">{fmtHoras(a.min)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-3 text-[13px] leading-relaxed text-niebla text-pretty">
          Apple no deja leer esto solo, pero podés mandar una captura de <strong className="text-tinta-soft">Ajustes → Tiempo en pantalla</strong> y la leo. La cruzo con tu ánimo y tu energía.
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={estado === 'subiendo'}
        onClick={() => input.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-iris-borde bg-papel-2 py-2.5 font-mono text-[12px] font-bold tracking-[0.3px] text-iris-deep disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
          <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 15l5-4 4 3 4-5 5 5" /><circle cx="8.5" cy="9.5" r="1.2" />
        </svg>
        {estado === 'subiendo' ? 'Leyendo la captura…' : 'Mandar captura de tiempo en pantalla'}
      </button>
      {estado === 'error' && error && <p className="mt-1.5 text-center font-mono text-[11px] text-rosa">{error}</p>}
    </div>
  );
}

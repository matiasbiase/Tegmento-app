'use client';

import { GLIFO_LUNA } from '@/components/ui/glifos';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrarSueno, type CalidadSueno } from '@/lib/actions/cuerpo';
import { sonarExito } from '@/lib/sonido';
import { IconLapiz } from '@/components/ui/iconos';

const CALIDADES: { key: CalidadSueno; label: string; color: string; tint: string }[] = [
  { key: 'bien', label: 'Descansé', color: 'var(--color-verde)', tint: 'var(--color-verde-tint)' },
  { key: 'regular', label: 'Regular', color: 'var(--color-oro-2)', tint: 'var(--color-ambar-tint)' },
  { key: 'mal', label: 'Dormí mal', color: 'var(--color-rosa)', tint: 'var(--color-rosa-tint)' },
];

const ETIQUETA: Record<CalidadSueno, string> = {
  bien: 'descansaste bien',
  regular: 'dormiste regular',
  mal: 'dormiste mal',
};

type YaHoy = { minutos: number; calidad: string | null };

export function RegistrarSueno({ yaHoy }: { yaHoy: YaHoy | null }) {
  const router = useRouter();
  const [horas, setHoras] = useState(yaHoy ? Math.round((yaHoy.minutos / 60) * 2) / 2 : 7.5);
  const [calidad, setCalidad] = useState<CalidadSueno | null>((yaHoy?.calidad as CalidadSueno) ?? null);
  const [guardando, setGuardando] = useState(false);
  // Si ya anotó hoy, arranca en modo "hecho"; el lápiz vuelve a abrir el form.
  const [editando, setEditando] = useState(false);
  const [guardadoHoras, setGuardadoHoras] = useState<number | null>(yaHoy ? yaHoy.minutos / 60 : null);
  const [guardadoCalidad, setGuardadoCalidad] = useState<CalidadSueno | null>((yaHoy?.calidad as CalidadSueno) ?? null);

  async function guardar() {
    if (!calidad || guardando) return;
    setGuardando(true);
    try {
      await registrarSueno(horas, calidad);
      setGuardadoHoras(horas);
      setGuardadoCalidad(calidad);
      setEditando(false);
      sonarExito(); // el tin de recompensa: registrar algo se siente bien
      router.refresh();
    } catch {
      // reintentable
    } finally {
      setGuardando(false);
    }
  }

  // Estado "hecho": mismo lenguaje que los chips del home (ícono visible + relleno
  // del color + UN tilde discreto). "Editar" es terciario, no una barra.
  if (guardadoHoras != null && !editando) {
    const hs = guardadoHoras.toLocaleString('es-AR', { maximumFractionDigits: 1 });
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Editar el sueño de hoy"
        className="flex w-full items-center gap-3 rounded-[18px] p-[14px_16px] text-left shadow-[0_4px_18px_rgba(50,50,90,.05)]"
        style={{ background: 'var(--color-iris-soft)', border: '1px solid #4a56c822' }}
      >
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="#4a56c8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            {GLIFO_LUNA}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-iris-deep">
            Dormiste {hs}&nbsp;h
            <svg viewBox="0 0 24 24" fill="none" stroke="#4a56c8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ml-1 inline-block size-[13px] align-[-1px]">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </p>
          <p className="mt-0.5 text-[12px] text-niebla">
            {guardadoCalidad ? `${ETIQUETA[guardadoCalidad][0].toUpperCase()}${ETIQUETA[guardadoCalidad].slice(1)} · el` : 'El'} sueño explica mucho de tu ánimo.
          </p>
        </div>
        <span className="flex flex-none items-center gap-1 self-start font-mono text-[12px] font-semibold text-iris">
          <IconLapiz className="size-[15px]" />
        </span>
      </button>
    );
  }

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-tinta">{editando ? 'Corregí tu sueño de hoy' : '¿Cómo dormiste anoche?'}</p>
        {editando && (
          <button type="button" onClick={() => setEditando(false)} className="flex-none font-mono text-[12px] font-semibold text-niebla">
            Cancelar
          </button>
        )}
      </div>

      {/* horas */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Menos"
          onClick={() => setHoras((h) => Math.max(0, Math.round((h - 0.5) * 10) / 10))}
          className="flex size-10 flex-none items-center justify-center rounded-full border border-iris-borde bg-white text-[19px] font-bold text-iris"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="font-serif text-[32px] font-semibold tracking-[-0.5px] text-tinta">{horas.toLocaleString('es-AR')}</span>
          <span className="ml-1 text-[15px] font-semibold text-niebla">horas</span>
        </div>
        <button
          type="button"
          aria-label="Más"
          onClick={() => setHoras((h) => Math.min(16, Math.round((h + 0.5) * 10) / 10))}
          className="flex size-10 flex-none items-center justify-center rounded-full border border-iris-borde bg-white text-[19px] font-bold text-iris"
        >
          +
        </button>
      </div>

      {/* calidad */}
      <div className="mt-4 flex gap-2">
        {CALIDADES.map((c) => {
          const sel = c.key === calidad;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCalidad(c.key)}
              className="flex-1 rounded-2xl py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                background: sel ? c.color : c.tint,
                color: sel ? '#fff' : c.color,
                border: `1.5px solid ${sel ? c.color : 'transparent'}`,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={!calidad || guardando}
        className="mt-4 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
      >
        {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Anotar mi sueño'}
      </button>
    </div>
  );
}

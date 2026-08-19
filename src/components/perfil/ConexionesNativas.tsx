'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { esNativo, sincronizarCalendario, sincronizarSalud, type ResultadoSync } from '@/lib/nativo';

// Conexiones que solo puede LEER la app nativa del iPhone (HealthKit, Calendario).
// La sección aparece igual en la PWA/Safari, pero ahí muestra "desde la app": el
// mismo web app se sirve a las dos; solo cambia si hay puente nativo para conectar.

type EstadoConexion = 'no-conectado' | 'conectado';

const IconSalud = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#d1567a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
    <path d="M12 20s-7-4.6-7-9.3A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.7C19 15.4 12 20 12 20z" />
    <path d="M3 12h4l1.5-3 2.5 6 2-4 1.5 1H21" />
  </svg>
);

const IconCalendarioTel = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#4a56c8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

function Tarjeta({
  icono,
  tint,
  titulo,
  sub,
  nativo,
  onSync,
}: {
  icono: React.ReactNode;
  tint: string;
  titulo: string;
  sub: string;
  nativo: boolean;
  onSync: () => Promise<ResultadoSync>;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<'idle' | 'sync' | 'ok' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function conectar() {
    setEstado('sync');
    setMsg(null);
    const r = await onSync();
    setMsg(r.mensaje);
    setEstado(r.ok ? 'ok' : 'error');
    if (r.ok) router.refresh();
  }

  return (
    <div className="border-b border-[rgba(108,120,238,.08)] py-[15px] last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="flex size-[38px] flex-none items-center justify-center rounded-[12px]" style={{ background: tint }}>
          {icono}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-tinta">{titulo}</p>
          <p className="mt-px font-mono text-[12px] text-niebla text-pretty">{sub}</p>
        </div>
        {nativo ? (
          <button
            type="button"
            disabled={estado === 'sync'}
            onClick={conectar}
            className="flex-none rounded-lg border border-iris-borde px-3 py-1.5 font-mono text-[11px] font-semibold text-iris-deep disabled:opacity-60"
          >
            {estado === 'sync' ? 'Sincronizando…' : estado === 'ok' ? 'Sincronizar' : 'Conectar'}
          </button>
        ) : (
          <span className="flex-none rounded-lg bg-gris-tint px-2.5 py-1.5 text-right font-mono text-[11px] font-semibold leading-tight text-niebla">
            Desde la<br />app del iPhone
          </span>
        )}
      </div>
      {msg && (
        <p
          className="mt-2 pl-[50px] font-mono text-[11px] leading-snug text-pretty"
          style={{ color: estado === 'ok' ? 'var(--color-verde)' : 'var(--color-rosa)' }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

export function ConexionesNativas() {
  // En la app nativa, Capacitor inyecta window.Capacitor; en Safari no existe.
  const [nativo, setNativo] = useState(false);
  useEffect(() => setNativo(esNativo()), []);

  return (
    <div className="rounded-[18px] bg-white px-[18px] shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <Tarjeta
        icono={IconCalendarioTel}
        tint="var(--color-iris-soft)"
        titulo="Calendario del iPhone"
        sub="Tus eventos del teléfono, en tu calendario"
        nativo={nativo}
        onSync={sincronizarCalendario}
      />
      <Tarjeta
        icono={IconSalud}
        tint="#fbe4ec"
        titulo="Apple Salud"
        sub="Tus pasos de cada día (el sueño todavía no)"
        nativo={nativo}
        onSync={sincronizarSalud}
      />
      <p className="py-3 text-[12px] leading-snug text-niebla text-pretty">
        Se activan desde la app del iPhone: tocás Conectar, iOS te pide permiso una vez, y tus eventos y pasos se cargan
        solos. En Safari se ven pero no se pueden conectar.
      </p>
    </div>
  );
}

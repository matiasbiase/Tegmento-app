'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rehacer la rueda pisa scores y focos: pide confirmación en dos pasos.
 * Va al flujo soloRueda (/rueda/editar), que no borra chats ni líneas.
 */
export function BotonRehacerRueda() {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const pendiente = false;

  if (confirmando) {
    return (
      <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
        <p className="text-[15px] font-semibold text-tinta">¿Rehacer la rueda desde cero?</p>
        <p className="mt-1 text-[13px] leading-snug text-niebla text-pretty">
          Se pisan tus puntajes y focos actuales. Tus chats, bitácora y líneas quedan intactos.
        </p>
        <div className="mt-3.5 flex gap-2.5">
          <button
            type="button"
            disabled={pendiente}
            onClick={() => router.push('/rueda/editar')}
            className="flex-1 rounded-[14px] py-2.5 font-mono text-[12px] font-bold tracking-[0.3px] text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
          >
            {pendiente ? 'Abriendo…' : 'Sí, rehacer'}
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => setConfirmando(false)}
            className="flex-1 rounded-[14px] border border-iris-borde bg-white py-2.5 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="flex w-full items-center gap-3.5 tarjeta bg-white text-left shadow-[0_4px_18px_rgba(50,50,90,.05)]"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-[12px] bg-[rgba(108,120,238,.1)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="#6c78ee" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-tinta">Rehacer la rueda desde cero</p>
        <p className="mt-0.5 font-mono text-[12px] text-niebla text-pretty">Volvé a puntuar tus 8 áreas y elegir focos.</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="#c4c4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

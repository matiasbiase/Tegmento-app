'use client';

import { useRouter } from 'next/navigation';

export function BotonSalir() {
  const router = useRouter();
  async function salir() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  return (
    <button
      onClick={salir}
      className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[rgba(194,85,113,.4)] py-3.5 font-mono text-[13px] font-semibold tracking-[0.3px] text-rosa"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Cerrar sesión
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';

export function GoogleConexion({ conectado }: { conectado: boolean }) {
  const router = useRouter();

  if (!conectado) {
    return (
      <a
        href="/api/google/conectar"
        className="rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-white"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
      >
        Conectar
      </a>
    );
  }
  return (
    <button
      onClick={async () => {
        await fetch('/api/google/desconectar', { method: 'POST' });
        router.refresh();
      }}
      className="rounded-lg border border-iris-borde px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-niebla"
    >
      Desconectar
    </button>
  );
}

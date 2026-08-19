'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generarHighlight } from '@/lib/actions/highlights';

// texto: highlight cacheado de hoy, o un fallback inmediato si todavía no hay de hoy.
// esDeHoy: si ya hay highlight generado hoy (no auto-regenera).
export function Highlight({ texto, esDeHoy }: { texto: string; esDeHoy: boolean }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);

  async function generar() {
    setTrabajando(true);
    try {
      await generarHighlight();
      router.refresh();
    } finally {
      setTrabajando(false);
    }
  }

  // Primera apertura del día: enriquecer con IA en segundo plano, una sola vez.
  useEffect(() => {
    if (!esDeHoy && !trabajando) generar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="relieve rounded-app border border-ambar-deep bg-[var(--color-burbuja)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[12px] font-semibold tracking-[0.3px] text-ambar-dim">Hoy, en una mirada</h2>
        <button
          type="button"
          onClick={generar}
          disabled={trabajando}
          aria-label="Actualizar"
          className="font-mono text-[12px] text-ambar disabled:opacity-50"
        >
          {trabajando ? 'pensando…' : '↻'}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-crema">{texto}</p>
    </section>
  );
}

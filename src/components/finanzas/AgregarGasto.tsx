'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { guardarGastoManual } from '@/lib/actions/gastos';

const CATEGORIAS = ['super', 'comida', 'transporte', 'farmacia', 'ocio', 'otros'];

// Cargar un gasto a mano. Nació el 26/07 porque antes solo se podía con la
// cámara: sin el ticket en la mano, no había forma de anotar el gasto.
//
// ⚠️ Desde el 03/08 la cámara no existe más, así que esto y la marca
// `[+gasto:]` del chat son las dos ÚNICAS puertas que quedan.
export function AgregarGasto() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [total, setTotal] = useState('');
  const [comercio, setComercio] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    const t = parseFloat(total.replace(',', '.'));
    if (!Number.isFinite(t) || t <= 0) {
      setError('Poné un monto.');
      return;
    }
    setGuardando(true);
    setError(null);
    const r = await guardarGastoManual({ total: t, comercio, categoria, moneda: '€' });
    setGuardando(false);
    if (!r.ok) {
      setError(r.error ?? 'No se pudo.');
      return;
    }
    setTotal('');
    setComercio('');
    setCategoria(null);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-iris-borde bg-white py-3 font-mono text-[13px] font-semibold text-iris-deep"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar un gasto a mano
      </button>
    );
  }

  return (
    <div className="mb-4 tarjeta bg-white sombra-card">
      <div className="mb-2.5 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-niebla">€</span>
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && guardar()}
            inputMode="decimal"
            autoFocus
            placeholder="0"
            className="w-full rounded-[12px] border border-iris-borde bg-papel-2 py-2.5 pl-8 pr-3 text-[16px] text-tinta outline-none focus:border-iris"
          />
        </div>
        <input
          value={comercio}
          onChange={(e) => setComercio(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          placeholder="En qué (súper, café…)"
          className="min-w-0 flex-[1.4] rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2.5 text-[16px] text-tinta outline-none focus:border-iris"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIAS.map((c) => {
          const on = categoria === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(on ? null : c)}
              className={`rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold capitalize transition-colors ${
                on ? 'bg-iris text-white' : 'border border-iris-borde bg-white text-niebla'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {error && <p className="mb-2 text-[12px] text-rosa">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex-1 rounded-[12px] py-2.5 font-mono text-[13px] font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
        >
          {guardando ? 'Guardando…' : 'Anotar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="flex-none rounded-[12px] border border-iris-borde px-4 font-mono text-[13px] font-semibold text-niebla"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

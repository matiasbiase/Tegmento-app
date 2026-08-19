'use client';

import { useState, useTransition } from 'react';
import { guardarVoz, alternarVozAuto } from '@/lib/actions/perfil';
import { Switch } from '@/components/perfil/Switch';

const IRIS = 'var(--color-iris)';

const VOCES = [
  { id: 'kokoro:ef_dora', label: 'Dora', meta: 'neural ♀' },
  { id: 'kokoro:em_alex', label: 'Alex', meta: 'neural ♂' },
  { id: 'kokoro:em_santa', label: 'Santa', meta: 'neural ♂' },
];

export function VozPerfil({ vozInicial, vozAutoInicial }: { vozInicial: string; vozAutoInicial: boolean }) {
  const [voz, setVoz] = useState(vozInicial);
  const [, startTransition] = useTransition();

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="mb-4 flex gap-2">
        {VOCES.map((v) => {
          const sel = voz === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVoz(v.id);
                startTransition(() => {
                  void guardarVoz(v.id);
                });
              }}
              className="flex flex-1 flex-col items-center gap-[3px] rounded-2xl p-[12px_4px]"
              style={{ background: sel ? 'rgba(108,120,238,.1)' : 'var(--color-lavanda)', border: `1.5px solid ${sel ? IRIS : 'transparent'}` }}
            >
              <span className="text-[15px] font-semibold" style={{ color: sel ? IRIS : 'var(--color-tinta)' }}>
                {v.label}
              </span>
              <span className="font-mono text-[11px] text-niebla">{v.meta}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-0.5 py-1.5">
        <span className="text-[15px] font-medium text-tinta">Leer respuestas en voz alta</span>
        <Switch inicial={vozAutoInicial} onToggle={alternarVozAuto} />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ponerMetaSemanal } from '@/lib/actions/actividades';
import { METAS_POSIBLES } from '@/lib/marcas';
import { IconLapiz } from '@/components/ui/iconos';

// Elegir cuántas veces por semana querés hacer algo. Sin esto, la app medía todo
// contra "todos los días", que para correr o ir al gimnasio es una vara que nadie
// se puso. Con la meta, 2 de 2 es un éxito.

export function MetaSemanal({ lineaId, meta }: { lineaId: number; meta: number | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState<number | null>(meta);

  async function elegir(nueva: number | null) {
    setValor(nueva);
    setAbierto(false);
    await ponerMetaSemanal(lineaId, nueva);
    router.refresh();
  }

  return (
    <>
      {/* SOLO EL LÁPIZ, sin el texto "meta: 2× por semana" al lado (30/07,
          Matías: *"¿por qué no ponés el lápiz al lado de '0 de X' y sacás el
          textito?"*). Ese texto repetía lo que el pill de progreso, ahí al
          lado (ver GrillaDias), ya cuenta — "2 de 2, como querías" YA dice
          cuál es la meta. El lápiz solo, pegado a ese pill, alcanza para
          entender que ahí se cambia. Por eso este componente ya no arma su
          propia fila: el que lo usa lo pone donde corresponda. */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={valor ? `Meta: ${valor} veces por semana. Cambiarla` : 'Ponerle una meta semanal'}
        className="flex size-6 flex-none items-center justify-center rounded-full text-niebla"
      >
        <IconLapiz className="size-[13px]" />
      </button>

      {abierto && (
        <div className="mt-2 w-full rounded-[12px] border border-gris-tint bg-[#fbfbfe] p-2.5">
          <p className="mb-2 font-mono text-[11px] font-semibold text-niebla">
            ¿Cuántas veces por semana querés hacerla?
          </p>
          {/* Botones grandes, no cuadraditos de 32px (29/07, Matías: *"es medio
              chiquitito y no me parece la mejor forma de mostrarlo"*). Cada uno
              dice qué significa, así no hay que deducir que "3" son tres veces
              por semana. */}
          <div className="flex flex-wrap gap-1.5">
            {METAS_POSIBLES.map((n) => {
              const sel = valor === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => elegir(n)}
                  className={`h-9 min-w-[46px] rounded-[12px] px-2.5 font-mono text-[12px] font-bold transition-colors ${
                    sel ? 'bg-iris text-white' : 'bg-white text-tinta-soft'
                  }`}
                  style={sel ? undefined : { boxShadow: 'inset 0 0 0 1px #e4e4ef' }}
                  aria-pressed={sel}
                  aria-label={`${n} ${n === 1 ? 'vez' : 'veces'} por semana`}
                >
                  {n}×
                </button>
              );
            })}
            {valor != null && (
              <button
                type="button"
                onClick={() => elegir(null)}
                className="h-9 rounded-[12px] bg-white px-3 font-mono text-[11px] font-semibold text-niebla"
                style={{ boxShadow: 'inset 0 0 0 1px #e4e4ef' }}
              >
                sacar meta
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

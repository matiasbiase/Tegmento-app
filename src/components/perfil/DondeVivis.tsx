'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarLugar } from '@/lib/actions/sobre-vos';
import { IconLapiz } from '@/components/ui/iconos';

// Dónde vivís. Es el dato que le faltaba a Descubrir: sin esto, "Contexto" era
// lo que pasa en el mundo (guerras, elecciones lejanas) en vez de lo que te pasa
// a vos donde estás. Con el lugar cargado se suman feeds de tu región y las
// noticias que nombran tu ciudad o tu país se van arriba de todo.
export function DondeVivis({ inicial }: { inicial: string | null }) {
  const router = useRouter();
  const [valor, setValor] = useState(inicial ?? '');
  const [editando, setEditando] = useState(!inicial);
  const [guardando, start] = useTransition();

  function guardar() {
    start(async () => {
      await guardarLugar(valor);
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex w-full items-center gap-3 tarjeta bg-white text-left shadow-[0_4px_18px_rgba(50,50,90,.05)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-tinta">{valor}</p>
          <p className="mt-0.5 font-mono text-[12px] text-niebla">Con esto elijo lo que pasa cerca tuyo</p>
        </div>
        {/* ⚠️ ACÁ DECÍA "Editar" ESCRITO (05/08, Matías: *"en todos lados que
            diga editar, que sea el lapicito"*). Era el último texto de la app
            que nombraba lo que el ícono ya dice, y encima el único: en el resto
            de las tarjetas editables el lápiz va solo. */}
        <span className="flex-none text-iris">
          <IconLapiz className="size-[15px]" />
        </span>
      </button>
    );
  }

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <p className="mb-1 text-[15px] font-semibold text-tinta">¿Dónde vivís?</p>
      <p className="mb-2.5 text-[12px] leading-snug text-niebla text-pretty">
        Ciudad y país. Lo uso para traerte lo que pasa donde estás, en vez de noticias del mundo que no te tocan.
      </p>
      <div className="flex gap-2">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valor.trim() && guardar()}
          placeholder="Núremberg, Alemania"
          className="min-w-0 flex-1 rounded-[14px] border border-iris-borde bg-white px-4 py-3 text-[16px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={!valor.trim() || guardando}
          className="flex-none rounded-[14px] px-4 font-mono text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
        >
          {guardando ? '…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

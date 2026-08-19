'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearActividad } from '@/lib/actions/actividades';
import { TituloSeccion } from '@/components/ui/TituloSeccion';
import type { Sugerencia } from '@/lib/descubrir';

// Descubrir: cosas para probar, elegidas según tus áreas. Dos tipos de tarjeta,
// según qué se hace al tocarlas: una actividad se suma a las tuyas; un tema de
// Polaridad abre esa herramienta con el ejemplo ya cargado.

function Chips({ areas }: { areas: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {areas.map((a) => (
        <span key={a} className="rounded-md bg-lavanda px-2 py-0.5 font-mono text-[11px] font-semibold text-niebla">
          {a}
        </span>
      ))}
    </div>
  );
}

function TarjetaActividad({ s, onSumada }: { s: Sugerencia; onSumada: (t: string) => void }) {
  const [sumando, setSumando] = useState(false);

  async function sumar() {
    if (sumando) return;
    setSumando(true);
    await crearActividad(s.titulo);
    // Al sumarla, el server refresca la lista y esta tarjeta desaparece (ya es
    // tuya). El aviso de arriba explica qué pasó, así el cambio no es abrupto.
    onSumada(s.titulo);
  }

  return (
    <div className="tarjeta bg-white sombra-card">
      <p className="text-[15px] font-semibold text-tinta text-pretty">{s.titulo}</p>
      <p className="mt-1 text-[13px] leading-snug text-tinta-soft text-pretty">{s.detalle}</p>
      <Chips areas={s.areas} />
      <button
        type="button"
        onClick={sumar}
        disabled={sumando}
        className="mt-3 w-full rounded-[12px] py-2.5 font-mono text-[12px] font-bold text-white disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
      >
        {sumando ? 'Sumando…' : 'Sumar a mis actividades'}
      </button>
    </div>
  );
}

function TarjetaPolaridad({ s }: { s: Sugerencia }) {
  const router = useRouter();
  return (
    <div className="tarjeta bg-white sombra-card">
      <p className="text-[15px] font-semibold leading-snug text-tinta text-pretty">“{s.titulo}”</p>
      <p className="mt-1.5 text-[13px] leading-snug text-niebla text-pretty">{s.detalle}</p>
      <button
        type="button"
        onClick={() => router.push(`/polaridad?texto=${encodeURIComponent(s.titulo)}`)}
        className="mt-3 w-full rounded-[12px] border border-iris-borde py-2.5 font-mono text-[12px] font-semibold text-iris-deep"
      >
        Pasarlo por Polaridad
      </button>
    </div>
  );
}

export function DescubrirUI({
  actividades,
  categoria = null,
}: {
  actividades: Sugerencia[];
  categoria?: string | null;
}) {
  const router = useRouter();
  const [sumada, setSumada] = useState<string | null>(null);

  // Filtrado por la categoría elegida arriba (una de las áreas de la rueda).
  // "Para vos" (sin categoría) muestra pocas; una categoría muestra todas las suyas.
  const acts = categoria ? actividades.filter((s) => s.areas.includes(categoria)) : actividades.slice(0, 6);

  return (
    <div className="flex flex-col gap-7">
      {sumada && (
        <button
          type="button"
          onClick={() => router.push('/actividades')}
          className="flex items-center gap-2.5 tarjeta bg-verde-tint text-left"
        >
          <span className="flex size-6 flex-none items-center justify-center rounded-full bg-verde text-[13px] text-white">✓</span>
          <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[#2b7a63] text-pretty">
            Sumaste “{sumada}”. Tocá para verla en Seguimiento.
          </span>
        </button>
      )}

      {acts.length > 0 && (
        <section>
          <TituloSeccion>Actividades para probar</TituloSeccion>
          <div className="flex flex-col gap-2.5">
            {acts.map((s) => (
              <TarjetaActividad key={s.id} s={s} onSumada={setSumada} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { AREAS_GUIA } from '@/lib/rueda-vida';
import { tintArea } from '@/lib/area-color';
import { Noticias } from '@/components/descubrir/Noticias';
import { DescubrirUI } from '@/components/descubrir/DescubrirUI';
import type { Sugerencia } from '@/lib/descubrir';

// Descubrir con categorías. Los nombres son los MISMOS que usa la app (las áreas
// de la rueda: Finanzas, Salud física…), no inventados, para que se entienda que
// es lo mismo. "Para vos" muestra todo, ordenado por tus áreas de foco.

const AREAS = AREAS_GUIA.map((a) => a.nombre);

export function DescubrirCliente({
  foco,
  actividades,
}: {
  foco: string[];
  actividades: Sugerencia[];
}) {
  const [cat, setCat] = useState<string | null>(null);
  // Las de foco primero, para que lo que estás trabajando quede a mano.
  const orden = [...AREAS].sort((a, b) => Number(foco.includes(b)) - Number(foco.includes(a)));

  return (
    <div className="flex flex-col gap-6">
      {/* segmentos: Para vos + las áreas de la rueda, scroll horizontal */}
      <div className="-mx-[22px] overflow-x-auto px-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          <Chip activo={cat === null} onClick={() => setCat(null)} label="Para vos" />
          {orden.map((a) => (
            <Chip key={a} activo={cat === a} onClick={() => setCat(a)} label={a} tinte={tintArea(a)} />
          ))}
        </div>
      </div>

      <Noticias categoria={cat} />
      <DescubrirUI actividades={actividades} categoria={cat} />
    </div>
  );
}

function Chip({
  activo,
  onClick,
  label,
  tinte,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  tinte?: { color: string; tint: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex-none whitespace-nowrap rounded-full border px-3.5 py-2 font-mono text-[12px] font-semibold transition-colors ${
        activo ? 'border-transparent text-white' : 'border-iris-borde bg-white text-niebla'
      }`}
      style={activo ? { background: tinte?.color ?? 'var(--color-iris-deep)' } : undefined}
    >
      {label}
    </button>
  );
}

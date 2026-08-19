'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pintarDia } from '@/lib/actions/actividades';
import { diasDeRacha, grillaDias, mapaSemanas, progresoMeta, racha, type DiaGrilla, type DiaMapa } from '@/lib/marcas';
import { MapaDias } from '@/components/actividades/MapaDias';
import { Celebracion } from '@/components/ui/Celebracion';
import { sonarExito } from '@/lib/sonido';

// La fila de días de una actividad diaria: la pintás como en un cuaderno.
// Solo se puede tocar hoy o ayer; los días más viejos quedan de solo lectura,
// porque si se pudiera rellenar la semana de memoria el dato no serviría.

// Los días se calculan en el cliente a propósito: el día es el del reloj de
// Matías, no el del server (que en el iPhone es el mismo, pero así no depende).
export function GrillaDias({
  lineaId,
  marcadas,
  meta = null,
}: {
  lineaId: number;
  marcadas: string[];
  meta?: number | null;
}) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  // Copia local para que el cuadrito se pinte al toque, sin esperar al server.
  const [pintadas, setPintadas] = useState<Set<string>>(() => new Set(marcadas));
  const [fiesta, setFiesta] = useState<{ hito: boolean; origen: { x: number; y: number } } | null>(null);
  const dias: DiaGrilla[] = grillaDias();
  // Cinco semanas de historia en vez de una sola: el mapa cuenta si sostenés.
  const semanas = mapaSemanas();
  const enRacha = new Set(diasDeRacha(pintadas));
  // El pill de progreso y el lápiz de meta se movieron a `RenglonActividad`
  // (30/07, ver el comentario ahí): quedan afuera, esta grilla solo pinta.

  function tocar(d: DiaGrilla, e: React.MouseEvent) {
    if (!d.editable) return;
    const yaEstaba = pintadas.has(d.fecha);
    const siguiente = new Set(pintadas);
    if (yaEstaba) siguiente.delete(d.fecha);
    else siguiente.add(d.fecha);
    setPintadas(siguiente);

    // Celebración al pintar (no al despintar): si la racha crece y llega a 2+,
    // festejamos; en los hitos (7, 30) va la celebración grande. Un pintado
    // suelto solo hace un "tin". Nunca hay castigo al cortar.
    if (!yaEstaba) {
      const antes = racha(pintadas);
      const ahora = racha(siguiente);
      const r = e.currentTarget.getBoundingClientRect();
      const origen = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      // Llegar a la meta que se puso gana sobre la racha: es lo que él quería
      // lograr. Solo festeja el día que la alcanza, no los que se pasa de largo.
      const cumpleAhora = meta != null && dias.filter((d) => siguiente.has(d.fecha)).length === progresoMeta(0, meta).meta;
      if (cumpleAhora) {
        setFiesta({ hito: true, origen });
      } else if (ahora > antes && ahora >= 2) {
        setFiesta({ hito: ahora === 7 || ahora === 30, origen });
      } else {
        sonarExito();
      }
    }

    arrancar(async () => {
      await pintarDia(lineaId, d.fecha);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="mb-1 grid grid-cols-7 gap-[5px]">
        {dias.map((d) => (
          <span key={`h-${d.fecha}`} className="text-center font-mono text-[11px] font-bold text-niebla-2">
            {d.dow}
          </span>
        ))}
      </div>
      <MapaDias
        semanas={semanas}
        pintadas={pintadas}
        diasRacha={enRacha}
        onTocar={(d, e) => tocar(d as DiaGrilla, e)}
      />
      {fiesta && <Celebracion hito={fiesta.hito} origen={fiesta.origen} onFin={() => setFiesta(null)} />}
    </div>
  );
}

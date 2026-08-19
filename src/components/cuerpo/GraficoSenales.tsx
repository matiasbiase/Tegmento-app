'use client';

import type { PuntoSenal } from '@/lib/cuerpo';

// Energía y libido de las últimas dos semanas, como líneas. Antes energía/libido
// eran un formulario que se llenaba y no devolvía nada; ahora se cargan en la
// Casa y acá se ven en el tiempo, para cruzarlas con el sueño y el ánimo.

const W = 280;
const H = 96;
const PAD_X = 6;
const PAD_Y = 12;

function ruta(puntos: PuntoSenal[]): { d: string; ultimo: { x: number; y: number } | null } {
  const conDato = puntos.map((p, i) => ({ p, i })).filter(({ p }) => p.valor != null);
  if (conDato.length === 0) return { d: '', ultimo: null };
  const paso = (W - PAD_X * 2) / Math.max(1, puntos.length - 1);
  const xy = ({ p, i }: { p: PuntoSenal; i: number }) => {
    const x = PAD_X + i * paso;
    // valor 1..5 → de abajo (1) a arriba (5)
    const y = PAD_Y + (H - PAD_Y * 2) * (1 - ((p.valor as number) - 1) / 4);
    return { x, y };
  };
  const pts = conDato.map(xy);
  const d = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  return { d, ultimo: pts[pts.length - 1] };
}

export function GraficoSenales({
  energia,
  libido,
}: {
  energia: PuntoSenal[];
  libido: PuntoSenal[];
}) {
  const e = ruta(energia);
  const l = ruta(libido);
  const hayAlgo = e.ultimo || l.ultimo;

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-tinta">Cómo venís</span>
        <span className="font-mono text-[11px] text-niebla">últimas 2 semanas</span>
      </div>

      {!hayAlgo ? (
        <p className="py-3 text-[13px] leading-snug text-niebla text-pretty">
          Cargá tu energía o tu libido desde la Casa (el chip “Cómo venís”) y acá vas a ver cómo evolucionan.
        </p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ height: 96 }} aria-label="Energía y libido de las últimas dos semanas">
            {/* guías horizontales sutiles */}
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + (H - PAD_Y * 2) * f} y2={PAD_Y + (H - PAD_Y * 2) * f} stroke="#eeeef6" strokeWidth="1" />
            ))}
            {e.d && <path d={e.d} fill="none" stroke="#c79238" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
            {l.d && <path d={l.d} fill="none" stroke="#c25571" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 5" />}
            {e.ultimo && <circle cx={e.ultimo.x} cy={e.ultimo.y} r="3.2" fill="#c79238" />}
            {l.ultimo && <circle cx={l.ultimo.x} cy={l.ultimo.y} r="3.2" fill="#c25571" />}
          </svg>
          <div className="mt-2 flex gap-4">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-niebla">
              <span className="h-[3px] w-3.5 rounded-full" style={{ background: 'var(--color-oro-2)' }} />
              Energía
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-niebla">
              <span className="h-[3px] w-3.5 rounded-full" style={{ background: 'var(--color-rosa)' }} />
              Libido
            </span>
          </div>
        </>
      )}
    </div>
  );
}

import Link from 'next/link';
import type { PatronChip } from '@/lib/observaciones';

// La tira de patrones, justo debajo del promedio de ánimo. Es el mismo material
// que el panel del Analista pero en otro formato: acá no se lee, se ojea. De un
// vistazo: qué patrones diste por buenos y cuántas lecturas lleva la app.
//
// Los que confirmaste van en verde; los que todavía están en observación, en gris.

export function BarraPatrones({
  patrones,
  lecturas,
  ultima,
  conLink = false,
}: {
  patrones: PatronChip[];
  lecturas: number;
  ultima: string | null;
  conLink?: boolean;
}) {
  if (patrones.length === 0 && lecturas === 0) return null;

  const cuerpo = (
    <>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Tus relaciones</p>
        <p className="font-mono text-[11px] text-niebla-2">
          {lecturas} {lecturas === 1 ? 'lectura' : 'lecturas'}
          {ultima ? ` · ${ultima}` : ''}
        </p>
      </div>

      {patrones.length === 0 ? (
        <p className="text-[13px] leading-snug text-niebla text-pretty">
          Ya hice lecturas de tus datos, pero todavía no me confirmaste ninguna. Decime cuáles te pasan y las sigo.
        </p>
      ) : (
        <div className="sin-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {patrones.map((p, i) => (
            <span
              key={i}
              className={`flex-none rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ${
                p.confirmado ? 'bg-verde-tint text-verde' : 'bg-gris-tint text-niebla'
              }`}
              title={p.texto}
            >
              {p.confirmado ? '✓ ' : ''}
              {p.texto.length > 42 ? `${p.texto.slice(0, 42).replace(/\s+\S*$/, '')}…` : p.texto}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const clases = 'block rounded-[18px] bg-white p-[13px_15px] sombra-card';
  return conLink ? (
    <Link href="/cosas-chicas" className={clases}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clases}>{cuerpo}</div>
  );
}

import type { Insight } from '@/lib/insight-finanzas';

// Lo que se nota en los gastos del mes. Si no hay nada sólido que decir, la card
// no aparece: mejor el silencio que una obviedad.

const ICONO: Record<Insight['tipo'], { bg: string; color: string; path: string }> = {
  // un local al que volvés
  comercio: { bg: '#eaebfc', color: '#4a56c8', path: 'M4 9h16l-1.2 9.5a2 2 0 0 1-2 1.75H7.2a2 2 0 0 1-2-1.75zM9 9V6.5a3 3 0 0 1 6 0V9' },
  // la porción que se lleva una categoría
  categoria: { bg: '#faf0dd', color: '#b06a1a', path: 'M12 3a9 9 0 1 0 9 9h-9z' },
  // la flecha del mes contra el anterior
  comparacion: { bg: '#e3f1ec', color: '#3d9b80', path: 'M4 16l5-5 4 3 6.5-7M20 6h-4M20 6v4' },
};

export function InsightFinanzas({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="mb-4 tarjeta bg-white sombra-card">
      <p className="mb-2.5 font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Lo que se nota</p>
      <div className="flex flex-col gap-2.5">
        {insights.map((i) => {
          const ic = ICONO[i.tipo];
          return (
            <div key={i.tipo} className="flex gap-2.5">
              <span
                className="mt-px flex size-[22px] flex-none items-center justify-center rounded-[8px]"
                style={{ background: ic.bg }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ic.color}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[13px]"
                >
                  <path d={ic.path} />
                </svg>
              </span>
              <p className="min-w-0 flex-1 text-[15px] leading-[1.42] text-tinta-soft text-pretty">{i.texto}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

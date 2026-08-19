import type { PuntoSueno } from '@/lib/cuerpo';

const IRIS = 'var(--color-iris)';
const MAX_H = 10; // tope del eje en horas

export function GraficoSueno({ serie, promedio }: { serie: PuntoSueno[]; promedio: number | null }) {
  const conDato = serie.some((p) => p.horas != null);

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Sueño · últimos 7 días</p>
        {promedio != null && <span className="text-[13px] font-semibold text-tinta-soft">{promedio.toLocaleString('es-AR')}h prom.</span>}
      </div>

      {!conDato ? (
        <p className="py-4 text-[15px] leading-relaxed text-niebla text-pretty">
          Todavía no registraste tu sueño. Anotalo abajo y va a empezar a aparecer acá.
        </p>
      ) : (
        <div className="flex h-[110px] items-end justify-between gap-2">
          {serie.map((p) => {
            const h = p.horas != null ? Math.min(p.horas, MAX_H) / MAX_H : 0;
            return (
              <div key={p.dia} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-[80px] w-full items-end justify-center">
                  {p.horas != null ? (
                    <div
                      className="w-[62%] rounded-t-[6px]"
                      style={{ height: `${Math.max(6, h * 80)}px`, background: p.esHoy ? IRIS : 'rgba(108,120,238,.3)' }}
                      title={`${p.horas.toLocaleString('es-AR')}h`}
                    />
                  ) : (
                    <div className="w-[62%] rounded-t-[6px] border border-dashed border-[rgba(108,120,238,.25)]" style={{ height: '6px' }} />
                  )}
                </div>
                <span className="font-mono text-[11px]" style={{ color: p.esHoy ? IRIS : '#b8b8c8', fontWeight: p.esHoy ? 700 : 400 }}>
                  {p.inicial}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

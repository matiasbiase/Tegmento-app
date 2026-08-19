import type { DiaAnimo } from '@/lib/animo';

export type SerieFoco = { nombre: string; color: string; serie: DiaAnimo[] };

const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function colorValor(v: number | null): string {
  if (v === null) return 'var(--color-borde)';
  if (v > 0.33) return 'var(--color-teal)'; // bien
  if (v < -0.33) return 'var(--color-brick)'; // mal
  return 'var(--color-ambar)'; // más o menos
}

export function EvolucionAnimo({ focos }: { focos: SerieFoco[] }) {
  if (focos.length === 0) return null;
  const hayDatos = focos.some((f) => f.serie.some((d) => d.valor !== null));

  return (
    <section className="relieve rounded-app border border-borde bg-surface p-4">
      <h2 className="mb-1 font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">Cómo venís evolucionando</h2>
      <p className="mb-3 text-[12px] text-muted">Tu ánimo en los últimos 7 días.</p>

      {!hayDatos ? (
        <p className="text-[13px] text-crema-soft">
          Registrá cómo venís en la pantalla principal y acá vas a ver cómo cambia con los días.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {focos.map((f) => (
            <div key={f.nombre}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: f.color }} />
                <span className="font-mono text-[12px] font-semibold tracking-[0.3px] text-crema">{f.nombre}</span>
              </div>
              <div className="flex gap-1.5">
                {f.serie.map((d, i) => {
                  const dow = new Date(d.dia + 'T12:00:00').getDay();
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="h-7 w-full rounded-[4px]"
                        style={{ background: colorValor(d.valor), opacity: d.valor === null ? 0.4 : 1 }}
                        title={d.dia}
                      />
                      <span className="font-mono text-[11px] text-muted">{DIAS_LETRA[dow]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-3 border-t border-borde/60 pt-2">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal" /><span className="text-[11px] text-muted">bien</span></span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ambar" /><span className="text-[11px] text-muted">más o menos</span></span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brick" /><span className="text-[11px] text-muted">mal</span></span>
          </div>
        </div>
      )}
    </section>
  );
}

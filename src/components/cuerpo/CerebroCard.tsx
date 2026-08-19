import { type IconoCerebro, type LecturaCerebro } from '@/lib/cerebro';

// Lo que no solemos ver: qué mecanismo suele haber detrás de lo que ya anotás.
// La forma de cada tarjeta sigue la regla del lib: primero TU dato (que es real),
// después "eso suele…" (que es el mecanismo, en condicional).
//
// Colores literales: Safari no resuelve var() en atributos de SVG.

const ICONOS: Record<IconoCerebro, React.ReactNode> = {
  // una señal que se dispara y no vuelve a la línea de base
  alerta: <path d="M3 14h3.5l2-6 3 11 2.5-8 1.5 3H21" />,
  // dos personas
  vinculo: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a5.5 5.5 0 0 0-2.2-4.4" />
    </>
  ),
  // una chispa: las ganas de ir por la próxima
  recompensa: (
    <>
      <path d="M12 3l1.9 4.9L19 9.8l-4.2 3.3.6 5.3-4.4-2.7-4.4 2.7.6-5.3L3 9.8l5.1-1.9z" />
    </>
  ),
};

export function CerebroCard({ lecturas }: { lecturas: LecturaCerebro[] }) {
  if (lecturas.length === 0) {
    return (
      <div className="tarjeta border border-iris-borde bg-white shadow-[0_3px_14px_rgba(50,50,90,.05)]">
        <p className="text-[13px] leading-relaxed text-niebla text-pretty">
          Todavía no hay con qué. Cuando lleves unas cuantas noches de sueño y algunos check-ins, acá va a aparecer qué
          suele haber detrás de lo que sentís.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {lecturas.map((l) => (
        <div
          key={l.id}
          className="tarjeta border bg-white shadow-[0_3px_14px_rgba(50,50,90,.05)]"
          style={{ borderColor: `${l.color}33` }}
        >
          <div className="mb-2 flex items-center gap-2.5">
            <span
              className="flex size-8 flex-none items-center justify-center rounded-[11px]"
              style={{ background: l.tint }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={l.color}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[17px]"
              >
                {ICONOS[l.icono]}
              </svg>
            </span>
            <span
              className="font-mono text-[11px] font-semibold tracking-[0.6px]"
              style={{ color: l.color }}
            >
              {l.sustancia}
            </span>
          </div>
          <p className="text-[14px] font-semibold leading-snug text-tinta text-pretty">{l.dato}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-tinta-soft text-pretty">{l.suele}</p>
        </div>
      ))}
      {/* Lo más importante de la sección: que quede claro que nada de esto está medido. */}
      <p className="px-1 text-[12px] leading-relaxed text-niebla text-pretty">
        Nada de esto se mide acá. Son mecanismos conocidos, leídos sobre lo que vos anotaste.
      </p>
    </div>
  );
}

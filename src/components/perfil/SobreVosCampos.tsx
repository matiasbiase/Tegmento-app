'use client';

import type { Genero } from '@/lib/actions/sobre-vos';

export const NEURO_OPCIONES = ['TDAH', 'TEA / Autismo', 'Dislexia', 'Altas capacidades', 'TOC', 'Ansiedad', 'Otra'];

const GENEROS: { id: Genero; label: string }[] = [
  { id: 'mujer', label: 'Mujer' },
  { id: 'hombre', label: 'Hombre' },
  { id: 'reservado', label: 'Prefiero no decirlo' },
];

// Campos controlados de "Sobre vos": identidad, seguir ciclo y neurodivergencia.
// Los usan el onboarding y Perfil; el guardado lo hace cada quien.
export function SobreVosCampos({
  genero,
  setGenero,
  sigueCiclo,
  setSigueCiclo,
  neuro,
  setNeuro,
  neuroReservado,
  setNeuroReservado,
}: {
  genero: Genero | null;
  setGenero: (g: Genero) => void;
  sigueCiclo: boolean;
  setSigueCiclo: (v: boolean) => void;
  neuro: string[];
  setNeuro: (v: string[]) => void;
  neuroReservado: boolean;
  setNeuroReservado: (v: boolean) => void;
}) {
  // El ciclo se puede activar si es mujer o si prefiere no decir su género
  // (no todo el que menstrúa quiere declararlo). Para "hombre" no se ofrece.
  const mostrarCiclo = genero === 'mujer' || genero === 'reservado';

  function toggleNeuro(op: string) {
    setNeuroReservado(false);
    setNeuro(neuro.includes(op) ? neuro.filter((x) => x !== op) : [...neuro, op]);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* identidad */}
      <div>
        <p className="mb-2 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">¿Con qué te identificás?</p>
        <div className="flex flex-col gap-2">
          {GENEROS.map((g) => {
            const on = genero === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGenero(g.id)}
                className="flex items-center gap-3 tarjeta border text-left text-[15px] transition-colors"
                style={{
                  borderColor: on ? 'var(--color-iris)' : 'rgba(108,120,238,.16)',
                  background: on ? 'var(--color-iris-soft)' : '#fff',
                  color: on ? 'var(--color-iris-deep)' : 'var(--color-tinta)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <span
                  className="size-[18px] flex-none rounded-full border-2"
                  style={{
                    borderColor: on ? 'var(--color-iris)' : 'var(--color-niebla-2)',
                    background: on ? 'radial-gradient(circle, var(--color-iris) 40%, transparent 45%)' : 'transparent',
                  }}
                />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ciclo (solo si mujer) */}
      {mostrarCiclo && (
        <button
          type="button"
          onClick={() => setSigueCiclo(!sigueCiclo)}
          className="flex items-center justify-between gap-3 rounded-[14px] p-[13px_15px] text-left"
          style={{ background: '#fbe4ec' }}
        >
          <span>
            <span className="block text-[15px] font-semibold text-[#9c3457]">Seguir mi ciclo menstrual</span>
            <span className="mt-0.5 block text-[12px] text-[#b06a80]">Opcional. Lo ves en Cuerpo y en el Calendario.</span>
          </span>
          <span
            className="relative h-[26px] w-[44px] flex-none rounded-full transition-colors"
            style={{ background: sigueCiclo ? '#d1567a' : '#e4c4cf' }}
          >
            <span
              className="absolute top-[3px] size-5 rounded-full bg-white transition-all"
              style={{ left: sigueCiclo ? '21px' : '3px' }}
            />
          </span>
        </button>
      )}

      {/* neurodivergencia */}
      <div>
        <p className="mb-1 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">
          ¿Tenés algún diagnóstico de neurodivergencia?
        </p>
        <p className="mb-2.5 text-[12px] leading-snug text-niebla text-pretty">
          Opcional, pero me ayuda a entender cómo procesás las cosas. Tocá lo que aplique.
        </p>
        <div className="flex flex-wrap gap-2">
          {NEURO_OPCIONES.map((op) => {
            const on = !neuroReservado && neuro.includes(op);
            return (
              <button
                key={op}
                type="button"
                onClick={() => toggleNeuro(op)}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors"
                style={{
                  background: on ? 'var(--color-iris)' : '#fff',
                  color: on ? '#fff' : 'var(--color-tinta-soft)',
                  border: `1.5px solid ${on ? 'var(--color-iris)' : 'rgba(108,120,238,.16)'}`,
                }}
              >
                {op}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setNeuroReservado(!neuroReservado);
              if (!neuroReservado) setNeuro([]);
            }}
            className="rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: neuroReservado ? 'var(--color-niebla)' : '#fff',
              color: neuroReservado ? '#fff' : 'var(--color-niebla)',
              border: `1.5px solid ${neuroReservado ? 'var(--color-niebla)' : 'rgba(138,138,160,.28)'}`,
            }}
          >
            Prefiero no decirlo
          </button>
        </div>
      </div>
    </div>
  );
}

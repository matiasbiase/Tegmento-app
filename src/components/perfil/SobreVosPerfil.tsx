'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarSobreVos, type Genero } from '@/lib/actions/sobre-vos';
import { SobreVosCampos } from '@/components/perfil/SobreVosCampos';
import { IconLapiz } from '@/components/ui/iconos';

const RESERVADO = 'reservado';

const LABEL_GENERO: Record<Genero, string> = {
  mujer: 'Mujer',
  hombre: 'Hombre',
  reservado: 'Prefiero no decirlo',
};

export function SobreVosPerfil({
  generoInicial,
  sigueCicloInicial,
  neuroInicial,
}: {
  generoInicial: Genero | null;
  sigueCicloInicial: boolean;
  neuroInicial: string[];
}) {
  const router = useRouter();
  const [genero, setGenero] = useState<Genero | null>(generoInicial);
  const [sigueCiclo, setSigueCiclo] = useState(sigueCicloInicial);
  const [neuroReservado, setNeuroReservado] = useState(neuroInicial.includes(RESERVADO));
  const [neuro, setNeuro] = useState<string[]>(neuroInicial.filter((n) => n !== RESERVADO));
  const [guardando, start] = useTransition();
  // Colapsado si ya hay un género definido (post-onboarding); abierto si falta.
  const [editando, setEditando] = useState(generoInicial == null);

  function guardar() {
    if (!genero) return;
    start(async () => {
      await guardarSobreVos({
        genero,
        sigueCiclo: genero !== 'hombre' ? sigueCiclo : false,
        neuro: neuroReservado ? [RESERVADO] : neuro,
      });
      setEditando(false);
      router.refresh();
    });
  }

  // Vista resumen: lo guardado, compacto, con un lápiz para editar.
  if (!editando && genero) {
    const partes = [LABEL_GENERO[genero]];
    if (genero !== 'hombre' && sigueCiclo) partes.push('sigue su ciclo');
    if (neuroReservado) partes.push('neurodivergencia reservada');
    else if (neuro.length) partes.push(neuro.join(', '));

    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="flex w-full items-center gap-3 tarjeta bg-white text-left shadow-[0_4px_18px_rgba(50,50,90,.05)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-tinta">{partes[0]}</p>
          {partes.length > 1 && (
            <p className="mt-0.5 font-mono text-[12px] text-niebla text-pretty">{partes.slice(1).join(' · ')}</p>
          )}
        </div>
        <span className="flex flex-none items-center gap-1.5 font-mono text-[12px] font-semibold text-iris">
          <IconLapiz className="size-[15px]" />
        </span>
      </button>
    );
  }

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <SobreVosCampos
        genero={genero}
        setGenero={setGenero}
        sigueCiclo={sigueCiclo}
        setSigueCiclo={setSigueCiclo}
        neuro={neuro}
        setNeuro={setNeuro}
        neuroReservado={neuroReservado}
        setNeuroReservado={setNeuroReservado}
      />
      <div className="mt-5 flex gap-2">
        {generoInicial != null && (
          <button
            type="button"
            onClick={() => {
              // descartar cambios: volver a lo guardado
              setGenero(generoInicial);
              setSigueCiclo(sigueCicloInicial);
              setNeuroReservado(neuroInicial.includes(RESERVADO));
              setNeuro(neuroInicial.filter((n) => n !== RESERVADO));
              setEditando(false);
            }}
            className="flex-none rounded-[14px] border border-iris-borde px-4 font-mono text-[12px] font-semibold text-niebla"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          disabled={!genero || guardando}
          onClick={guardar}
          className="flex-1 rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

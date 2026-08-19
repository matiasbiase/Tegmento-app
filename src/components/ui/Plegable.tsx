'use client';

import { useState } from 'react';

// Una fila que se abre. Para lo que tiene que seguir estando pero dejar de
// competir: en Patrones, el gráfico de ánimo y el resumen de la semana.
//
// Arranca cerrada a propósito. Lo que se abre es una decisión del que mira, y
// una pantalla donde todo está abierto es una pantalla donde nada resalta.
export function Plegable({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2.5 rounded-[18px] border border-iris-borde bg-white px-[13px] py-3 text-left text-[14px] font-medium text-tinta shadow-[0_3px_14px_rgba(50,50,90,.05)]"
      >
        <span className="flex-none text-niebla">{icono}</span>
        {titulo}
        <span className={`ml-auto flex-none text-niebla-2 transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>
      {abierto && <div className="mt-2">{children}</div>}
    </div>
  );
}

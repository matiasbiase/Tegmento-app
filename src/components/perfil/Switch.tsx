'use client';

import { useState, useTransition } from 'react';

/**
 * Switch tipo iOS (lila). Optimista: cambia al instante y persiste con la action.
 * `onToggle` devuelve el estado real guardado.
 */
export function Switch({ inicial, onToggle }: { inicial: boolean; onToggle: () => Promise<boolean> }) {
  const [on, setOn] = useState(inicial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        const optimista = !on;
        setOn(optimista);
        startTransition(async () => {
          try {
            const real = await onToggle();
            setOn(real);
          } catch {
            setOn(!optimista);
          }
        });
      }}
      className="relative h-7 w-12 flex-none rounded-full transition-colors duration-200"
      style={{ background: on ? 'var(--color-iris)' : '#d4d4e2' }}
    >
      <span
        className="absolute left-[3px] top-[3px] size-[22px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,.18)] transition-transform duration-200"
        style={{ transform: on ? 'translateX(20px)' : 'none' }}
      />
    </button>
  );
}

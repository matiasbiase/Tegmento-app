'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * El campo de búsqueda, con el filtro de destacados al lado.
 *
 * La búsqueda va por URL (`?q=…&destacados=1`) y no por estado local: así el
 * resultado se puede compartir, el botón de atrás funciona, y la consulta la
 * hace el server sin necesidad de una API aparte.
 *
 * ⚠️ Se busca al ENVIAR, no en cada tecla. En el celular, buscar mientras
 * escribís significa una consulta por letra y la lista saltando abajo del dedo.
 */
export function CampoBuscar({ valorInicial, soloDestacados }: { valorInicial: string; soloDestacados: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState(valorInicial);

  function ir(q: string, destacados: boolean) {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (destacados) p.set('destacados', '1');
    router.push(`/buscar${p.toString() ? `?${p}` : ''}`);
  }

  return (
    <div className="mt-1 flex gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ir(texto, soloDestacados);
        }}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-iris-borde bg-white px-3.5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[16px] flex-none text-niebla-2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          type="search"
          enterKeyHint="search"
          placeholder="Buscar en lo que hablaste…"
          aria-label="Buscar en tus mensajes"
          className="min-w-0 flex-1 bg-transparent py-3 text-[16px] text-tinta outline-none placeholder:text-niebla"
        />
      </form>

      <button
        type="button"
        onClick={() => ir(texto, !soloDestacados)}
        aria-pressed={soloDestacados}
        aria-label={soloDestacados ? 'Ver todos los mensajes' : 'Ver solo los destacados'}
        className="grid size-[46px] flex-none place-items-center rounded-[18px] border transition-colors"
        style={{
          background: soloDestacados ? 'var(--color-ambar-tint)' : '#fff',
          borderColor: soloDestacados ? 'var(--color-oro-2)' : 'var(--color-iris-borde)',
          color: soloDestacados ? 'var(--color-oro-2)' : 'var(--color-niebla-2)',
        }}
      >
        <svg viewBox="0 0 24 24" className="size-[19px]" fill={soloDestacados ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
          <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />
        </svg>
      </button>
    </div>
  );
}

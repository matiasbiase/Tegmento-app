'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { descartarArranqueObjetivos, objetivoDesdeCandidato } from '@/lib/actions/objetivos';
import type { Candidato } from '@/lib/objetivos-arranque';
import { COLOR_TEMPERATURA } from '@/components/objetivos/color-temperatura';

/**
 * EL ARRANQUE DE OBJETIVOS EN EL HOME.
 *
 * Pieza 3 de `docs/maquetas/2026-07-30-objetivos.html`. Tres bloques, y el orden
 * no es casual: **primero se propone, después se pregunta.** La pregunta sola
 * ("¿hay algo grande en lo que venís?") le deja todo el trabajo al usuario —
 * tiene que pensar el qué, el desde cuándo y el nombre. Una fila que ya dice
 * "Alemán, desde marzo" es ese mismo objetivo con el trabajo hecho.
 *
 * ⚠️ **SE PREGUNTA UNA VEZ Y NO MOLESTA MÁS.** "Ahora no" apaga la tarjeta para
 * siempre (`descartarArranqueObjetivos`). Y desaparece sola en cuanto exista un
 * objetivo: una app que sigue preguntando si querés empezar algo que ya
 * empezaste no te está mirando.
 *
 * ⚠️ **NO DICE CUÁNTAS VECES.** Ver la nota larga en `lib/objetivos-arranque.ts`.
 * "96 veces desde marzo" era lo que decía la maqueta y Matías lo bajó el 30/07:
 * el número se lee como una medición, y "está frío" da la misma pauta sin
 * castigar a nadie.
 */

// El puntito de la temperatura y su regla ("va al lado de la palabra, no en
// lugar de ella") viven en `color-temperatura.ts`: desde el 03/08 también lo usa
// `TarjetaObjetivo`, y el mismo color tiene que salir de un solo lado.

export function ArranqueObjetivos({
  candidatos,
  estimacion,
}: {
  candidatos: Candidato[];
  /** "Los 3 que cerraste te llevaron entre 5 y 8 semanas". Null = no hay con qué. */
  estimacion: string | null;
}) {
  const router = useRouter();
  const [oculto, setOculto] = useState(false);
  const [tomados, setTomados] = useState<string[]>([]);
  const [pendiente, empezar] = useTransition();

  if (oculto) return null;

  const visibles = candidatos.filter((c) => !tomados.includes(c.titulo));

  function tomar(c: Candidato) {
    // Se saca de la lista al toque, sin esperar al servidor: la fila ya no tiene
    // nada que ofrecer y dejarla ahí medio segundo invita a tocarla dos veces.
    setTomados((t) => [...t, c.titulo]);
    empezar(async () => {
      await objetivoDesdeCandidato(c.titulo, c.desde);
      router.refresh();
    });
  }

  function ahoraNo() {
    setOculto(true);
    empezar(async () => {
      await descartarArranqueObjetivos();
    });
  }

  return (
    <div className="mb-4 tarjeta border border-iris-borde bg-white sombra-card">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-[26px] flex-none items-center justify-center rounded-[8px] bg-iris-soft text-iris">
          {/* La montaña, la misma que en la pestaña: dos dibujos para un mismo
              destino es lo que confunde. Vive en `ui/iconos.tsx`, pero acá va
              inline por ser un solo trazo y para no arrastrar el módulo entero. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
            <path d="M3 19h18L14.5 6.5 11 13l-2-3z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold leading-snug text-tinta text-pretty">
            ¿Hay algo grande en lo que venís, sin fecha de entrega?
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.45] text-niebla text-pretty">
            Buscar trabajo, aprender un idioma, volver a entrenar. Lo anoto y te muestro el tiempo que le vas
            poniendo.
          </p>
        </div>
      </div>

      {/* ── LO QUE YA VE ──────────────────────────────────────────────────── */}
      {visibles.length > 0 && (
        <div className="mt-3.5">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.3px] text-niebla">
            Lo veo en lo que ya venís haciendo
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {visibles.map((c) => (
              <div
                key={c.titulo}
                className="flex items-center gap-2.5 rounded-[12px] border border-iris-borde bg-papel-2 p-[9px_11px]"
              >
                <span className={`size-[7px] flex-none rounded-full ${COLOR_TEMPERATURA[c.temperatura]}`} aria-hidden />
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-tinta">
                  <span className="font-semibold">{c.titulo}</span>
                  <span className="text-niebla">, {c.frase}</span>
                </span>
                <button
                  type="button"
                  onClick={() => tomar(c)}
                  disabled={pendiente}
                  className="flex-none rounded-[9px] bg-iris-soft px-2.5 py-1.5 text-[12px] font-semibold text-iris-deep disabled:opacity-50"
                >
                  + objetivo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CUÁNTO SUELE LLEVARTE ─────────────────────────────────────────────
          La respuesta a "estaría bueno que estime cuánto va a llevar". Sí puede,
          y ⚠️ SOLO CON SUS PROPIOS CIERRES: no hay otros usuarios de los que
          sacar un promedio —la app es local y es de él— así que un "la gente
          suele tardar X" sería un número inventado, y una cifra inventada le
          arruina la credibilidad a todas las demás de la pantalla. Con un solo
          objetivo cerrado `estimarDeCerrados` devuelve null: un caso no es un
          rango. */}
      {estimacion && (
        <div className="mt-3.5 border-t border-iris-borde pt-3">
          <p className="font-mono text-[10.5px] font-semibold tracking-[0.3px] text-niebla">Cuánto suele llevarte</p>
          <p className="mt-1.5 text-[13.5px] leading-snug text-tinta text-pretty">{estimacion}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] leading-snug text-niebla">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[12px] flex-none">
              <path d="M12 9v4M12 16.5h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            sale de lo tuyo, no de un promedio de nadie
          </p>
        </div>
      )}

      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/objetivos?nuevo=1')}
          className="rounded-[12px] bg-iris px-3 py-[7px] text-[12.5px] font-semibold text-white"
        >
          Sí, anotarlo
        </button>
        <button
          type="button"
          onClick={ahoraNo}
          disabled={pendiente}
          className="rounded-[12px] px-3 py-[7px] text-[12.5px] font-semibold text-niebla disabled:opacity-50"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}

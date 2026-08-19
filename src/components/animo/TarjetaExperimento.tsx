'use client';

import { useState, useTransition } from 'react';
import { anotarDeExperimento } from '@/lib/actions/observaciones';

// UN experimento en curso, con el campo para anotar AHÍ MISMO.
//
// ── Por qué existe (29/07, Matías: *"Relaciones no deja anotar nada"*) ────────
// El Analista proponía "anotá con quién estuviste en los check-ins" y la única
// respuesta posible en toda la pantalla era "me pasa" / "no me pasa". El
// experimento te pedía observar algo y después no había dónde escribirlo: había
// que salir a otra pantalla y anotarlo como si fuera una nota suelta, perdiendo
// de qué experimento venía.
//
// ⚠️ EL CAMPO VA EN LA TARJETA Y NO DETRÁS DE UN BOTÓN. Un "+ anotar" que abre
// una hoja son dos toques y una pantalla nueva para escribir seis palabras;
// el experimento se observa en momentos sueltos del día y cualquier fricción
// ahí se come el registro. Si el campo está, se escribe.
//
// Y las últimas notas se ven abajo porque **anotar sin ver lo anotado se siente
// como tirar papelitos a un pozo**: al tercer día uno ya no sabe si viene
// escribiendo o no.

export type NotaExperimento = { id: number; texto: string; cuando: string };

export function TarjetaExperimento({
  lineaId,
  titulo,
  dias,
  notas,
}: {
  lineaId: number;
  titulo: string;
  /** Días que lleva corriendo, o null si no se pudo leer de las notas. */
  dias: number | null;
  /** Lo último que anotó sobre este experimento, de más nuevo a más viejo. */
  notas: NotaExperimento[];
}) {
  const [texto, setTexto] = useState('');
  const [guardando, empezar] = useTransition();
  // Lo escrito en esta visita, para que aparezca al toque sin esperar al server.
  const [recien, setRecien] = useState<string[]>([]);

  function anotar() {
    const t = texto.trim();
    if (!t || guardando) return;
    setTexto(''); // se vacía al toque: el campo queda listo para lo próximo
    setRecien((r) => [t, ...r]);
    empezar(async () => {
      await anotarDeExperimento(lineaId, t);
    });
  }

  // Se muestran tres notas contando las de esta visita: la tarjeta es un recordatorio
  // de que venís anotando, no el historial (ese está en Historial).
  const previas = notas.slice(0, Math.max(0, 3 - recien.length));

  return (
    <div className="glass-tinte mb-2.5 tarjeta border border-iris-borde">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-white text-iris shadow-[0_2px_8px_rgba(108,120,238,.16)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M9 3h6M10 3v5.2L5.6 17a2.2 2.2 0 0 0 1.9 3.3h9a2.2 2.2 0 0 0 1.9-3.3L14 8.2V3M8 14h8" />
          </svg>
        </span>
        {dias != null && (
          <span className="ml-auto flex-none rounded-full bg-iris-soft px-2 py-[3px] font-mono text-[10px] font-semibold text-iris-deep">
            {dias === 0 ? 'Arrancó hoy' : dias === 1 ? 'Día 2' : `Día ${dias + 1}`}
          </span>
        )}
      </div>

      <p className="mb-3 text-[15.5px] font-medium leading-[1.35] text-tinta text-pretty">{titulo}</p>

      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && anotar()}
          placeholder="Anotá lo que veas…"
          className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-niebla"
        />
        <button
          type="button"
          onClick={anotar}
          disabled={!texto.trim() || guardando}
          className="h-[42px] flex-none rounded-[12px] bg-iris px-4 font-mono text-[12.5px] font-bold text-white shadow-[0_4px_12px_rgba(108,120,238,.28)] disabled:opacity-40 disabled:shadow-none"
        >
          Anotar
        </button>
      </div>

      {(recien.length > 0 || previas.length > 0) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-iris-borde pt-2.5">
          {recien.map((t, i) => (
            <p key={`r${i}`} className="text-[13px] leading-snug text-tinta-soft text-pretty">
              <span className="font-mono text-[10.5px] text-verde">recién · </span>
              {t}
            </p>
          ))}
          {previas.map((n) => (
            <p key={n.id} className="text-[13px] leading-snug text-tinta-soft text-pretty">
              <span className="font-mono text-[10.5px] text-niebla-2">{n.cuando} · </span>
              {n.texto}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

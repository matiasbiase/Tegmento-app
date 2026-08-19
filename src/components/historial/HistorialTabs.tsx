'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Charlas, Carpetas, type ChatItem, type CarpetaVista, type NotaElegible } from '@/components/historial/Charlas';
import { TituloSeccion } from '@/components/ui/TituloSeccion';
import { borrarRegistro, type OrigenRegistro } from '@/lib/actions/registros';

// Un registro puntual de lo que fuiste subiendo (ánimo, sueño, notas, sync…).
export type Registro = {
  hora: string;
  etiqueta: string;
  color: string;
  tint: string;
  texto: string;
  origen: OrigenRegistro;
  id: number;
};

export type DiaRegistros = { dia: string; items: Registro[] };

// Historial en tres vistas: las charlas por día (tipo Notas), las carpetas que
// hiciste vos, y los registros crudos por día.
//
// ⚠️ Las charlas ya NO se agrupan por las 8 áreas de la rueda: era un orden que
// el usuario no eligió. Las áreas siguen existiendo para el Analista.
export function HistorialTabs({
  chats,
  carpetas,
  registros,
  notas = [],
}: {
  chats: ChatItem[];
  carpetas: CarpetaVista[];
  registros: DiaRegistros[];
  /** Las notas a las que se puede mandar una charla, ya filtradas. */
  notas?: NotaElegible[];
}) {
  const [vista, setVista] = useState<'charlas' | 'carpetas' | 'registros'>('charlas');

  return (
    <div>
      {/* selector de vista */}
      <div className="mb-5 flex gap-1 rounded-full bg-white p-1 shadow-[0_3px_14px_rgba(50,50,90,.06)]">
        {(
          [
            ['charlas', 'Charlas'],
            ['carpetas', 'Carpetas'],
            ['registros', 'Registros'],
          ] as const
        ).map(([key, label]) => {
          const sel = vista === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setVista(key)}
              className="flex-1 rounded-full py-2.5 font-mono text-[12px] font-semibold tracking-[0.2px] transition-colors"
              style={{
                background: sel ? 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' : 'transparent',
                color: sel ? '#fff' : 'var(--color-niebla)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {vista === 'charlas' ? (
        <Charlas chats={chats} carpetas={carpetas} notas={notas} />
      ) : vista === 'carpetas' ? (
        <Carpetas carpetas={carpetas} chats={chats} />
      ) : registros.length === 0 ? (
        <VacioRegistros />
      ) : (
        <div className="flex flex-col gap-6">
          {registros.map((d) => (
            <section key={d.dia}>
              <TituloSeccion>{d.dia}</TituloSeccion>
              <div className="flex flex-col gap-2">
                {d.items.map((r) => (
                  <RegistroItem key={`${r.origen}-${r.id}`} r={r} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function VacioRegistros() {
  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <p className="text-[15px] leading-relaxed text-niebla text-pretty">
        Acá va a aparecer todo lo que registres: ánimo, sueño, notas, lo que sincronices. Empezá con una etiqueta en el
        chat.
      </p>
    </div>
  );
}

// Tocás un registro y se expande: el texto completo (si es largo) + el tacho para
// borrarlo. El borrado pide un segundo toque de confirmación (dedazos del celu).
function RegistroItem({ r }: { r: Registro }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, startBorrando] = useTransition();
  const router = useRouter();
  const largo = r.texto.length > 110;

  function borrar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    startBorrando(async () => {
      await borrarRegistro(r.origen, r.id);
      router.refresh();
    });
  }

  return (
    <div
      onClick={() => {
        setAbierto((a) => !a);
        setConfirmando(false);
      }}
      className={`cursor-pointer rounded-[18px] bg-white p-[12px_14px] shadow-[0_3px_14px_rgba(50,50,90,.05)] transition-opacity ${borrando ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-3 text-left">
        <span
          className="mt-0.5 flex-none rounded-lg px-2 py-1 font-mono text-[11px] font-bold tracking-[0.2px]"
          style={{ background: r.tint, color: r.color }}
        >
          {r.etiqueta}
        </span>
        <span className={`min-w-0 flex-1 text-[15px] leading-[1.45] text-tinta text-pretty ${abierto ? '' : 'line-clamp-2'}`}>
          {r.texto}
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <span className="font-mono text-[11px] text-niebla">{r.hora}</span>
          {largo && (
            <svg
              viewBox="0 0 24 24" fill="none" stroke="#c4c4d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className="size-3.5 transition-transform"
              style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </span>
      </div>
      {abierto && (
        <div className="mt-2.5 flex justify-end border-t border-gris-tint-2 pt-2.5">
          <button
            type="button"
            disabled={borrando}
            onClick={(e) => {
              e.stopPropagation();
              borrar();
            }}
            className={`flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              confirmando ? 'border-rosa bg-rosa text-white' : 'border-[#f0d0d8] text-rosa'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
            {borrando ? 'Borrando…' : confirmando ? '¿Seguro? Tocá de nuevo' : 'Borrar'}
          </button>
        </div>
      )}
    </div>
  );
}

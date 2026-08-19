'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { guardarMes, type ModoGuardado } from '@/lib/actions/actividades';
import { grillaMes } from '@/lib/marcas';

// Pasar la hoja de papel a la app. Es la grilla del mes entero con todos los
// días tocables: acá NO corre la regla de hoy/ayer, porque transcribir lo que ya
// pintaste en papel no es rellenar de memoria. El futuro sí queda bloqueado.

export type FilaMes = { lineaId: number; titulo: string; fechas: string[] };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function nombreMes(mes: string): string {
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : mes;
}

export function TranscribirMes({ mes, filas, mesAnterior, mesSiguiente }: {
  mes: string;
  filas: FilaMes[];
  mesAnterior: string;
  mesSiguiente: string | null;
}) {
  const router = useRouter();
  const dias = grillaMes(mes);
  const [pintadas, setPintadas] = useState<Map<number, Set<string>>>(
    () => new Map(filas.map((f) => [f.lineaId, new Set(f.fechas)])),
  );
  const [modo, setModo] = useState<ModoGuardado>('sumar');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);

  function tocar(lineaId: number, fecha: string, editable: boolean) {
    if (!editable) return;
    setListo(null);
    setPintadas((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(lineaId) ?? []);
      if (set.has(fecha)) set.delete(fecha);
      else set.add(fecha);
      next.set(lineaId, set);
      return next;
    });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const n = await guardarMes(
        mes,
        filas.map((f) => ({ lineaId: f.lineaId, fechas: [...(pintadas.get(f.lineaId) ?? [])] })),
        modo,
      );
      setListo(`Guardado: ${n} ${n === 1 ? 'día pintado' : 'días pintados'} en ${nombreMes(mes)}.`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const total = [...pintadas.values()].reduce((s, set) => s + set.size, 0);

  return (
    <div>
      {/* mes */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/actividades/transcribir?mes=${mesAnterior}`}
          aria-label="Mes anterior"
          className="flex size-9 items-center justify-center rounded-full bg-white text-niebla sombra-card"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <p className="font-serif text-[19px] font-semibold capitalize text-tinta">{nombreMes(mes)}</p>
        {mesSiguiente ? (
          <Link
            href={`/actividades/transcribir?mes=${mesSiguiente}`}
            aria-label="Mes siguiente"
            className="flex size-9 items-center justify-center rounded-full bg-white text-niebla sombra-card"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <span className="size-9" />
        )}
      </div>

      {filas.length === 0 ? (
        <div className="rounded-[18px] bg-white p-[22px_18px] text-center sombra-card">
          <p className="text-[15px] font-semibold text-tinta">No hay actividades diarias</p>
          <p className="mx-auto mt-1 max-w-[280px] text-[13px] leading-relaxed text-niebla text-pretty">
            Abrí una actividad y tocá “Seguir día a día”: ahí va a aparecer acá.
          </p>
        </div>
      ) : (
        <>
          {/* una tarjeta por actividad, con el mes entero */}
          <div className="flex flex-col gap-2.5">
            {filas.map((f) => {
              const set = pintadas.get(f.lineaId) ?? new Set<string>();
              return (
                <div key={f.lineaId} className="rounded-[18px] bg-white p-[14px_14px_16px] sombra-card">
                  <div className="mb-2.5 flex items-baseline justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-tinta">{f.titulo}</p>
                    <span className="flex-none font-mono text-[11px] text-niebla">{set.size} días</span>
                  </div>
                  <div className="grid grid-cols-7 gap-[5px]">
                    {dias.map((d) => {
                      const on = set.has(d.fecha);
                      return (
                        <button
                          key={d.fecha}
                          type="button"
                          onClick={() => tocar(f.lineaId, d.fecha, d.editable)}
                          disabled={!d.editable}
                          aria-label={`${d.dia}${on ? ', hecho' : ''}`}
                          aria-pressed={on}
                          className={`grid aspect-square place-items-center rounded-[8px] font-mono text-[11px] font-bold transition-colors ${
                            on ? 'bg-verde text-white' : 'bg-[#f1f1f7] text-niebla-2'
                          } ${d.esHoy ? 'shadow-[inset_0_0_0_2px_#6c78ee]' : ''} ${
                            d.editable ? 'active:opacity-70' : 'opacity-40'
                          }`}
                        >
                          {d.dia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* qué hacer con lo que ya está cargado */}
          <div className="mt-4 tarjeta bg-white sombra-card">
            <p className="mb-2.5 font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Al guardar</p>
            <div className="flex flex-col gap-2">
              <Opcion
                sel={modo === 'sumar'}
                onClick={() => setModo('sumar')}
                titulo="Sumar a lo que ya hay"
                bajada="Agrega los días que falten y no borra nada. Lo más seguro."
              />
              <Opcion
                sel={modo === 'reemplazar'}
                onClick={() => setModo('reemplazar')}
                titulo="Reemplazar el mes"
                bajada="El papel manda: este mes queda exactamente como lo dejaste acá. Sirve para borrar un día que marcaste por error."
              />
            </div>

            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="mt-3.5 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
            >
              {guardando ? 'Guardando…' : `Guardar ${total} ${total === 1 ? 'día' : 'días'}`}
            </button>
            {listo && <p className="mt-2 text-center text-[13px] font-semibold text-verde">{listo}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function Opcion({ sel, onClick, titulo, bajada }: { sel: boolean; onClick: () => void; titulo: string; bajada: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={sel}
      className={`flex items-start gap-2.5 rounded-[18px] border p-[11px_12px] text-left transition-colors ${
        sel ? 'border-verde bg-verde-tint' : 'border-iris-borde bg-white'
      }`}
    >
      <span
        className={`mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-full border-2 ${
          sel ? 'border-verde bg-verde' : 'border-niebla-2'
        }`}
      >
        {sel && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold ${sel ? 'text-[#2b7a63]' : 'text-tinta'}`}>{titulo}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-niebla text-pretty">{bajada}</span>
      </span>
    </button>
  );
}

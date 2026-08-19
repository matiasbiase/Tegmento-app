'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registrarInicioPeriodo, registrarFinPeriodo, editarPeriodo, borrarPeriodo } from '@/lib/actions/ciclo';
import { estadoCiclo, NOMBRE_FASE, COLOR_FASE, type Periodo } from '@/lib/ciclo';
import { IconLapiz } from '@/components/ui/iconos';

export type PeriodoVista = Periodo & { id: number };

const CORAL = '#d1567a';

function hoyYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const inputFecha =
  'rounded-[12px] border border-[#f0d0d8] bg-[#fdf6f8] px-2.5 py-1.5 text-[16px] text-tinta outline-none';

function etiquetaFecha(ymd: string): string {
  const [a, m, d] = ymd.split('-').map(Number);
  const s = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(a, m - 1, d));
  return s.replace('.', '');
}

// Anillo de progreso del ciclo: el arco pintado va del día 1 al día actual,
// con el color de la fase. En el centro, el número de día.
function Anillo({ dia, largo, color }: { dia: number; largo: number; color: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, dia / largo));
  return (
    <div className="relative flex-none" style={{ width: 68, height: 68 }}>
      <svg viewBox="0 0 68 68" className="size-full -rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#f0eef4" strokeWidth="6" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-serif text-[19px] font-semibold leading-none text-tinta">{dia}</p>
          <p className="text-[11px] text-niebla">día</p>
        </div>
      </div>
    </div>
  );
}

export function CicloCard({ periodos }: { periodos: PeriodoVista[] }) {
  const router = useRouter();
  const [ocupado, start] = useTransition();
  const [gestion, setGestion] = useState(false);
  const [otroDia, setOtroDia] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(hoyYmd());
  const [editId, setEditId] = useState<number | null>(null);
  const [editInicio, setEditInicio] = useState('');
  const [editFin, setEditFin] = useState('');

  const estado = estadoCiclo(periodos);
  const abierto = periodos.length > 0 && periodos[periodos.length - 1].fin == null;

  function accion(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className={`rounded-[18px] bg-white p-[16px_18px] sombra-card ${ocupado ? 'opacity-60' : ''}`}>
      {estado ? (
        <div className="flex items-center gap-4">
          <Anillo dia={estado.diaCiclo} largo={estado.largoCiclo} color={COLOR_FASE[estado.fase]} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold" style={{ color: COLOR_FASE[estado.fase] }}>
              Fase {NOMBRE_FASE[estado.fase].toLowerCase()}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-niebla">
              {estado.enPeriodo ? 'Estás con el período. ' : ''}
              Próximo estimado: {etiquetaFecha(estado.proximoInicio)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-[15px] leading-relaxed text-niebla text-pretty">
          Todavía no registraste ningún período. Cuando te venga, tocá el botón y voy a ir estimando tu ciclo.
        </p>
      )}

      <div className="mt-3.5 flex gap-2">
        {abierto ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => accion(() => registrarFinPeriodo())}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] border py-2.5 font-mono text-[12px] font-bold tracking-[0.3px]"
            style={{ borderColor: CORAL, color: CORAL }}
          >
            Terminó mi período
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => accion(() => registrarInicioPeriodo())}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 font-mono text-[12px] font-bold tracking-[0.3px] text-white"
            style={{ background: CORAL, boxShadow: '0 6px 16px rgba(209,86,122,.32)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Empezó hoy
          </button>
        )}
        {periodos.length > 0 && (
          <button
            type="button"
            onClick={() => setGestion((g) => !g)}
            className="flex-none rounded-[18px] border border-iris-borde px-3 font-mono text-[12px] font-semibold text-niebla"
          >
            {gestion ? 'Listo' : 'Ver'}
          </button>
        )}
      </div>

      {/* empezó otro día: por si te olvidaste de marcarlo el día que vino */}
      {!abierto &&
        (otroDia ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[11px] text-niebla">Empezó el</span>
            <input type="date" value={fechaInicio} max={hoyYmd()} onChange={(e) => setFechaInicio(e.target.value)} className={`${inputFecha} min-w-0 flex-1`} />
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                accion(() => registrarInicioPeriodo(fechaInicio));
                setOtroDia(false);
              }}
              className="flex-none rounded-[12px] px-3 py-1.5 font-mono text-[11px] font-bold text-white"
              style={{ background: CORAL }}
            >
              Registrar
            </button>
            <button type="button" onClick={() => setOtroDia(false)} className="flex-none font-mono text-[11px] text-niebla">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setOtroDia(true)} className="mt-2 font-mono text-[11px] font-semibold text-rosa">
            ¿Empezó otro día? Elegí la fecha
          </button>
        ))}

      {gestion && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gris-tint-2 pt-3">
          {[...periodos].reverse().slice(0, 6).map((p) =>
            editId === p.id ? (
              <div key={p.id} className="flex flex-col gap-1.5 rounded-[12px] bg-[#fdf6f8] p-2">
                <div className="flex items-center gap-2">
                  <span className="w-9 font-mono text-[11px] text-niebla">Inicio</span>
                  <input type="date" value={editInicio} max={hoyYmd()} onChange={(e) => setEditInicio(e.target.value)} className={`${inputFecha} min-w-0 flex-1`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-9 font-mono text-[11px] text-niebla">Fin</span>
                  <input type="date" value={editFin} max={hoyYmd()} onChange={(e) => setEditFin(e.target.value)} className={`${inputFecha} min-w-0 flex-1`} />
                </div>
                <div className="flex justify-end gap-2 pt-0.5">
                  <button type="button" onClick={() => setEditId(null)} className="font-mono text-[11px] text-niebla">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      accion(() => editarPeriodo(p.id, editInicio, editFin || null));
                      setEditId(null);
                    }}
                    className="rounded-[8px] px-3 py-1 font-mono text-[11px] font-bold text-white"
                    style={{ background: CORAL }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-tinta-soft">
                  {etiquetaFecha(p.inicio)}
                  {p.fin ? ` → ${etiquetaFecha(p.fin)}` : ' → en curso'}
                </span>
                <div className="flex flex-none items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(p.id);
                      setEditInicio(p.inicio);
                      setEditFin(p.fin ?? '');
                    }}
                    aria-label="Editar fechas"
                    className="text-iris-deep"
                  >
                    <IconLapiz className="size-[14px]" />
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => accion(() => borrarPeriodo(p.id))}
                    aria-label="Borrar período"
                    className="text-rosa"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                    </svg>
                  </button>
                </div>
              </div>
            ),
          )}
          <p className="mt-1 text-[11px] leading-snug text-niebla text-pretty">
            Es una estimación para acompañarte, no un método anticonceptivo. También podés decírmelo al chat: &ldquo;me vino hoy&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}

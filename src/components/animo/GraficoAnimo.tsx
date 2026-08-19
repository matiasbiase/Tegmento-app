'use client';

import { useState } from 'react';
import type { PuntoAnimo, PuntoPeriodo, ResumenAnimo } from '@/lib/animo';
import { MOODS, moodCercano } from '@/lib/animo';

// Literal a propósito: este color va a `stroke=` y `fill=` del SVG del gráfico,
// y Safari no resuelve var() en atributos de presentación (queda negro).
const IRIS = '#6c78ee';

type Periodo = 'dias' | 'semanas' | 'meses';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'dias', label: '7 días' },
  { key: 'semanas', label: 'Semanas' },
  { key: 'meses', label: 'Meses' },
];

const SUBTITULO: Record<Periodo, string> = {
  dias: 'promedio de la semana',
  semanas: 'promedio de 8 semanas',
  meses: 'promedio de 6 meses',
};

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

type Punto = { clave: string; etiqueta: string; valor: number | null; esActual: boolean };

// Zona de labels del eje a la izquierda; los puntos arrancan después.
const X0 = 60;
const X1 = 292;
const ys = (v: number) => 128 - (v - 1) * 33; // v en 1..4

export function GraficoAnimo({
  serie,
  semanas,
  meses,
  resumen,
}: {
  serie: PuntoAnimo[];
  semanas: PuntoPeriodo[];
  meses: PuntoPeriodo[];
  resumen: ResumenAnimo;
}) {
  const [periodo, setPeriodo] = useState<Periodo>('dias');

  const puntos: Punto[] =
    periodo === 'dias'
      ? serie.map((p) => ({ clave: p.dia, etiqueta: p.inicial, valor: p.valor, esActual: p.esHoy }))
      : periodo === 'semanas'
        ? semanas
        : meses;

  const n = puntos.length;
  const xs = (i: number) => (n > 1 ? X0 + i * ((X1 - X0) / (n - 1)) : (X0 + X1) / 2);

  const conValor = puntos.filter((p) => p.valor != null);

  // El resumen sigue al período: 7 días usa el semanal (con tendencia); el resto, el promedio de lo visible.
  const valores = conValor.map((p) => p.valor as number);
  const promPeriodo = valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
  const promedio = periodo === 'dias' ? resumen.promedio : promPeriodo;
  const etiqueta = promedio != null ? moodCercano(promedio).label : '—';
  const sinDatos = promedio == null && conValor.length === 0;

  return (
    <div className="rounded-[18px] bg-white p-[22px_20px] shadow-[0_4px_20px_rgba(50,50,90,.06)]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Ánimo</p>
        <div className="flex gap-1 rounded-full bg-lavanda p-1">
          {PERIODOS.map((p) => {
            const sel = p.key === periodo;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriodo(p.key)}
                className="rounded-full px-3 py-2 font-mono text-[12px] font-semibold tracking-[0.2px] transition-colors"
                style={{ background: sel ? '#fff' : 'transparent', color: sel ? IRIS : 'var(--color-niebla)', boxShadow: sel ? '0 2px 8px rgba(50,50,90,.08)' : 'none' }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {sinDatos ? (
        <p className="py-6 text-[15px] leading-relaxed text-niebla text-pretty">
          Todavía no registraste tu ánimo esta semana. Elegí cómo venís abajo y va a empezar a aparecer acá.
        </p>
      ) : (
        <>
          {promedio != null && (
            <div className="mb-1.5 flex items-baseline gap-2.5">
              <span className="font-serif text-[32px] font-semibold tracking-[-0.3px] text-tinta">{etiqueta}</span>
              <span className="text-[15px] font-semibold text-tinta-soft">
                {fmt(promedio)} / 4 · {SUBTITULO[periodo]}
              </span>
            </div>
          )}

          {periodo === 'dias' && resumen.delta != null && Math.abs(resumen.delta) >= 0.05 && (
            <div
              className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
              style={{ background: resumen.delta >= 0 ? 'var(--color-verde-tint)' : 'var(--color-rosa-tint)' }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={resumen.delta >= 0 ? '#3d9b80' : '#c25571'}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[13px]"
                style={{ transform: resumen.delta >= 0 ? 'none' : 'scaleY(-1)' }}
              >
                <path d="M5 13l5-7 4 5 5-6" />
              </svg>
              <span className="text-[12px] font-semibold" style={{ color: resumen.delta >= 0 ? 'var(--color-verde)' : 'var(--color-rosa)' }}>
                {resumen.delta >= 0 ? '+' : '−'}
                {fmt(Math.abs(resumen.delta))} vs. la semana pasada
                {resumen.promedioPrev != null && ` (era ${moodCercano(resumen.promedioPrev).label} · ${fmt(resumen.promedioPrev)})`}
              </span>
            </div>
          )}

          {conValor.length === 0 ? (
            <p className="py-6 text-[15px] leading-relaxed text-niebla text-pretty">
              Sin registros en este período todavía.
            </p>
          ) : (
            <svg viewBox="0 0 300 152" className="h-auto w-full">
              {/* eje: cada altura es un mood */}
              {MOODS.map((m) => (
                <g key={m.key}>
                  <line x1={X0 - 8} x2={X1 + 4} y1={ys(m.valor)} y2={ys(m.valor)} stroke="#ececf6" strokeWidth="1" />
                  <text x={0} y={ys(m.valor) + 3.5} fontSize="10" fontWeight="600" fill={m.deep} opacity="0.85">
                    {m.label}
                  </text>
                </g>
              ))}

              {conValor.length > 1 && (
                <polyline
                  points={conValor.map((p) => `${xs(puntos.indexOf(p))},${ys(p.valor as number)}`).join(' ')}
                  fill="none"
                  stroke={IRIS}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              )}
              {puntos.map((p, i) =>
                p.valor == null ? null : (
                  <circle
                    key={p.clave}
                    cx={xs(i)}
                    cy={ys(p.valor)}
                    r={p.esActual ? 7 : 4.5}
                    fill={p.esActual ? IRIS : '#fff'}
                    stroke={IRIS}
                    strokeWidth="2.5"
                  />
                ),
              )}

              {/* etiquetas del período alineadas a cada punto */}
              {puntos.map((p, i) => (
                <text
                  key={`e-${p.clave}`}
                  x={xs(i)}
                  y={148}
                  fontSize="10"
                  fontWeight={p.esActual ? 700 : 400}
                  fill={p.esActual ? IRIS : '#b8b8c8'}
                  textAnchor="middle"
                >
                  {p.etiqueta}
                </text>
              ))}
            </svg>
          )}
        </>
      )}
    </div>
  );
}

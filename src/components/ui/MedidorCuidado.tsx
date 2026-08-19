// Medidor de Polaridad: una barra en tres zonas (verde / amarillo / rojo) con un
// marcador. Lo que mide es cuánto cuidado hay que tener con lo que se está leyendo
// (no qué tan polarizada está la nota, que era el enfoque viejo y no servía para
// hacer nada con la respuesta). Debajo, el motivo puntual que dio la IA.

import { nivelCuidado } from '@/lib/cuidado';

const VERDE = 'var(--color-verde)';
const ORO = 'var(--color-oro-2)';
const ROSA = 'var(--color-rosa)';

export function MedidorCuidado({ cuidado, porQue }: { cuidado: number; porQue?: string }) {
  const c = Math.max(0, Math.min(100, Math.round(cuidado)));
  const n = nivelCuidado(c);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">
          Con cuánto cuidado leerlo
        </span>
        <span className="font-mono text-[11px] font-bold" style={{ color: n.color }}>
          {n.titulo}
        </span>
      </div>
      <div
        className="relative h-[9px] rounded-full"
        style={{
          background: `linear-gradient(90deg, ${VERDE} 0%, ${VERDE} 30%, ${ORO} 42%, ${ORO} 58%, ${ROSA} 70%, ${ROSA} 100%)`,
        }}
      >
        <div
          className="absolute top-1/2 size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
          style={{ left: `${c}%`, borderColor: n.color, boxShadow: '0 1px 5px rgba(40,40,80,.3)' }}
        />
      </div>
      <p className="mt-2 text-[13px] leading-snug text-tinta-soft text-pretty">{porQue?.trim() || n.consejo}</p>
    </div>
  );
}

import { db } from '@/lib/db/client';
import { areas } from '@/lib/db/schema';
import { RadarRueda } from '@/components/rueda/RadarRueda';

export const dynamic = 'force-dynamic';

export default async function Rueda() {
  const areasRows = await db.select().from(areas).orderBy(areas.orden);

  const datos = areasRows.map((a) => ({
    nombre: a.nombre,
    actual: a.scoreActual ?? 0,
    deseado: a.scoreDeseado ?? 0,
    color: a.color ?? '#6c78ee', // literal: termina en un fill= de SVG, y Safari no resuelve var() ahí
  }));
  const enFoco = areasRows.filter((a) => a.foco).length;

  return (
    <div className="flotar px-[22px] pt-2">
      <h1 className="font-serif text-[32px] font-semibold leading-[1.05] tracking-[-0.4px] text-tinta text-balance">
        Tu rueda de la vida
      </h1>
      <p className="mb-[18px] mt-1 text-[15px] text-niebla text-pretty">
        {`Cómo venís en ${areasRows.length} áreas.`}
        {enFoco > 0 ? ` ${enFoco} ${enFoco === 1 ? 'está' : 'están'} en foco este mes; el resto, en pausa.` : ''}
      </p>

      {/* radar */}
      <div className="mb-3.5 rounded-[18px] bg-white p-[12px_10px_4px] shadow-[0_4px_20px_rgba(50,50,90,.06)]">
        <RadarRueda datos={datos} mostrarLeyenda={false} />
      </div>

      {/* leyenda de áreas */}
      <div className="mb-8 rounded-[18px] bg-white px-4 shadow-[0_4px_18px_rgba(50,50,90,.05)]">
        {areasRows.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2.5 border-b border-[rgba(108,120,238,.08)] py-[11px] last:border-0"
          >
            <span className="size-2.5 flex-none rounded-full" style={{ background: a.color ?? 'var(--color-iris)' }} />
            <span className="flex-1 truncate font-mono text-[12px] font-semibold tracking-[0.2px] text-tinta">
              {a.nombre}
            </span>
            {a.foco && (
              <span
                className="rounded-lg px-[7px] py-[3px] font-mono text-[11px] font-bold tracking-[0.2px] text-white"
                style={{ background: a.color ?? 'var(--color-iris)' }}
              >
                Foco
              </span>
            )}
            <span className="flex-none whitespace-nowrap font-mono text-[12px] text-niebla">
              {a.scoreActual ?? 0}/5 → {a.scoreDeseado ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

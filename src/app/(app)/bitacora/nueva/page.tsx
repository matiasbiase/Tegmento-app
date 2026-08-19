import { db } from '@/lib/db/client';
import { areas, lineas } from '@/lib/db/schema';
import { crearEntrada } from '@/lib/actions/bitacora';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

export default async function NuevaEntrada() {
  const [areasRows, lineasRows] = await Promise.all([
    db.select().from(areas),
    db.select().from(lineas),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <BotonCerrar href="/historial" posicion="pantalla" />
      <h1 className="font-mono text-[12px] font-semibold tracking-[0.3px] text-muted">Nueva entrada · manual</h1>
      <form action={crearEntrada} className="flex flex-col gap-4">
        <textarea
          name="contenido"
          rows={6}
          required
          autoFocus
          placeholder="¿Qué pasó? ¿Qué pensaste? ¿Qué decidiste?"
          className="rounded-app border border-borde bg-surface px-3 py-2 text-[16px] leading-relaxed text-crema placeholder:text-muted"
        />
        <div className="flex gap-2">
          <select name="areaId" defaultValue="" className="flex-1 rounded-[4px] border border-borde bg-surface px-2 py-2 font-mono text-[12px] text-crema-soft">
            <option value="">Área (opcional)</option>
            {areasRows.filter((a) => a.activa).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <select name="lineaId" defaultValue="" className="flex-1 rounded-[4px] border border-borde bg-surface px-2 py-2 font-mono text-[12px] text-crema-soft">
            <option value="">Línea (opcional)</option>
            {lineasRows.filter((l) => l.estado === 'activa').map((l) => (
              <option key={l.id} value={l.id}>{l.titulo}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-app relieve-cta bg-ambar py-3 font-mono text-[15px] tracking-[0.4px] text-[#412402]">
          Registrar
        </button>
      </form>
    </div>
  );
}

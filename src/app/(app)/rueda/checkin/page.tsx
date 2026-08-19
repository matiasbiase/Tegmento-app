import { db } from '@/lib/db/client';
import { areas } from '@/lib/db/schema';
import { guardarCheckin, crearArea } from '@/lib/actions/areas';
import { CLAVE_PUNTUACION } from '@/lib/rueda-vida';
import { Card } from '@/components/ui/Card';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

export default async function Checkin() {
  const filas = (await db.select().from(areas)).filter((a) => a.activa);

  return (
    <div className="flex flex-col gap-4">
      <BotonCerrar href="/rueda" posicion="pantalla" />
      <Card titulo="LA ESCALA">
        {CLAVE_PUNTUACION.map(([n, texto]) => (
          <p key={n} className="py-0.5 text-[12px] text-crema-soft">
            <span className="font-mono text-ambar">{n}</span> · {texto}
          </p>
        ))}
      </Card>

      <form action={guardarCheckin} className="flex flex-col gap-4">
        {filas.map((a) => (
          <Card key={a.id} titulo={a.nombre}>
            <div className="flex justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex-1">
                  <input
                    type="radio"
                    name={`score_${a.id}`}
                    value={n}
                    defaultChecked={a.scoreActual === n}
                    required
                    className="peer sr-only"
                  />
                  <span className="block cursor-pointer rounded-[4px] border border-borde py-2 text-center font-mono text-[15px] text-muted peer-checked:border-ambar peer-checked:text-ambar">
                    {n}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[12px] text-muted">Quiero llegar a</span>
              <select
                name={`deseado_${a.id}`}
                defaultValue={a.scoreDeseado ?? 3}
                className="rounded-[4px] border border-borde bg-surface px-2 py-1 font-mono text-[12px] text-crema"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </Card>
        ))}
        <button type="submit" className="rounded-app relieve-cta bg-ambar py-3 font-mono text-[15px] tracking-[0.4px] text-[#412402]">
          Guardar check-in
        </button>
      </form>

      <Card titulo="NUEVA ÁREA">
        <form action={crearArea} className="flex gap-2">
          <input
            name="nombre"
            placeholder="ej: Finanzas"
            required
            className="flex-1 rounded-[4px] border border-borde bg-bg px-3 py-2 font-mono text-[16px] text-crema placeholder:text-muted"
          />
          <button type="submit" className="rounded-[4px] border border-ambar-deep px-4 font-mono text-[12px] text-ambar">
            Agregar
          </button>
        </form>
      </Card>
    </div>
  );
}

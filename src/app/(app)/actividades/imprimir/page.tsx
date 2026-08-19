import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { lineas } from '@/lib/db/schema';
import { BotonImprimir } from '@/components/actividades/BotonImprimir';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

// La hoja del mes para imprimir y llenar a mano. Todo en negro sobre blanco y
// con los números bien grandes: después esta misma hoja se fotografía y la lee
// Gemma, así que lo importante es que los casilleros se distingan.
export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const hoy = new Date();
  const m = mesParam?.match(/^(\d{4})-(\d{2})$/);
  const anio = m ? Number(m[1]) : hoy.getFullYear();
  const mesNum = m ? Number(m[2]) : hoy.getMonth() + 1;
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const dias = Array.from({ length: ultimoDia }, (_, i) => i + 1);

  const actividades = await db
    .select({ id: lineas.id, titulo: lineas.titulo })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'), eq(lineas.diaria, true)));

  return (
    <div className="hoja-imprimible mx-auto max-w-[900px] bg-white p-6 text-black">
      <BotonCerrar href="/actividades" posicion="pantalla" />
      {/* barra de acciones: no se imprime */}
      <div className="no-print mb-5 flex items-center gap-2">
        <Link
          href="/actividades"
          className="rounded-[12px] border border-iris-borde px-3.5 py-2 font-mono text-[12px] font-semibold text-niebla"
        >
          Volver
        </Link>
        <BotonImprimir />
      </div>

      <h1 className="mb-1 text-center font-serif text-[26px] font-bold tracking-[1px]">
        {MESES[mesNum - 1]} {anio}
      </h1>
      <p className="no-print mb-4 text-center text-[12px] text-[#666]">
        Imprimila, pintá los casilleros de los días que hiciste cada cosa, y cuando quieras sacale una foto desde
        Seguimiento. Se lee mejor si pintás el casillero entero.
      </p>

      {actividades.length === 0 ? (
        <p className="no-print mt-8 text-center text-[15px] text-[#666]">
          Todavía no tenés actividades marcadas como diarias. Prendé el interruptor de calendario en alguna, desde
          Seguimiento, y volvé acá.
        </p>
      ) : (
        /* En pantalla la tabla no entra (la app es angosta): scrollea de costado.
           Al imprimir sale apaisada y entra entera, así que ahí no se recorta. */
        <div className="overflow-x-auto print:overflow-x-visible">
        <table className="w-full min-w-[760px] border-collapse print:min-w-0">
          <thead>
            <tr>
              <th className="w-[170px] border border-black p-1 text-left text-[11px] font-bold tracking-[0.5px]">
                Actividad
              </th>
              {dias.map((d) => (
                <th key={d} className="border border-black p-0 text-center text-[11px] font-bold leading-[14px]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actividades.map((a) => (
              <tr key={a.id}>
                <td className="border border-black p-1 text-[11px] leading-tight">{a.titulo}</td>
                {dias.map((d) => (
                  <td key={d} className="h-[26px] border border-black p-0" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

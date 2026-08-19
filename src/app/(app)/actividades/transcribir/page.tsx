import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { lineas, marcas } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { TranscribirMes, type FilaMes } from '@/components/actividades/TranscribirMes';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function TranscribirPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const hoy = new Date();
  const mesActual = ym(hoy);
  const mes = mesParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesParam) ? mesParam : mesActual;

  const [anio, mesNum] = mes.split('-').map(Number);
  const mesAnterior = ym(new Date(anio, mesNum - 2, 1));
  const siguiente = ym(new Date(anio, mesNum, 1));
  // No se navega al futuro: no hay nada que transcribir de un mes que no pasó.
  const mesSiguiente = siguiente <= mesActual ? siguiente : null;

  const actividades = await db
    .select({ id: lineas.id, titulo: lineas.titulo })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'), eq(lineas.diaria, true)));

  const delMes = await db
    .select()
    .from(marcas)
    .where(and(gte(marcas.fecha, `${mes}-01`), lte(marcas.fecha, `${mes}-31`)));

  const filas: FilaMes[] = actividades.map((a) => ({
    lineaId: a.id,
    titulo: a.titulo,
    fechas: delMes.filter((m) => m.lineaId === a.id).map((m) => m.fecha),
  }));

  return (
    <div className="flotar px-[22px] pt-2">
      <BotonCerrar href="/actividades" posicion="pantalla" />
      <TituloFijo titulo="Pasar la hoja" />
      <p className="mb-5 mt-1 text-[15px] text-niebla text-pretty">
        Tocá los días que pintaste en papel. Acá se puede marcar todo el mes, no solo hoy y ayer: estás copiando lo que
        ya hiciste, no rellenando de memoria.
      </p>
      <TranscribirMes mes={mes} filas={filas} mesAnterior={mesAnterior} mesSiguiente={mesSiguiente} />
    </div>
  );
}

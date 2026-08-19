import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { lupa } from '@/lib/db/schema';
import { etiquetaFecha } from '@/lib/fechas';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { PolaridadUI, type PolaridadGuardada } from '@/components/polaridad/PolaridadUI';
import type { ResultadoContraste } from '@/components/contraste/TarjetaContraste';

export const dynamic = 'force-dynamic';

export default async function PolaridadPage({ searchParams }: { searchParams: Promise<{ texto?: string }> }) {
  const { texto } = await searchParams;
  const textoInicial = texto?.slice(0, 4000);
  const filas = await db.select().from(lupa).orderBy(desc(lupa.id)).limit(20);
  const guardadas: PolaridadGuardada[] = filas.map((f) => {
    let resultado: ResultadoContraste;
    try {
      resultado = JSON.parse(f.resultado) as ResultadoContraste;
    } catch {
      resultado = { modo: 'mapa', cuidado: f.carga ?? 50 };
    }
    return { id: f.id, entrada: f.entrada, cuidado: f.carga ?? 50, fecha: etiquetaFecha(f.creado), resultado };
  });

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Polaridad" />
      <div className="mt-4" />
      <PolaridadUI guardadas={guardadas} textoInicial={textoInicial} />
    </div>
  );
}

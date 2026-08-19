import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, lineas } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { ACTIVIDADES, rankear } from '@/lib/descubrir';
import { DescubrirCliente } from '@/components/descubrir/DescubrirCliente';

export const dynamic = 'force-dynamic';

// Descubrir: sugerencias elegidas según tus áreas. No es búsqueda en internet
// (la app corre local); es un catálogo curado que se ordena por lo que ya te
// importa y esconde las actividades que ya tenés. La lista rota con el día para
// que se sienta viva sin volverse azarosa.
export default async function DescubrirPage() {
  const [focoRows, actividadesRows] = await Promise.all([
    db.select({ nombre: areas.nombre }).from(areas).where(and(eq(areas.activa, true), eq(areas.foco, true))),
    // Tanto lo del onboarding (tipo 'habito') como lo sumado a mano ('actividad'):
    // las dos sirven para no volver a sugerir algo que ya hacés.
    db
      .select({ titulo: lineas.titulo })
      .from(lineas)
      .where(and(inArray(lineas.tipo, ['actividad', 'habito']), inArray(lineas.estado, ['activa', 'hecha']))),
  ]);

  const foco = focoRows.map((f) => f.nombre);
  const yaTengo = actividadesRows.map((a) => a.titulo);
  // semilla del día: el orden cambia entre días, no en cada recarga.
  const semilla = Math.floor(Date.now() / 86_400_000);

  // Pasamos todas: el recorte por categoría lo hace el cliente, y "Para vos" ya
  // viene ordenado por foco. (El catálogo es chico, no hay costo de sobra.)
  const actividades = rankear(ACTIVIDADES, { foco, yaTengo, semilla });

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Descubrir" />
      {/* Sin bajada: lo que hacía era explicar con letra chica algo que ya se ve
          (las categorías arriba y los títulos de cada sección). Menos texto
          suelto, más contenido. */}
      <div className="mt-4">
        <DescubrirCliente foco={foco} actividades={actividades} />
      </div>
    </div>
  );
}

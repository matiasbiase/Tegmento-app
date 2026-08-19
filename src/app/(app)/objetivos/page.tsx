import { TituloFijo } from '@/components/ui/TituloFijo';
import { ObjetivosSeccion } from '@/components/objetivos/ObjetivosSeccion';

export const dynamic = 'force-dynamic';

// ⚠️ EL CUERPO DE ESTA PANTALLA SE FUE A `components/objetivos/ObjetivosSeccion`
// el 06/08: lo mismo se muestra ahora en la pestaña "Objetivos" de Seguimiento.
// Acá quedó la cáscara —título y `?nuevo=1`— para que el link del Home siga
// funcionando igual.
export default async function ObjetivosPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Objetivos" />
      <div className="mt-4" />
      <ObjetivosSeccion abrirNuevo={nuevo === '1'} />
    </div>
  );
}

import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { NIVELES_DEFAULT, type Niveles, type RasgoId } from '@/lib/personalidad';
import { PersonalidadEditor } from '@/components/perfil/PersonalidadEditor';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

export const dynamic = 'force-dynamic';

export default async function PersonalidadPage() {
  const filas = await db.select().from(config);
  const cfg = new Map(filas.map((f) => [f.clave, f.valor]));

  const niveles: Niveles = { ...NIVELES_DEFAULT };
  for (const id of Object.keys(niveles) as RasgoId[]) {
    const v = Number(cfg.get(`rasgo_${id}`));
    if (v >= 1 && v <= 5) niveles[id] = v;
  }

  return (
    <>
      <BotonCerrar href="/perfil" posicion="pantalla" etiqueta="Salir de personalidad" />
      <PersonalidadEditor inicial={niveles} extraInicial={cfg.get('personalidad_extra') ?? ''} />
    </>
  );
}

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bitacora, temas } from '@/lib/db/schema';
import { etiquetaFecha } from '@/lib/fechas';
import { Sello } from '@/components/ui/Sello';

export const dynamic = 'force-dynamic';

const selloPorTipo = {
  sync: { color: 'ambar', texto: 'Sync' },
  chat: { color: 'muted', texto: 'Chat' },
  manual: { color: 'teal', texto: 'Manual' },
  // Faltaba (30/07): un registro `tipo: 'hecho'` (algo puntual marcado hecho
  // desde Actividades, ver `lib/actions/actividades.ts`) caía al fallback
  // `?? selloPorTipo.manual` y se mostraba como "Manual" — mismo dato, sello
  // distinto según si lo mirabas desde acá o desde /historial, donde `BADGE`
  // sí lo tenía.
  hecho: { color: 'ambar', texto: 'Hecho' },
  experimento: { color: 'ambar', texto: 'Experimento' },
  detectado: { color: 'muted', texto: 'Detectado' },
  sistema: { color: 'brick', texto: 'Sistema' },
} as const;

export default async function Bitacora({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const temaId = tema ? Number(tema) : null;

  const [temasRows, entradas] = await Promise.all([
    db.select().from(temas),
    temaId
      ? db.select().from(bitacora).where(eq(bitacora.temaId, temaId)).orderBy(desc(bitacora.fecha))
      : db.select().from(bitacora).orderBy(desc(bitacora.fecha)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/bitacora"
          className={`rounded-[4px] border px-2 py-1 font-mono text-[12px] ${!temaId ? 'border-ambar-deep text-ambar' : 'border-borde text-muted'}`}
        >
          Todo
        </Link>
        {temasRows.map((t) => (
          <Link
            key={t.id}
            href={`/bitacora?tema=${t.id}`}
            className={`rounded-[4px] border px-2 py-1 font-mono text-[12px] ${temaId === t.id ? 'border-ambar-deep text-ambar' : 'border-borde text-muted'}`}
          >
            TEMA: {t.nombre}
          </Link>
        ))}
        <Link href="/bitacora/nueva" className="ml-auto rounded-[4px] bg-ambar px-3 py-1 font-mono text-[12px] font-semibold text-[#412402]">
          + ENTRADA
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {entradas.map((e) => {
          const sello = selloPorTipo[e.tipo as keyof typeof selloPorTipo] ?? selloPorTipo.manual;
          return (
            <li key={e.id} className="rounded-app border border-borde bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[12px] text-muted">{etiquetaFecha(e.fecha)}</span>
                <Sello color={sello.color}>{sello.texto}</Sello>
              </div>
              <p className="text-[15px] leading-relaxed text-crema-soft">{e.contenido}</p>
            </li>
          );
        })}
        {entradas.length === 0 && <p className="text-[15px] text-muted">Sin entradas para este tema.</p>}
      </ul>
    </div>
  );
}

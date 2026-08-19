import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chatNotas, etiquetas, notaEtiquetas, notas } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { NotasUI } from '@/components/notas/NotasUI';
import { purgarNotasViejas } from '@/lib/actions/notas';

export const dynamic = 'force-dynamic';

// Notas: el lugar sin IA de cara al usuario. Ver `lib/db/schema.ts` (tabla
// `notas`) por qué el texto igual llega al Analista.
export default async function NotasPage() {
  // ⚠️ SE LIMPIA LA PAPELERA AL ABRIR (06/08). Sin cron: la papelera solo
  // importa cuando estás mirando tus notas. Ver `purgarNotasViejas`.
  await purgarNotasViejas();

  const todas = await db.select().from(notas).orderBy(desc(notas.actualizado));
  // ⚠️ LA LISTA SOLO MUESTRA LAS VIVAS. Antes `borrarNota` borraba la fila, así
  // que este `select` sin filtro alcanzaba; con la papelera, sin este filtro las
  // borradas seguirían apareciendo como si nada.
  const filas = todas.filter((f) => !f.borrada);
  const papelera = todas.filter((f) => f.borrada);

  // Cuántas charlas tiene cada nota. Se cuenta en SQL y no trayendo las charlas
  // para hacerles `.length` acá: la lista solo necesita el número, y traer las
  // filas enteras crece con el uso sin que se note hasta que molesta.
  // ⚠️ Desde el 04/08 se cuenta sobre `chat_notas` y no sobre `chats.nota_id`:
  // una charla puede estar en varias notas, así que el número de cada nota ya no
  // sale de agrupar las charlas — sale de contar las referencias.
  const cuentas = await db
    .select({ notaId: chatNotas.notaId, cuantas: sql<number>`count(*)` })
    .from(chatNotas)
    .groupBy(chatNotas.notaId);

  const chatsPorNota: Record<number, number> = {};
  for (const c of cuentas) chatsPorNota[c.notaId] = c.cuantas;

  // Las etiquetas de todas las notas, en una sola consulta. El filtro y los
  // chips de la lista salen de acá; sin esto, filtrar por etiqueta habría que
  // hacerlo en el server y volver a pedir la página en cada toque.
  const relaciones = await db
    .select({ notaId: notaEtiquetas.notaId, nombre: etiquetas.nombre })
    .from(notaEtiquetas)
    .innerJoin(etiquetas, eq(etiquetas.id, notaEtiquetas.etiquetaId));

  const porNota = new Map<number, string[]>();
  for (const r of relaciones) {
    if (!porNota.has(r.notaId)) porNota.set(r.notaId, []);
    porNota.get(r.notaId)!.push(r.nombre);
  }

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Notas" />
      <div className="mt-4" />
      <NotasUI
        notas={filas.map((f) => ({ ...f, etiquetas: porNota.get(f.id) ?? [] }))}
        chatsPorNota={chatsPorNota}
        papelera={papelera.map((f) => ({
          id: f.id,
          titulo: f.titulo,
          cuerpo: f.cuerpo,
          borrada: f.borrada as string,
        }))}
      />
    </div>
  );
}

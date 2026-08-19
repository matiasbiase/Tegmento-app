import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { eventos } from '@/lib/db/schema';

// Importa eventos del calendario del iPhone (EventKit) que la app nativa lee y
// empuja acá. Se guardan en `eventos` con gcalId "apple:<uid>" para deduplicar y
// distinguirlos de los internos (gcalId null) y de Google.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const lista = Array.isArray(body?.eventos) ? body.eventos : null;
  if (!lista) return NextResponse.json({ error: 'Falta la lista de eventos.' }, { status: 400 });

  const ahora = new Date().toISOString();
  let nuevos = 0;
  let actualizados = 0;

  for (const e of lista) {
    const uid = typeof e?.uid === 'string' ? e.uid.slice(0, 200) : null;
    const titulo = typeof e?.titulo === 'string' ? e.titulo.trim().slice(0, 200) : '';
    const inicio = typeof e?.inicio === 'string' ? e.inicio : null; // "YYYY-MM-DD" o "YYYY-MM-DDTHH:MM"
    if (!uid || !titulo || !inicio || !/^\d{4}-\d{2}-\d{2}/.test(inicio)) continue;
    const fin = typeof e?.fin === 'string' && /^\d{4}-\d{2}-\d{2}/.test(e.fin) ? e.fin : inicio;
    const gcalId = `apple:${uid}`;

    const [existe] = await db.select({ id: eventos.id }).from(eventos).where(eq(eventos.gcalId, gcalId)).limit(1);
    if (existe) {
      await db.update(eventos).set({ titulo, inicio, fin, syncedAt: ahora }).where(eq(eventos.id, existe.id));
      actualizados++;
    } else {
      await db.insert(eventos).values({ gcalId, titulo, inicio, fin, syncedAt: ahora });
      nuevos++;
    }
  }

  return NextResponse.json({ ok: true, nuevos, actualizados });
}

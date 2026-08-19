import { NextResponse } from 'next/server';
import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cuerpo } from '@/lib/db/schema';

// Importa datos de Apple Salud (HealthKit) que la app nativa lee y empuja acá.
// Por ahora, sueño → `cuerpo` (tipo 'sueno'). Regla: NO pisa un registro manual
// del día; solo rellena los días que no tienen sueño cargado (fuente 'apple').
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const suenos = Array.isArray(body?.sueno) ? body.sueno : [];
  const pasos = Array.isArray(body?.pasos) ? body.pasos : [];
  if (!Array.isArray(body?.sueno) && !Array.isArray(body?.pasos)) {
    return NextResponse.json({ error: 'Falta sueño o pasos.' }, { status: 400 });
  }

  let nuevos = 0;

  // Pasos por día (Apple Salud): un registro por día, sin duplicar.
  for (const p of pasos) {
    const fecha = typeof p?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : null;
    const cant = Number(p?.pasos);
    if (!fecha || !Number.isFinite(cant) || cant <= 0) continue;
    const [existe] = await db
      .select({ id: cuerpo.id })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'pasos'), gte(cuerpo.creado, `${fecha}T00:00`), lt(cuerpo.creado, `${fecha}T23:59`)))
      .limit(1);
    if (existe) {
      await db.update(cuerpo).set({ valor: Math.round(cant) }).where(eq(cuerpo.id, existe.id));
      continue;
    }
    await db.insert(cuerpo).values({
      tipo: 'pasos',
      valor: Math.round(cant),
      calidad: null,
      nota: 'Apple Salud',
      creado: `${fecha}T12:00`,
      // ⚠️ ESTE NO SOSTIENE LA RACHA: entró solo, no viniste a contarlo.
      origen: 'salud',
    });
    nuevos++;
  }

  for (const s of suenos) {
    const fecha = typeof s?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.fecha) ? s.fecha : null;
    const minutos = Number(s?.minutos);
    if (!fecha || !Number.isFinite(minutos) || minutos <= 0) continue;

    // ¿ya hay un sueño ese día (manual o importado)? entonces no lo tocamos.
    const desde = `${fecha}T00:00`;
    const hasta = `${fecha}T23:59`;
    const [existe] = await db
      .select({ id: cuerpo.id })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, desde), lt(cuerpo.creado, hasta)))
      .limit(1);
    if (existe) continue;

    await db.insert(cuerpo).values({
      tipo: 'sueno',
      valor: Math.round(minutos),
      calidad: null,
      nota: 'Apple Salud',
      creado: `${fecha}T08:00`, // hora nominal de la mañana para que caiga en el día
      // ⚠️ ESTE NO SOSTIENE LA RACHA: entró solo, no viniste a contarlo.
      origen: 'salud',
    });
    nuevos++;
  }

  return NextResponse.json({ ok: true, nuevos });
}

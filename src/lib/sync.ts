import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, bitacora, eventos, lineas, mails, sugerencias } from '@/lib/db/schema';
import { tokenAcceso } from '@/lib/google/auth';
import { listarMails } from '@/lib/google/gmail';
import { listarEventos } from '@/lib/google/calendar';
import { mapearEvento, mapearMail } from '@/lib/google/mapear';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';

type Catalogo = {
  areas: { id: number; nombre: string }[];
  lineas: { id: number; titulo: string }[];
};

function buscarArea(catalogo: Catalogo, nombre: string | null | undefined): number | null {
  if (!nombre) return null;
  return catalogo.areas.find((a) => a.nombre.toUpperCase() === nombre.toUpperCase())?.id ?? null;
}

function buscarLinea(catalogo: Catalogo, titulo: string | null | undefined): number | null {
  if (!titulo) return null;
  return catalogo.lineas.find((l) => l.titulo.toUpperCase() === titulo.toUpperCase())?.id ?? null;
}

async function clasificarJson(rol: 'clasificador-mail' | 'clasificador-evento', catalogo: Catalogo, texto: string) {
  try {
    const crudo = await llamarRol(
      rol,
      [
        {
          rol: 'user',
          contenido: `ÁREAS: ${catalogo.areas.map((a) => a.nombre).join(', ')}\nLÍNEAS: ${catalogo.lineas.map((l) => l.titulo).join(', ')}\n\n${texto}`,
        },
      ],
      { json: true },
    );
    return JSON.parse(crudo) as { importante?: boolean; area?: string | null; linea?: string | null };
  } catch {
    return null;
  }
}

export async function cicloSync(): Promise<string> {
  const token = await tokenAcceso().catch(() => null);
  if (!token) return 'sin-google';

  const ahora = new Date().toISOString();
  const [mailsExistentes, eventosExistentes, areasRows, lineasRows] = await Promise.all([
    db.select({ gmailId: mails.gmailId }).from(mails),
    db.select({ gcalId: eventos.gcalId }).from(eventos),
    db.select().from(areas),
    db.select().from(lineas),
  ]);
  const catalogo: Catalogo = {
    areas: areasRows.filter((a) => a.activa),
    lineas: lineasRows.filter((l) => l.estado === 'activa'),
  };
  const yaVistos = new Set(mailsExistentes.map((m) => m.gmailId));
  const yaEventos = new Set(eventosExistentes.map((e) => e.gcalId));

  // 1. Traer y cachear crudo, esto nunca depende de Gemma
  const [mailsCrudos, eventosCrudos] = await Promise.all([listarMails(token), listarEventos(token)]);
  const mailsNuevos = mailsCrudos.filter((m) => !yaVistos.has(m.id)).map(mapearMail);
  const eventosNuevos = eventosCrudos
    .filter((e) => !yaEventos.has(e.id))
    .map(mapearEvento)
    .filter((e): e is typeof e & { inicio: string; fin: string } => e.inicio != null && e.fin != null);

  const idsMailsNuevos: number[] = [];
  for (const m of mailsNuevos) {
    const [fila] = await db.insert(mails).values({ ...m, syncedAt: ahora }).returning();
    idsMailsNuevos.push(fila.id);
  }
  const idsEventosNuevos: number[] = [];
  for (const e of eventosNuevos) {
    const [fila] = await db.insert(eventos).values({ ...e, syncedAt: ahora }).returning();
    idsEventosNuevos.push(fila.id);
  }

  // 2. Clasificación con Gemma (si está)
  let importantes = 0;
  const lineasConActividad = new Set<number>();
  if (await ollamaDisponible()) {
    for (let i = 0; i < mailsNuevos.length; i++) {
      const m = mailsNuevos[i];
      const r = await clasificarJson(
        'clasificador-mail',
        catalogo,
        `MAIL:\nDe: ${m.remitente}\nAsunto: ${m.asunto}\nSnippet: ${m.snippet}`,
      );
      if (!r) continue;
      const areaId = buscarArea(catalogo, r.area);
      const lineaId = buscarLinea(catalogo, r.linea);
      await db
        .update(mails)
        .set({ importante: Boolean(r.importante), areaId, lineaId })
        .where(eq(mails.id, idsMailsNuevos[i]));
      if (r.importante) importantes++;
      if (lineaId) {
        lineasConActividad.add(lineaId);
        if (r.importante) {
          const pendientes = await db.select().from(sugerencias).where(eq(sugerencias.estado, 'pendiente'));
          const contenido = `Novedad por mail sobre una línea: "${m.asunto}" (${m.remitente}).`;
          if (!pendientes.some((s) => s.lineaId === lineaId && s.contenido === contenido)) {
            await db.insert(sugerencias).values({
              tipo: 'novedad',
              contenido,
              lineaId,
              evidencia: JSON.stringify({ mail: `${m.remitente}, ${m.asunto}` }),
              creado: ahora,
            });
          }
        }
      }
    }
    for (let i = 0; i < eventosNuevos.length; i++) {
      const e = eventosNuevos[i];
      const r = await clasificarJson('clasificador-evento', catalogo, `EVENTO:\nTítulo: ${e.titulo}\nInicio: ${e.inicio}`);
      if (!r) continue;
      const areaId = buscarArea(catalogo, r.area);
      const lineaId = buscarLinea(catalogo, r.linea);
      await db.update(eventos).set({ areaId, lineaId }).where(eq(eventos.id, idsEventosNuevos[i]));
      if (lineaId) lineasConActividad.add(lineaId);
    }
  }

  // 3. Última actividad de líneas tocadas
  for (const lineaId of lineasConActividad) {
    await db.update(lineas).set({ ultimaActividad: ahora }).where(eq(lineas.id, lineaId));
  }

  // 4. Cronista, regla anti-ruido: solo si hubo algo relevante
  const hoy = new Date().toISOString().slice(0, 10);
  const eventosDeHoy = eventosNuevos.filter((e) => e.inicio.startsWith(hoy)).length;
  if (importantes > 0 || eventosDeHoy > 0) {
    const resumenCrudo = await llamarRol('cronista', [
      {
        rol: 'user',
        contenido:
          `Transcripción:\nSistema: Sync automático. Llegaron ${mailsNuevos.length} mails (${importantes} importantes) y ${eventosNuevos.length} eventos nuevos.\n` +
          mailsNuevos.map((m) => `Mail: ${m.remitente}, ${m.asunto}`).join('\n') +
          '\n' +
          eventosNuevos.map((e) => `Evento: ${e.titulo} (${e.inicio})`).join('\n'),
      },
    ]).catch(() => null);
    if (resumenCrudo) {
      await db.insert(bitacora).values({ tipo: 'sync', contenido: resumenCrudo.trim(), fecha: ahora });
    }
  }

  return `mails:${mailsNuevos.length} (importantes:${importantes}) eventos:${eventosNuevos.length}`;
}

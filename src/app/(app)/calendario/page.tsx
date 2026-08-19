import { and, asc, eq, gte, isNull, like, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, areas, bitacora, chatMensajes, config, cuerpo, eventos, gastos, lineas, periodos } from '@/lib/db/schema';
import { fechaDeInicio, horaDeInicio } from '@/lib/agenda';
import { claveDiaLocal, diaVacio, moodDominante, type DetalleDia } from '@/lib/dia';
import { largoPromedioCiclo, marcasCiclo, type MarcaCiclo } from '@/lib/ciclo';
import { CalendarioUI, type EventoVista, type AreaOpcion, type MarcaDia } from '@/components/calendario/CalendarioUI';
import { TituloFijo } from '@/components/ui/TituloFijo';

export const dynamic = 'force-dynamic';

function hora(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export default async function CalendarioPage() {
  // Ventana de datos para pintar el calendario: 1 año atrás (para navegar meses)
  // y todo lo futuro de la agenda.
  const desde = new Date(Date.now() - 366 * 86_400_000).toISOString();

  const [eventosRows, areasRows, animoRows, cuerpoRows, gastosRows, hechasRows, bitacoraRows, periodosRows, cfgRows, fotosRows] =
    await Promise.all([
      // internos (gcalId null) + los importados del iPhone (gcalId "apple:…")
      db
        .select()
        .from(eventos)
        .where(or(isNull(eventos.gcalId), like(eventos.gcalId, 'apple:%')))
        .orderBy(asc(eventos.inicio)),
      db.select().from(areas),
      db.select().from(animoCheckins).where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, desde))),
      db.select().from(cuerpo).where(gte(cuerpo.creado, desde)),
      db.select().from(gastos).where(gte(gastos.creado, desde)),
      db.select().from(lineas),
      db.select().from(bitacora).where(gte(bitacora.fecha, desde)),
      db.select().from(periodos).orderBy(asc(periodos.inicio)),
      db.select().from(config),
      // fotos que subiste al chat: quedan guardadas y las volvés a ver acá, en
      // el día que las sacaste. Antes se perdían en el hilo de la conversación.
      db
        .select({ path: chatMensajes.adjuntoPath, creado: chatMensajes.creado })
        .from(chatMensajes)
        .where(and(eq(chatMensajes.adjuntoTipo, 'imagen'), gte(chatMensajes.creado, desde))),
    ]);

  const cfg = new Map(cfgRows.map((r) => [r.clave, r.valor]));
  const sigueCiclo = cfg.get('sigue_ciclo') === '1';

  const nombreArea = new Map(areasRows.map((a) => [a.id, a.nombre]));
  const colorArea = new Map(areasRows.map((a) => [a.id, a.color]));

  const lista: EventoVista[] = eventosRows.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    fecha: fechaDeInicio(e.inicio),
    hora: horaDeInicio(e.inicio),
    areaId: e.areaId,
    area: e.areaId != null ? (nombreArea.get(e.areaId) ?? null) : null,
    areaColor: e.areaId != null ? (colorArea.get(e.areaId) ?? null) : null,
    nota: e.nota,
    externo: e.gcalId != null,
  }));

  // ---- Balance por día: junto todo lo registrado en su día local ----
  const dias = new Map<string, DetalleDia>();
  const get = (clave: string) => {
    if (!dias.has(clave)) dias.set(clave, diaVacio());
    return dias.get(clave)!;
  };

  for (const a of animoRows) {
    get(claveDiaLocal(new Date(a.creado))).animo.push({ estado: a.estado, nota: a.nota, hora: hora(a.creado) });
  }
  for (const c of cuerpoRows) {
    const dia = get(claveDiaLocal(new Date(c.creado)));
    if (c.tipo === 'sueno' && c.valor != null) {
      dia.sueno = { hs: Math.round((c.valor / 60) * 10) / 10, calidad: c.calidad };
    } else if (c.tipo === 'comida' && c.nota) {
      dia.comidas.push({ nota: c.nota, hora: hora(c.creado) });
    }
  }
  for (const g of gastosRows) {
    const clave = g.fecha && /^\d{4}-\d{2}-\d{2}/.test(g.fecha) ? g.fecha.slice(0, 10) : claveDiaLocal(new Date(g.creado));
    get(clave).gastos.push({ comercio: g.comercio, total: g.total, moneda: g.moneda });
  }
  for (const l of hechasRows) {
    if (l.tipo === 'actividad' && l.estado === 'hecha' && l.ultimaActividad) {
      get(claveDiaLocal(new Date(l.ultimaActividad))).hechas.push(l.titulo);
    }
  }
  for (const e of eventosRows) {
    get(fechaDeInicio(e.inicio)).eventos.push({ titulo: e.titulo, hora: horaDeInicio(e.inicio) });
  }
  for (const b of bitacoraRows) {
    // el sueño y el check-in ya tienen su propia fila; acá van notas y resúmenes de charla
    if (b.contenido.startsWith('Dormí ') || b.contenido.startsWith('Check-in del día')) continue;
    if (b.tipo === 'hecho') continue; // ya está como actividad hecha
    const dia = get(claveDiaLocal(new Date(b.fecha)));
    if (b.tipo === 'chat') dia.charlas.push({ texto: b.contenido, hora: hora(b.fecha) });
    else dia.notas.push({ texto: b.contenido, hora: hora(b.fecha) });
  }
  for (const f of fotosRows) {
    if (f.path) get(claveDiaLocal(new Date(f.creado))).fotos.push({ path: f.path, hora: hora(f.creado) });
  }

  // Ciclo: marca coral en los días de período (reales + estimados) si lo sigue.
  let ciclo: Record<string, MarcaCiclo> = {};
  if (sigueCiclo && periodosRows.length > 0) {
    const hasta = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
    ciclo = marcasCiclo(periodosRows, desde.slice(0, 10), hasta, largoPromedioCiclo(periodosRows));
  }

  // Marca compacta por día para pintar la grilla (mood + ciclo + qué categorías hay).
  const marcas: Record<string, MarcaDia> = {};
  const claves = new Set([...dias.keys(), ...Object.keys(ciclo)]);
  for (const clave of claves) {
    const d = dias.get(clave);
    marcas[clave] = { mood: d ? moodDominante(d.animo.map((a) => a.estado)) : null, ciclo: ciclo[clave] ?? null };
  }

  const detalles: Record<string, DetalleDia> = Object.fromEntries(dias);

  const opciones: AreaOpcion[] = areasRows
    .filter((a) => a.activa)
    .sort((a, b) => a.orden - b.orden)
    .map((a) => ({ id: a.id, nombre: a.nombre }));

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Calendario" />
      <CalendarioUI eventos={lista} areas={opciones} marcas={marcas} detalles={detalles} />
    </div>
  );
}

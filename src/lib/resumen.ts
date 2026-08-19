// Resumen semanal: una lectura corta de cómo venís, armada con lo que registraste
// en los últimos 7 días. Se genera una vez por semana (al abrir Patrones en una
// semana nueva) y queda cacheado en config, con fallback sin IA que nunca falta.

import { desc, gte, and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, bitacora, config, cuerpo, eventos, gastos, lineas } from '@/lib/db/schema';
import { fechaDeInicio } from '@/lib/agenda';

const ETIQUETA: Record<string, string> = {
  genial: 'genial',
  bien: 'bien',
  neutral: 'neutral',
  bajon: 'con bajón',
  masomenos: 'más o menos',
  mal: 'mal',
};

/** Clave de la semana ISO ("2026-W30"), con lunes como arranque. */
export function claveSemana(d: Date): string {
  // algoritmo ISO 8601: la semana es la del jueves más cercano
  const fecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (fecha.getDay() + 6) % 7; // 0 = lunes
  fecha.setDate(fecha.getDate() - dow + 3); // el jueves de esta semana
  const anio = fecha.getFullYear();
  const primerJueves = new Date(anio, 0, 4);
  const dow2 = (primerJueves.getDay() + 6) % 7;
  primerJueves.setDate(primerJueves.getDate() - dow2 + 3);
  const semana = 1 + Math.round((fecha.getTime() - primerJueves.getTime()) / (7 * 86_400_000));
  return `${anio}-W${String(semana).padStart(2, '0')}`;
}

export type DatosResumen = {
  nombre: string;
  animo: { dia: string; estado: string; nota: string | null }[];
  suenoNoches: number;
  suenoPromedioHs: number | null;
  comidas: number;
  gastosTotal: number | null;
  gastosMoneda: string | null;
  gastosTickets: number;
  hechas: string[];
  eventosProximos: { titulo: string; cuando: string }[];
  entradas: number;
};

export async function datosResumen(): Promise<DatosResumen> {
  const hace7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const hoyYmd = new Date().toISOString().slice(0, 10);
  const [animos, cuerpoRows, gastosRows, hechasRows, eventosRows, entradasRows, cfg] = await Promise.all([
    db
      .select()
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, hace7)))
      .orderBy(animoCheckins.creado),
    db.select().from(cuerpo).where(gte(cuerpo.creado, hace7)),
    db.select().from(gastos).where(gte(gastos.creado, hace7)),
    db
      .select()
      .from(lineas)
      .where(and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'hecha'), gte(lineas.ultimaActividad, hace7))),
    db.select().from(eventos).where(gte(eventos.inicio, hoyYmd)).orderBy(eventos.inicio).limit(3),
    db.select().from(bitacora).where(gte(bitacora.fecha, hace7)).orderBy(desc(bitacora.fecha)),
    db.select().from(config).where(eq(config.clave, 'nombre')),
  ]);

  const suenos = cuerpoRows.filter((c) => c.tipo === 'sueno' && c.valor != null);
  const conTotal = gastosRows.filter((g) => g.total != null);

  return {
    nombre: cfg[0]?.valor ?? 'Matías',
    animo: animos.map((a) => ({ dia: a.creado.slice(0, 10), estado: a.estado, nota: a.nota })),
    suenoNoches: suenos.length,
    suenoPromedioHs: suenos.length
      ? Math.round((suenos.reduce((s, c) => s + (c.valor ?? 0), 0) / suenos.length / 60) * 10) / 10
      : null,
    comidas: cuerpoRows.filter((c) => c.tipo === 'comida').length,
    gastosTotal: conTotal.length ? conTotal.reduce((s, g) => s + (g.total ?? 0), 0) : null,
    gastosMoneda: conTotal.find((g) => g.moneda)?.moneda ?? null,
    gastosTickets: conTotal.length,
    hechas: hechasRows.map((h) => h.titulo),
    eventosProximos: eventosRows.map((e) => ({ titulo: e.titulo, cuando: fechaDeInicio(e.inicio) })),
    entradas: entradasRows.length,
  };
}

export function promptResumen(d: DatosResumen): string {
  const animo = d.animo.length
    ? d.animo.map((a) => `${a.dia}: ${ETIQUETA[a.estado] ?? a.estado}${a.nota ? ` (${a.nota})` : ''}`).join('\n')
    : '(no registró ánimo esta semana)';
  const gastosTxt =
    d.gastosTotal != null
      ? `${d.gastosMoneda ?? ''} ${d.gastosTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })} en ${d.gastosTickets} ticket(s)`
      : '(sin tickets cargados)';
  return [
    `Usuario: ${d.nombre}`,
    `\nÁNIMO DE LA SEMANA:\n${animo}`,
    `\nSUEÑO: ${d.suenoNoches ? `${d.suenoNoches} noche(s) registrada(s), promedio ${d.suenoPromedioHs}h` : '(sin registros)'}`,
    `\nCOMIDAS ANOTADAS: ${d.comidas}`,
    `\nGASTOS: ${gastosTxt}`,
    `\nCOSAS QUE HIZO (puntuales): ${d.hechas.length ? d.hechas.join(' · ') : '(ninguna marcada)'}`,
    `\nLO QUE SE VIENE: ${d.eventosProximos.length ? d.eventosProximos.map((e) => `${e.titulo} (${e.cuando})`).join(' · ') : '(nada agendado)'}`,
    `\nENTRADAS EN LA BITÁCORA: ${d.entradas}`,
  ].join('\n');
}

// Lectura sin IA, para cuando Ollama no está. Nunca queda vacía.
export function fallbackResumen(d: DatosResumen): string {
  const partes: string[] = [`${d.nombre}, tu semana en una mirada.`];

  if (d.animo.length) {
    const buenos = d.animo.filter((a) => a.estado === 'genial' || a.estado === 'bien').length;
    partes.push(
      buenos >= d.animo.length / 2
        ? `Registraste tu ánimo ${d.animo.length} ${d.animo.length === 1 ? 'vez' : 'veces'} y la mayoría venía para arriba.`
        : `Registraste tu ánimo ${d.animo.length} ${d.animo.length === 1 ? 'vez' : 'veces'}, con varios días flojos.`,
    );
  }
  if (d.suenoNoches) partes.push(`Dormiste en promedio ${d.suenoPromedioHs}h (${d.suenoNoches} ${d.suenoNoches === 1 ? 'noche' : 'noches'}).`);
  if (d.hechas.length) partes.push(`Quedó marcado: ${d.hechas.join(', ')}.`);
  if (d.gastosTotal != null)
    partes.push(
      `Gastaste ${d.gastosMoneda ?? ''} ${d.gastosTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })} en ${d.gastosTickets} ${d.gastosTickets === 1 ? 'ticket' : 'tickets'}.`,
    );
  if (d.eventosProximos[0]) partes.push(`Se viene: ${d.eventosProximos[0].titulo}.`);
  if (partes.length === 1)
    partes.push('Esta semana no registraste nada todavía. Con un par de check-ins ya puedo leerte mejor.');
  return partes.join(' ');
}

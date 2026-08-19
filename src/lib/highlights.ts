import { desc, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { areas, animoCheckins, bitacora, config, lineas } from '@/lib/db/schema';
import { relacionEntre } from '@/lib/conexiones';

const ETIQUETA: Record<string, string> = {
  bien: 'bien',
  masomenos: 'más o menos',
  mal: 'mal',
  genial: 'genial',
  neutral: 'neutral',
  bajon: 'con bajón',
};

// Cómo se lee cada puntaje de la rueda, en segunda persona y sin números:
// espeja las anclas conductuales del onboarding (CLAVE_PUNTUACION).
const ANCLA: Record<number, string> = {
  1: 'marcaste que la estás pasando mal ahí',
  2: 'sentís que puede mejorar bastante',
  3: 'va bastante bien, con algo para afinar',
  4: 'estás bien ahí y querés sostenerlo',
  5: 'estás pleno con eso',
};

export type DatosHighlight = {
  nombre: string;
  rueda: { nombre: string; actual: number; deseado: number; foco: boolean }[];
  animoReciente: { area: string; estado: string; cuando: string }[];
  deadlines: { titulo: string; dias: number }[];
  ultimaEntrada: string | null;
};

export async function datosHighlight(): Promise<DatosHighlight> {
  const hace3 = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const [areasRows, lineasRows, animos, ult, cfg] = await Promise.all([
    db.select().from(areas),
    db.select().from(lineas),
    db.select().from(animoCheckins).where(gte(animoCheckins.creado, hace3)).orderBy(desc(animoCheckins.creado)),
    db.select().from(bitacora).orderBy(desc(bitacora.fecha)).limit(1),
    db.select().from(config).where(eq(config.clave, 'nombre')),
  ]);
  const activas = areasRows.filter((a) => a.activa);
  const nombreArea = new Map(areasRows.map((a) => [a.id, a.nombre]));

  const hoy = new Date();
  const deadlines = lineasRows
    .filter((l) => l.estado === 'activa' && l.deadline)
    .map((l) => ({
      titulo: l.titulo,
      dias: Math.ceil((new Date(l.deadline!).getTime() - hoy.getTime()) / 86_400_000),
    }))
    .filter((d) => d.dias >= 0 && d.dias <= 14)
    .sort((a, b) => a.dias - b.dias);

  return {
    nombre: cfg[0]?.valor ?? 'Matías',
    rueda: activas.map((a) => ({
      nombre: a.nombre,
      actual: a.scoreActual ?? 0,
      deseado: a.scoreDeseado ?? 0,
      foco: a.foco,
    })),
    animoReciente: animos.slice(0, 6).map((r) => ({
      area: r.areaId ? (nombreArea.get(r.areaId) ?? '') : 'general',
      estado: r.estado,
      cuando: r.creado.slice(0, 10),
    })),
    deadlines,
    ultimaEntrada: ult[0]?.contenido ?? null,
  };
}

export function promptHighlight(d: DatosHighlight): string {
  const rueda = d.rueda
    .map((a) => `${a.nombre}: ${a.actual}/5 (quiere ${a.deseado})${a.foco ? ' [foco]' : ''}`)
    .join('\n');
  const animo = d.animoReciente.length
    ? d.animoReciente.map((a) => `${a.area}: ${ETIQUETA[a.estado] ?? a.estado} (${a.cuando})`).join('\n')
    : '(sin registros recientes)';
  const dls = d.deadlines.length
    ? d.deadlines.map((x) => `${x.titulo}: en ${x.dias} día(s)`).join('\n')
    : '(ninguno cercano)';
  return [
    `Usuario: ${d.nombre}`,
    `\nRUEDA (actual/deseado):\n${rueda}`,
    `\nÁNIMO RECIENTE:\n${animo}`,
    `\nDEADLINES CERCANOS:\n${dls}`,
    d.ultimaEntrada ? `\nÚLTIMA ENTRADA: ${d.ultimaEntrada}` : '',
  ].join('\n');
}

// Resumen sin IA, para cuando Ollama no está. Nunca queda vacío.
// Habla de las áreas en términos de intención y dirección, nunca de puntajes:
// "salud mental 4 de 5" lee como boletín y eso no acompaña a nadie.
export function fallbackHighlight(d: DatosHighlight): string {
  const partes: string[] = [`Hola ${d.nombre}.`];

  const conGap = [...d.rueda]
    .filter((a) => a.foco)
    .map((a) => ({ ...a, gap: a.deseado - a.actual }))
    .sort((a, b) => b.gap - a.gap)[0]
    ?? [...d.rueda]
      .map((a) => ({ ...a, gap: a.deseado - a.actual }))
      .sort((a, b) => b.gap - a.gap)[0];
  if (conGap && conGap.gap > 0) {
    const ancla = ANCLA[Math.max(1, Math.min(5, conGap.actual))];
    partes.push(`Elegiste darle lugar a ${conGap.nombre}: ${ancla}, y querés moverlo.`);
    const otraFoco = d.rueda.find((a) => a.foco && a.nombre !== conGap.nombre);
    if (otraFoco) {
      const rel = relacionEntre(conGap.nombre, otraFoco.nombre);
      if (rel) partes.push(rel.nota);
    }
  }
  if (d.deadlines[0]) {
    const x = d.deadlines[0];
    partes.push(x.dias === 0 ? `Hoy vence "${x.titulo}".` : `"${x.titulo}" vence en ${x.dias} día(s).`);
  }
  if (d.animoReciente[0]) {
    const a = d.animoReciente[0];
    const estado = ETIQUETA[a.estado] ?? a.estado;
    partes.push(a.area === 'general' ? `Lo último que registraste: venías ${estado}.` : `Lo último que registraste: ${a.area}, ${estado}.`);
  }
  return partes.join(' ');
}

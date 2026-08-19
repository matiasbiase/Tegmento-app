'use server';

import { revalidatePath } from 'next/cache';
import { desc, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, bitacora, lineas } from '@/lib/db/schema';
import { moodDe } from '@/lib/animo';
import { llamarRol } from '@/lib/llm/roles';
import { ollamaDisponible } from '@/lib/llm/proveedor';

export type CheckinHoyData = {
  estado: string; // MoodKey
  lineaIds: number[];
  nota: string;
  factores?: string[]; // qué influye en cómo te sentís (Trabajo, Sueño…)
  palabras?: string[]; // cómo te sentís en una palabra (Tranquilo, Ansioso…)
};

export type CheckinResultado = {
  reflejo: string;
  racha: number;
};

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Días consecutivos (terminando hoy) con al menos un check-in general. */
function calcularRacha(fechas: string[], hoy = new Date()): number {
  const dias = new Set(fechas.map((f) => diaLocal(new Date(f))));
  let racha = 0;
  const cursor = new Date(hoy);
  while (dias.has(diaLocal(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/**
 * El core loop de la app: registrás cómo venís y qué hiciste, y la IA te
 * devuelve un reflejo inmediato. Guarda ánimo + bitácora y marca actividad
 * en las líneas elegidas.
 */
export async function registrarCheckinHoy(data: CheckinHoyData): Promise<CheckinResultado> {
  const mood = moodDe(data.estado);
  if (!mood) throw new Error('Estado inválido');
  const ahora = new Date();
  const nota = data.nota.trim();

  const elegidas = data.lineaIds.length
    ? await db.select().from(lineas).where(inArray(lineas.id, data.lineaIds))
    : [];
  const titulos = elegidas.map((l) => l.titulo);

  const factores = (data.factores ?? []).map((f) => f.trim()).filter(Boolean).slice(0, 12);
  // Las palabras no se guardaban desde la Casa: el registro rápido perdía la
  // mitad de lo que la pantalla de Ánimo sí pregunta, y el Analista se quedaba
  // sin esa señal cuando Matías registraba desde el home (que es casi siempre).
  const palabras = (data.palabras ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 12);
  await db.insert(animoCheckins).values({
    areaId: null,
    estado: mood.key,
    nota: nota || null,
    factores: factores.length ? JSON.stringify(factores) : null,
    palabras: palabras.length ? JSON.stringify(palabras) : null,
    creado: ahora.toISOString(),
  });

  if (titulos.length || nota) {
    const partes = [] as string[];
    if (titulos.length) partes.push(`Hice: ${titulos.join(', ')}.`);
    if (nota) partes.push(nota);
    await db.insert(bitacora).values({
      tipo: 'manual',
      contenido: `Check-in del día (${mood.label}). ${partes.join(' ')}`,
      fecha: ahora.toISOString(),
      lineaId: elegidas[0]?.id ?? null,
    });
  }
  if (elegidas.length) {
    await db.update(lineas).set({ ultimaActividad: ahora.toISOString() }).where(inArray(lineas.id, data.lineaIds));
  }

  // Racha y últimos registros para darle contexto al reflejo.
  const previos = await db
    .select({ estado: animoCheckins.estado, creado: animoCheckins.creado })
    .from(animoCheckins)
    .where(isNull(animoCheckins.areaId))
    .orderBy(desc(animoCheckins.creado))
    .limit(40);
  const racha = calcularRacha(previos.map((p) => p.creado));

  let reflejo = '';
  if (await ollamaDisponible()) {
    const ayer = previos.find((p) => diaLocal(new Date(p.creado)) !== diaLocal(ahora));
    const contenido = [
      `Ánimo de hoy: ${mood.label}.`,
      titulos.length ? `Hoy hizo: ${titulos.join(', ')}.` : 'No marcó actividades.',
      factores.length ? `Lo que más le influye hoy: ${factores.join(', ')}.` : '',
      nota ? `Su nota: "${nota}"` : '',
      ayer ? `El registro anterior fue: ${moodDe(ayer.estado)?.label ?? ayer.estado}.` : 'Es su primer registro.',
      racha > 1 ? `Lleva ${racha} días seguidos registrando.` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      reflejo = (await llamarRol('reflejo', [{ rol: 'user', contenido }])).trim();
    } catch {
      reflejo = '';
    }
  }
  if (!reflejo) {
    // Sin IA el loop no se rompe: reflejo simple pero real.
    const base =
      mood.key === 'bajon'
        ? 'Anotado. Los días así también cuentan, y que lo registres vale doble.'
        : titulos.length
          ? `Anotado: ${mood.label.toLowerCase()}, con ${titulos.join(' y ')} en el día.`
          : `Anotado: ${mood.label.toLowerCase()}.`;
    reflejo = racha > 1 ? `${base} Van ${racha} días seguidos registrando.` : base;
  }

  revalidatePath('/chat');
  revalidatePath('/cuerpo');
  return { reflejo, racha };
}

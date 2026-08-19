import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { crearBasePrueba, borrarBasePrueba, hayBaseReal, verificarNoEsLaReal } from './basePrueba';

// Agrupar mensajes por tema ("cristalizar", 29/07): contra una base real, no
// solo la lógica pura de `lib/cristales.ts` — acá importa que el tema quede
// bien guardado y que desagrupar deje al mensaje exactamente como estaba.

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

let ruta: string;

beforeAll(() => {
  ruta = crearBasePrueba();
  verificarNoEsLaReal();
});

afterAll(() => borrarBasePrueba(ruta));

async function modulos() {
  const acciones = await import('@/lib/actions/mensajes');
  const { db } = await import('@/lib/db/client');
  const schema = await import('@/lib/db/schema');
  return { ...acciones, db, ...schema };
}

async function chatDePrueba() {
  const { db, chats } = await modulos();
  const ahora = new Date().toISOString();
  const [chat] = await db
    .insert(chats)
    .values({ titulo: 'Charla de prueba', iniciado: ahora, ultimaActividad: ahora, estado: 'abierto' })
    .returning();
  return chat.id;
}

describe.runIf(hayBaseReal())('agrupar mensajes por tema, de punta a punta', () => {
  it('crearTemaYAgrupar crea el tema y lo asigna a los mensajes elegidos', async () => {
    const { crearTemaYAgrupar, db, chatMensajes } = await modulos();
    const chatId = await chatDePrueba();
    const ahora = new Date().toISOString();
    const [a, b] = await db
      .insert(chatMensajes)
      .values([
        { chatId, rol: 'user', contenido: 'Dormí una siesta', creado: ahora },
        { chatId, rol: 'assistant', contenido: '¿Te ayudó?', creado: ahora },
      ])
      .returning();

    const tema = await crearTemaYAgrupar('Dormir', [a.id, b.id]);
    expect(tema?.nombre).toBe('Dormir');

    const filas = await db.select().from(chatMensajes).where(eq(chatMensajes.chatId, chatId));
    expect(filas.every((f) => f.temaId === tema!.id)).toBe(true);
  });

  it('reusa un tema existente en vez de duplicarlo (mismo nombre, sin importar mayúsculas)', async () => {
    const { crearTemaYAgrupar, db, chatMensajes, temas } = await modulos();
    const chatId = await chatDePrueba();
    const ahora = new Date().toISOString();
    const [a, b] = await db
      .insert(chatMensajes)
      .values([
        { chatId, rol: 'user', contenido: 'x', creado: ahora },
        { chatId, rol: 'user', contenido: 'y', creado: ahora },
      ])
      .returning();

    const primero = await crearTemaYAgrupar('Mudanza', [a.id]);
    const segundo = await crearTemaYAgrupar('mudanza', [b.id]);
    expect(segundo?.id).toBe(primero?.id);

    const filasTema = await db.select().from(temas).where(eq(temas.nombre, 'Mudanza'));
    expect(filasTema).toHaveLength(1);
  });

  it('desagruparMensajes vuelve el tema a null', async () => {
    const { crearTemaYAgrupar, desagruparMensajes, db, chatMensajes } = await modulos();
    const chatId = await chatDePrueba();
    const ahora = new Date().toISOString();
    const [a] = await db.insert(chatMensajes).values({ chatId, rol: 'user', contenido: 'z', creado: ahora }).returning();

    await crearTemaYAgrupar('Lo que sea', [a.id]);
    await desagruparMensajes([a.id]);

    const [fila] = await db.select().from(chatMensajes).where(eq(chatMensajes.id, a.id));
    expect(fila.temaId).toBeNull();
  });

  it('agruparMensajes con un tema ya existente no crea uno nuevo', async () => {
    const { crearTemaYAgrupar, agruparMensajes, db, chatMensajes, temas } = await modulos();
    const chatId = await chatDePrueba();
    const ahora = new Date().toISOString();
    const [a, b] = await db
      .insert(chatMensajes)
      .values([
        { chatId, rol: 'user', contenido: 'a', creado: ahora },
        { chatId, rol: 'user', contenido: 'b', creado: ahora },
      ])
      .returning();

    const tema = await crearTemaYAgrupar('Un tema', [a.id]);
    await agruparMensajes([b.id], tema!.id);

    const cuantos = await db.select().from(temas).where(eq(temas.nombre, 'Un tema'));
    expect(cuantos).toHaveLength(1);
    const [filaB] = await db.select().from(chatMensajes).where(eq(chatMensajes.id, b.id));
    expect(filaB.temaId).toBe(tema!.id);
  });
});

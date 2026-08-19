import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { crearBasePrueba, borrarBasePrueba, hayBaseReal, verificarNoEsLaReal } from './basePrueba';

// Una charla en VARIAS notas (04/08). Reemplaza a `chats.notaId`, que era un solo
// FK, y revierte una decisión que estaba escrita en el schema con su argumento.
//
// Se testea contra la base porque lo que cambió es el MODELO: que el toggle no
// duplique, que sacarla de una nota no la saque de las otras, y que la charla
// nunca se copie. Nada de eso se ve en la pantalla hasta que está mal.

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

let ruta: string;

beforeAll(() => {
  ruta = crearBasePrueba();
  verificarNoEsLaReal();
});

afterAll(() => borrarBasePrueba(ruta));

async function sembrar() {
  const { db } = await import('@/lib/db/client');
  const { chats, notas } = await import('@/lib/db/schema');
  const ahora = new Date().toISOString();
  const [c] = await db
    .insert(chats)
    .values({ titulo: 'Charla de prueba', iniciado: ahora, ultimaActividad: ahora })
    .returning({ id: chats.id });
  const [n1] = await db
    .insert(notas)
    .values({ titulo: 'Nota A', cuerpo: '', creado: ahora, actualizado: ahora })
    .returning({ id: notas.id });
  const [n2] = await db
    .insert(notas)
    .values({ titulo: 'Nota B', cuerpo: '', creado: ahora, actualizado: ahora })
    .returning({ id: notas.id });
  return { chatId: c.id, notaA: n1.id, notaB: n2.id };
}

describe.runIf(hayBaseReal())('una charla en varias notas', () => {
  it('⚠️ puede estar en DOS notas a la vez', async () => {
    const { alternarChatEnNota, notasDeChat } = await import('@/lib/actions/notas');
    const { chatId, notaA, notaB } = await sembrar();

    expect((await alternarChatEnNota(chatId, notaA)).dentro).toBe(true);
    expect((await alternarChatEnNota(chatId, notaB)).dentro).toBe(true);

    const notas = await notasDeChat(chatId);
    expect(notas).toHaveLength(2);
    expect(notas).toContain(notaA);
    expect(notas).toContain(notaB);
  });

  it('sacarla de una NO la saca de la otra', async () => {
    const { alternarChatEnNota, notasDeChat } = await import('@/lib/actions/notas');
    const { chatId, notaA, notaB } = await sembrar();

    await alternarChatEnNota(chatId, notaA);
    await alternarChatEnNota(chatId, notaB);
    expect((await alternarChatEnNota(chatId, notaA)).dentro).toBe(false);

    expect(await notasDeChat(chatId)).toEqual([notaB]);
  });

  it('⚠️ tocar dos veces es poner y sacar, no dos filas', async () => {
    const { alternarChatEnNota, notasDeChat } = await import('@/lib/actions/notas');
    const { chatId, notaA } = await sembrar();

    await alternarChatEnNota(chatId, notaA);
    await alternarChatEnNota(chatId, notaA);
    await alternarChatEnNota(chatId, notaA);

    // La PK compuesta hace imposible el duplicado: acá se comprueba que además
    // el estado final es el correcto (impar = dentro).
    expect(await notasDeChat(chatId)).toEqual([notaA]);
  });

  it('⚠️ la charla NO se copia: sigue siendo una sola fila', async () => {
    // Es lo que hace tolerable haber revertido la decisión vieja del schema
    // ("mandarla deja de ser mudarla para ser copiarla"). No se copia: se
    // referencia desde varias.
    const { alternarChatEnNota } = await import('@/lib/actions/notas');
    const { db } = await import('@/lib/db/client');
    const { chats } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const { chatId, notaA, notaB } = await sembrar();

    await alternarChatEnNota(chatId, notaA);
    await alternarChatEnNota(chatId, notaB);

    const filas = await db.select().from(chats).where(eq(chats.id, chatId));
    expect(filas).toHaveLength(1);
    expect(filas[0].titulo).toBe('Charla de prueba');
  });

  it('una charla sin notas devuelve lista vacía', async () => {
    const { notasDeChat } = await import('@/lib/actions/notas');
    const { chatId } = await sembrar();
    expect(await notasDeChat(chatId)).toEqual([]);
  });
});

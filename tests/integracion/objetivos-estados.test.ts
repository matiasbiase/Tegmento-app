import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { crearBasePrueba, borrarBasePrueba, hayBaseReal, verificarNoEsLaReal } from './basePrueba';

// Pausar (1.2) y reciclar (1.3), los dos del 30/07 y construidos el 03/08.
//
// Se testean contra la base y no en puro porque lo que importa de los dos es
// QUÉ QUEDA GUARDADO: que pausar no ponga fecha de cierre, y que reciclar deje
// dos filas y no una reiniciada. Las dos cosas son invisibles en la pantalla y
// las dos romperían la estimación de "cuánto suele llevarte".

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

let ruta: string;

beforeAll(() => {
  ruta = crearBasePrueba();
  verificarNoEsLaReal();
});

afterAll(() => borrarBasePrueba(ruta));

async function crear(titulo: string) {
  const { db } = await import('@/lib/db/client');
  const { objetivos } = await import('@/lib/db/schema');
  const [o] = await db
    .insert(objetivos)
    .values({ titulo, arranco: '2026-01-15', estado: 'activo', creado: new Date().toISOString() })
    .returning({ id: objetivos.id });
  return o.id;
}

describe.runIf(hayBaseReal())('pausar un objetivo', () => {
  it('⚠️ queda pausado SIN fecha de cierre', async () => {
    const { pausarObjetivo } = await import('@/lib/actions/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivos } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const id = await crear('Volver a nadar');
    await pausarObjetivo(id);

    const [o] = await db.select().from(objetivos).where(eq(objetivos.id, id));
    expect(o.estado).toBe('pausado');
    // Es la diferencia entera con abandonar: sin `cerrado`, no entra como
    // materia prima en `estimarDeCerrados`. Uno que vas a retomar no "llevó"
    // todavía nada, y contarlo ensuciaría la estimación del próximo parecido.
    expect(o.cerrado).toBeNull();
  });

  it('se retoma y vuelve a activo', async () => {
    const { pausarObjetivo, reanudarObjetivo } = await import('@/lib/actions/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivos } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const id = await crear('Alemán');
    await pausarObjetivo(id);
    await reanudarObjetivo(id);

    const [o] = await db.select().from(objetivos).where(eq(objetivos.id, id));
    expect(o.estado).toBe('activo');
    expect(o.cerrado).toBeNull();
  });

  it('⚠️ un pausado NO cuenta como cerrado para la estimación', async () => {
    const { pausarObjetivo } = await import('@/lib/actions/objetivos');
    const { estimarDeCerrados } = await import('@/lib/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivos } = await import('@/lib/db/schema');

    const id = await crear('Correr 10k');
    await pausarObjetivo(id);

    const todos = await db.select().from(objetivos);
    const logrados = todos.filter((o) => o.estado === 'logrado');
    expect(logrados.find((o) => o.id === id)).toBeUndefined();
    // Y no explota con la lista que sí hay.
    expect(() => estimarDeCerrados(logrados)).not.toThrow();
  });
});

describe.runIf(hayBaseReal())('reciclar un objetivo', () => {
  it('⚠️ deja DOS filas: la vieja entera y una nueva desde hoy', async () => {
    const { reciclarObjetivo } = await import('@/lib/actions/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivos } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const id = await crear('Buscar trabajo');
    const nuevoId = await reciclarObjetivo(id);
    expect(nuevoId).not.toBeNull();
    expect(nuevoId).not.toBe(id);

    const [viejo] = await db.select().from(objetivos).where(eq(objetivos.id, id));
    const [nuevo] = await db.select().from(objetivos).where(eq(objetivos.id, nuevoId!));

    // La vuelta vieja se cierra como lograda y CONSERVA su arranco: es el único
    // dato que dice cuánto llevó la vez pasada. Reiniciar la misma fila lo
    // habría borrado.
    expect(viejo.estado).toBe('logrado');
    expect(viejo.arranco).toBe('2026-01-15');
    expect(viejo.cerrado).not.toBeNull();

    // La nueva arranca hoy, activa y con el mismo título.
    expect(nuevo.estado).toBe('activo');
    expect(nuevo.titulo).toBe('Buscar trabajo');
    expect(nuevo.arranco).not.toBe('2026-01-15');
  });

  it('⚠️ la vuelta nueva NO hereda la fecha de meta vencida', async () => {
    const { reciclarObjetivo } = await import('@/lib/actions/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivos } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const [o] = await db
      .insert(objetivos)
      .values({
        titulo: 'Aprobar el B2',
        arranco: '2026-01-15',
        estado: 'activo',
        fechaMeta: '2026-03-01', // ya pasó
        meta: 'aprobar el examen',
        horasEstimadas: 750,
        creado: new Date().toISOString(),
      })
      .returning({ id: objetivos.id });

    const nuevoId = await reciclarObjetivo(o.id);
    const [nuevo] = await db.select().from(objetivos).where(eq(objetivos.id, nuevoId!));

    // Heredarla abriría la vuelta nueva con una meta en el pasado, y la tarjeta
    // diría "faltan -40 semanas".
    expect(nuevo.fechaMeta).toBeNull();
    // Las horas estimadas SÍ se heredan: cuánto sale en total no cambia por
    // empezar de nuevo.
    expect(nuevo.horasEstimadas).toBe(750);
    expect(nuevo.meta).toBe('aprobar el examen');
  });

  it('⚠️ los movimientos de la vuelta vieja no se copian a la nueva', async () => {
    const { anotarMovimiento, reciclarObjetivo } = await import('@/lib/actions/objetivos');
    const { db } = await import('@/lib/db/client');
    const { objetivoMovimientos } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const id = await crear('Ponerme en forma');
    await anotarMovimiento(id, { nota: 'primera semana', horas: '3' });

    const nuevoId = await reciclarObjetivo(id);

    const delViejo = await db.select().from(objetivoMovimientos).where(eq(objetivoMovimientos.objetivoId, id));
    const delNuevo = await db.select().from(objetivoMovimientos).where(eq(objetivoMovimientos.objetivoId, nuevoId!));

    expect(delViejo).toHaveLength(1); // la historia queda donde pasó
    // La vuelta nueva arranca en cero, que es la verdad: el tiempo del año
    // pasado no es tiempo que le pusiste ahora.
    expect(delNuevo).toHaveLength(0);
  });

  it('reciclar algo que no existe no rompe nada', async () => {
    const { reciclarObjetivo } = await import('@/lib/actions/objetivos');
    expect(await reciclarObjetivo(999999)).toBeNull();
  });
});

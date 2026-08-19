import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { crearBasePrueba, borrarBasePrueba, hayBaseReal, verificarNoEsLaReal } from './basePrueba';

// Tests del camino que Matías usa de verdad, contra una base SQLite real.
//
// Los 302 tests que había eran todos de lógica pura, y por eso ninguno agarró
// los bugs del 25/07: la actividad que quedaba como "hecha", el gasto que no se
// podía guardar, el 500 al agregar. Estos cubren el flujo entero: server action
// → base → lo que la pantalla vuelve a leer.

// revalidatePath solo existe dentro de un request de Next; acá no hace falta.
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

let ruta: string;

beforeAll(() => {
  ruta = crearBasePrueba();
  verificarNoEsLaReal();
});

afterAll(() => borrarBasePrueba(ruta));

// Los módulos se importan DESPUÉS de fijar DB_PATH: el cliente lo lee al cargarse.
async function modulos() {
  const acciones = await import('@/lib/actions/actividades');
  const observaciones = await import('@/lib/actions/observaciones');
  const { db } = await import('@/lib/db/client');
  const schema = await import('@/lib/db/schema');
  return { ...acciones, ...observaciones, db, ...schema };
}

describe.runIf(hayBaseReal())('actividades, de punta a punta', () => {
  it('lo que sumás desde Actividades queda EN CURSO, no como algo hecho', async () => {
    const { crearActividad, db, lineas } = await modulos();
    await crearActividad('Ir a bouldern');
    const [a] = await db.select().from(lineas);
    expect(a.titulo).toBe('Ir a bouldern');
    expect(a.estado).toBe('activa');
    expect(a.tipo).toBe('actividad');
  });

  it('crearla con seguimiento la deja lista para pintar (el camino del chip de la Casa)', async () => {
    const { crearActividad, db, lineas, eq } = { ...(await modulos()), eq: (await import('drizzle-orm')).eq };
    await crearActividad('Estudiar alemán', undefined, true);
    const [a] = await db.select().from(lineas).where(eq(lineas.titulo, 'Estudiar alemán'));
    expect(a.diaria).toBe(true);
    expect(a.estado).toBe('activa');
  });

  it('se le puede cambiar el nombre sin perder los días pintados', async () => {
    const { crearActividad, renombrarActividad, pintarDia, db, lineas, marcas } = await modulos();
    const { eq } = await import('drizzle-orm');
    const { ymd } = await import('@/lib/marcas');

    await crearActividad('Aleman de lunes s viernes', undefined, true);
    const [a] = await db.select().from(lineas).where(eq(lineas.titulo, 'Aleman de lunes s viernes'));
    await pintarDia(a.id, ymd(new Date()));

    await renombrarActividad(a.id, 'Alemán de lunes a viernes', 'Para el laburo');

    const [despues] = await db.select().from(lineas).where(eq(lineas.id, a.id));
    expect(despues.titulo).toBe('Alemán de lunes a viernes');
    expect(despues.objetivo).toBe('Para el laburo');
    const dias = await db.select().from(marcas).where(eq(marcas.lineaId, a.id));
    expect(dias).toHaveLength(1); // el día pintado sigue ahí
  });

  it('pintar hoy guarda el día, y volver a tocar lo borra', async () => {
    const { crearActividad, pintarDia, db, lineas, marcas } = await modulos();
    const { eq } = await import('drizzle-orm');
    const { ymd } = await import('@/lib/marcas');
    const hoy = ymd(new Date());

    await crearActividad('Correr', undefined, true);
    const [a] = await db.select().from(lineas).where(eq(lineas.titulo, 'Correr'));

    expect(await pintarDia(a.id, hoy)).toBe(true);
    expect(await db.select().from(marcas).where(eq(marcas.lineaId, a.id))).toHaveLength(1);

    expect(await pintarDia(a.id, hoy)).toBe(false);
    expect(await db.select().from(marcas).where(eq(marcas.lineaId, a.id))).toHaveLength(0);
  });

  it('no deja pintar un día viejo, aunque se llame a la acción directo', async () => {
    const { crearActividad, pintarDia, db, lineas, marcas } = await modulos();
    const { eq } = await import('drizzle-orm');

    await crearActividad('Meditar', undefined, true);
    const [a] = await db.select().from(lineas).where(eq(lineas.titulo, 'Meditar'));

    expect(await pintarDia(a.id, '2026-01-05')).toBe(false);
    expect(await db.select().from(marcas).where(eq(marcas.lineaId, a.id))).toHaveLength(0);
  });

  it('la meta semanal se guarda acotada a la semana', async () => {
    const { crearActividad, ponerMetaSemanal, db, lineas } = await modulos();
    const { eq } = await import('drizzle-orm');

    await crearActividad('Fútbol', undefined, true);
    const [a] = await db.select().from(lineas).where(eq(lineas.titulo, 'Fútbol'));

    await ponerMetaSemanal(a.id, 2);
    expect((await db.select().from(lineas).where(eq(lineas.id, a.id)))[0].metaSemanal).toBe(2);

    await ponerMetaSemanal(a.id, 99);
    expect((await db.select().from(lineas).where(eq(lineas.id, a.id)))[0].metaSemanal).toBe(7);

    await ponerMetaSemanal(a.id, null);
    expect((await db.select().from(lineas).where(eq(lineas.id, a.id)))[0].metaSemanal).toBeNull();
  });
});

describe.runIf(hayBaseReal())('observaciones del Analista', () => {
  it('responder dos veces la misma observación no la duplica', async () => {
    const { seguirObservacion, descartarObservacion, db, sugerencias } = await modulos();
    const { eq, and } = await import('drizzle-orm');
    const PATRON = 'Los días que vas a boulder tu ánimo aparece mejor';

    await seguirObservacion(PATRON, 'evidencia');
    await descartarObservacion(PATRON, 'evidencia');

    const filas = await db
      .select()
      .from(sugerencias)
      .where(and(eq(sugerencias.tipo, 'observacion'), eq(sugerencias.contenido, PATRON)));
    expect(filas).toHaveLength(1);
    expect(filas[0].estado).toBe('descartada');
  });

  it('convertir una observación en actividad no crea duplicados', async () => {
    const { observacionAActividad, db, lineas } = await modulos();
    const { eq } = await import('drizzle-orm');

    expect(await observacionAActividad('Caminar a la mañana')).toBe('Caminar a la mañana');
    await observacionAActividad('Caminar a la mañana');

    const filas = await db.select().from(lineas).where(eq(lineas.titulo, 'Caminar a la mañana'));
    expect(filas).toHaveLength(1);
    expect(filas[0].estado).toBe('activa');
  });

  // El bug que arreglan estos dos: el experimento te pedía observar algo y no
  // había dónde escribirlo. Lo que importa no es solo que se guarde, sino que
  // quede ATADO al experimento y con el tipo correcto: si cae como nota suelta,
  // en la próxima lectura no se sabe de dónde salió.
  it('lo anotado sobre un experimento queda atado a ese experimento', async () => {
    const { observacionAActividad, anotarDeExperimento, db, lineas, bitacora } = await modulos();
    const { eq, and } = await import('drizzle-orm');

    await observacionAActividad('Anotar con quién estuviste', true);
    const [exp] = await db.select().from(lineas).where(eq(lineas.titulo, 'Anotar con quién estuviste'));

    expect(await anotarDeExperimento(exp.id, '  Estuve con Ana, terminé arriba  ')).toBe(true);

    const notas = await db
      .select()
      .from(bitacora)
      .where(and(eq(bitacora.tipo, 'experimento'), eq(bitacora.lineaId, exp.id)));
    expect(notas).toHaveLength(1);
    expect(notas[0].contenido).toBe('Estuve con Ana, terminé arriba');
  });

  it('una nota vacía no ensucia la bitácora', async () => {
    const { observacionAActividad, anotarDeExperimento, db, lineas, bitacora } = await modulos();
    const { eq, and } = await import('drizzle-orm');

    await observacionAActividad('Probar sin café después de las 4', true);
    const [exp] = await db.select().from(lineas).where(eq(lineas.titulo, 'Probar sin café después de las 4'));

    expect(await anotarDeExperimento(exp.id, '   ')).toBe(false);

    const notas = await db
      .select()
      .from(bitacora)
      .where(and(eq(bitacora.tipo, 'experimento'), eq(bitacora.lineaId, exp.id)));
    expect(notas).toHaveLength(0);
  });
});

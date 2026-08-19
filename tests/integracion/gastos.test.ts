import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { crearBasePrueba, borrarBasePrueba, hayBaseReal, verificarNoEsLaReal } from './basePrueba';
import { sacarPromesasFalsas } from '@/lib/promesas';
import { extraerMarcaGasto } from '@/lib/gastos-marca';

// OJO: `detector-actividad` NO se importa arriba. Arrastra roles → db/client, y
// el cliente lee DB_PATH al cargarse: importarlo antes del beforeAll hace que
// todo el test corra contra la base REAL de Matías (pasó: metió tres gastos de
// prueba en sus Finanzas). Los módulos que tocan la base se importan adentro.

// El recorrido completo del gasto contado en palabras, sin el modelo de por medio.
//
// Nació del bug del 25/07: Matías escribió "Gaste 5.70 en la entrada de la
// pileta podes sumarlo?" y el asistente contestó "lo sumo a tus gastos" con
// [+ticket], la marca de FOTOS. Sin foto esa marca no dibujaba botón, así que no
// había forma de guardarlo, y encima el texto decía que ya estaba hecho.
//
// ⚠️ EL 03/08 SE SACÓ EL TICKET ENTERO, así que la mitad de ese bug ya no puede
// existir: no hay dos marcas entre las que el modelo pueda elegir mal. Lo que
// SÍ sigue vivo y se sigue probando acá es la otra mitad —la promesa falsa
// ("lo sumo") y que el gasto llegue de verdad a la base—, más la categoría, que
// desde ese día viaja en la marca porque ya no la escribe ninguna foto.

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

let ruta: string;

beforeAll(() => {
  ruta = crearBasePrueba();
  verificarNoEsLaReal();
});

afterAll(() => borrarBasePrueba(ruta));

describe.runIf(hayBaseReal())('gasto contado en palabras', () => {
  it('la respuesta rota del 25/07 termina en un gasto guardado', async () => {
    // 1. Lo que devolvió el modelo: la promesa falsa, sin ninguna marca.
    const cruda = '¡Dale! Claro, lo sumo a tus gastos.';
    const deteccion = { tipo: 'gasto' as const, titulo: 'entrada de la pileta', monto: 5.7, moneda: '€' };
    const { completarMarca } = await import('@/lib/detector-actividad');

    // 2. Lo que hace el endpoint del chat con esa respuesta.
    const final = sacarPromesasFalsas(completarMarca(cruda, deteccion));
    expect(final).not.toMatch(/lo sumo/i); // la promesa falsa se fue
    expect(final).toContain('[+gasto: entrada de la pileta | 5.7 | €]');

    // 3. Lo que hace la UI al dibujar el botón.
    const marca = extraerMarcaGasto(final);
    expect(marca).not.toBeNull();
    expect(marca!.total).toBe(5.7);
    expect(marca!.descripcion).toBe('entrada de la pileta');

    // 4. Lo que pasa cuando Matías lo toca.
    const { guardarGastoManual } = await import('@/lib/actions/gastos');
    const { db } = await import('@/lib/db/client');
    const { gastos } = await import('@/lib/db/schema');
    const r = await guardarGastoManual({
      total: marca!.total,
      comercio: marca!.descripcion,
      moneda: marca!.moneda,
      categoria: marca!.categoria,
    });
    expect(r.ok).toBe(true);

    const guardados = await db.select().from(gastos);
    expect(guardados).toHaveLength(1);
    expect(guardados[0].total).toBe(5.7);
    expect(guardados[0].comercio).toBe('entrada de la pileta');
  });

  it('un gasto sin monto no se guarda ni por las dudas', async () => {
    const { guardarGastoManual } = await import('@/lib/actions/gastos');
    expect((await guardarGastoManual({ total: 0, comercio: 'nada' })).ok).toBe(false);
    expect((await guardarGastoManual({ total: -5, comercio: 'negativo' })).ok).toBe(false);
  });

  // ⚠️ EL TEST QUE HABÍA ACÁ ("con foto, el camino del ticket se respeta y no se
  // pisa") se fue con el ticket el 03/08. Ya no hay dos caminos que puedan
  // pisarse: con foto o sin foto, el gasto entra por `[+gasto:]`.

  // Lo que ocupa su lugar: la categoría, que desde el 03/08 llega por la marca.
  // Antes la escribía SOLO el parseo de la foto, así que un gasto contado
  // hablando quedaba siempre sin clasificar.
  it('la categoría de la marca llega hasta la base', async () => {
    const { completarMarca } = await import('@/lib/detector-actividad');
    const cruda = 'Un cafecito nunca viene mal.\n\n[+gasto: café con Ana | 3.50 | € | comida]';
    const deteccion = { tipo: 'nada' as const, titulo: '', monto: 0, moneda: '€' };

    const marca = extraerMarcaGasto(completarMarca(cruda, deteccion));
    expect(marca!.categoria).toBe('comida');

    const { guardarGastoManual } = await import('@/lib/actions/gastos');
    const { db } = await import('@/lib/db/client');
    const { gastos } = await import('@/lib/db/schema');
    await guardarGastoManual({
      total: marca!.total,
      comercio: marca!.descripcion,
      moneda: marca!.moneda,
      categoria: marca!.categoria,
    });

    const guardados = await db.select().from(gastos);
    const cafe = guardados.find((g) => g.comercio === 'café con Ana');
    expect(cafe?.categoria).toBe('comida');
    // ⚠️ Y sin foto de por medio: es la prueba de que sacar el ticket no se
    // llevó puesta la categoría, que era el riesgo real de ese borrado.
    expect(cafe?.items).toBeNull();
  });
});

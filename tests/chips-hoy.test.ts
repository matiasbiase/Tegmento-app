import { describe, it, expect } from 'vitest';
import { acomodar, chipsDeHoy, faltanHoy, TOPE_CHIPS_HOY } from '@/lib/chips-hoy';

const act = (id: number, titulo: string, diaria = true, marcadaHoy = false) => ({
  id,
  titulo,
  diaria,
  marcadaHoy,
});

describe('chipsDeHoy · qué entra en la fila', () => {
  it('solo las diarias: una tarea de una sola vez no tiene qué marcar', () => {
    const { visibles } = chipsDeHoy([act(1, 'Bouldern'), act(2, 'Renovar el pasaporte', false)]);
    expect(visibles.map((v) => v.id)).toEqual([1]);
  });

  it('sin actividades diarias, la fila queda vacía y no hay resto', () => {
    expect(chipsDeHoy([act(1, 'Renovar el pasaporte', false)])).toEqual({ visibles: [], resto: 0 });
  });

  it('lleva el estado de hoy a cada chip', () => {
    const { visibles } = chipsDeHoy([act(1, 'Tegmento', true, true), act(2, 'Leer')]);
    expect(visibles.map((v) => v.hecha)).toEqual([true, false]);
  });
});

describe('chipsDeHoy · el tope y el "+N"', () => {
  const seis = [1, 2, 3, 4, 5, 6].map((i) => act(i, `Actividad ${i}`));

  it('corta en el tope y cuenta el resto', () => {
    const { visibles, resto } = chipsDeHoy(seis);
    expect(visibles).toHaveLength(TOPE_CHIPS_HOY);
    expect(resto).toBe(2);
  });

  it('⚠️ con el tope justo no hay resto', () => {
    const { visibles, resto } = chipsDeHoy(seis.slice(0, TOPE_CHIPS_HOY));
    expect(visibles).toHaveLength(TOPE_CHIPS_HOY);
    expect(resto).toBe(0);
  });

  it('⚠️ cuando sobra UNA sola, entra en vez de esconderse detrás de un "+1"', () => {
    // Un "+1" ocupa el mismo lugar que el chip que esconde, y encima obliga a
    // salir de la pantalla para ver una sola cosa.
    const { visibles, resto } = chipsDeHoy(seis.slice(0, TOPE_CHIPS_HOY + 1));
    expect(visibles).toHaveLength(TOPE_CHIPS_HOY + 1);
    expect(resto).toBe(0);
  });

  it('con dos de sobra sí recorta: ahí el "+N" ahorra lugar de verdad', () => {
    const { resto } = chipsDeHoy(seis.slice(0, TOPE_CHIPS_HOY + 2));
    expect(resto).toBe(2);
  });

  it('las que no son diarias no cuentan para el tope ni para el resto', () => {
    const mezcla = [...seis, act(7, 'Mudanza', false), act(8, 'Pasaporte', false)];
    const { visibles, resto } = chipsDeHoy(mezcla);
    expect(visibles).toHaveLength(TOPE_CHIPS_HOY);
    expect(resto).toBe(2);
  });
});

describe('chipsDeHoy · el orden', () => {
  it('⚠️⚠️ NO reordena por hecho/pendiente: el que marcaste se queda donde estaba', () => {
    // Con tope, mandar las hechas al final haría que la que acabás de marcar
    // caiga fuera de la fila: tocás un chip, se pone verde y desaparece.
    const cinco = [
      act(1, 'Uno', true, true),
      act(2, 'Dos'),
      act(3, 'Tres'),
      act(4, 'Cuatro'),
      act(5, 'Cinco'),
      act(6, 'Seis'),
    ];
    expect(chipsDeHoy(cinco).visibles.map((v) => v.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('chipsDeHoy · los rótulos', () => {
  it('recorta el nombre largo para que la fila siga siendo una fila', () => {
    const { visibles } = chipsDeHoy([act(1, 'Buscar trabajo de product designer en Alemania')]);
    expect(visibles[0].titulo.length).toBeLessThanOrEqual(19); // 18 + el "…"
  });

  it('un nombre corto pasa entero', () => {
    expect(chipsDeHoy([act(1, 'Bouldern')]).visibles[0].titulo).toBe('Bouldern');
  });
});

describe('faltanHoy', () => {
  it('cuenta solo las diarias sin marcar', () => {
    expect(
      faltanHoy([act(1, 'A', true, true), act(2, 'B'), act(3, 'C', false), act(4, 'D')]),
    ).toBe(2);
  });

  it('con todas marcadas da cero', () => {
    expect(faltanHoy([act(1, 'A', true, true), act(2, 'B', true, true)])).toBe(0);
  });
});

describe('acomodar · que no sobre espacio a la derecha', () => {
  const c = (titulo: string) => ({ titulo });

  it('no saca ni agrega ninguno', () => {
    const chips = [c('Tegmento'), c('Bouldern'), c('Leer'), c('Llamar familia'), c('Futbol')];
    const salida = acomodar(chips);
    expect(salida).toHaveLength(chips.length);
    expect(new Set(salida.map((x) => x.titulo))).toEqual(new Set(chips.map((x) => x.titulo)));
  });

  it('si entran todos en un renglón, no toca el orden', () => {
    const chips = [c('Leer'), c('Correr')];
    expect(acomodar(chips).map((x) => x.titulo)).toEqual(['Leer', 'Correr']);
  });

  it('⚠️ sube uno corto para tapar el hueco', () => {
    // Con 260px de ancho entra "Llamar familia" (129) y sobran 123: "Buscar
    // trabajo" (129) no entra, pero "Leer" (64) sí. En vez de cortar el renglón
    // ahí, sube "Leer" — que estaba último — al segundo lugar.
    const chips = [c('Llamar familia'), c('Buscar trabajo'), c('Bouldern semanal'), c('Leer')];
    const salida = acomodar(chips, 260).map((x) => x.titulo);
    expect(salida[1]).toBe('Leer');
    // Y lo que importa de verdad: subió, no bajó.
    expect(salida.indexOf('Leer')).toBeLessThan(3);
  });

  it('⚠️ el que no entra en ningún renglón igual sale, no se pierde', () => {
    // Un título tan largo que no entra ni en una fila vacía: abre su propio
    // renglón. Perderlo sería el peor final posible y nadie lo notaría.
    const largo = c('a'.repeat(200));
    const salida = acomodar([c('Leer'), largo, c('Correr')]);
    expect(salida.map((x) => x.titulo)).toContain(largo.titulo);
    expect(salida).toHaveLength(3);
  });

  it('no entra en bucle infinito con la lista vacía', () => {
    expect(acomodar([])).toEqual([]);
  });

  it('⚠️ es estable: marcar no cambia el orden', () => {
    // El ancho depende del TÍTULO, y el título no cambia al marcar. Es la misma
    // garantía que ya protegía `chipsDeHoy`.
    const chips = [c('Tegmento'), c('Bouldern'), c('Leer'), c('Llamar familia')];
    expect(acomodar(chips).map((x) => x.titulo)).toEqual(acomodar(chips).map((x) => x.titulo));
  });
});

import { describe, it, expect } from 'vitest';
import {
  hayQueMostrarPuntitos,
  indiceTrasDescartar,
  indiceVisible,
  quedan,
} from '@/lib/baraja-bot';

const t = (id: string) => ({ id });

describe('quedan · lo que sigue en pie', () => {
  it('saca las descartadas y respeta el orden', () => {
    expect(quedan([t('a'), t('b'), t('c')], ['b']).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('sin descartes, devuelve todo', () => {
    expect(quedan([t('a'), t('b')], [])).toHaveLength(2);
  });

  it('un id que ya no está en la lista no molesta', () => {
    expect(quedan([t('a')], ['viejo']).map((x) => x.id)).toEqual(['a']);
  });
});

describe('indiceVisible · el clamp', () => {
  it('deja pasar un índice que existe', () => {
    expect(indiceVisible(3, 1)).toBe(1);
  });

  it('⚠️ nunca apunta afuera: al acortarse la lista, cae en la última', () => {
    expect(indiceVisible(2, 5)).toBe(1);
  });

  it('con la lista vacía da 0 y no un negativo', () => {
    expect(indiceVisible(0, 3)).toBe(0);
  });

  it('no acepta negativos', () => {
    expect(indiceVisible(3, -2)).toBe(0);
  });
});

describe('indiceTrasDescartar · adónde queda mirando', () => {
  it('sacar una del medio deja el foco donde estaba: ahí ahora está la que seguía', () => {
    // [a,b,c], mirando b (1) → quedan [a,c], y en 1 está c.
    expect(indiceTrasDescartar(3, 1)).toBe(1);
  });

  it('sacar la primera muestra la que era segunda', () => {
    expect(indiceTrasDescartar(3, 0)).toBe(0);
  });

  it('⚠️ sacar la última es el único caso que retrocede: no hay adónde avanzar', () => {
    expect(indiceTrasDescartar(3, 2)).toBe(1);
  });

  it('sacar la única deja 0 y no -1', () => {
    expect(indiceTrasDescartar(1, 0)).toBe(0);
  });
});

describe('hayQueMostrarPuntitos', () => {
  it('⚠️ con una sola no van: un punto solo no dice "la primera de una"', () => {
    expect(hayQueMostrarPuntitos(1)).toBe(false);
    expect(hayQueMostrarPuntitos(0)).toBe(false);
  });

  it('desde dos, sí', () => {
    expect(hayQueMostrarPuntitos(2)).toBe(true);
  });
});

describe('el recorrido completo de un descarte', () => {
  it('descartar la del medio y volver a leer el índice da la que seguía', () => {
    const todas = [t('a'), t('b'), t('c')];
    const antes = quedan(todas, []);
    const mirando = indiceVisible(antes.length, 1);
    expect(antes[mirando].id).toBe('b');

    const destino = indiceTrasDescartar(antes.length, mirando);
    const despues = quedan(todas, ['b']);
    expect(despues[indiceVisible(despues.length, destino)].id).toBe('c');
  });

  it('descartando hasta vaciar la baraja, el índice nunca se sale', () => {
    const todas = [t('a'), t('b')];
    const fuera: string[] = [];
    let pedido = 1;
    for (const id of ['b', 'a']) {
      const vivas = quedan(todas, fuera);
      const i = indiceVisible(vivas.length, pedido);
      pedido = indiceTrasDescartar(vivas.length, i);
      fuera.push(id);
      expect(pedido).toBeGreaterThanOrEqual(0);
    }
    expect(quedan(todas, fuera)).toHaveLength(0);
    expect(indiceVisible(0, pedido)).toBe(0);
  });
});

// ── ⚠️ ACÁ VIVÍAN LOS TESTS DE `franjaCompacta`, Y SE FUERON CON ELLA (18/08) ─
// Los botones de la tarjeta se mudaron al renglón de abajo (`AccionesBot`), así
// que la franja tiene una sola forma y no queda nada que decidir. Se fueron
// también los dos helpers `abierta` y `conBoton`, que no los usaba nadie más.
// El porqué entero está en `lib/baraja-bot`, donde estaba la función.

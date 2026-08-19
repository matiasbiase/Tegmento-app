import { describe, it, expect } from 'vitest';
import { MAX_MARCAS, tinte, trozos, ubicarMarcas } from '@/lib/como-se-lee';

// El mensaje de la maqueta, que es el caso que hay que sostener.
const MSG = 'Che, ya van tres veces que quedamos y cancelás. No sé si querés que sigamos viéndonos.';

describe('ubicarMarcas', () => {
  it('ubica las dos frases de la maqueta y las numera por posición', () => {
    const marcas = ubicarMarcas(MSG, [
      // A propósito en el orden INVERSO al del mensaje: el número tiene que
      // salir de dónde está la frase, no de cómo vino el JSON.
      { frase: 'No sé si querés que sigamos viéndonos.', lectura: 'Planteado como duda sobre el vínculo, pide una defensa.' },
      { frase: 'ya van tres veces', lectura: 'Contar las veces puede leerse como que llevás un registro.' },
    ]);
    expect(marcas.map((m) => [m.numero, m.frase])).toEqual([
      [1, 'ya van tres veces'],
      [2, 'No sé si querés que sigamos viéndonos.'],
    ]);
  });

  it('encuentra la frase aunque el modelo le cambie mayúsculas o tildes', () => {
    // Caso real de este tipo de modelo: "devuelve" la frase corregida.
    const marcas = ubicarMarcas(MSG, [{ frase: 'Ya Van Tres Veces', lectura: 'x' }]);
    expect(marcas).toHaveLength(1);
    // Lo que se subraya sale del mensaje original, no de lo que mandó el modelo.
    expect(marcas[0].frase).toBe('ya van tres veces');
  });

  it('los índices no se corren cuando hay tildes antes de la frase', () => {
    // Este es el bug que motivó `aplanar` sin NFD: con NFD + borrar diacríticos
    // el string se acorta y el subrayado arranca una letra antes por cada tilde.
    const msg = 'Perdón, perdón, perdón: ya van tres veces que cancelás.';
    const marcas = ubicarMarcas(msg, [{ frase: 'YA VAN TRES VECES', lectura: 'x' }]);
    expect(marcas[0].frase).toBe('ya van tres veces');
    expect(msg.slice(marcas[0].desde, marcas[0].hasta)).toBe('ya van tres veces');
  });

  it('tolera que cambie los espacios o un salto de línea', () => {
    const msg = 'Che,\nya van   tres veces que quedamos.';
    const marcas = ubicarMarcas(msg, [{ frase: 'ya van tres veces', lectura: 'x' }]);
    expect(marcas).toHaveLength(1);
    expect(msg.slice(marcas[0].desde, marcas[0].hasta)).toBe('ya van   tres veces');
  });

  it('descarta la frase que el modelo parafraseó y no está en el mensaje', () => {
    const marcas = ubicarMarcas(MSG, [
      { frase: 'llevás la cuenta de las veces', lectura: 'x' },
      { frase: 'ya van tres veces', lectura: 'sí está' },
    ]);
    expect(marcas).toHaveLength(1);
    expect(marcas[0].lectura).toBe('sí está');
  });

  it('descarta la segunda de dos marcas que se solapan', () => {
    const marcas = ubicarMarcas(MSG, [
      { frase: 'ya van tres veces que quedamos', lectura: 'primera' },
      { frase: 'tres veces', lectura: 'encimada' },
    ]);
    expect(marcas).toHaveLength(1);
    expect(marcas[0].lectura).toBe('primera');
  });

  it('descarta las marcas sin frase o sin lectura', () => {
    expect(ubicarMarcas(MSG, [{ frase: '', lectura: 'algo' }])).toHaveLength(0);
    expect(ubicarMarcas(MSG, [{ frase: 'ya van tres veces', lectura: '   ' }])).toHaveLength(0);
  });

  it('sin marcas devuelve lista vacía, que es un resultado válido', () => {
    // Un mensaje que no tiene nada torcido NO tiene que inventar una marca.
    expect(ubicarMarcas('Gracias por avisarme, nos vemos el jueves.', [])).toEqual([]);
  });

  it('corta en el máximo de marcas', () => {
    const msg = 'uno dos tres cuatro cinco seis';
    const crudas = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].map((f) => ({ frase: f, lectura: 'x' }));
    expect(ubicarMarcas(msg, crudas)).toHaveLength(MAX_MARCAS);
  });
});

describe('trozos', () => {
  it('parte el mensaje en subrayado y no subrayado, sin perder ni un carácter', () => {
    const marcas = ubicarMarcas(MSG, [
      { frase: 'ya van tres veces', lectura: 'x' },
      { frase: 'No sé si querés que sigamos viéndonos.', lectura: 'y' },
    ]);
    const t = trozos(MSG, marcas);
    expect(t.map((x) => x.texto).join('')).toBe(MSG);
    expect(t.map((x) => x.marca)).toEqual([null, 1, null, 2]);
  });

  it('sin marcas, el mensaje entero es un solo trozo limpio', () => {
    expect(trozos('hola', [])).toEqual([{ texto: 'hola', marca: null }]);
  });

  it('una marca que arranca en el carácter 0 no deja un trozo vacío adelante', () => {
    const marcas = ubicarMarcas('ya van tres veces que pasa', [{ frase: 'ya van tres veces', lectura: 'x' }]);
    const t = trozos('ya van tres veces que pasa', marcas);
    expect(t[0]).toEqual({ texto: 'ya van tres veces', marca: 1 });
  });
});

describe('tinte', () => {
  it('alterna los dos tintes por posición, sin relación con el contenido', () => {
    expect(tinte(1)).toEqual(tinte(3));
    expect(tinte(2)).toEqual(tinte(4));
    expect(tinte(1)).not.toEqual(tinte(2));
  });

  it('ninguno es verde ni rojo: el color no dice si está bien o mal', () => {
    // Verde = "está bien", rojo = "está mal". Los dos prohibidos acá.
    for (const n of [1, 2]) {
      expect(tinte(n).fondo).not.toContain('verde');
      expect(tinte(n).fondo).not.toContain('alerta');
    }
  });
});

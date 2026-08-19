import { describe, it, expect } from 'vitest';
import { extraerMarcaGasto } from '@/lib/gastos-marca';

describe('extraerMarcaGasto', () => {
  it('lee descripción, monto y moneda', () => {
    expect(extraerMarcaGasto('Listo. [+gasto: súper | 40 | €]')).toEqual({
      descripcion: 'súper',
      total: 40,
      moneda: '€',
      categoria: null,
    });
  });

  it('acepta decimales con coma o punto', () => {
    expect(extraerMarcaGasto('[+gasto: almuerzo | 12,50 | €]')?.total).toBe(12.5);
    expect(extraerMarcaGasto('[+gasto: almuerzo | 12.50]')?.total).toBe(12.5);
  });

  it('maneja separador de miles', () => {
    expect(extraerMarcaGasto('[+gasto: notebook | 1.299,99 | €]')?.total).toBe(1299.99);
    expect(extraerMarcaGasto('[+gasto: notebook | 1,299.99]')?.total).toBe(1299.99);
  });

  it('funciona sin moneda', () => {
    expect(extraerMarcaGasto('[+gasto: café | 3]')).toEqual({
      descripcion: 'café',
      total: 3,
      moneda: null,
      categoria: null,
    });
  });

  it('funciona con solo el monto', () => {
    expect(extraerMarcaGasto('[+gasto: 25]')).toEqual({
      descripcion: null,
      total: 25,
      moneda: null,
      categoria: null,
    });
  });

  it('ignora símbolos pegados al número', () => {
    expect(extraerMarcaGasto('[+gasto: farmacia | €18]')?.total).toBe(18);
  });

  it('devuelve null sin marca', () => {
    expect(extraerMarcaGasto('gasté algo hoy')).toBeNull();
  });

  it('devuelve null si no hay monto legible', () => {
    expect(extraerMarcaGasto('[+gasto: algo caro]')).toBeNull();
  });
});

// La cuarta parte, que entró el 03/08 al sacar el ticket. Hasta ese día la
// categoría la escribía SOLO la foto, así que los gastos contados hablando
// entraban sin clasificar.
describe('extraerMarcaGasto · la categoría', () => {
  it('lee las cuatro partes', () => {
    expect(extraerMarcaGasto('[+gasto: café con Ana | 3.50 | € | comida]')).toEqual({
      descripcion: 'café con Ana',
      total: 3.5,
      moneda: '€',
      categoria: 'comida',
    });
  });

  it('⚠️ sin moneda, la tercera parte es la CATEGORÍA y no la moneda', () => {
    // Es el caso que obliga a desambiguar por contenido y no por posición. Si se
    // tomara por posición, esto guardaría "comida" como moneda y el gasto
    // aparecería como "comida 3,50".
    expect(extraerMarcaGasto('[+gasto: café | 3.50 | comida]')).toEqual({
      descripcion: 'café',
      total: 3.5,
      moneda: null,
      categoria: 'comida',
    });
  });

  it('tolera mayúsculas y acentos', () => {
    // El modelo escribe "Súper" tan seguido como "super".
    expect(extraerMarcaGasto('[+gasto: Rewe | 23.60 | € | Súper]')?.categoria).toBe('super');
  });

  it('una categoría que no existe se descarta, no se inventa', () => {
    // Mejor sin chip que con uno que FinanzasUI no sabe pintar. Y ⚠️ tampoco cae
    // a "otros": "otros" es una categoría real que el modelo puede elegir a
    // propósito, distinta de "no supe clasificar esto".
    expect(extraerMarcaGasto('[+gasto: algo | 10 | € | criptomonedas]')?.categoria).toBeNull();
  });

  it('⚠️ una categoría inválida no se come el lugar de la moneda', () => {
    expect(extraerMarcaGasto('[+gasto: algo | 10 | € | criptomonedas]')?.moneda).toBe('€');
  });

  it('las ocho categorías se reconocen', () => {
    for (const c of ['super', 'comida', 'farmacia', 'transporte', 'ropa', 'ocio', 'servicios', 'otros']) {
      expect(extraerMarcaGasto(`[+gasto: x | 1 | € | ${c}]`)?.categoria).toBe(c);
    }
  });

  it('el orden invertido también entra', () => {
    // Si el modelo pone la categoría antes que la moneda, se resuelve igual:
    // ninguna de las dos se busca por posición.
    expect(extraerMarcaGasto('[+gasto: cine | 4.20 | ocio | €]')).toEqual({
      descripcion: 'cine',
      total: 4.2,
      moneda: '€',
      categoria: 'ocio',
    });
  });
});

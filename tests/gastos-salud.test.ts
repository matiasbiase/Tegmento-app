import { describe, it, expect } from 'vitest';
import { resumenSaludGastos, textoSaludGastos } from '@/lib/gastos-salud';

function gasto(moneda: string | null, items: Array<{ nombre: string; precio: number | null; salud?: 'sano' | 'chatarra' | null }>) {
  return { moneda, items: JSON.stringify(items) };
}

describe('resumenSaludGastos', () => {
  it('calcula el % de chatarra sobre lo etiquetado, no sobre el total', () => {
    const r = resumenSaludGastos([
      gasto('EUR', [
        { nombre: 'Manzanas', precio: 3, salud: 'sano' },
        { nombre: 'Detergente', precio: 5, salud: null }, // no es comida: afuera
        { nombre: 'Papas fritas', precio: 2, salud: 'chatarra' },
      ]),
      gasto('EUR', [{ nombre: 'Coca-Cola', precio: 1.5, salud: 'chatarra' }]),
    ]);
    expect(r).not.toBeNull();
    expect(r!.itemsContados).toBe(3);
    expect(r!.sanoTotal).toBe(3);
    expect(r!.chatarraTotal).toBe(3.5);
    // 3.5 / 6.5 ≈ 54%
    expect(r!.pctChatarra).toBe(54);
  });

  it('con menos de 3 ítems etiquetados, no dice nada (evita un % que parece preciso y no lo es)', () => {
    const r = resumenSaludGastos([gasto('EUR', [{ nombre: 'Manzanas', precio: 3, salud: 'sano' }])]);
    expect(r).toBeNull();
  });

  it('no mezcla monedas: solo cuenta la moneda dominante', () => {
    const r = resumenSaludGastos([
      gasto('EUR', [
        { nombre: 'a', precio: 1, salud: 'sano' },
        { nombre: 'b', precio: 1, salud: 'sano' },
        { nombre: 'c', precio: 1, salud: 'chatarra' },
      ]),
      // un solo ticket suelto en otra moneda: no debería mover el número de arriba
      gasto('ARS', [{ nombre: 'd', precio: 999, salud: 'chatarra' }]),
    ]);
    expect(r).not.toBeNull();
    expect(r!.moneda).toBe('EUR');
    expect(r!.chatarraTotal).toBe(1);
    expect(r!.pctChatarra).toBe(33);
  });

  it('ignora ítems sin precio', () => {
    const r = resumenSaludGastos([
      gasto('EUR', [
        { nombre: 'a', precio: null, salud: 'chatarra' },
        { nombre: 'b', precio: 2, salud: 'sano' },
        { nombre: 'c', precio: 2, salud: 'sano' },
        { nombre: 'd', precio: 2, salud: 'chatarra' },
      ]),
    ]);
    expect(r!.itemsContados).toBe(3);
  });
});

describe('textoSaludGastos', () => {
  it('null da null (no hay renglón que sumar al Analista)', () => {
    expect(textoSaludGastos(null)).toBeNull();
  });

  it('arma una frase con el número ya calculado', () => {
    const texto = textoSaludGastos({ sanoTotal: 3, chatarraTotal: 3.5, pctChatarra: 54, itemsContados: 3, moneda: 'EUR' });
    expect(texto).toContain('54%');
    expect(texto).toContain('EUR');
  });
});

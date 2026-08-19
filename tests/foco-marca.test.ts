import { describe, it, expect } from 'vitest';
import { extraerMarcaFoco, limpiarMarcaFoco, FOCO_MIN_DEFECTO } from '@/lib/foco-marca';

describe('extraerMarcaFoco', () => {
  it('sin minutos, arranca con el default', () => {
    const texto = 'Dale, poné el reloj y no mires el teléfono.\n[+foco: terminar la presentación]';
    expect(extraerMarcaFoco(texto)).toEqual({
      que: 'terminar la presentación',
      minutos: FOCO_MIN_DEFECTO,
    });
  });

  it('con minutos, respeta los que pidió', () => {
    expect(extraerMarcaFoco('[+foco: escribir el mail | 15]')).toEqual({
      que: 'escribir el mail',
      minutos: 15,
    });
  });

  it('⚠️ un número EN la descripción no son los minutos', () => {
    // Es la razón de que los minutos vayan después de un `|` y no se busque
    // "el primer número que aparezca", como sí hace gastos-marca. Sin esta
    // regla, esto abriría una sesión de tres minutos.
    expect(extraerMarcaFoco('[+foco: terminar el capítulo 3]')).toEqual({
      que: 'terminar el capítulo 3',
      minutos: FOCO_MIN_DEFECTO,
    });
  });

  it('tolera que el modelo escriba la unidad', () => {
    expect(extraerMarcaFoco('[+foco: leer | 45 min]')?.minutos).toBe(45);
  });

  it('sin marca no hay nada que arrancar', () => {
    expect(extraerMarcaFoco('¿Y cómo venís con el alemán?')).toBeNull();
  });

  it('una marca vacía no cuenta', () => {
    // Sin un "en qué", el overlay quedaría con el título en blanco.
    expect(extraerMarcaFoco('[+foco:   ]')).toBeNull();
  });

  it('una marca con solo el separador tampoco', () => {
    expect(extraerMarcaFoco('[+foco:  | 25]')).toBeNull();
  });

  it('⚠️ un disparate de minutos cae al rango, no abre un reloj absurdo', () => {
    // Si el modelo manda segundos (1500) en vez de minutos, 1.500 minutos son
    // 25 horas. Se recorta al techo en vez de abrir eso.
    expect(extraerMarcaFoco('[+foco: estudiar | 1500]')?.minutos).toBe(180);
    expect(extraerMarcaFoco('[+foco: estudiar | 0]')?.minutos).toBe(FOCO_MIN_DEFECTO);
    expect(extraerMarcaFoco('[+foco: estudiar | -10]')?.minutos).toBe(10);
  });

  it('redondea los minutos rotos', () => {
    expect(extraerMarcaFoco('[+foco: leer | 12.6]')?.minutos).toBe(13);
  });

  it('recorta un título kilométrico', () => {
    const largo = 'a'.repeat(200);
    expect(extraerMarcaFoco(`[+foco: ${largo}]`)?.que).toHaveLength(80);
  });
});

describe('limpiarMarcaFoco', () => {
  it('el mensaje se lee sin la marca', () => {
    // Se muestra en pantalla Y se lee en voz alta: la marca no se escucha.
    expect(limpiarMarcaFoco('Arrancá con esto.\n[+foco: escribir | 25]')).toBe('Arrancá con esto.');
  });

  it('sin marca lo deja igual', () => {
    expect(limpiarMarcaFoco('Todo bien por acá.')).toBe('Todo bien por acá.');
  });
});

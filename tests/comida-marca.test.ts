import { describe, it, expect } from 'vitest';
import { extraerMarcaComida, limpiarMarcaComida, normalizarComida } from '@/lib/comida-marca';

describe('extraerMarcaComida', () => {
  it('el caso que falló el 01/08', () => {
    const texto = 'Suena a un planazo. ¿Cómo te sentís después?\n[+comida: hamburguesa con papas y huevo, fernet]';
    expect(extraerMarcaComida(texto)).toBe('hamburguesa con papas y huevo, fernet');
  });

  it('sin marca no hay nada que guardar', () => {
    expect(extraerMarcaComida('¿Y cómo venís con el alemán?')).toBeNull();
  });

  it('una marca vacía no cuenta', () => {
    // Si el modelo emite `[+comida: ]`, el botón diría "guardar" sobre la nada.
    expect(extraerMarcaComida('[+comida:   ]')).toBeNull();
  });
});

describe('limpiarMarcaComida', () => {
  it('el mensaje se lee sin la marca', () => {
    // Se muestra en pantalla Y se lee en voz alta: la marca no se escucha.
    expect(limpiarMarcaComida('Anotado.\n[+comida: milanesa]')).toBe('Anotado.');
  });

  it('un mensaje sin marca no cambia', () => {
    expect(limpiarMarcaComida('Anotado.')).toBe('Anotado.');
  });
});

describe('normalizarComida', () => {
  it('junta los espacios de más', () => {
    expect(normalizarComida('  milanesa   con  puré ')).toBe('milanesa con puré');
  });

  it('corta a 120: es una comida, no un menú', () => {
    expect(normalizarComida('a'.repeat(300))).toHaveLength(120);
  });
});

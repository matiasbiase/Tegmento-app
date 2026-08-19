import { describe, it, expect } from 'vitest';
import { ETIQUETA_IDEA, leerMarcaIdea, sinMarcaIdea } from '@/lib/idea-marca';

describe('leerMarcaIdea', () => {
  it('lee la marca al final del mensaje', () => {
    const m = 'Buenísimo, anotala así no se te pierde.\n\n[+idea: Aprender a hacer pan]';
    expect(leerMarcaIdea(m)).toEqual({ texto: 'Aprender a hacer pan' });
  });

  it('aguanta mayúsculas en la marca, que el modelo a veces pone', () => {
    expect(leerMarcaIdea('[+IDEA: Ir a Japón]')?.texto).toBe('Ir a Japón');
  });

  it('junta los espacios de más', () => {
    expect(leerMarcaIdea('[+idea:   Poner   un   bar  ]')?.texto).toBe('Poner un bar');
  });

  it('sin marca, null', () => {
    expect(leerMarcaIdea('Contame más de eso')).toBeNull();
    expect(leerMarcaIdea('')).toBeNull();
  });

  it('una marca vacía no crea una nota sin título', () => {
    expect(leerMarcaIdea('[+idea:   ]')).toBeNull();
  });

  it('⚠️ se recorta: el título de una nota es su primer renglón', () => {
    // Una marca larguísima haría una nota con un título de tres líneas, que en
    // la lista se ve como un error.
    const largo = 'a'.repeat(300);
    expect(leerMarcaIdea(`[+idea: ${largo}]`)?.texto).toHaveLength(120);
  });

  it('no se come el resto del mensaje: la marca corta en el corchete', () => {
    const m = '[+idea: Aprender alemán] y después seguimos hablando';
    expect(leerMarcaIdea(m)?.texto).toBe('Aprender alemán');
  });
});

describe('sinMarcaIdea', () => {
  it('saca la marca de lo que se muestra en la burbuja', () => {
    const m = 'Buena idea.\n\n[+idea: Aprender a hacer pan]';
    expect(sinMarcaIdea(m)).toBe('Buena idea.');
  });

  it('no deja tres saltos de línea seguidos donde estaba', () => {
    const m = 'Uno.\n\n[+idea: X]\n\nDos.';
    expect(sinMarcaIdea(m)).toBe('Uno.\n\nDos.');
  });

  it('un mensaje sin marca vuelve igual', () => {
    expect(sinMarcaIdea('Contame más')).toBe('Contame más');
  });
});

describe('⚠️ la etiqueta es una sola y está fija', () => {
  // Si cada idea llegara con la etiqueta que se le ocurra al modelo, el filtro
  // de Notas se llenaría de "idea", "ideas", "Idea futura" y ninguna agruparía
  // nada — el bug de los 52 temas del 28/07, en su versión de etiquetas.
  it('es una constante, no algo que venga del modelo', () => {
    expect(ETIQUETA_IDEA).toBe('Idea');
  });
});

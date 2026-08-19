import { describe, it, expect } from 'vitest';
import { sacarPromesasFalsas } from '@/lib/promesas';

describe('sacarPromesasFalsas', () => {
  it('saca el "ya lo anoté" cuando el gasto está sin confirmar', () => {
    const r = sacarPromesasFalsas('Buenísimo. Ya lo anoté en Finanzas.\n\n[+gasto: súper | 40 | €]');
    expect(r).not.toMatch(/anoté/i);
    expect(r).toContain('[+gasto: súper | 40 | €]');
    expect(r).toContain('Buenísimo.');
  });

  it('saca el "lo sumé a tus actividades" cuando la actividad está sin confirmar', () => {
    const r = sacarPromesasFalsas('Qué bueno el fútbol. Lo sumé a tus actividades.\n\n[+actividad: jugar al fútbol]');
    expect(r).not.toMatch(/sumé/i);
    expect(r).toContain('[+actividad: jugar al fútbol]');
  });

  it('agarra las otras formas de decirlo', () => {
    expect(sacarPromesasFalsas('Listo, ya quedó guardado en Finanzas.\n\n[+gasto: nafta | 60 | €]')).not.toMatch(/guardado/i);
    expect(sacarPromesasFalsas('Ya está anotado en tus actividades.\n\n[+hecho: mandé el mail]')).not.toMatch(/anotado/i);
  });

  it('NO toca el condicional ni el futuro: ahí no miente', () => {
    const texto = 'Si querés lo anoto en Finanzas, decime.\n\n[+gasto: almuerzo | 12 | €]';
    expect(sacarPromesasFalsas(texto)).toBe(texto);
    const texto2 = 'Puedo anotarlo si te sirve.\n\n[+gasto: café | 3 | €]';
    expect(sacarPromesasFalsas(texto2)).toBe(texto2);
  });

  it('no toca la respuesta si no hay ninguna marca pendiente', () => {
    // Sin marca no hay nada que confirmar: acá "anoté" puede referirse a algo
    // que la app sí hizo por otro camino, y no nos corresponde editarlo.
    const texto = 'Ya lo anoté, quedó todo listo.';
    expect(sacarPromesasFalsas(texto)).toBe(texto);
  });

  it('si toda la línea era la promesa, la saca sin dejar el texto roto', () => {
    const r = sacarPromesasFalsas('Ya lo guardé.\n\n[+gasto: súper | 40 | €]');
    expect(r).toBe('[+gasto: súper | 40 | €]');
  });

  it('deja el resto de la oración cuando la promesa es solo una parte', () => {
    const r = sacarPromesasFalsas('Se nota que te hizo bien. Lo registré igual. ¿Cómo venís del cuerpo?\n\n[+actividad: ir al gimnasio]');
    expect(r).not.toMatch(/registré/i);
    expect(r).toContain('Se nota que te hizo bien.');
    expect(r).toContain('¿Cómo venís del cuerpo?');
  });
});

describe('presente que suena a hecho', () => {
  it('saca el "lo sumo a tus gastos" del caso real del 25/07', () => {
    // Respuesta textual del asistente cuando Matías pidió sumar la pileta.
    const r = sacarPromesasFalsas('¡Dale! Claro, lo sumo a tus gastos.\n\n[+gasto: pileta | 5.7 | €]');
    expect(r).not.toMatch(/lo sumo/i);
    expect(r).toContain('[+gasto: pileta | 5.7 | €]');
  });

  it('pero deja el condicional, que es honesto', () => {
    const texto = 'Si querés lo anoto ahora.\n\n[+gasto: café | 3 | €]';
    expect(sacarPromesasFalsas(texto)).toBe(texto);
    const texto2 = 'Lo cargo si te sirve.\n\n[+gasto: nafta | 50 | €]';
    expect(sacarPromesasFalsas(texto2)).toBe(texto2);
  });
});

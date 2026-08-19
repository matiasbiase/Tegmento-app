import { describe, expect, it } from 'vitest';
import { hayOtraPersona, sacarComoloveSinOtro } from '@/lib/comolove';

describe('hayOtraPersona', () => {
  // Los dos casos reales del 29/07 que dispararon el botón sin motivo.
  it('no la encuentra donde no la hay', () => {
    expect(hayOtraPersona('No muy bien tengo dos caminos')).toBe(false);
    expect(hayOtraPersona('dormí una siesta')).toBe(false);
    expect(hayOtraPersona('hoy no pude arrancar con el alemán')).toBe(false);
  });

  it('la encuentra por la palabra', () => {
    expect(hayOtraPersona('me peleé con un amigo')).toBe(true);
    expect(hayOtraPersona('hablé con mi vieja')).toBe(true);
    expect(hayOtraPersona('mi jefe me tiene podrido')).toBe(true);
  });

  it('la encuentra por el ida y vuelta', () => {
    expect(hayOtraPersona('me dijo que no venía')).toBe(true);
    expect(hayOtraPersona('quedamos en vernos y no apareció')).toBe(true);
  });

  // Sin esto se perdería el caso más común: nombrar a alguien.
  it('la encuentra por el nombre propio', () => {
    expect(hayOtraPersona('quedé mal con Ana')).toBe(true);
    expect(hayOtraPersona('ayer vi a Martín')).toBe(true);
  });

  it('la mayúscula del principio no es una persona', () => {
    expect(hayOtraPersona('Hoy me fue bien')).toBe(false);
    expect(hayOtraPersona('Dormí una siesta')).toBe(false);
  });
});

describe('sacarComoloveSinOtro', () => {
  const conMarca = 'Te escucho. ¿Qué es lo que te tiene así?\n\n[+comolove: lo que te pasa]';

  it('saca el botón cuando no hay otra persona', () => {
    const r = sacarComoloveSinOtro(conMarca, 'No muy bien tengo dos caminos');
    expect(r).not.toMatch(/\+comolove/);
    // Y deja intacto el texto, que estaba bien.
    expect(r).toContain('¿Qué es lo que te tiene así?');
  });

  it('lo deja cuando sí hay alguien', () => {
    expect(sacarComoloveSinOtro(conMarca, 'me peleé con mi amigo')).toMatch(/\+comolove/);
  });

  it('no toca una respuesta que no trae la marca', () => {
    const sin = 'Te escucho, contame.';
    expect(sacarComoloveSinOtro(sin, 'cualquier cosa')).toBe(sin);
  });

  it('no deja renglones vacíos donde estaba la marca', () => {
    const r = sacarComoloveSinOtro(conMarca, 'dormí una siesta');
    expect(r).not.toMatch(/\n\n\n/);
    expect(r.endsWith('así?')).toBe(true);
  });
});

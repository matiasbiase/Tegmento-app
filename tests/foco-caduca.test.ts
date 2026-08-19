import { describe, it, expect } from 'vitest';
import { focosCumplidos, huboLogro, textoFocoCumplido } from '@/lib/foco-caduca';

const area = (id: number, nombre: string, foco = true) => ({ id, nombre, foco });
const obj = (areaId: number | null, estado: string, llego?: boolean) => ({ areaId, estado, llego });

describe('focosCumplidos', () => {
  it('caduca cuando no le queda ningún objetivo pendiente', () => {
    const r = focosCumplidos([area(1, 'Salud física')], [obj(1, 'logrado'), obj(1, 'abandonado')]);
    expect(r.map((a) => a.nombre)).toEqual(['Salud física']);
  });

  it('no caduca si le queda uno abierto', () => {
    const r = focosCumplidos([area(1, 'Salud física')], [obj(1, 'logrado'), obj(1, 'activo')]);
    expect(r).toEqual([]);
  });

  // ⚠️ Sin objetivos el foco no está cumplido: está SIN EMPEZAR. Preguntar
  // "¿ya lo tenés resuelto?" sobre una pantalla vacía es leerla como un logro.
  it('un foco sin ningún objetivo no caduca', () => {
    expect(focosCumplidos([area(1, 'Salud física')], [])).toEqual([]);
    expect(focosCumplidos([area(1, 'Salud física')], [obj(2, 'logrado')])).toEqual([]);
  });

  // ⚠️ Pausar es "sigue vivo, lo frené". Si contara como terminado, pausar sería
  // la forma silenciosa de que el área te pregunte si querés soltarla.
  it('un pausado cuenta como pendiente', () => {
    expect(focosCumplidos([area(1, 'Salud física')], [obj(1, 'pausado')])).toEqual([]);
  });

  // ⚠️ La app mide sola si un objetivo de rueda o de hábito llegó, pero no lo
  // cierra. Si acá solo contaran los cerrados, el foco no caducaría nunca por
  // culpa de algo que la app ya da por cumplido.
  it('uno que llegó cuenta como terminado aunque siga activo', () => {
    const r = focosCumplidos([area(1, 'Salud física')], [obj(1, 'activo', true)]);
    expect(r.map((a) => a.nombre)).toEqual(['Salud física']);
  });

  it('uno que todavía no llegó sigue pendiente', () => {
    expect(focosCumplidos([area(1, 'Salud física')], [obj(1, 'activo', false)])).toEqual([]);
  });

  it('las áreas que no están en foco nunca aparecen', () => {
    expect(focosCumplidos([area(1, 'Salud física', false)], [obj(1, 'logrado')])).toEqual([]);
  });

  it('devuelve varias si varias caducaron', () => {
    const r = focosCumplidos(
      [area(1, 'Salud física'), area(2, 'Finanzas'), area(3, 'Contexto')],
      [obj(1, 'logrado'), obj(2, 'logrado'), obj(3, 'activo')],
    );
    expect(r.map((a) => a.nombre)).toEqual(['Salud física', 'Finanzas']);
  });
});

describe('huboLogro', () => {
  // ⚠️⚠️ Este par de tests existe por un error que se vio con datos reales:
  // Matías cerró un objetivo con "esto ya no va" y **la app lo felicitó por
  // haberlo soltado**. El área caduca igual —no le queda trabajo— pero decirlo
  // como logro es una mentira amable.
  it('un abandonado no es un logro', () => {
    expect(huboLogro([1], [obj(1, 'abandonado')])).toBe(false);
  });

  it('uno logrado alcanza, aunque haya abandonados al lado', () => {
    expect(huboLogro([1], [obj(1, 'abandonado'), obj(1, 'logrado')])).toBe(true);
  });

  it('uno que llegó sin cerrarse también cuenta', () => {
    expect(huboLogro([1], [obj(1, 'activo', true)])).toBe(true);
  });

  it('no mira objetivos de otras áreas', () => {
    expect(huboLogro([1], [obj(2, 'logrado')])).toBe(false);
  });
});

describe('textoFocoCumplido', () => {
  it('una sola área, con logro', () => {
    expect(textoFocoCumplido(['Salud física'])).toBe(
      'Cumpliste lo que te propusiste en Salud física, y sigue siendo uno de tus focos.',
    );
  });

  it('sin logro no felicita', () => {
    expect(textoFocoCumplido(['Contexto'], false)).toBe(
      'Ya no te queda nada abierto en Contexto, y sigue siendo uno de tus focos.',
    );
  });

  it('dos áreas', () => {
    expect(textoFocoCumplido(['Salud física', 'Finanzas'])).toBe(
      'Cumpliste lo que te propusiste en Salud física y Finanzas, y siguen siendo focos tuyos.',
    );
  });

  it('tres áreas, con la coma en el lugar', () => {
    expect(textoFocoCumplido(['A', 'B', 'C'])).toBe(
      'Cumpliste lo que te propusiste en A, B y C, y siguen siendo focos tuyos.',
    );
  });

  it('sin áreas no dice nada', () => {
    expect(textoFocoCumplido([])).toBe('');
    expect(textoFocoCumplido([], false)).toBe('');
  });
});

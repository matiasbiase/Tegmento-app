import { describe, it, expect } from 'vitest';
import { fuerzaDe, ladosDe, relacionesLivianas } from '@/lib/relaciones-livianas';

describe('ladosDe', () => {
  it('saca los dos lados de la observación de la maqueta', () => {
    const lados = ladosDe('Los días de más de 6h de pantalla, al otro día marcás el ánimo más abajo.');
    expect(lados?.map((l) => l.clave)).toEqual(['pantalla', 'animo']);
  });

  it('respeta el orden en que aparecen en la frase, no un orden inventado', () => {
    // Si se invirtiera, la flecha afirmaría una causa que nadie midió.
    const a = ladosDe('Los días que dormís siesta, la energía a la noche te queda más alta.');
    expect(a?.map((l) => l.clave)).toEqual(['siesta', 'energia']);
    const b = ladosDe('Tu energía sube los días que dormís siesta.');
    expect(b?.map((l) => l.clave)).toEqual(['energia', 'siesta']);
  });

  it('funciona sin tildes, que es como se escribe rápido', () => {
    expect(ladosDe('los dias de mas pantalla el animo baja')?.map((l) => l.clave)).toEqual(['pantalla', 'animo']);
  });

  it('la siesta le gana al sueño cuando están las dos en la frase', () => {
    // "dormís" es palabra de Sueño y está ANTES que "siesta": por posición
    // ganaba Sueño y la relación salía mal. La siesta es un caso de dormir.
    expect(ladosDe('Los días que dormís siesta, la energía te queda más alta.')?.map((l) => l.clave)).toEqual([
      'siesta',
      'energia',
    ]);
  });

  it('con tres dominios toma el primero y el último, no los dos primeros', () => {
    // La tercera tarjeta de la maqueta. Tiene gasto ("gastás"), comida
    // ("snacks") y sueño ("dormís"): los dos primeros serían Gastos → Comida,
    // que son dos formas de nombrar el MISMO lado, no una relación.
    const lados = ladosDe('Las semanas que gastás más en snacks, dormís menos horas.');
    expect(lados?.map((l) => l.clave)).toEqual(['gasto', 'sueno']);
  });

  it('"horas de sueño" no cuenta como dos dominios', () => {
    // Sueño matchea en la misma posición dos veces: es una sola punta, no dos.
    expect(ladosDe('Dormís pocas horas de sueño esta semana.')).toBeNull();
  });

  it('devuelve null cuando hay un solo dominio', () => {
    expect(ladosDe('Tu ánimo viene más bajo que la semana pasada.')).toBeNull();
  });

  it('devuelve null cuando no hay ninguno', () => {
    expect(ladosDe('Estás atravesando un momento de cambios importantes.')).toBeNull();
  });

  it('no se cuelga con vacío', () => {
    expect(ladosDe('')).toBeNull();
  });
});

describe('fuerzaDe', () => {
  const cinco = '2026-07-01, 2026-07-02, 2026-07-03, 2026-07-04, 2026-07-05';

  // ⚠️ EL TEXTO CAMBIÓ EL 06/08: la barra pasó a decir CUÁNTO SE PUEDE CONFIAR
  // en el hallazgo, no cuánto pasa. La relevancia la contesta él abajo, aparte.
  it('confianza alta: bastante confiable, y sí pide confirmación', () => {
    const f = fuerzaDe(cinco, 'alta');
    expect(f.texto).toBe('5 días · bastante confiable');
    expect(f.pideConfirmacion).toBe(true);
  });

  it('confianza media: puede ser casualidad, y todavía pide confirmación', () => {
    const f = fuerzaDe('2026-07-01, 2026-07-02, 2026-07-03', 'media');
    expect(f.texto).toBe('3 días · poco confiable todavía');
    expect(f.pideConfirmacion).toBe(true);
  });

  it('LO FLOJO NO PIDE CONFIRMACIÓN', () => {
    // La regla del 30/07: preguntar "¿te pasa?" sobre una corazonada con dos
    // datos es pedirle que la valide, y si dice que sí se vuelve verdad sin
    // haberlo ganado.
    const f = fuerzaDe('2026-07-01, 2026-07-02', 'baja');
    expect(f.texto).toBe('2 días · todavía se está cocinando');
    expect(f.pideConfirmacion).toBe(false);
  });

  it('un solo día va en singular', () => {
    expect(fuerzaDe('2026-07-01', 'baja').texto).toBe('1 día · todavía se está cocinando');
  });

  it('sin fechas citadas, no invita un número', () => {
    expect(fuerzaDe('pasó varias veces', 'media').texto).toBe('poco confiable todavía');
  });

  it('la barra tiene tres posiciones, no un porcentaje calculado', () => {
    // Es la decisión de fondo: un número exacto suena a medición cuando esto es
    // una corazonada con pocos datos.
    const anchos = new Set([fuerzaDe(cinco, 'alta').ancho, fuerzaDe(cinco, 'media').ancho, fuerzaDe(cinco, 'baja').ancho]);
    expect(anchos.size).toBe(3);
    // El mismo tier con más o menos fechas da el MISMO ancho.
    expect(fuerzaDe('2026-07-01', 'alta').ancho).toBe(fuerzaDe(cinco, 'alta').ancho);
  });
});

describe('relacionesLivianas', () => {
  it('deja afuera las observaciones que no se pueden reducir a dos lados', () => {
    const r = relacionesLivianas([
      { patron: 'Los días de más pantalla, el ánimo baja.', evidencia: '2026-07-01, 2026-07-02', confianza: 'media' },
      { patron: 'Estás en un momento de cambios.', evidencia: '2026-07-01', confianza: 'alta' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].lados.map((l) => l.clave)).toEqual(['pantalla', 'animo']);
  });

  it('usa el limpiador que le pasan para la frase que se muestra', () => {
    const r = relacionesLivianas(
      [{ patron: 'pantalla y ánimo (2026-07-01)', evidencia: '2026-07-01', confianza: 'baja' }],
      (p) => p.replace(/\s*\(.*\)/, ''),
    );
    expect(r[0].frase).toBe('pantalla y ánimo');
    // El patrón crudo NO se toca: es la identidad con la que se guarda el veredicto.
    expect(r[0].patron).toBe('pantalla y ánimo (2026-07-01)');
  });

  it('sin observaciones, lista vacía', () => {
    expect(relacionesLivianas([])).toEqual([]);
  });
});

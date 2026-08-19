import { describe, it, expect } from 'vitest';
import { avance, cuandoLlegas, juntado, mesDe, ritmoMensual, ritmoNecesario, siApartaras } from '@/lib/objetivo-plata';

const HOY = new Date(2026, 7, 2); // 2 de agosto de 2026
const ap = (monto: number, creado = '2026-08-01T10:00:00.000Z') => ({ monto, creado });

describe('juntado y avance', () => {
  it('suma los aportes', () => {
    expect(juntado([ap(100), ap(240), ap(400)])).toBe(740);
  });

  it('el avance es una fracción', () => {
    expect(avance([ap(740)], 2000)).toBeCloseTo(0.37, 2);
  });

  it('no se pasa de 1: una barra al 140% no dice nada', () => {
    expect(avance([ap(3000)], 2000)).toBe(1);
  });

  it('sin meta no hay avance que calcular', () => {
    expect(avance([ap(100)], 0)).toBe(0);
  });
});

describe('ritmoMensual', () => {
  it('divide por los meses que PASARON, no por los que tuvieron aporte', () => {
    // ⚠️ Aportó dos veces en cinco meses. El ritmo real es 600/5, no 600/2.
    // Dividir por los meses con aporte daría una proyección que no se cumple.
    const aportes = [ap(300), ap(300)];
    expect(ritmoMensual(aportes, '2026-03-02', HOY)).toBeCloseTo(120, 0);
  });

  it('sin aportes no hay ritmo', () => {
    expect(ritmoMensual([], '2026-03-02', HOY)).toBe(0);
  });

  it('un objetivo de doce días no extrapola a un mes entero', () => {
    // Con 100 en 12 días, dividir por 0,4 meses daría 250/mes. El piso de un mes
    // lo deja en 100, que es lo que de verdad se sabe.
    expect(ritmoMensual([ap(100)], '2026-07-21', HOY)).toBe(100);
  });
});

describe('cuandoLlegas', () => {
  it('proyecta con el ritmo real', () => {
    // 740 juntados en 5 meses = 147/mes. Faltan 1260 → 9 meses → mayo de 2027.
    const d = cuandoLlegas([ap(370), ap(370)], { montoMeta: 2000, arranco: '2026-03-02' }, HOY);
    expect(d && mesDe(d, HOY)).toBe('en mayo');
  });

  it('sin aportes no dice una fecha inventada', () => {
    expect(cuandoLlegas([], { montoMeta: 2000, arranco: '2026-03-02' }, HOY)).toBeNull();
  });

  it('con la meta alcanzada no hay nada que proyectar', () => {
    expect(cuandoLlegas([ap(2500)], { montoMeta: 2000, arranco: '2026-03-02' }, HOY)).toBeNull();
  });

  it('con un ritmo mínimo se calla en vez de decir el año 2187', () => {
    // Un euro en cinco meses contra una meta de 50.000: la cuenta da siglos, y
    // una fecha absurda se lee como que la app está rota.
    expect(cuandoLlegas([ap(1)], { montoMeta: 50_000, arranco: '2026-03-02' }, HOY)).toBeNull();
  });
});

describe('siApartaras — la palanca', () => {
  it('con más por mes, la fecha se adelanta', () => {
    const base = cuandoLlegas([ap(370), ap(370)], { montoMeta: 2000, arranco: '2026-03-02' }, HOY)!;
    const conMas = siApartaras([ap(370), ap(370)], { montoMeta: 2000 }, 300, HOY)!;
    expect(conMas.getTime()).toBeLessThan(base.getTime());
  });

  it('con menos por mes, se atrasa', () => {
    const base = cuandoLlegas([ap(370), ap(370)], { montoMeta: 2000, arranco: '2026-03-02' }, HOY)!;
    const conMenos = siApartaras([ap(370), ap(370)], { montoMeta: 2000 }, 40, HOY)!;
    expect(conMenos.getTime()).toBeGreaterThan(base.getTime());
  });

  it('apartar cero no devuelve una fecha', () => {
    expect(siApartaras([ap(740)], { montoMeta: 2000 }, 0, HOY)).toBeNull();
  });
});

describe('mesDe', () => {
  it('dentro de los próximos once meses, solo el mes', () => {
    expect(mesDe(new Date(2027, 0, 15), HOY)).toBe('en enero');
  });

  it('a doce meses o más, con el año', () => {
    // ⚠️ El corte es por DISTANCIA, no por año calendario: en agosto de 2026,
    // "en agosto" a secas no puede significar agosto de 2027.
    expect(mesDe(new Date(2027, 7, 15), HOY)).toBe('en agosto de 2027');
  });

  it('lejos, con el año', () => {
    expect(mesDe(new Date(2029, 2, 15), HOY)).toBe('en marzo de 2029');
  });

  it('nunca dice el día: sería precisión falsa', () => {
    expect(mesDe(new Date(2027, 0, 15), HOY)).not.toMatch(/\d{1,2} de/);
  });
});

// ── EL RITMO QUE HACE FALTA PARA LLEGAR A LA FECHA (06/08) ───────────────────
describe('ritmoNecesario', () => {
  const meta = { montoMeta: 1500 };
  const hoy = new Date('2026-08-06T10:00:00');

  it('reparte lo que falta en los días que quedan', () => {
    // 1500 - 300 = 1200 a repartir. Del 6/8 al 15/10 hay 70 días enteros…
    // ⚠️ …y dan 71, porque HOY CUENTA: son las 10 de la mañana y el día todavía
    // sirve para apartar algo. El `Math.ceil` es eso, no un redondeo suelto. Si
    // contara 70, la app estaría descartando el día en el que estás parado.
    const r = ritmoNecesario([{ monto: 300, creado: '2026-08-01' }], meta, '2026-10-15', hoy)!;
    expect(r.falta).toBe(1200);
    expect(r.diasRestantes).toBe(71);
    expect(Math.round(r.porSemana)).toBe(118);
    expect(Math.round(r.porDia!)).toBe(17);
  });

  it('⚠️ no ofrece la cifra por día cuando no significa nada', () => {
    // 1500 en diez años son 0,41 por día: un número que no ayuda a decidir.
    const r = ritmoNecesario([], meta, '2036-08-06', hoy)!;
    expect(r.porDia).toBeNull();
    expect(r.porSemana).toBeGreaterThan(0);
  });

  it('ya llegaste: no hay ritmo que calcular', () => {
    const r = ritmoNecesario([{ monto: 1500, creado: '2026-08-01' }], meta, '2026-10-15', hoy)!;
    expect(r.cumplido).toBe(true);
    expect(r.falta).toBe(0);
  });

  it('⚠️ la fecha ya pasó: no se proyecta hacia atrás', () => {
    const r = ritmoNecesario([], meta, '2026-01-01', hoy)!;
    expect(r.cumplido).toBe(false);
    expect(r.diasRestantes).toBe(0);
    expect(r.porSemana).toBe(0);
  });

  it('sin fecha de meta no hay nada que decir', () => {
    expect(ritmoNecesario([], meta, null, hoy)).toBeNull();
    expect(ritmoNecesario([], meta, '', hoy)).toBeNull();
  });
});

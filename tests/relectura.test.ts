import { describe, it, expect } from 'vitest';
import {
  DIAS_MAXIMOS,
  DIAS_MINIMOS,
  LARGO_MINIMO,
  candidatas,
  idRelectura,
  haceCuanto,
  laEscribioEl,
  relecturaDelDia,
  relecturasDelDia,
  animoDesde,
  textoDelCruce,
} from '@/lib/relectura';

const hoy = '2026-08-07';
function haceDias(n: number): string {
  const d = new Date(`${hoy}T00:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const LARGO = 'Perdimos la copa, pero a pesar de eso sigo bastante contento con el equipo.';
const msj = (texto: string, dias: number) => ({ texto, fecha: haceDias(dias) });

describe('laEscribioEl', () => {
  // ⚠️⚠️ El filtro más importante: cuando tocás "Charlar", la app manda un
  // mensaje en primera persona POR VOS y queda guardado como tuyo. Releerle a
  // alguien una frase que nunca escribió rompe justo la confianza que esta
  // tarjeta necesita.
  it('descarta los mensajes que escribe la app al tocar Charlar', () => {
    expect(laEscribioEl('Quiero contarte cómo viene lo de Alemán.')).toBe(false);
    expect(laEscribioEl('Quiero contarte cómo vengo durmiendo estos días.')).toBe(false);
    expect(laEscribioEl('Quiero pensar una decisión en voz alta.')).toBe(false);
    expect(laEscribioEl('Hace unos días quedamos en que iba a probar la siesta corta.')).toBe(false);
  });

  // ⚠️ Un pedido es trabajo que le encargaste al bot, no algo que pensaste.
  it('descarta los pedidos al bot', () => {
    expect(laEscribioEl('¿Podés interpretar esta charla?')).toBe(false);
    expect(laEscribioEl('Podes armarme una lista con esto')).toBe(false);
    expect(laEscribioEl('explicame cómo funciona')).toBe(false);
  });

  it('deja pasar lo que sí escribió él', () => {
    expect(laEscribioEl(LARGO)).toBe(true);
    expect(laEscribioEl('No muy bien, tengo dos caminos y no sé cuál')).toBe(true);
  });

  // ⚠️ Se parece a una reflexión porque empieza igual: ahí está la trampa.
  it('descarta las órdenes a la app', () => {
    expect(laEscribioEl('Quiero que aparezca entre mis notas que mañana escribo sobre esto')).toBe(false);
    expect(laEscribioEl('Quiero que anotes esto como actividad')).toBe(false);
  });

  it('un texto vacío no cuenta', () => {
    expect(laEscribioEl('   ')).toBe(false);
  });
});

describe('candidatas', () => {
  it('deja pasar lo que está en la ventana', () => {
    expect(candidatas([msj(LARGO, 20)], hoy)).toEqual([{ texto: LARGO, fecha: haceDias(20), dias: 20 }]);
  });

  // ⚠️ Lo de esta semana no es relectura: es la charla en curso.
  it('lo reciente no entra', () => {
    expect(candidatas([msj(LARGO, DIAS_MINIMOS - 1)], hoy)).toEqual([]);
  });

  // ⚠️ Y una frase de hace un año no se relee: se arqueologiza.
  it('lo muy viejo tampoco', () => {
    expect(candidatas([msj(LARGO, DIAS_MAXIMOS + 1)], hoy)).toEqual([]);
  });

  it('lo muy corto no es una idea, es un ok', () => {
    expect(candidatas([msj('Ta esta sumado', 20)], hoy)).toEqual([]);
    expect(candidatas([msj('x'.repeat(LARGO_MINIMO), 20)], hoy)).toHaveLength(1);
  });

  it('no releen los mensajes de la app', () => {
    expect(candidatas([msj('Quiero contarte cómo viene lo de Bouldern y esto es largo de más', 20)], hoy)).toEqual([]);
  });

  // ⚠️⚠️ Regla estructural, no lista de frases: sin la foto, el texto no
  // significa nada — y encima ese texto lo suele escribir la app.
  it('un mensaje con adjunto no se relee', () => {
    const con = [{ texto: LARGO, fecha: haceDias(20), conAdjunto: true }];
    expect(candidatas(con, hoy)).toEqual([]);
  });

  it('ordena de la más fresca a la más vieja', () => {
    const r = candidatas([msj(`${LARGO} vieja`, 60), msj(`${LARGO} fresca`, 16)], hoy);
    expect(r.map((c) => c.dias)).toEqual([16, 60]);
  });
});

describe('relecturaDelDia', () => {
  it('sin candidatas no hay tarjeta', () => {
    expect(relecturaDelDia([], hoy)).toBeNull();
  });

  // ⚠️ La misma todo el día: si cambiara en cada refresh dejaría de ser un
  // recuerdo y sería un carrusel.
  it('es estable dentro del mismo día', () => {
    const cs = candidatas([msj(`${LARGO} a`, 16), msj(`${LARGO} b`, 20), msj(`${LARGO} c`, 30)], hoy);
    expect(relecturaDelDia(cs, hoy)).toEqual(relecturaDelDia(cs, hoy));
  });

  it('cambia de un día para el otro', () => {
    const cs = [
      { texto: 'a', fecha: haceDias(16), dias: 16 },
      { texto: 'b', fecha: haceDias(20), dias: 20 },
      { texto: 'c', fecha: haceDias(30), dias: 30 },
    ];
    const vistos = new Set(['2026-08-07', '2026-08-08', '2026-08-09'].map((d) => relecturaDelDia(cs, d)?.texto));
    expect(vistos.size).toBeGreaterThan(1);
  });

  it('nunca sale del grupo de las cinco más frescas', () => {
    const cs = Array.from({ length: 12 }, (_, i) => ({ texto: `t${i}`, fecha: haceDias(i + 16), dias: i + 16 }));
    const elegidas = Array.from({ length: 40 }, (_, i) => {
      const d = new Date('2026-01-01T00:00:00');
      d.setDate(d.getDate() + i);
      return relecturaDelDia(cs, d.toISOString().slice(0, 10))?.texto;
    });
    expect(new Set(elegidas)).toEqual(new Set(['t0', 't1', 't2', 't3', 't4']));
  });
});

describe('haceCuanto', () => {
  it('dice la distancia, no la fecha', () => {
    expect(haceCuanto(14)).toBe('hace 2 semanas');
    expect(haceCuanto(20)).toBe('hace 3 semanas');
    expect(haceCuanto(30)).toBe('hace un mes');
    expect(haceCuanto(60)).toBe('hace dos meses');
    expect(haceCuanto(85)).toBe('hace tres meses');
  });
});

describe('animoDesde', () => {
  const ck = (fecha: string, estado: string) => ({ fecha, estado });

  it('cuenta lo posterior a la frase', () => {
    const r = animoDesde([ck('2026-07-10', 'bien'), ck('2026-08-01', 'bien'), ck('2026-08-02', 'bajon'), ck('2026-08-03', 'genial')], '2026-07-20');
    expect(r).toEqual({ total: 3, bajones: 1 });
  });

  // ⚠️ Con uno o dos no hay "cómo vino": hay dos datos sueltos, y presentarlos
  // como tendencia sería inventar una lectura.
  it('con menos de tres no dice nada', () => {
    expect(animoDesde([ck('2026-08-01', 'bien'), ck('2026-08-02', 'bien')], '2026-07-20')).toBeNull();
  });

  it('no mira lo anterior a la frase', () => {
    expect(animoDesde([ck('2026-07-01', 'bien'), ck('2026-07-02', 'bien'), ck('2026-07-03', 'bien')], '2026-07-20')).toBeNull();
  });
});

describe('textoDelCruce', () => {
  // ⚠️ Ni felicita ni reta: dice el hecho. Misma regla que la tarjeta del foco.
  it('sin bajones lo dice como hecho, no como elogio', () => {
    expect(textoDelCruce({ total: 9, bajones: 0 })).toBe('Desde entonces anotaste cómo estabas 9 veces, y ninguna fue un bajón.');
  });

  it('con bajones dice cuántos y se calla', () => {
    expect(textoDelCruce({ total: 9, bajones: 1 })).toBe('Desde entonces anotaste cómo estabas 9 veces, y 1 fue un bajón.');
    expect(textoDelCruce({ total: 9, bajones: 4 })).toBe('Desde entonces anotaste cómo estabas 9 veces, y 4 fueron bajones.');
  });

  it('todas bajones', () => {
    expect(textoDelCruce({ total: 4, bajones: 4 })).toBe('Desde entonces anotaste cómo estabas 4 veces, y todas fueron bajones.');
  });
});

describe('relecturasDelDia', () => {
  const cinco = Array.from({ length: 5 }, (_, i) => ({ texto: `t${i}`, fecha: haceDias(i + 16), dias: i + 16 }));

  it('sin candidatas no hay nada que mostrar', () => {
    expect(relecturasDelDia([], hoy)).toEqual([]);
  });

  // La razón de existir de la función: la primera es la que se ve sola, así que
  // tiene que ser exactamente la que `relecturaDelDia` venía eligiendo.
  it('la primera es la del día', () => {
    expect(relecturasDelDia(cinco, hoy)[0]).toEqual(relecturaDelDia(cinco, hoy));
  });

  // ⚠️ "Otro recuerdo" da la vuelta y vuelve al principio. Si la lista tuviera
  // repetidos, dar la vuelta te mostraría dos veces lo mismo y parecería colgado.
  it('están todas y ninguna repetida', () => {
    const r = relecturasDelDia(cinco, hoy);
    expect(r).toHaveLength(5);
    expect(new Set(r.map((c) => c.texto)).size).toBe(5);
  });

  it('nunca sale del grupo de las cinco más frescas', () => {
    const doce = Array.from({ length: 12 }, (_, i) => ({ texto: `t${i}`, fecha: haceDias(i + 16), dias: i + 16 }));
    const r = relecturasDelDia(doce, hoy);
    expect(new Set(r.map((c) => c.texto))).toEqual(new Set(['t0', 't1', 't2', 't3', 't4']));
  });

  it('con una sola candidata devuelve esa y nada más', () => {
    const una = [{ texto: 'sola', fecha: haceDias(16), dias: 16 }];
    expect(relecturasDelDia(una, hoy).map((c) => c.texto)).toEqual(['sola']);
  });

  it('es estable dentro del mismo día y rota de un día para el otro', () => {
    expect(relecturasDelDia(cinco, hoy)).toEqual(relecturasDelDia(cinco, hoy));
    expect(relecturasDelDia(cinco, '2026-08-08')[0]).not.toEqual(relecturasDelDia(cinco, hoy)[0]);
  });
});

// ── ⚠️⚠️ EL ID, QUE NACIÓ DE UN BUG (18/08) ──────────────────────────────────
//
// Las relecturas entraron a la baraja del bot armando su id con lo que se MUESTRA
// —"hace un mes" y los primeros 24 caracteres— y React tiró keys repetidas. Las
// dos piezas elegidas eran justo las que borran diferencias: `haceCuanto` es un
// embudo por diseño y 24 caracteres son el arranque de una frase, no la frase.
describe('idRelectura', () => {
  it('distingue dos frases que arrancan igual el mismo día', () => {
    const a = idRelectura({ fecha: '2026-07-20', texto: 'Quiero dejar de llegar al viernes sin nada mío' });
    const b = idRelectura({ fecha: '2026-07-20', texto: 'Quiero dejar de llegar al viernes cansado' });
    expect(a).not.toBe(b);
  });

  it('distingue la misma frase escrita en dos días', () => {
    const a = idRelectura({ fecha: '2026-07-20', texto: 'Tengo que dormir más temprano de lo que vengo' });
    const b = idRelectura({ fecha: '2026-07-28', texto: 'Tengo que dormir más temprano de lo que vengo' });
    expect(a).not.toBe(b);
  });

  // Lo que el descarte necesita: mañana tiene que seguir siendo el mismo id,
  // aunque `relecturasDelDia` rote el orden de la baraja.
  it('es el mismo id para la misma frase, siempre', () => {
    const c = { fecha: '2026-07-20', texto: 'Quiero volver a escribir los domingos a la mañana' };
    expect(idRelectura(c)).toBe(idRelectura({ ...c }));
  });
});

// ── ⚠️⚠️ LA MISMA FRASE, UNA SOLA VEZ (18/08) ────────────────────────────────
//
// Salió de un warning de React —keys repetidas en la baraja del bot— pero el bug
// era de producto: devolverte dos veces la misma frase como si fueran dos
// recuerdos distintos. En el Home nunca se vio porque se dibujaba una sola.
describe('candidatas · no repite la misma frase', () => {
  const larga = 'Quiero dejar de llegar al viernes sin haber hecho nada mío en toda la semana';

  it('la misma frase escrita dos veces el mismo día entra una sola vez', () => {
    const cs = candidatas(
      [
        { texto: larga, fecha: '2026-07-29' },
        { texto: larga, fecha: '2026-07-29' },
      ],
      '2026-08-18',
    );
    expect(cs).toHaveLength(1);
  });

  it('la misma frase en dos días distintos también, y queda la más reciente', () => {
    const cs = candidatas(
      [
        { texto: larga, fecha: '2026-07-29' },
        { texto: larga, fecha: '2026-06-20' },
      ],
      '2026-08-18',
    );
    expect(cs).toHaveLength(1);
    expect(cs[0].fecha).toBe('2026-07-29');
  });

  it('dos frases distintas del mismo día siguen entrando las dos', () => {
    const cs = candidatas(
      [
        { texto: larga, fecha: '2026-07-29' },
        { texto: `${larga} y encima me cuesta arrancar`, fecha: '2026-07-29' },
      ],
      '2026-08-18',
    );
    expect(cs).toHaveLength(2);
  });
});

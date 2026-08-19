import { describe, it, expect } from 'vitest';
import { juntarObservaciones, separarPorRespuesta, type ObsCruda } from '@/lib/relaciones-historial';

const o = (patron: string, confianza = 'media', evidencia = '3 días'): ObsCruda => ({ patron, evidencia, confianza });

describe('juntarObservaciones — varios análisis, no solo el último', () => {
  it('junta las de todos los análisis', () => {
    const r = juntarObservaciones([[o('Amigos y ánimo')], [o('Sueño y energía')], [o('Gastos y estrés')]]);
    expect(r).toHaveLength(3);
  });

  it('⚠️ el mismo cruce redactado dos veces cuenta UNA', () => {
    // El modelo redacta distinto en cada corrida: sin esto la pantalla mostraría
    // la misma relación tres veces y parecería rota.
    const r = juntarObservaciones([[o('Amigos y ánimo')], [o('amigos y ánimo!')], [o('  AMIGOS  Y  ANIMO ')]]);
    expect(r).toHaveLength(1);
  });

  it('gana la versión MÁS NUEVA, que entra primera', () => {
    const r = juntarObservaciones([[o('Amigos y ánimo', 'alta', '9 días')], [o('Amigos y ánimo', 'baja', '2 días')]]);
    expect(r[0].confianza).toBe('alta');
    expect(r[0].evidencia).toBe('9 días');
  });

  it('respeta el orden: lo más nuevo primero', () => {
    const r = juntarObservaciones([[o('nueva')], [o('vieja')]]);
    expect(r.map((x) => x.patron)).toEqual(['nueva', 'vieja']);
  });

  it('descarta los patrones vacíos en vez de mostrar tarjetas en blanco', () => {
    expect(juntarObservaciones([[o(''), o('   '), o('buena')]])).toHaveLength(1);
  });

  it('sin análisis, lista vacía y no explota', () => {
    expect(juntarObservaciones([])).toEqual([]);
    expect(juntarObservaciones([[]])).toEqual([]);
  });
});

describe('separarPorRespuesta — lo confirmado se queda', () => {
  const obs = [o('Amigos y ánimo'), o('Sueño y energía'), o('Gastos y estrés')];

  it('sin respuestas, todas van a preguntar', () => {
    const r = separarPorRespuesta(obs, [], []);
    expect(r.preguntar).toHaveLength(3);
    expect(r.confirmadas).toHaveLength(0);
  });

  it('⚠️ lo que confirmó NO desaparece: se muda abajo', () => {
    // Es el bug que dejaba Relaciones vacío: al contestar todo, la pantalla se
    // vaciaba y decía "no encontré nada".
    const r = separarPorRespuesta(obs, ['Amigos y ánimo'], []);
    expect(r.confirmadas.map((x) => x.patron)).toEqual(['Amigos y ánimo']);
    expect(r.preguntar).toHaveLength(2);
  });

  it('con TODO contestado que sí, la pantalla sigue teniendo contenido', () => {
    const r = separarPorRespuesta(obs, obs.map((x) => x.patron), []);
    expect(r.preguntar).toHaveLength(0);
    expect(r.confirmadas).toHaveLength(3); // ← lo que arregla el pedido
  });

  it('⚠️ lo descartado no vuelve, ni arriba ni abajo', () => {
    // Dijo que no le pasa. Mostrarlo otra vez sería discutirle.
    const r = separarPorRespuesta(obs, [], ['Sueño y energía']);
    expect(r.preguntar.map((x) => x.patron)).toEqual(['Amigos y ánimo', 'Gastos y estrés']);
    expect(r.confirmadas).toHaveLength(0);
  });

  it('⚠️ compara normalizando, como al juntar', () => {
    // Las respuestas se guardan con el texto del día que las contestó; el de hoy
    // puede venir con una coma de más. Comparando literal, una ya contestada
    // volvería a preguntarse como nueva.
    const r = separarPorRespuesta([o('Amigos y ánimo')], ['amigos y animo,'], []);
    expect(r.confirmadas).toHaveLength(1);
    expect(r.preguntar).toHaveLength(0);
  });

  it('una respuesta a algo que ya no existe no rompe nada', () => {
    const r = separarPorRespuesta(obs, ['algo viejo que el analista ya no dice'], []);
    expect(r.preguntar).toHaveLength(3);
    expect(r.confirmadas).toHaveLength(0);
  });
});

// ── EL "NO SÉ" (05/08) ───────────────────────────────────────────────────────
// Es la razón de ser del tercer botón: si una observación contestada "no sé"
// volviera a `preguntar`, la pantalla se la preguntaría de nuevo al instante y
// el botón no serviría para nada.
describe('separarPorRespuesta · el "no sé"', () => {
  const o = (patron: string) => ({ patron, evidencia: '', confianza: 'alta' });
  const obs = [o('Amigos y ánimo'), o('Sueño y energía'), o('Gastos y estrés')];

  it('⚠️ lo dudoso NO vuelve a preguntarse: va a su propio montón', () => {
    const r = separarPorRespuesta(obs, [], [], ['Sueño y energía']);
    expect(r.preguntar.map((x) => x.patron)).toEqual(['Amigos y ánimo', 'Gastos y estrés']);
    expect(r.dudosas.map((x) => x.patron)).toEqual(['Sueño y energía']);
    expect(r.confirmadas).toHaveLength(0);
  });

  it('un "me pasa" le gana a un "no sé" viejo sobre lo mismo', () => {
    // No debería pasar (la fila es una sola y se pisa), pero si pasara, la
    // respuesta que afirma algo vale más que la que no dice nada.
    const r = separarPorRespuesta([o('Amigos y ánimo')], ['Amigos y ánimo'], [], ['Amigos y ánimo']);
    expect(r.confirmadas).toHaveLength(1);
    expect(r.dudosas).toHaveLength(0);
  });

  it('lo descartado le gana al "no sé": dijo que no le pasa', () => {
    const r = separarPorRespuesta([o('Amigos y ánimo')], [], ['Amigos y ánimo'], ['Amigos y ánimo']);
    expect(r.preguntar).toHaveLength(0);
    expect(r.dudosas).toHaveLength(0);
    expect(r.confirmadas).toHaveLength(0);
  });

  it('sin dudosas, sigue funcionando igual que antes (el 4º argumento es opcional)', () => {
    const r = separarPorRespuesta(obs, [], []);
    expect(r.preguntar).toHaveLength(3);
    expect(r.dudosas).toHaveLength(0);
  });
});

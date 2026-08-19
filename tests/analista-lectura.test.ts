import { describe, it, expect } from 'vitest';
import { filtrarObservaciones, parsear, type ResultadoAnalisis } from '@/lib/analista-lectura';

// R.3 del informe del 13/08: `lib/analista.ts` es "lo que decide qué se convierte
// en conocimiento permanente sobre él" y no tenía un solo test. Estos son los de
// las dos funciones que deciden: `parsear` (qué se acepta de lo que devolvió el
// modelo) y `filtrarObservaciones` (qué sobrevive al filtro).
//
// ⚠️ LOS CASOS NO SON INVENTADOS: casi todos son la respuesta real que dio Gemma
// alguna vez, con la fecha anotada al lado. Un test con datos plausibles prueba
// que la función hace lo que dice; uno con la respuesta que rompió prueba que no
// vuelve a pasar.

/** Una observación bien formada, para no repetirla en cada caso. */
const OBS_BUENA = {
  patron: 'Los días que jugás al fútbol con el pie lesionado, al día siguiente registrás el ánimo más bajo.',
  evidencia: '2026-07-26, 2026-07-27, 2026-07-28 y 2026-07-30',
  confianza: 'alta',
};

const crudo = (j: unknown) => JSON.stringify(j);

describe('parsear', () => {
  it('sin hiloCentral devuelve null: el análisis se descarta entero', () => {
    expect(parsear(crudo({ observaciones: [OBS_BUENA] }))).toBeNull();
    expect(parsear(crudo({ hiloCentral: '', observaciones: [OBS_BUENA] }))).toBeNull();
  });

  it('con JSON roto devuelve null en vez de tirar', () => {
    // Pasa de verdad: el modelo corta la respuesta a mitad cuando el historial es
    // largo. Si esto tirara, se caería el worker entero un lunes a las 9:00.
    expect(parsear('{"hiloCentral": "algo", "observacio')).toBeNull();
    expect(parsear('')).toBeNull();
    expect(parsear('No puedo analizar esto.')).toBeNull();
  });

  it('corta a 6 observaciones y a 3 sugerencias', () => {
    const res = parsear(
      crudo({
        hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.',
        observaciones: Array.from({ length: 10 }, () => OBS_BUENA),
        sugerencias: Array.from({ length: 8 }, (_, i) => ({ texto: `sugerencia ${i}` })),
      }),
    );
    expect(res?.observaciones).toHaveLength(6);
    expect(res?.sugerencias).toHaveLength(3);
  });

  it('descarta las sugerencias vacías en vez de guardar strings pelados', () => {
    const res = parsear(
      crudo({
        hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.',
        sugerencias: [{ texto: 'sirve' }, { texto: '' }, {}],
      }),
    );
    expect(res?.sugerencias).toEqual([{ texto: 'sirve' }]);
  });

  it('sin observaciones, o con algo que no es lista, devuelve lista vacía', () => {
    const base = { hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.' };
    expect(parsear(crudo(base))?.observaciones).toEqual([]);
    expect(parsear(crudo({ ...base, observaciones: 'ninguna' }))?.observaciones).toEqual([]);
  });

  it('con los campos faltantes deja strings vacíos y no rompe', () => {
    const res = parsear(
      crudo({ hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.', observaciones: [{}] }),
    );
    expect(res?.observaciones[0]).toEqual({ patron: '', evidencia: '', confianza: 'baja', experimento: undefined });
  });
});

describe('parsear · la confianza se cuenta, no se cree', () => {
  const conConfianza = (evidencia: string, confianza: unknown) =>
    parsear(
      crudo({
        hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.',
        observaciones: [{ patron: OBS_BUENA.patron, evidencia, confianza }],
      }),
    )?.observaciones[0].confianza;

  it('⚠️ "alta" citando UNA sola fecha cae a "baja"', () => {
    // El caso del 28/07: "cuando te sentís cuestionado la libido baja
    // considerablemente", confianza ALTA, una fecha. Un día no es una relación.
    expect(conConfianza('2026-07-28', 'alta')).toBe('baja');
  });

  it('"alta" con cuatro fechas se queda alta', () => {
    expect(conConfianza('2026-07-26, 2026-07-27, 2026-07-28 y 2026-07-30', 'alta')).toBe('alta');
  });

  it('nunca la sube: "baja" con cuatro fechas sigue baja', () => {
    // Si el modelo fue prudente, se respeta. El techo es un techo, no un piso.
    expect(conConfianza('2026-07-26, 2026-07-27, 2026-07-28 y 2026-07-30', 'baja')).toBe('baja');
  });

  it('dos fechas repetidas cuentan como una: el techo es "baja"', () => {
    // Se cuentan fechas DISTINTAS (`Set`). Citar el mismo día dos veces no es
    // más evidencia, y el modelo lo hace cuando le pedís que cite.
    expect(conConfianza('2026-07-28 y 2026-07-28', 'alta')).toBe('baja');
  });

  it('sin fechas citadas respeta lo que dijo el modelo', () => {
    expect(conConfianza('se ve en la bitácora de la semana pasada', 'alta')).toBe('alta');
  });

  it('una confianza que no existe cae a "baja", no se guarda tal cual', () => {
    // El modelo devuelve "high" o "altísima" cuando se le va la mano con el
    // idioma. Sin esto entraría a la base un valor que ninguna pantalla sabe leer.
    expect(conConfianza('se ve en la bitácora', 'altísima')).toBe('baja');
    expect(conConfianza('se ve en la bitácora', 'high')).toBe('baja');
    expect(conConfianza('se ve en la bitácora', undefined)).toBe('baja');
  });
});

describe('parsear · el experimento', () => {
  const conExperimento = (experimento: unknown) =>
    parsear(
      crudo({
        hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.',
        observaciones: [{ ...OBS_BUENA, experimento }],
      }),
    )?.observaciones[0].experimento;

  it('le saca el "Probá" del principio', () => {
    // El botón ya dice "+ probar: …". Se limpia al parsear y no en la pantalla
    // para que quede guardado prolijo.
    expect(conExperimento('Probá jugar sin el pie lesionado una semana')).toBe(
      'jugar sin el pie lesionado una semana',
    );
  });

  it('sin experimento queda undefined, no un string vacío', () => {
    // La pantalla pregunta `if (o.experimento)`: un '' pasaría como ausente igual,
    // pero se guarda `undefined` para que la fila no tenga un campo vacío.
    expect(conExperimento(undefined)).toBeUndefined();
    expect(conExperimento('')).toBeUndefined();
  });
});

describe('filtrarObservaciones', () => {
  const DESDE = '2026-07-01';
  const HASTA = '2026-07-31';

  const conObservaciones = (observaciones: ResultadoAnalisis['observaciones']): ResultadoAnalisis => ({
    hiloCentral: 'Una frase que cuenta la tensión de las últimas semanas.',
    observaciones,
    sugerencias: [{ texto: 'algo' }],
  });

  it('deja pasar la frase que conecta dos cosas', () => {
    const res = filtrarObservaciones(conObservaciones([OBS_BUENA]), DESDE, HASTA);
    expect(res.observaciones).toHaveLength(1);
  });

  it('⚠️ voltea las etiquetas sueltas, que es para lo que existe', () => {
    // Las cuatro que devolvió el análisis del 25/07 y que Matías cazó al toque:
    // son códigos temáticos, no dicen nada que él no supiera y no se pueden
    // confirmar ni descartar.
    const etiquetas = ['gasto recurrente', 'compensación/recompensa', 'dolor y persistencia', 'preocupación por la salud'];
    const res = filtrarObservaciones(
      conObservaciones(etiquetas.map((patron) => ({ patron, evidencia: '', confianza: 'media' }))),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toEqual([]);
  });

  it('una frase larga sin ninguna marca de relación tampoco pasa', () => {
    // Largo no es lo mismo que relación: esto tiene diez palabras y sigue siendo
    // un rótulo estirado.
    const res = filtrarObservaciones(
      conObservaciones([
        { patron: 'Gasto recurrente en comida rápida durante todo el mes pasado.', evidencia: '', confianza: 'media' },
      ]),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toEqual([]);
  });

  it('⚠️ descarta entera la observación con una fecha inventada', () => {
    // El caso real: citaba "2024-03-12 $5800" cuando los registros son de julio
    // de 2026 y en euros. Una observación con evidencia falsa es PEOR que una
    // etiqueta vaga, porque suena rigurosa.
    const res = filtrarObservaciones(
      conObservaciones([OBS_BUENA, { ...OBS_BUENA, evidencia: 'el 2024-03-12 gastaste $5800' }]),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toHaveLength(1);
    expect(res.observaciones[0].evidencia).toBe(OBS_BUENA.evidencia);
  });

  it('también cuando el año va suelto, sin fecha completa', () => {
    const res = filtrarObservaciones(
      conObservaciones([{ ...OBS_BUENA, evidencia: 'como venía pasando desde 2024' }]),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toEqual([]);
  });

  it('una fecha del futuro, fuera de la ventana, también se cae', () => {
    const res = filtrarObservaciones(
      conObservaciones([{ ...OBS_BUENA, evidencia: 'el 2026-08-15 registraste el ánimo más bajo' }]),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toEqual([]);
  });

  it('sin fechas citadas la evidencia pasa: no se exige citar, se exige no inventar', () => {
    const res = filtrarObservaciones(
      conObservaciones([{ ...OBS_BUENA, evidencia: 'se repite en varias entradas de la bitácora' }]),
      DESDE,
      HASTA,
    );
    expect(res.observaciones).toHaveLength(1);
  });

  it('no toca el hiloCentral ni las sugerencias', () => {
    // El filtro es de observaciones. `analizar()` valida el hilo aparte, con
    // `esHiloValido`, y decide otra cosa con eso (reintentar, no descartar).
    const original = conObservaciones([OBS_BUENA]);
    const res = filtrarObservaciones(original, DESDE, HASTA);
    expect(res.hiloCentral).toBe(original.hiloCentral);
    expect(res.sugerencias).toEqual(original.sugerencias);
  });
});

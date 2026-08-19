import { desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { analisis, animoCheckins, areas, bitacora, config, conocimiento, cuerpo, eventos, gastos, hechos, lineas, notas, objetivos, periodos, sugerencias } from '@/lib/db/schema';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { moodDe } from '@/lib/animo';
import { normalizarItem } from '@/lib/gastos-items';
import { resumenSaludGastos, textoSaludGastos } from '@/lib/gastos-salud';
import { estadoCiclo, NOMBRE_FASE } from '@/lib/ciclo';
import { esHiloValido } from '@/lib/observacion-valida';
import { filtrarObservaciones, parsear, type ResultadoAnalisis } from '@/lib/analista-lectura';
import { calcularDensidad, instruccionSegunDensidad } from '@/lib/densidad';
import { textoAprendido, TITULO_APRENDIZAJES } from '@/lib/aprendizajes';
import { mismoHecho } from '@/lib/cerebro-hechos';
import { animoVersusFactores, suenoVersusAnimo, type CheckinAnimo, type Noche } from '@/lib/relaciones-datos';

// Ánimo viejo (por área) usa bien/masomenos/mal; el general usa moodDe (genial…bajon).
const ETIQUETA: Record<string, string> = { bien: 'bien', masomenos: 'más o menos', mal: 'mal' };

function etiquetaAnimo(estado: string): string {
  return moodDe(estado)?.label.toLowerCase() ?? ETIQUETA[estado] ?? estado;
}

/** Parsea un campo JSON de string[] de forma segura (factores/palabras del ánimo). */
function listaJSON(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// El tipo y las dos funciones que leen la respuesta del modelo viven en
// `lib/analista-lectura` desde el 14/08, para que se puedan probar sin abrir la
// base. Se re-exporta el tipo porque `scripts/analisis-guardar.ts` lo importa de
// acá.
export type { ResultadoAnalisis } from '@/lib/analista-lectura';

// Arma el "transcript" de datos para el Analista: ventana de 30 días.
// Le pasamos TODAS las señales que registra Matías para que la Teoría Fundamentada
// cruce conducta con ánimo: rueda, ánimo (con el porqué), sueño, comida, actividades
// (en curso y hechas), eventos y lo que escribió. Cuanto más ve, mejor triangula.
export async function armarDatos(): Promise<string> {
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [areasRows, lineasRows, animos, entradas, eventosRows, cuerpoRows, gastosRows, periodosRows, cfgRows, veredictos, notasRows, objetivosRows] =
    await Promise.all([
      db.select().from(areas),
      db.select().from(lineas),
      db.select().from(animoCheckins).where(gte(animoCheckins.creado, hace30)).orderBy(animoCheckins.creado),
      db.select().from(bitacora).where(gte(bitacora.fecha, hace30)).orderBy(desc(bitacora.fecha)).limit(25),
      db.select().from(eventos).where(gte(eventos.inicio, hace30)).orderBy(desc(eventos.inicio)).limit(30),
      db.select().from(cuerpo).where(gte(cuerpo.creado, hace30)).orderBy(cuerpo.creado),
      db.select().from(gastos).where(gte(gastos.creado, hace30)).orderBy(gastos.creado),
      db.select().from(periodos).orderBy(periodos.inicio),
      db.select().from(config),
      db.select().from(sugerencias).where(eq(sugerencias.tipo, 'observacion')),
      // ⚠️ LAS NOTAS SÍ ENTRAN ACÁ, y no es una contradicción con que Notas sea
      // "el lugar sin IA": lo que esa pantalla promete es que nada te lee ni te
      // contesta MIENTRAS ESCRIBÍS, no que el texto se tire. Matías lo pidió
      // así con todas las letras el 30/07 ("que el analista las tenga en
      // consideración pero que sea un espacio sin IA directa").
      // Es, además, el material más rico que puede leer: es lo único que se
      // escribe sin pensar en que alguien lo va a procesar.
      db.select().from(notas).where(gte(notas.actualizado, hace30)).orderBy(desc(notas.actualizado)).limit(25),
      // Los objetivos de largo aliento. ⚠️ NO se filtran por los 30 días: la
      // gracia de un objetivo es justamente que arrancó hace nueve meses, y
      // recortarlo a la ventana lo dejaría afuera del análisis. Son pocas filas.
      db.select().from(objetivos),
    ]);
  const nombreArea = new Map(areasRows.map((a) => [a.id, a.nombre]));
  const cfg = new Map(cfgRows.map((r) => [r.clave, r.valor]));

  const rueda = areasRows
    .filter((a) => a.activa)
    .map((a) => `${a.nombre}: ${a.scoreActual ?? '?'}/5 (quiere ${a.scoreDeseado ?? '?'})${a.foco ? ' [foco]' : ''}`)
    .join('\n');

  // Ánimo con el porqué: etiqueta + nota + factores/palabras si los hay.
  const animo = animos.length
    ? animos
        .map((r) => {
          const quien = r.areaId ? nombreArea.get(r.areaId) : 'general';
          const señales = [...listaJSON(r.factores), ...listaJSON(r.palabras)];
          const ctx = [r.nota?.trim(), señales.length ? señales.join(', ') : ''].filter(Boolean).join(' · ');
          return `${r.creado.slice(0, 10)} ${quien}: ${etiquetaAnimo(r.estado)}${ctx ? ` (${ctx})` : ''}`;
        })
        .join('\n')
    : '(sin registros de ánimo)';

  // Sueño: horas + calidad. Es de lo que más suele explicar el ánimo.
  const suenos = cuerpoRows.filter((c) => c.tipo === 'sueno' && c.valor != null);
  const suenoTxt = suenos.length
    ? suenos
        .map((c) => `${c.creado.slice(0, 10)}: ${((c.valor as number) / 60).toLocaleString('es-AR', { maximumFractionDigits: 1 })}h${c.calidad ? ` (${c.calidad})` : ''}`)
        .join('\n')
    : '(sin registros de sueño)';

  // Comida: texto libre de qué comió.
  const comidas = cuerpoRows.filter((c) => c.tipo === 'comida' && c.nota);
  const comidaTxt = comidas.length ? comidas.map((c) => `${c.creado.slice(0, 10)}: ${c.nota}`).join('\n') : '(sin registros de comida)';

  // Energía y libido (autoobservación 1-5): señales para cruzar con todo lo demás.
  const senales = cuerpoRows.filter((c) => (c.tipo === 'energia' || c.tipo === 'libido') && c.valor != null);
  const senalesTxt = senales.length
    ? senales.map((c) => `${c.creado.slice(0, 10)}: ${c.tipo} ${c.valor}/5`).join('\n')
    : '(sin registros)';

  // Tiempo en pantalla (de capturas que el usuario manda): total + top apps.
  const pantallas = cuerpoRows.filter((c) => c.tipo === 'pantalla' && c.valor != null);
  const pantallaTxt = pantallas.length
    ? pantallas
        .map((c) => {
          const h = Math.floor((c.valor as number) / 60);
          const m = (c.valor as number) % 60;
          let apps = '';
          try {
            const arr = JSON.parse(c.nota ?? '[]') as { nombre: string; min: number }[];
            apps = arr.slice(0, 4).map((a) => `${a.nombre} ${a.min}min`).join(', ');
          } catch {
            apps = '';
          }
          return `${c.creado.slice(0, 10)}: ${h}h${m}m${apps ? ` (${apps})` : ''}`;
        })
        .join('\n')
    : '(sin registros)';

  // Ciclo menstrual: fase actual + días de período recientes (si lo sigue). Es una
  // señal hormonal fuerte: la fase se correlaciona con energía y ánimo.
  const sigueCiclo = cfg.get('sigue_ciclo') === '1';
  let cicloTxt = '';
  if (sigueCiclo && periodosRows.length > 0) {
    const est = estadoCiclo(periodosRows);
    const fase = est ? `Hoy: día ${est.diaCiclo} del ciclo, fase ${NOMBRE_FASE[est.fase].toLowerCase()}.` : '';
    const periodosLista = periodosRows
      .slice(-4)
      .map((p) => `${p.inicio}${p.fin ? ` → ${p.fin}` : ' (en curso)'}`)
      .join('; ');
    cicloTxt = `${fase} Períodos recientes: ${periodosLista}. Considerá el efecto hormonal de la fase en el ánimo y la energía, sin reducir todo a eso.`;
  }

  // Perfil: identidad y neurodivergencia declaradas (contexto, no etiqueta).
  let neuro: string[] = [];
  try {
    const arr = JSON.parse(cfg.get('neurodivergencia') ?? '[]');
    if (Array.isArray(arr)) neuro = arr.map(String).filter((n) => n && n !== 'reservado');
  } catch {
    neuro = [];
  }

  // Gastos (de los tickets): comercio, total e ítems. Sirve para cruzar plata y
  // comida con el ánimo (ej: mucho de algo en los tickets + baja de energía).
  const gastoTxt = gastosRows.length
    ? gastosRows
        .map((g) => {
          const its = g.items
            ? (() => {
                try {
                  return (JSON.parse(g.items as string) as unknown[])
                    .map(normalizarItem)
                    .filter((x): x is NonNullable<typeof x> => x != null)
                    .map((it) => (it.precio != null ? `${it.nombre} ${it.precio}` : it.nombre))
                    .join(', ');
                } catch {
                  return '';
                }
              })()
            : '';
          const monto = g.total != null ? `${g.moneda ? `${g.moneda} ` : ''}${g.total}` : 's/d';
          return `${(g.fecha ?? g.creado.slice(0, 10)).slice(0, 10)}: ${g.comercio ?? 'ticket'} ${monto}${g.categoria ? ` [${g.categoria}]` : ''}${its ? ` (${its})` : ''}`;
        })
        .join('\n')
    : '(sin gastos registrados)';

  // El % de ultraprocesados SUMADO EN CÓDIGO (ver gastos-salud.ts) y no pedido
  // al modelo: es una cuenta sobre treinta líneas de ticket, no una relación.
  const saludGastosTxt = textoSaludGastos(resumenSaludGastos(gastosRows));

  // Actividades en curso: lo que sostiene en el tiempo.
  const actividadesTxt = lineasRows
    .filter((l) => l.tipo === 'actividad' && l.estado === 'activa')
    .map((l) => `${l.titulo}${l.objetivo ? ` (${l.objetivo})` : ''}`)
    .join('\n');

  // Actividades hechas: cosas puntuales que pasaron una vez (mandó algo, empezó un
  // trámite), con la fecha. Marcadores para cruzar con el ánimo.
  const hechas = lineasRows
    .filter((l) => l.tipo === 'actividad' && l.estado === 'hecha')
    .sort((a, b) => (a.ultimaActividad ?? '') < (b.ultimaActividad ?? '') ? 1 : -1);
  const hechasTxt = hechas.length
    ? hechas.map((l) => `${(l.ultimaActividad ?? '').slice(0, 10)}: ${l.titulo}`).join('\n')
    : '(sin actividades hechas)';

  const lineasTxt = lineasRows
    .filter((l) => l.tipo !== 'actividad' && l.estado === 'activa')
    .map((l) => `${l.titulo}${l.objetivo ? ` (objetivo: ${l.objetivo})` : ''}`)
    .join('\n');

  // Bitácora sin las actividades hechas (ya van en su sección) para no duplicar.
  const diario = entradas.filter((e) => e.tipo !== 'hecho');
  const diarioTxt = diario.length ? diario.map((e) => `[${e.fecha.slice(0, 10)} · ${e.tipo}] ${e.contenido}`).join('\n') : '(sin entradas)';

  // Las notas van con título Y cuerpo: el título es el primer renglón que escribió
  // él, así que suele ser el resumen más honesto de la nota que cualquier recorte.
  //
  // ⚠️ LAS PRIVADAS ENTRAN IGUAL, PERO MARCADAS (31/07). Es el pedido exacto de
  // Matías: *"quiero que los datos sean manejados por la IA interna, pero no
  // quiero que estén a la vista"*. Sacarlas del contexto sería tirar justo el
  // dato que explica un bajón; dejarlas sin marcar haría que el Analista las
  // cite textual en una observación, y esa observación se muestra en el Home —
  // o sea, la privacidad se filtraría por la puerta de al lado.
  //
  // La marca va en el contexto y la regla de qué hacer con ella, en
  // `prompts/analista.md`: se usan para entender, no se nombran.
  const notasTxt = notasRows.length
    ? notasRows
        .map(
          (n) =>
            `[${n.actualizado.slice(0, 10)}]${n.privada ? ' [PRIVADA]' : ''} ${n.titulo || '(sin título)'}${
              n.cuerpo.trim() ? `\n${n.cuerpo.trim()}` : ''
            }`,
        )
        .join('\n\n')
    : '(sin notas)';

  // ── OBJETIVOS (30/07) ──────────────────────────────────────────────────────
  // Lo grande y de largo aliento, con el TIEMPO YA PUESTO. Es la señal que ningún
  // otro bloque le da: todo lo demás son días sueltos, y esto son meses. Sirve
  // para leer un bajón con contexto ("viene nueve meses buscando trabajo").
  //
  // Va con el ÁREA de la rueda: es lo que le permite cruzar el objetivo con los
  // scores de esa área (para eso existe la columna, y sin esto no servía de nada).
  const objetivosTxt = objetivosRows.length
    ? objetivosRows
        .map((o) => {
          const area = o.areaId ? ` [${nombreArea.get(o.areaId)}]` : '';
          // ⚠️ 'pausado' TIENE QUE ESTAR ACÁ (03/08). Este encadenado terminaba
          // en un `else` que asumía "abandonado", así que un objetivo en pausa
          // le llegaba al Analista como "dejado el null" — y con eso podía
          // escribir que Matías abandonó algo que solo frenó. Un pausado no
          // tiene `cerrado`, por eso no lleva fecha.
          const estado =
            o.estado === 'activo'
              ? 'en curso'
              : o.estado === 'pausado'
                ? 'en pausa (lo frenó él, no lo abandonó)'
                : o.estado === 'logrado'
                  ? `logrado el ${o.cerrado}`
                  : `dejado el ${o.cerrado}`;
          const meta = o.fechaMeta ? ` · meta: ${o.meta ?? 'sin describir'} para el ${o.fechaMeta}` : ' · sin fecha límite';
          return `${o.titulo}${area}: arrancó el ${o.arranco}, ${estado}${meta}`;
        })
        .join('\n')
    : '(sin objetivos anotados)';

  const eventosTxt = eventosRows.length
    ? eventosRows.map((e) => `${e.inicio.slice(0, 10)} ${e.titulo}${e.areaId ? ` [${nombreArea.get(e.areaId)}]` : ''}`).join('\n')
    : '(sin eventos)';

  // La respuesta de Matías a análisis anteriores. Es lo que convierte esto en un
  // ida y vuelta: lo que confirmó vale como dato duro, y lo que descartó no se
  // vuelve a proponer igual. Sin esto, el Analista repetiría siempre lo mismo.
  const confirmadas = veredictos.filter((v) => v.estado === 'anotada').map((v) => `- ${v.contenido}`);
  const rechazadas = veredictos.filter((v) => v.estado === 'descartada').map((v) => `- ${v.contenido}`);
  const veredictoTxt = [
    confirmadas.length
      ? `Te dijo que SÍ le pasa (dalo por bueno, podés profundizar o ver cómo evolucionó):\n${confirmadas.join('\n')}`
      : '',
    rechazadas.length
      ? `Te dijo que NO es así (no lo repitas, buscá otra explicación para esos datos):\n${rechazadas.join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // Cuánto puede afirmar con lo que hay. Va PRIMERO, antes que los datos: define
  // con qué permiso los va a leer. Al arranque, la lectura honesta es "todavía
  // estoy mirando", y decirlo es mejor que inventar una relación.
  const diasConAnimo = new Set(animos.filter((a) => !a.areaId).map((a) => a.creado.slice(0, 10))).size;

  return [
    instruccionSegunDensidad(calcularDensidad(diasConAnimo), diasConAnimo),
    neuro.length ? `### PERFIL (tenelo en cuenta con respeto, no como etiqueta)\nNeurodivergencia declarada: ${neuro.join(', ')}.` : '',
    `### RUEDA (áreas de vida, score actual vs deseado)\n${rueda}`,
    `### ÁNIMO REGISTRADO (cronológico, con el porqué)\n${animo}`,
    `### SUEÑO (cronológico)\n${suenoTxt}`,
    `### ENERGÍA Y LIBIDO (autoobservación 1-5)\n${senalesTxt}`,
    `### TIEMPO EN PANTALLA (de capturas, total + apps)\n${pantallaTxt}`,
    cicloTxt ? `### CICLO MENSTRUAL\n${cicloTxt}` : '',
    `### COMIDA (cronológico)\n${comidaTxt}`,
    `### GASTOS (de los tickets: comercio, total, qué compró)\n${gastoTxt}`,
    saludGastosTxt ? `### GASTO EN COMIDA, YA CALCULADO (no lo recalcules, usalo)\n${saludGastosTxt}` : '',
    `### ACTIVIDADES EN CURSO (lo que sigue)\n${actividadesTxt || '(ninguna)'}`,
    `### ACTIVIDADES HECHAS (cosas puntuales que pasaron, con fecha)\n${hechasTxt}`,
    `### EVENTOS (agenda)\n${eventosTxt}`,
    `### LÍNEAS ACTIVAS\n${lineasTxt || '(ninguna)'}`,
    `### ENTRADAS DE BITÁCORA (lo que escribió)\n${diarioTxt}`,
    // Aparte de la bitácora y no mezclado con ella: son textos más largos y
    // escritos sin filtro (nadie los lee mientras se escriben), así que valen
    // distinto como evidencia. Si fueran el mismo bloque, el modelo los trataría
    // como una entrada más de tres renglones.
    `### NOTAS (lo que escribió en su cuaderno, sin que nada le respondiera)\n${notasTxt}`,
    // ⚠️ VA DESPUÉS DE LAS ACTIVIDADES Y ANTES DE LOS VEREDICTOS, a propósito: un
    // objetivo es el marco largo donde caen las actividades de arriba, y leerlo
    // después ayuda a no confundir "no marcó nada esta semana" con "abandonó".
    `### OBJETIVOS DE LARGO ALIENTO (meses, no días. El arco importa más que la semana)\n${objetivosTxt}`,
    veredictoTxt ? `### LO QUE MATÍAS YA TE RESPONDIÓ SOBRE TUS OBSERVACIONES\n${veredictoTxt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Esquema que fuerza la forma de la respuesta. Sin esto, con el historial real
// (grande) el modelo devolvía un JSON con sus propias claves, en inglés, y el
// análisis se descartaba: por eso los patrones quedaban congelados.
const ESQUEMA_ANALISIS = {
  type: 'object',
  properties: {
    hiloCentral: { type: 'string' },
    observaciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          patron: { type: 'string' },
          evidencia: { type: 'string' },
          confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
          // Opcional a propósito: no toda relación da para probar algo, y un
          // experimento inventado para llenar el campo es peor que ninguno.
          experimento: { type: 'string' },
        },
        required: ['patron', 'evidencia', 'confianza'],
      },
    },
    // ⚠️ ACÁ NO VA `sugerencias`, Y ES A PROPÓSITO (28/07, decisión de Matías).
    // El prompt pedía un bloque de consejos que "empiece con un verbo", y de ahí
    // salían cosas como "Priorizá programar el bouldering como un compromiso
    // ineludible": un coach dando órdenes sobre algo que él había contado al
    // pasar. Su punto: **la máquina no tiene que decirte qué hacer con lo que
    // ve, tiene que verlo bien.** La conclusión la saca él.
    // Sacarlo del esquema es lo que de verdad lo apaga: mientras la clave siga
    // acá, el modelo la completa aunque el prompt no la pida.
  },
  required: ['hiloCentral', 'observaciones'],
} as const;

// Retándolo por lo mismo que ya dice el prompt, pero al final de todo y con las
// etiquetas que acaba de escribir a la vista. Es lo único que lo saca del modo
// "códigos temáticos" cuando entró en él.
const RETO = `Las observaciones que devolviste NO sirven: son ETIQUETAS sueltas ("dolor y persistencia", "gasto recurrente"), no patrones.
Una observación tiene que ser una ORACIÓN COMPLETA que conecte DOS cosas distintas de sus datos y nombre cuáles, así:
"Los días que jugás al fútbol con el pie lesionado, al día siguiente registrás el ánimo más bajo."
"Las semanas con varios gastos seguidos coinciden con menos energía."
Rehacelo. Ninguna observación puede ser un rótulo de dos o tres palabras: todas tienen que decir qué pasa cuando pasa otra cosa. El hiloCentral también tiene que ser una frase, no un título.`;

async function pedirAnalisis(datos: string, reto = false): Promise<ResultadoAnalisis | null> {
  try {
    const mensajes = reto
      ? [{ rol: 'user' as const, contenido: datos }, { rol: 'user' as const, contenido: RETO }]
      : [{ rol: 'user' as const, contenido: datos }];
    const crudo = await llamarRol('analista', mensajes, { esquema: ESQUEMA_ANALISIS });
    return parsear(crudo);
  } catch {
    return null;
  }
}

// Corre el análisis y persiste. Devuelve true si lo logró con IA.
export async function analizar(): Promise<boolean> {
  if (!(await ollamaDisponible())) return false;
  const datos = await armarDatos();
  // La misma ventana que ve el modelo en armarDatos: si cita algo de afuera, lo
  // inventó.
  const hasta = new Date().toISOString().slice(0, 10);
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  // Con el historial largo, el modelo se va a "códigos temáticos" y devuelve
  // etiquetas en vez de patrones. Se filtran; si no queda casi nada, se le
  // muestra el problema y se le pide de nuevo (una sola vez, tarda ~30s).
  let res = await pedirAnalisis(datos);
  if (res) {
    const filtrado = filtrarObservaciones(res, desde, hasta);
    if (filtrado.observaciones.length < 2 || !esHiloValido(filtrado.hiloCentral)) {
      const segundo = await pedirAnalisis(datos, true);
      const filtradoSegundo = segundo ? filtrarObservaciones(segundo, desde, hasta) : null;
      // Nos quedamos con el mejor de los dos intentos.
      res =
        filtradoSegundo && filtradoSegundo.observaciones.length >= filtrado.observaciones.length
          ? filtradoSegundo
          : filtrado;
    } else {
      res = filtrado;
    }
  }

  // Sin observaciones válidas no se guarda nada: es preferible dejar el análisis
  // anterior (que puede ser bueno) antes que pisarlo con una lista de rótulos.
  if (!res || res.observaciones.length === 0) return false;

  return guardarAnalisis(res);
}

/**
 * PERSISTE UNA LECTURA, VENGA DE DONDE VENGA.
 *
 * Se separó de `analizar()` el 29/07 para que el Analista pueda correr **sin el
 * modelo local**: `armarDatos()` arma el contexto, alguien lo lee y devuelve el
 * JSON, y esto lo guarda. Ese "alguien" hoy es Claude Code a mano (ver
 * `scripts/analisis-contexto.ts` y `scripts/analisis-guardar.ts`); mañana puede
 * ser la API de Anthropic, y pasado el modelo local otra vez.
 *
 * ⚠️ NO ES SOLO UN INSERT, y por eso vive acá y no en el script: una lectura
 * toca TRES cosas —la tabla `analisis`, las sugerencias pendientes y el perfil
 * vivo en `conocimiento`— y si el camino de afuera hiciera solo el insert, el
 * asistente seguiría hablando con lo que aprendió hace un mes sin que nadie se
 * dé cuenta.
 *
 * El filtro de observaciones NO se aplica acá: `analizar()` ya lo corre con su
 * ventana, y quien escribe a mano ya vio los datos.
 */
export async function guardarAnalisis(res: ResultadoAnalisis): Promise<boolean> {
  if (res.observaciones.length === 0) return false;

  const ahora = new Date().toISOString();
  await db.insert(analisis).values({ fecha: ahora, hiloCentral: res.hiloCentral, resultado: JSON.stringify(res) });

  // Reemplazar las sugerencias del Analista pendientes por las nuevas
  const pendientes = await db.select().from(sugerencias).where(eq(sugerencias.estado, 'pendiente'));
  for (const s of pendientes.filter((x) => x.tipo === 'analista')) {
    await db.update(sugerencias).set({ estado: 'descartada' }).where(eq(sugerencias.id, s.id));
  }
  for (const s of res.sugerencias) {
    await db.insert(sugerencias).values({ tipo: 'analista', contenido: s.texto, creado: ahora });
  }

  // PERFIL VIVO: el analista enriquece lo que el asistente sabe de la persona.
  // Entrada estable en `conocimiento` (título fijo → se reemplaza, no duplica),
  // que el asistente lee en cada charla junto al perfil del onboarding.
  //
  // ⚠️ LA REGLA SE MUDÓ A `lib/aprendizajes` (13/08) Y NO CAMBIÓ DE COMPORTAMIENTO.
  // Acá estaba enterrada en tres líneas adentro de una función que escribe en
  // cuatro tablas, así que no se podía probar sin una base. Allá tiene tests —
  // incluidos tres que **fijan el sesgo que hoy tiene**, para que el día que se
  // arregle se vea como un test que cambia y no como algo que nadie miró.
  const aprendido = textoAprendido(res.hiloCentral);
  await db.delete(conocimiento).where(eq(conocimiento.titulo, TITULO_APRENDIZAJES));
  await db.insert(conocimiento).values({ titulo: TITULO_APRENDIZAJES, contenido: aprendido.slice(0, 1500), activa: true, creado: ahora });

  await guardarComoHechos(res.observaciones, ahora);
  await guardarRelacionesCalculadas(ahora);
  return true;
}

/**
 * ── LO MISMO, PERO EN `hechos` (13/08) ───────────────────────────────────────
 *
 * Cada observación entra como un **patrón `no_confirmado` con origen
 * `analista`**, esperando el veredicto de Matías. A diferencia del párrafo de
 * arriba, esto NO se sobrescribe: se acumula, y lo que él ya contestó se queda
 * con su respuesta.
 *
 * ⚠️ CONVIVE CON EL PÁRRAFO A PROPÓSITO, Y ES TEMPORAL. El párrafo sigue siendo
 * lo único que el chat lee hasta que esta tabla tenga contenido; sacarlo hoy
 * dejaría al bot sin nada que saber de él durante una semana entera —hasta el
 * lunes que viene, que es cuando vuelve a correr esto—. Cuando `hechos` tenga
 * material, el párrafo se va. **Está anotado como deuda, no como diseño.**
 *
 * ⚠️ ENTRAN COMO `patron` Y NO COMO `episodio`, aunque no salgan de episodios
 * explicados. Es lo honesto: son deducciones del modelo sobre varios días, no
 * cosas que pasaron una vez. Por eso `saleDe` va vacío — y por eso **vencen**:
 * una deducción que él nunca confirmó no puede quedarse para siempre. Cuando la
 * confirma, `trasVeredicto` le limpia el vencimiento.
 */
async function guardarComoHechos(observaciones: ResultadoAnalisis['observaciones'], ahora: string) {
  const yaEstan = await db.select().from(hechos).where(eq(hechos.origen, 'analista'));
  const vence = new Date(Date.now() + DIAS_QUE_VIVE_UNA_DEDUCCION * 86_400_000).toISOString();

  for (const o of observaciones) {
    const contenido = o.patron.trim();
    if (!contenido) continue;
    // ⚠️ NO SE PISA LO QUE ÉL YA CONTESTÓ. Si el patrón ya está, se lo deja como
    // está: su veredicto es el dato más caro de la app y volver a insertarlo lo
    // devolvería a `no_confirmado`. Es el mismo error que el clasificador hacía
    // con los temas —comparar mal y crear uno nuevo cada vez— y que dejó 52
    // temas con un chat cada uno el 28/07.
    if (yaEstan.some((h) => mismoHecho(h.contenido, contenido))) continue;

    await db.insert(hechos).values({
      tipo: 'patron',
      contenido: contenido.slice(0, 500),
      porque: null,
      areaId: null, // el Analista no devuelve área; inventarla sería peor
      estado: 'no_confirmado',
      origen: 'analista',
      cuando: ahora,
      vence,
      saleDe: null,
      creado: ahora,
    });
  }
}

/** Cuánto vive una deducción del modelo que él nunca confirmó ni descartó. */
const DIAS_QUE_VIVE_UNA_DEDUCCION = 60;

/**
 * ── LO QUE SALE DE LA ARITMÉTICA, NO DEL MODELO (13/08) ──────────────────────
 *
 * Corre junto al Analista pero es otra cosa: cruces calculados sobre las filas,
 * **ya pasados por `lib/sesgos`**. Se distinguen por `origen: 'calculo'`.
 *
 * ⚠️ HOY ESTO ESCRIBE CERO, Y ESE ES EL RESULTADO CORRECTO. Medido el 13/08: de
 * 24 noches, 21 tienen ánimo el mismo día, y **solo UNA fue de menos de 6 horas**
 * — hacen falta tres. Los factores del ánimo caen todos por `mismo-acto`. O sea
 * que la máquina anda y los datos dicen que todavía no hay nada honesto que
 * decir, que es exactamente su regla.
 *
 * Se conecta igual, y a propósito: el día que aparezcan tres noches cortas, la
 * relación va a salir sola sin que nadie toque nada. **Dejar la tubería puesta
 * cuando todavía no hay agua es más barato que acordarse de ponerla después.**
 */
async function guardarRelacionesCalculadas(ahora: string) {
  const [animos, cuerpoRows] = await Promise.all([
    db.select().from(animoCheckins).where(isNull(animoCheckins.areaId)),
    db.select().from(cuerpo).where(eq(cuerpo.tipo, 'sueno')),
  ]);

  const checkins: CheckinAnimo[] = animos.map((a) => ({
    dia: a.creado.slice(0, 10),
    estado: a.estado,
    factores: listaJSON(a.factores),
  }));
  const noches: Noche[] = cuerpoRows
    .filter((c) => c.valor != null)
    .map((c) => ({ dia: c.creado.slice(0, 10), minutos: c.valor as number }));

  const encontradas = [
    suenoVersusAnimo(noches, checkins),
    ...animoVersusFactores(checkins).relaciones,
  ].filter((r): r is NonNullable<typeof r> => r != null);
  if (encontradas.length === 0) return;

  const yaEstan = await db.select().from(hechos).where(eq(hechos.origen, 'calculo'));
  const vence = new Date(Date.now() + DIAS_QUE_VIVE_UNA_DEDUCCION * 86_400_000).toISOString();

  for (const r of encontradas) {
    if (yaEstan.some((h) => mismoHecho(h.contenido, r.texto))) continue;
    await db.insert(hechos).values({
      tipo: 'patron',
      contenido: r.texto.slice(0, 500),
      porque: null,
      areaId: null,
      estado: 'no_confirmado',
      origen: 'calculo',
      cuando: ahora,
      vence,
      saleDe: null,
      creado: ahora,
    });
  }
}

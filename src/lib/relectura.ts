/**
 * Re-reading: something you wrote a while ago, handed back to you.
 *
 * The one piece of the home screen that gives before it asks — everything else
 * there wanted something from you first. The Spanish note below has the numbers
 * that made the case, measured over 47 days of real use.
 */
/**
 * LA RELECTURA: lo que escribiste hace un tiempo, devuelto.
 *
 * ⚠️⚠️ ES LA ÚNICA PIEZA DEL HOME QUE **DEVUELVE ANTES DE PEDIR**, y por eso
 * existe. Medido el 07/08 sobre 47 días de uso: **43 días marcaste y 17
 * escribiste**, y la app te devolvió 16 análisis. Todo lo que había arriba en el
 * Home era "atendeme" —marcá esto, contestá aquello—, así que la app pedía todos
 * los días y devolvía de vez en cuando.
 *
 * ⚠️ Y ES LA ÚNICA DE LAS TRES FORMAS DE JOURNALING QUE LA APP YA PUEDE HACER.
 * La página en blanco y el prompt guiado piden que el usuario cambie primero; la
 * relectura solo necesita lo que ya está guardado. Ataca de frente el pedido de
 * Matías del 05/08 —*"que el chat dé ganas de hablar, no solo de anotar"*—
 * desde el otro lado: **no vas a escribir más porque te lo pidan, vas a escribir
 * más si lo que escribiste vuelve.**
 *
 * ⚠️ NO DECIDE NADA NI ESCRIBE NADA. Elige un mensaje y devuelve por qué; la
 * pantalla arma la tarjeta.
 */

/** Antes de esto no es relectura, es la charla de esta semana. */
export const DIAS_MINIMOS = 14;

/**
 * ⚠️ Y UN TECHO, porque una frase de hace un año no se relee: se arqueologiza.
 * Tres meses es el rango donde todavía te acordás del contexto y a la vez ya
 * pasó suficiente como para que te sorprenda.
 */
export const DIAS_MAXIMOS = 90;

/** Menos que esto no es una idea, es un "ok". */
export const LARGO_MINIMO = 40;

/**
 * ⚠️⚠️ LOS MENSAJES QUE ESCRIBIÓ LA APP, NO ÉL. Cuando tocás "Charlar" en una
 * actividad o un disparador del Home, la app **manda un mensaje en primera
 * persona por vos** ("Quiero contarte cómo viene lo de Alemán"). Quedan
 * guardados con `rol: 'user'` y son indistinguibles de lo que escribiste vos.
 *
 * Releerle a alguien una frase que él nunca escribió es la peor forma posible de
 * fallar en esta función: **rompe justo la confianza que la tarjeta necesita.**
 * Por eso el filtro va por prefijo y no por heurística.
 * Ver `lib/disparadores.ts` y `charlar()` en `ActividadesUI`.
 */
const ARRANQUES_DE_LA_APP = [
  'quiero contarte cómo viene lo de',
  'quiero contarte cómo vengo durmiendo',
  'hace unos días quedamos en que iba a probar',
  'quiero hablar de algo que noté y confirmé',
  'últimamente aparece',
  'quiero pensar una decisión en voz alta',
];

/**
 * ⚠️ Y LO QUE ES UN PEDIDO AL BOT TAMPOCO SE RELEE. "¿Podés interpretar esta
 * charla?" es trabajo que le encargaste, no algo que pensaste. Devolvértelo dos
 * semanas después no te dice nada de vos.
 */
// ⚠️ El `[\s¿¡"'«]*` del arranque no es decorativo: sin él, `¿Podés…` no
// matchea porque el signo de apertura va PRIMERO. Lo agarró el test, no yo — y
// es el caso más frecuente, porque un pedido casi siempre se escribe como
// pregunta.
const PEDIDOS = /^[\s¿¡"'«]*(pod[eé]s|puedes|podr[íi]as|hac[eé]me|arm[aá]me|explicame|explícame|dame|mostrame|mostrá|busc[aá]|traduc)/i;

/**
 * ⚠️ Y LAS ÓRDENES A LA APP TAMPOCO. *"Quiero que aparezca entre mis notas que
 * mañana voy a escribir sobre…"* no es un pensamiento: es una instrucción. Se
 * parece a una reflexión porque empieza igual, y ahí está la trampa.
 */
const ORDENES = /^[\s¿¡"'«]*quiero que (aparezca|anotes|guardes|agregues|sumes|pongas)/i;

export type Candidata = { texto: string; fecha: string; dias: number };

/**
 * ⚠️⚠️ UN MENSAJE CON ADJUNTO NO SE PUEDE RELEER, y esta regla es estructural en
 * vez de una lista de frases prohibidas — que es lo que la vuelve confiable.
 * Cuando mandás una foto, la app escribe sola *"¿Qué ves en esta foto?"* (ver
 * `lib/chatEntrada.ts`); pero incluso si el texto fuera tuyo, **hablaba de algo
 * que la tarjeta no puede mostrar**. Sin la foto, la frase no significa nada.
 * Salió de probar contra los 96 mensajes reales: la relectura del día era
 * exactamente esa.
 */

/** Días enteros entre dos fechas YYYY-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00`);
  const b = Date.parse(`${hasta}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** ¿Esta frase la escribió él, o se la escribió la app? */
export function laEscribioEl(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  if (!t) return false;
  if (ARRANQUES_DE_LA_APP.some((a) => t.startsWith(a))) return false;
  if (ORDENES.test(t)) return false;
  return !PEDIDOS.test(t);
}

/**
 * LAS FRASES QUE SE PUEDEN RELEER, de la más reciente a la más vieja.
 *
 * `mensajes` son los suyos (`rol: 'user'`), con la fecha en que los escribió.
 *
 * ── ⚠️⚠️ SIN REPETIDAS, Y ESO SALIÓ DE UN BUG VISIBLE (18/08) ────────────────
 *
 * Cuando las relecturas pasaron a ser tarjetas de la baraja del bot, React tiró
 * *"two children with the same key: relectura-2026-07-29-…"* — **misma fecha y
 * mismo texto**. O sea que la lista traía la misma frase dos veces.
 *
 * 👉 Y NO ERA RARO NI UN CASO DE BORDE: escribís lo mismo dos veces seguidas —
 * un mensaje que se reenvía, una frase que repetís al día siguiente— y las dos
 * entran. Nunca se había notado porque en el Home se dibujaba **una sola** y las
 * demás vivían atrás de "Otro recuerdo": una lista con repetidos se veía igual
 * que una sin repetidos.
 *
 * ⚠️ **EL DUPLICADO NO ERA EL PROBLEMA DE REACT, ERA UN PROBLEMA DE PRODUCTO.**
 * La key repetida fue el síntoma que lo hizo visible, pero devolverte dos veces
 * la misma frase como si fueran dos recuerdos distintos ya estaba mal antes de
 * que existiera la baraja. Por eso se arregla acá —en quién arma la lista— y no
 * poniéndole un índice al id, que habría callado el warning dejando el duplicado
 * adentro.
 *
 * ⚠️ SE QUEDA LA MÁS RECIENTE de las repetidas, que es la primera que llega:
 * `mensajes` viene ordenado de nuevo a viejo, y `dias` ya está calculado por
 * mensaje, así que quedarse con la primera es quedarse con la de menos días.
 */
export function candidatas(
  mensajes: { texto: string; fecha: string; conAdjunto?: boolean }[],
  hoy: string,
): Candidata[] {
  return mensajes
    .filter((m) => !m.conAdjunto)
    .map((m) => ({ texto: m.texto.trim(), fecha: m.fecha, dias: diasEntre(m.fecha, hoy) }))
    .filter(
      (c) =>
        c.texto.length >= LARGO_MINIMO &&
        c.dias >= DIAS_MINIMOS &&
        c.dias <= DIAS_MAXIMOS &&
        laEscribioEl(c.texto),
    )
    .filter((c, i, todas) => todas.findIndex((o) => o.texto === c.texto) === i)
    .sort((a, b) => a.dias - b.dias);
}

/**
 * LAS CINCO MÁS FRESCAS, EMPEZANDO POR LA DE HOY.
 *
 * ⚠️ EL ORDEN NO ES UN DETALLE: la primera es la que se muestra sola, y las que
 * siguen son a las que llegás con "Otro recuerdo" (09/08). Rotar la lista en vez
 * de devolver un índice deja al componente sin ninguna cuenta que hacer — pide
 * la primera y listo.
 *
 * ⚠️ LA DE HOY SIGUE SIENDO LA MISMA TODO EL DÍA. Rota por día del año, sin
 * guardar nada: mañana la lista arranca en otra. Lo que cambió el 09/08 es que
 * ahora podés adelantarte a mano; lo que NO cambió es que sola no se mueve.
 */
export function relecturasDelDia(cs: Candidata[], hoy: string): Candidata[] {
  if (cs.length === 0) return [];
  const d = new Date(`${hoy}T00:00:00`);
  const diaDelAno = Math.floor((d.getTime() - Date.parse(`${d.getFullYear()}-01-01T00:00:00`)) / 86_400_000);
  const pool = cs.slice(0, 5);
  const desde = diaDelAno % pool.length;
  return [...pool.slice(desde), ...pool.slice(0, desde)];
}

/**
 * CUÁL SE MUESTRA HOY. La primera de `relecturasDelDia`.
 *
 * ⚠️ UNA SOLA Y LA MISMA TODO EL DÍA. Si cambiara en cada refresh dejaría de ser
 * un recuerdo y pasaría a ser un carrusel.
 */
export function relecturaDelDia(cs: Candidata[], hoy: string): Candidata | null {
  return relecturasDelDia(cs, hoy)[0] ?? null;
}

/**
 * EL ID DE UNA RELECTURA EN LA BARAJA DEL BOT.
 *
 * ── ⚠️⚠️ POR QUÉ NO ALCANZABA CON LO OBVIO (18/08, bug) ─────────────────────
 *
 * La primera versión armaba el id con `haceCuanto(dias)` y los primeros 24
 * caracteres del texto, y React tiró *"encountered two children with the same
 * key"*. **Las dos piezas que elegí eran las dos que no distinguen nada:**
 *
 *  · `haceCuanto` es un EMBUDO a propósito: mete 21 a 44 días en "hace un mes".
 *    Dos frases de días distintos salen con el mismo rótulo — es su trabajo.
 *  · Y 24 caracteres alcanzan para el arranque de una frase, no para la frase.
 *    Dos mensajes que empiezan igual ("Quiero dejar de…") chocan.
 *
 * 👉 **LA LECCIÓN: un id no se arma con lo que se MUESTRA.** Lo que se muestra
 * está redondeado y recortado justamente para que se lea bien, y las dos cosas
 * borran diferencias. Se arma con lo que la identifica: la fecha real del
 * mensaje y su texto entero.
 *
 * ⚠️ EL TEXTO VA HASHEADO Y NO ENTERO porque este id viaja a una cookie — la de
 * descartadas — y meter frases completas ahí la haría crecer sin techo.
 *
 * ⚠️ Y ES ESTABLE ENTRE DÍAS, que es lo que el descarte necesita: `relecturasDelDia`
 * ROTA el orden cada día, así que un id con el índice le pasaría mañana el
 * descarte de hoy a otra frase. La fecha del mensaje no rota.
 */
export function idRelectura(c: { texto: string; fecha: string }): string {
  // djb2, que es corto, estable y no necesita una dependencia. No es
  // criptográfico y no hace falta que lo sea: separa frases, no protege nada.
  let h = 5381;
  for (let i = 0; i < c.texto.length; i++) h = ((h << 5) + h + c.texto.charCodeAt(i)) | 0;
  return `relectura-${c.fecha}-${(h >>> 0).toString(36)}`;
}

/**
 * "HACE DOS SEMANAS", "HACE UN MES". En palabras, porque una fecha exacta
 * ("el 23 de julio") obliga a calcular; lo que importa es la distancia.
 */
export function haceCuanto(dias: number): string {
  if (dias < 21) return `hace ${Math.round(dias / 7)} semanas`;
  if (dias < 45) return 'hace un mes';
  if (dias < 75) return 'hace dos meses';
  return 'hace tres meses';
}

/**
 * CÓMO VINO EL ÁNIMO DESDE ESE DÍA.
 *
 * ⚠️⚠️ ES EL CRUCE, Y ES LO QUE HACE ÚTIL A LA TARJETA. Devolverte una frase
 * tuya es memoria; ponerle al lado qué pasó después es la única parte que vos no
 * podés hacer de cabeza. Sin esto, la relectura es un álbum de fotos.
 *
 * ⚠️ PIDE UN MÍNIMO DE 3 REGISTROS. Con uno o dos no hay "cómo vino": hay dos
 * datos sueltos, y presentarlos como tendencia sería inventar una lectura.
 */
export const MINIMO_PARA_CRUZAR = 3;

export function animoDesde(
  checkins: { fecha: string; estado: string }[],
  desde: string,
): { total: number; bajones: number } | null {
  const posteriores = checkins.filter((c) => c.fecha > desde);
  if (posteriores.length < MINIMO_PARA_CRUZAR) return null;
  return {
    total: posteriores.length,
    bajones: posteriores.filter((c) => c.estado === 'bajon').length,
  };
}

/**
 * La frase del cruce.
 *
 * ⚠️ NUNCA FELICITA NI RETA. "Ninguna fue un bajón" es un hecho; "¡qué bien
 * venís!" sería la app opinando sobre tu vida a partir de cuatro toques. Y del
 * otro lado, con bajones, dice cuántos y se calla: es la misma regla que hizo
 * que la tarjeta del foco dejara de felicitar por lo que habías abandonado.
 */
export function textoDelCruce(a: { total: number; bajones: number }): string {
  const veces = `${a.total} ${a.total === 1 ? 'vez' : 'veces'}`;
  if (a.bajones === 0) return `Desde entonces anotaste cómo estabas ${veces}, y ninguna fue un bajón.`;
  if (a.bajones === a.total) return `Desde entonces anotaste cómo estabas ${veces}, y todas fueron bajones.`;
  return `Desde entonces anotaste cómo estabas ${veces}, y ${a.bajones} ${a.bajones === 1 ? 'fue un bajón' : 'fueron bajones'}.`;
}

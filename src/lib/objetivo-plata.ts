/**
 * OBJETIVOS DE PLATA: juntar para algo, y saber cuándo llegás.
 *
 * Decisión de Matías (02/08): *"objetivos de cuánto uno guarda dinero, si quiere
 * hacer un viaje… darle valor al usuario, no darle cosas para que haga"*.
 *
 * ── ⚠️ POR QUÉ EL PROGRESO NO SALE DE LOS GASTOS ─────────────────────────────
 *
 * La tentación era calcular el ahorro solo: ingresos menos gastos. **No se
 * puede, y fingir que sí sería el peor error posible en esta pantalla.** La app
 * conoce una parte de lo que gastás (lo que le contaste y los tickets que
 * sacaste), y de lo que entra no sabe absolutamente nada. Un "ahorraste 740 €"
 * calculado sobre eso es un número inventado con cara de dato, que es la regla
 * que más veces se repitió en este proyecto.
 *
 * Entonces el progreso son APORTES: vos decís "aparté 100". Un número y un
 * toque. Es honesto, y de paso es lo único que la app puede afirmar.
 *
 * Los gastos siguen sirviendo, pero para otra cosa: para la sección de "qué se
 * repite" y para el cruce con el ánimo. Nunca para el progreso.
 */

export type Aporte = { monto: number; creado: string };

export type ObjetivoPlata = {
  titulo: string;
  montoMeta: number;
  moneda: string;
  arranco: string; // YYYY-MM-DD
};

/** Cuánto llevás juntado. */
export function juntado(aportes: Aporte[]): number {
  return aportes.reduce((n, a) => n + (Number.isFinite(a.monto) ? a.monto : 0), 0);
}

/** De 0 a 1, sin pasarse: una barra al 140% no significa nada. */
export function avance(aportes: Aporte[], montoMeta: number): number {
  if (!(montoMeta > 0)) return 0;
  return Math.min(1, juntado(aportes) / montoMeta);
}

/**
 * Cuánto venís apartando por mes.
 *
 * ⚠️ SE DIVIDE POR LOS MESES QUE PASARON, NO POR LOS MESES CON APORTE. Si en
 * cinco meses aportaste en dos, tu ritmo real es el de cinco: dividir por dos
 * daría un promedio lindo y una proyección que no se va a cumplir. La pantalla
 * dice cuándo llegás de verdad, no cuándo llegarías si todos los meses fueran
 * como los buenos.
 */
export function ritmoMensual(aportes: Aporte[], arranco: string, ahora: Date = new Date()): number {
  if (aportes.length === 0) return 0;
  const desde = new Date(`${arranco}T12:00:00`);
  if (Number.isNaN(desde.getTime())) return 0;
  const dias = Math.max(1, (ahora.getTime() - desde.getTime()) / 86_400_000);
  // Mínimo un mes: con doce días de historia, extrapolar a un mes exagera.
  const meses = Math.max(1, dias / 30.44);
  return juntado(aportes) / meses;
}

/**
 * En qué mes llegás si seguís así. `null` cuando no se puede decir.
 *
 * ⚠️ DEVUELVE `null` EN DOS CASOS Y LOS DOS IMPORTAN: sin aportes todavía (no
 * hay ritmo que proyectar) y con la meta ya alcanzada (no hay nada que
 * proyectar). En los dos, la pantalla tiene que decir otra cosa en vez de una
 * fecha inventada.
 */
export function cuandoLlegas(
  aportes: Aporte[],
  objetivo: Pick<ObjetivoPlata, 'montoMeta' | 'arranco'>,
  ahora: Date = new Date(),
): Date | null {
  const falta = objetivo.montoMeta - juntado(aportes);
  if (falta <= 0) return null;
  const ritmo = ritmoMensual(aportes, objetivo.arranco, ahora);
  if (ritmo <= 0) return null;
  const meses = falta / ritmo;
  // ⚠️ Techo de 40 años: con un ritmo mínimo la cuenta da fechas absurdas
  // ("llegás en 2187") que se leen como un error de la app, no como una
  // advertencia. Arriba de eso conviene no decir nada.
  if (meses > 480) return null;
  const d = new Date(ahora);
  d.setMonth(d.getMonth() + Math.ceil(meses));
  return d;
}

/**
 * QUÉ PASARÍA SI APARTARAS OTRA CANTIDAD.
 *
 * Es la palanca del mockup del 02/08, y la razón por la que existe: contesta
 * *"cuánto se puede hacer más eficiente"* **sin que la app recomiende nada**.
 * Movés vos, la app hace la cuenta.
 *
 * ⚠️ ES LA DIFERENCIA ENTRE ARITMÉTICA Y CONSEJO, y no es un detalle de tono:
 * "gastás mucho en salidas" es un juicio y encima, en plata, roza el
 * asesoramiento financiero — que en la UE necesita licencia. "Si esto fuera 55,
 * sería enero" es una cuenta que hiciste vos.
 */
export function siApartaras(
  aportes: Aporte[],
  objetivo: Pick<ObjetivoPlata, 'montoMeta'>,
  porMes: number,
  ahora: Date = new Date(),
): Date | null {
  const falta = objetivo.montoMeta - juntado(aportes);
  if (falta <= 0) return null;
  if (!(porMes > 0)) return null;
  const meses = falta / porMes;
  if (meses > 480) return null;
  const d = new Date(ahora);
  d.setMonth(d.getMonth() + Math.ceil(meses));
  return d;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * "en marzo" si cae dentro de los próximos once meses; "en marzo de 2029" si no.
 *
 * ⚠️ EL CORTE ES POR MESES DE DISTANCIA, NO POR AÑO CALENDARIO. La primera
 * versión decía "del año que viene" solo cuando cambiaba el año, y en agosto de
 * 2026 una proyección a mayo de 2027 se leía **"en mayo"** — que suena a dentro
 * de nueve meses o a hace tres, según cómo lo leas. Con el corte por distancia,
 * "en mayo" siempre significa el mayo que viene.
 *
 * Sin día: prometer el 14 de marzo con una proyección hecha sobre cinco meses de
 * aportes es precisión falsa. El mes ya dice lo que hay que decir.
 */
export function mesDe(d: Date, ahora: Date = new Date()): string {
  const mes = MESES[d.getMonth()];
  const meses = (d.getFullYear() - ahora.getFullYear()) * 12 + (d.getMonth() - ahora.getMonth());
  return meses <= 11 ? `en ${mes}` : `en ${mes} de ${d.getFullYear()}`;
}

/**
 * CUÁNTO TENÉS QUE APARTAR PARA LLEGAR A LA FECHA.
 *
 * Pedido de Matías (06/08): *"estaría bueno que sea inteligente y me diga,
 * tendrías que ahorrar más o menos tanto por semana o por día; si apartás por
 * día tanto, vas a llegar a esta cifra"*.
 *
 * ── ⚠️ ES EL INVERSO DE `siApartaras`, Y ESA ES TODA LA DIFERENCIA ──────────
 *
 * `siApartaras` contesta *"si pongo 100 por mes, ¿cuándo llego?"*: movés vos, la
 * app hace la cuenta. Esta contesta *"tengo fecha, ¿cuánto por semana?"*, que es
 * la pregunta que uno se hace de verdad cuando el viaje ya tiene día.
 *
 * ⚠️ SIGUE SIENDO ARITMÉTICA, NO CONSEJO, y hay que cuidarlo porque acá se roza
 * el borde: la frase dice **cuánto falta dividido en cuánto tiempo queda**, no
 * "deberías ahorrar". La app no sabe qué entra ni qué podés recortar (ver la
 * nota de arriba sobre por qué el progreso no sale de los gastos), así que
 * cualquier "deberías" sería un consejo financiero sin los datos para darlo.
 *
 * ⚠️ EL DÍA SOLO SE OFRECE SI DA UNA CIFRA QUE SIGNIFIQUE ALGO. Con 1.500 € en
 * 70 días son 21 por día y se entiende; con 1.500 € en 3 años son 1,37 por día,
 * un número que no le sirve a nadie para decidir. Por eso `porDia` puede venir
 * en `null` mientras `porSemana` tiene valor.
 */
export type RitmoNecesario = {
  /** Lo que falta juntar. */
  falta: number;
  /** Días que quedan hasta la fecha. Nunca menos de 1. */
  diasRestantes: number;
  porSemana: number;
  /** null cuando la cifra diaria es tan chica que no informa (ver arriba). */
  porDia: number | null;
  /** Ya llegaste, o la fecha ya pasó: no hay ritmo que calcular. */
  cumplido: boolean;
};

/** Abajo de esto, la cifra por día deja de ayudar a decidir. */
const MINIMO_POR_DIA = 2;

export function ritmoNecesario(
  aportes: Aporte[],
  objetivo: Pick<ObjetivoPlata, 'montoMeta'>,
  fechaMeta: string | null | undefined,
  ahora: Date = new Date(),
): RitmoNecesario | null {
  if (!fechaMeta) return null;
  const meta = new Date(`${fechaMeta}T23:59:59`);
  if (Number.isNaN(meta.getTime())) return null;

  const falta = objetivo.montoMeta - juntado(aportes);
  if (falta <= 0) return { falta: 0, diasRestantes: 0, porSemana: 0, porDia: null, cumplido: true };

  const dias = Math.ceil((meta.getTime() - ahora.getTime()) / 86_400_000);
  // La fecha ya pasó: no se proyecta hacia atrás. Que lo diga la pantalla.
  if (dias <= 0) return { falta, diasRestantes: 0, porSemana: 0, porDia: null, cumplido: false };

  const porDiaCrudo = falta / dias;
  return {
    falta,
    diasRestantes: dias,
    porSemana: porDiaCrudo * 7,
    porDia: porDiaCrudo >= MINIMO_POR_DIA ? porDiaCrudo : null,
    cumplido: false,
  };
}

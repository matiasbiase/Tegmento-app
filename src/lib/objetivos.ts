/**
 * Objetivos: el arco largo de tiempo invertido en algo grande.
 *
 * Todo lo de acá es puro y sin base de datos. **Y es donde vive la regla que
 * gobierna la sección**, así que conviene leerla antes de tocar nada:
 *
 * ── LOS DOS TIPOS ─────────────────────────────────────────────────────────────
 *  - ABIERTO (sin `fechaMeta`): "buscar trabajo". NO tiene total, porque nadie
 *    sabe cuántas horas son. Muestra tiempo acumulado y el arco, y **nunca un
 *    porcentaje ni un "falta poco"**: los inventaría.
 *  - CON META (con `fechaMeta`): "alemán B2, examen el 15/11". El total existe,
 *    así que sí puede mostrar progreso y proyectar cuánto falta. No adivina:
 *    hace aritmética sobre las horas que ya puso.
 *
 * ⚠️ Esa línea la pidió Matías (30/07) y no es cosmética. Un porcentaje sobre un
 * objetivo abierto necesita un denominador que no existe; cuando la app inventa
 * una cifra, le arruina la credibilidad a todas las demás — es exactamente la
 * lección que costó dos arreglos en la confianza del Analista.
 *
 * ⚠️ Y NADA DE ARENGAS EN NINGUNO DE LOS DOS. Ni "no aflojes", ni "vas muy
 * bien", ni signos de exclamación. El empuje sale del hecho contado: "dos
 * semanas sin moverlo, antes de eso nueve meses" funciona porque es verdad, no
 * porque anime. Si una frase de acá se puede leer con voz de entrenador, está
 * mal escrita.
 */

const MS_DIA = 86_400_000;

export type Objetivo = {
  id: number;
  titulo: string;
  areaId: number | null;
  arranco: string;
  estado: string;
  cerrado: string | null;
  meta: string | null;
  fechaMeta: string | null;
  horasEstimadas: number | null;
  horasPorVez: number | null;
};

/** Un movimiento, venga de donde venga (anotado a mano o deducido). */
export type Movimiento = {
  fecha: string; // YYYY-MM-DD
  horas: number | null;
  nota: string | null;
  /** De dónde salió: sirve para decírselo al usuario, nunca se esconde. */
  origen: 'manual' | 'actividad' | 'evento';
};

/** ¿Este objetivo puede hablar de progreso y de cuánto falta? */
export function tieneMeta(o: Pick<Objetivo, 'fechaMeta'>): boolean {
  return !!o.fechaMeta;
}

// ── EL ARCO ──────────────────────────────────────────────────────────────────

/** Días enteros entre dos fechas YYYY-MM-DD. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00`);
  const b = Date.parse(`${hasta}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_DIA));
}

/**
 * "9 meses y 2 semanas", "1 año y 4 meses", "6 días".
 *
 * ⚠️ La unidad la elige el largo, y eso importa: "0 meses" en un objetivo de seis
 * días lo convierte en un fracaso el primer día. Se sube de unidad recién cuando
 * la de abajo ya no alcanza para contar la historia.
 */
export function arcoEnPalabras(desde: string, hasta: string): string {
  const dias = diasEntre(desde, hasta);
  if (dias < 14) return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  if (dias < 60) return `${Math.floor(dias / 7)} semanas`;

  // ⚠️ LOS MESES SE CUENTAN POR CALENDARIO, no dividiendo los días por 30,44.
  // Con el promedio, un año justo (365 días) daba 11,99 → `Math.floor` → **"11
  // meses y 4 semanas"**, que es la clase de número que hace desconfiar de todo
  // lo demás en la pantalla. Lo cazó un test.
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // Todavía no llegó al día del mes: ese mes no está cumplido.
  if (b.getDate() < a.getDate()) meses -= 1;

  if (meses < 12) {
    // Lo que sobra se mide desde el aniversario del mes, no desde una división.
    const aniv = new Date(a.getFullYear(), a.getMonth() + meses, a.getDate());
    const restoSemanas = Math.floor(Math.round((b.getTime() - aniv.getTime()) / MS_DIA) / 7);
    const m = `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    return restoSemanas >= 1 ? `${m} y ${restoSemanas} ${restoSemanas === 1 ? 'semana' : 'semanas'}` : m;
  }

  const anios = Math.floor(meses / 12);
  const restoMeses = meses % 12;
  const txt = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  return restoMeses >= 1 ? `${txt} y ${restoMeses} ${restoMeses === 1 ? 'mes' : 'meses'}` : txt;
}

/**
 * ¿La tira se dibuja en semanas o en meses?
 *
 * Con menos de dos meses de arco, en MESES: un objetivo de seis días se vería
 * como diez columnas vacías, o sea como un fracaso antes de empezar.
 */
export function granularidad(desde: string, hasta: string): 'semanas' | 'meses' {
  return diasEntre(desde, hasta) < 60 ? 'semanas' : 'meses';
}

export type Columna = {
  /** Etiqueta corta: "jul" o la semana. */ clave: string;
  /** Cuántos movimientos cayeron ahí. */ cuantos: number;
  /** Alto relativo, 0-100. El vacío queda en 0 y se pinta gris, nunca rojo. */ alto: number;
};

/**
 * La tira del arco: una columna por período, la altura relativa al período más
 * movido.
 *
 * El vacío devuelve `alto: 0` y `cuantos: 0`. La pantalla lo pinta gris y
 * chiquito — **nunca rojo y nunca marcado como hueco**: que se vea que no pasó
 * nada, sin que se lea como un reto.
 */
export function serieArco(
  movimientos: Movimiento[],
  desde: string,
  hasta: string,
  cuantas = 10,
): Columna[] {
  const porMes = granularidad(desde, hasta) === 'meses';
  const fin = new Date(`${hasta}T00:00:00`);
  const cols: Columna[] = [];

  for (let i = cuantas - 1; i >= 0; i--) {
    if (porMes) {
      const d = new Date(fin.getFullYear(), fin.getMonth() - i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      cols.push({ clave, cuantos: movimientos.filter((m) => m.fecha.slice(0, 7) === clave).length, alto: 0 });
    } else {
      // Semanas contadas para atrás desde `hasta`, de 7 días exactos: no importa
      // en qué día de la semana caen, importa que sean tramos iguales.
      const finSem = new Date(fin.getTime() - i * 7 * MS_DIA);
      const iniSem = new Date(finSem.getTime() - 6 * MS_DIA);
      const a = iso(iniSem);
      const b = iso(finSem);
      cols.push({ clave: b, cuantos: movimientos.filter((m) => m.fecha >= a && m.fecha <= b).length, alto: 0 });
    }
  }

  const max = Math.max(...cols.map((c) => c.cuantos), 0);
  return cols.map((c) => ({ ...c, alto: max === 0 ? 0 : Math.round((c.cuantos / max) * 100) }));
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── LO QUE LA APP "DICE" ─────────────────────────────────────────────────────

/**
 * La frase que reencuadra el hueco. Es lo único que esta pantalla afirma, y
 * afirma un HECHO CONTADO, no un consejo.
 *
 * Sale de la frase de Matías: *"miro los otros nueve meses y digo: che, estuve
 * trabajando, no estoy tan lejos"*. La estructura es siempre la misma —lo que
 * pasó hace poco, y después el arco entero— porque es el orden que hace que el
 * hueco se lea chico al lado de lo hecho.
 *
 * Devuelve null cuando no hay nada honesto que decir. **Callarse es una opción
 * válida**: inventar una frase para llenar el lugar es cómo empieza una arenga.
 */
export function reencuadre(movimientos: Movimiento[], objetivo: Pick<Objetivo, 'arranco'>, hoy: string): string | null {
  const dias = diasEntre(objetivo.arranco, hoy);

  if (movimientos.length === 0) {
    if (dias < 14) return `Arrancó hace ${dias} ${dias === 1 ? 'día' : 'días'}. Todavía no hay arco para mirar.`;
    // Arco largo y ningún movimiento: pasa al crear un objetivo que viene de
    // antes que la app. No se calla —una tarjeta muda no se entiende— pero
    // tampoco se inventa nada: se dice el hecho y CÓMO se va a llenar, que es lo
    // único útil en ese momento.
    return `Anotado desde el ${desdeCorto(objetivo.arranco)}, sin movimientos todavía. Se van a sumar solos cuando marques algo que se llame parecido.`;
  }

  const ultima = movimientos.map((m) => m.fecha).sort().at(-1) as string;
  const sinMover = diasEntre(ultima, hoy);
  const arco = arcoEnPalabras(objetivo.arranco, hoy);

  // Recién empezado: no hay arco largo que contar todavía, y pretender que sí lo
  // hay sería la primera mentira de la pantalla.
  if (dias < 21) {
    return `Arrancó hace ${arco}. En un par de semanas se empieza a ver la forma.`;
  }

  // El caso que motivó la pantalla entera: un hueco reciente contra un arco largo.
  if (sinMover >= 10) {
    const hueco = sinMover >= 30 ? arcoEnPalabras(ultima, hoy) : `${Math.floor(sinMover / 7)} semanas`;
    return `${mayus(hueco)} sin moverlo. Antes de eso, ${arco}.`;
  }

  // Movimiento reciente: se cuenta el arco, sin felicitar a nadie.
  return `Lo venís moviendo. ${mayus(arco)} en esto.`;
}

function mayus(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "12/10/2025" a partir de un YYYY-MM-DD. */
function desdeCorto(iso: string): string {
  return iso.split('-').reverse().join('/');
}

// ── HORAS ────────────────────────────────────────────────────────────────────

/**
 * Cuántas horas hay puestas, y si se puede decir el número.
 *
 * ⚠️ LAS HORAS QUE NO SE SABEN NO SE ESTIMAN. Un movimiento sin horas solo
 * cuenta como movimiento. La única forma de que una actividad marcada valga
 * horas es que Matías haya dicho cuánto le lleva cada vez (`horasPorVez`): así
 * la estimación es de él, no un promedio que la app se inventó. Sin eso,
 * `horas` vuelve null y la pantalla muestra la cantidad de movimientos y nada
 * más — que es la verdad.
 */
export function horasPuestas(
  movimientos: Movimiento[],
  horasPorVez: number | null,
): { horas: number | null; movimientos: number; estimadas: boolean } {
  let total = 0;
  let algunaReal = false;
  let algunaEstimada = false;

  for (const m of movimientos) {
    if (m.horas != null) {
      total += m.horas;
      algunaReal = true;
    } else if (horasPorVez != null) {
      total += horasPorVez;
      algunaEstimada = true;
    }
  }

  if (!algunaReal && !algunaEstimada) return { horas: null, movimientos: movimientos.length, estimadas: false };
  return {
    horas: Math.round(total * 10) / 10,
    movimientos: movimientos.length,
    // Si alguna se estimó, el número se muestra con "~": no es lo mismo saber
    // que suponer, y la diferencia tiene que estar a la vista.
    estimadas: algunaEstimada,
  };
}

// ── SOLO PARA LOS QUE TIENEN META ────────────────────────────────────────────

export type Progreso = { porcentaje: number; hechas: number; totales: number };

/**
 * La barra de progreso. **Solo existe si hay meta Y horas estimadas.**
 *
 * Devuelve null en cualquier otro caso, y eso es lo que impide que un objetivo
 * abierto muestre un porcentaje: sin denominador no hay fracción.
 */
export function progresoDeMeta(o: Pick<Objetivo, 'fechaMeta' | 'horasEstimadas'>, horas: number | null): Progreso | null {
  if (!o.fechaMeta || !o.horasEstimadas || o.horasEstimadas <= 0 || horas == null) return null;
  return {
    porcentaje: Math.min(100, Math.round((horas / o.horasEstimadas) * 100)),
    hechas: horas,
    totales: o.horasEstimadas,
  };
}

export type Proyeccion = { llega: boolean; texto: string };

/**
 * "Al ritmo de los últimos dos meses, llegás con tres semanas de sobra."
 *
 * ⚠️ EL RITMO VA SIEMPRE EN LA FRASE. Sin decir de dónde sale, "llegás con tres
 * semanas de sobra" es un oráculo; con el ritmo adelante es una cuenta que se
 * puede discutir. Por eso el texto lo arma esta función y no la pantalla: si
 * fuera la pantalla, alguien iba a mostrar el resultado sin la premisa.
 *
 * ⚠️ Y SI VA ATRASADO, LO DICE IGUAL. Una app que solo habla cuando la noticia
 * es linda deja de ser creíble justo cuando más la necesitás. El tono es el
 * mismo en los dos casos: un cálculo, sin dramatizar y sin alentar.
 *
 * Devuelve null cuando no hay con qué calcular (sin meta, sin horas estimadas, o
 * con un ritmo de cero: no se puede proyectar desde la nada).
 */
export function proyeccion(
  o: Pick<Objetivo, 'fechaMeta' | 'horasEstimadas'>,
  horas: number | null,
  horasPorSemanaReciente: number,
  hoy: string,
): Proyeccion | null {
  if (!o.fechaMeta || !o.horasEstimadas || horas == null) return null;
  const semanasQueQuedan = diasEntre(hoy, o.fechaMeta) / 7;
  if (semanasQueQuedan <= 0) return null;

  const faltan = o.horasEstimadas - horas;
  if (faltan <= 0) {
    return { llega: true, texto: `Ya pusiste las ${o.horasEstimadas} h que calculaste. Lo que sigue es la fecha.` };
  }
  if (horasPorSemanaReciente <= 0) {
    const necesarias = Math.round((faltan / semanasQueQuedan) * 10) / 10;
    return {
      llega: false,
      texto: `No lo movés desde hace un rato. Para llegar a la fecha harían falta unas ${necesarias} h por semana.`,
    };
  }

  const semanasQueNecesita = faltan / horasPorSemanaReciente;
  const sobra = Math.floor(semanasQueQuedan - semanasQueNecesita);

  if (semanasQueNecesita <= semanasQueQuedan) {
    return {
      llega: true,
      texto:
        sobra >= 1
          ? `Al ritmo de las últimas semanas, llegás con ${sobra} ${sobra === 1 ? 'semana' : 'semanas'} de sobra.`
          : 'Al ritmo de las últimas semanas, llegás justo.',
    };
  }
  const necesarias = Math.round((faltan / semanasQueQuedan) * 10) / 10;
  return {
    llega: false,
    texto: `Al ritmo de las últimas semanas no llegás. Harían falta unas ${necesarias} h por semana.`,
  };
}

/** Horas por semana en la ventana reciente, para alimentar la proyección. */
export function ritmoReciente(
  movimientos: Movimiento[],
  horasPorVez: number | null,
  hoy: string,
  semanas = 8,
): number {
  const desde = iso(new Date(Date.parse(`${hoy}T00:00:00`) - semanas * 7 * MS_DIA));
  const recientes = movimientos.filter((m) => m.fecha >= desde);
  const { horas } = horasPuestas(recientes, horasPorVez);
  if (horas == null) return 0;
  return Math.round((horas / semanas) * 100) / 100;
}

// ── ESTIMAR EL PRÓXIMO, DESDE LOS CERRADOS ───────────────────────────────────

/**
 * "Las tres mudanzas que registraste te llevaron entre 5 y 8 semanas."
 *
 * ⚠️ SALE DE LOS OBJETIVOS YA CERRADOS DE MATÍAS, y se dice como RANGO. Un "te
 * va a llevar 6 semanas" es una predicción; "las tres anteriores te llevaron
 * entre 5 y 8" es un dato suyo que él interpreta. Es la misma regla que gobierna
 * al Analista: evidencia contada, no veredicto.
 *
 * ⚠️ CON UN SOLO CASO DEVUELVE null. Un caso no es un rango, y presentarlo como
 * tal sería darle a un dato el peso de tres. Callarse es lo honesto.
 */
export function estimarDeCerrados(cerrados: Pick<Objetivo, 'titulo' | 'arranco' | 'cerrado'>[]): string | null {
  const largos = cerrados
    .filter((o) => o.cerrado)
    .map((o) => diasEntre(o.arranco, o.cerrado as string))
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  if (largos.length < 2) return null;

  const min = Math.max(1, Math.round(largos[0] / 7));
  const max = Math.round(largos[largos.length - 1] / 7);
  const cuantos = largos.length;
  if (min === max) return `Los ${cuantos} que cerraste te llevaron ${min} ${min === 1 ? 'semana' : 'semanas'}.`;
  return `Los ${cuantos} que cerraste te llevaron entre ${min} y ${max} semanas.`;
}

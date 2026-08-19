// La grilla de días de una actividad diaria: qué días se muestran, cuáles se
// pueden pintar y cuántos seguidos venís.
//
// Regla de fondo (decisión de Matías): SOLO se puede marcar hoy o ayer. Si se
// pudiera rellenar la semana entera de memoria, el dato deja de servir para que
// el Analista cruce actividades con ánimo.

/** Días visibles en la grilla. */
export const DIAS_VISIBLES = 7;

/** Cuántos días para atrás se pueden pintar (0 = hoy, 1 = también ayer). */
export const DIAS_EDITABLES = 1;

const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Fecha local a YYYY-MM-DD. Local a propósito: el día es el del usuario. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumarDias(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

export type DiaGrilla = {
  fecha: string; // YYYY-MM-DD
  dia: number; // número del día del mes, lo que se ve en el cuadrito
  dow: string; // inicial del día de la semana
  esHoy: boolean;
  editable: boolean;
};

/**
 * Los últimos `dias` días terminando en hoy, del más viejo al más nuevo (así se
 * leen de izquierda a derecha, como en un calendario).
 */
export function grillaDias(hoy: Date = new Date(), dias: number = DIAS_VISIBLES): DiaGrilla[] {
  const out: DiaGrilla[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = sumarDias(hoy, -i);
    out.push({
      fecha: ymd(d),
      dia: d.getDate(),
      dow: DOW[d.getDay()],
      esHoy: i === 0,
      editable: i <= DIAS_EDITABLES,
    });
  }
  return out;
}

/**
 * La grilla de un mes entero, para transcribir la hoja de papel. Acá NO corre la
 * regla de hoy/ayer: si lo fuiste pintando en papel día a día, pasarlo a la app
 * es transcribir, no rellenar de memoria. Lo único que se bloquea es el futuro.
 */
export function grillaMes(mes: string, hoy: Date = new Date()): DiaGrilla[] {
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const anio = Number(m[1]);
  const mesNum = Number(m[2]);
  if (mesNum < 1 || mesNum > 12) return [];

  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const hoyYmd = ymd(hoy);
  const out: DiaGrilla[] = [];
  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = `${mes}-${String(d).padStart(2, '0')}`;
    const fd = new Date(anio, mesNum - 1, d);
    out.push({
      fecha,
      dia: d,
      dow: DOW[fd.getDay()],
      esHoy: fecha === hoyYmd,
      editable: fecha <= hoyYmd,
    });
  }
  return out;
}

/** Metas de frecuencia que se pueden elegir: de 1 a 7 veces por semana. */
export const METAS_POSIBLES = [1, 2, 3, 4, 5, 6, 7] as const;

export type ProgresoMeta = {
  hechos: number;
  meta: number;
  faltan: number;
  cumplida: boolean;
};

/**
 * Cómo venís contra la meta que te pusiste, en la ventana de días visibles.
 *
 * La comparación es contra TU meta, no contra los 7 días: si te propusiste correr
 * 2 veces por semana y corriste 2, eso es "2 de 2, como querías" y no "2 de 7".
 * Era el pedido de Matías: que la app no le pida todos los días algo que él
 * nunca quiso hacer todos los días.
 *
 * Pasarse de la meta no es un error: `faltan` llega a 0 y ahí queda.
 */
export function progresoMeta(hechos: number, meta: number): ProgresoMeta {
  const m = Math.max(1, Math.min(DIAS_VISIBLES, Math.round(meta)));
  return {
    hechos,
    meta: m,
    faltan: Math.max(0, m - hechos),
    cumplida: hechos >= m,
  };
}

/** Si ese día se puede pintar o despintar. El futuro nunca. */
export function puedeMarcar(fecha: string, hoy: Date = new Date()): boolean {
  for (let i = 0; i <= DIAS_EDITABLES; i++) {
    if (ymd(sumarDias(hoy, -i)) === fecha) return true;
  }
  return false;
}

/**
 * Días seguidos pintados. Cuenta para atrás desde hoy; si hoy todavía no está
 * marcado arranca desde ayer, así la racha no se "rompe" a la mañana antes de
 * que llegues a hacer la actividad. Devuelve 0 si no hay al menos 2 seguidos:
 * la racha es para ver el envión, no para puntuar un día suelto.
 */
export function racha(fechas: Iterable<string>, hoy: Date = new Date()): number {
  const set = fechas instanceof Set ? fechas : new Set(fechas);
  // El punto de arranque: hoy si está marcado, sino ayer.
  const arranque = set.has(ymd(hoy)) ? 0 : 1;
  let n = 0;
  for (let i = arranque; ; i++) {
    if (!set.has(ymd(sumarDias(hoy, -i)))) break;
    n++;
  }
  return n >= 2 ? n : 0;
}

/** Un día dentro del mapa de semanas. `futuro` = todavía no pasó: va en blanco. */
export type DiaMapa = DiaGrilla & { futuro: boolean };

/**
 * El mapa tipo calendario: N semanas completas terminando en la semana de hoy,
 * alineadas de domingo a sábado. Los días que todavía no pasaron vienen con
 * `futuro: true` para dibujarlos vacíos en vez de como "no lo hiciste" — que es
 * la diferencia entre un dato y un reproche.
 */
export function mapaSemanas(hoy: Date = new Date(), semanas: number = 5): DiaMapa[][] {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  // Sábado de la semana de hoy: el final de la grilla.
  const finSemana = sumarDias(base, 6 - base.getDay());
  const arranque = sumarDias(finSemana, -(semanas * 7 - 1));
  const hoyStr = ymd(base);

  const out: DiaMapa[][] = [];
  for (let s = 0; s < semanas; s++) {
    const fila: DiaMapa[] = [];
    for (let d = 0; d < 7; d++) {
      const dia = sumarDias(arranque, s * 7 + d);
      const fecha = ymd(dia);
      const diff = Math.round((dia.getTime() - base.getTime()) / 86_400_000);
      fila.push({
        fecha,
        dia: dia.getDate(),
        dow: DOW[dia.getDay()],
        esHoy: fecha === hoyStr,
        // La misma regla de siempre: solo hoy o ayer se pueden pintar.
        editable: diff <= 0 && diff >= -DIAS_EDITABLES,
        futuro: diff > 0,
      });
    }
    out.push(fila);
  }
  return out;
}

/**
 * Las fechas que forman la racha viva, de la más nueva a la más vieja. Es la
 * misma cuenta que `racha()` pero devolviendo cuáles: el mapa las necesita para
 * encenderlas. Devuelve [] si no hay racha (una sola marca no es racha).
 */
export function diasDeRacha(fechas: Iterable<string>, hoy: Date = new Date()): string[] {
  const set = fechas instanceof Set ? fechas : new Set(fechas);
  const arranque = set.has(ymd(hoy)) ? 0 : 1;
  const out: string[] = [];
  for (let i = arranque; ; i++) {
    const f = ymd(sumarDias(hoy, -i));
    if (!set.has(f)) break;
    out.push(f);
  }
  return out.length >= 2 ? out : [];
}

/**
 * ¿Hoy TOCA esta actividad? No existe un campo de "qué días la hago" (queda
 * pendiente decidirlo), así que se infiere del historial: si la marcaste al
 * menos dos veces en este mismo día de la semana, es un patrón y no una
 * casualidad. Con una sola vez cualquier actividad "tocaría" todos los días.
 *
 * El día de hoy no cuenta como antecedente: lo que se busca es si HOY toca,
 * no si ya la hiciste.
 */
export function tocaHoy(fechas: Iterable<string>, hoy: Date = new Date(), minimo = 2): boolean {
  return vecesEsteDia(fechas, hoy) >= minimo;
}

/** Cuántas veces cayó en este mismo día de la semana (sin contar hoy). */
export function vecesEsteDia(fechas: Iterable<string>, hoy: Date = new Date()): number {
  const dow = hoy.getDay();
  const hoyStr = ymd(hoy);
  let n = 0;
  for (const f of fechas) {
    if (f >= hoyStr) continue;
    // Mediodía a propósito: con T00:00 el parseo en UTC corre el día para atrás
    // en cualquier huso al oeste de Greenwich.
    if (new Date(`${f}T12:00:00`).getDay() === dow) n++;
  }
  return n;
}

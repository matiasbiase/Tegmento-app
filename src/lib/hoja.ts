// La hoja del mes: Matías imprime el cuadro, lo va pintando a mano en papel y
// una vez al mes le saca una foto. Gemma la lee y de ahí salen las marcas.
//
// Mismo patrón que los tickets y el tiempo en pantalla (foto → JSON → dato), con
// una diferencia importante: acá NO vale la regla de "solo hoy o ayer". Esa regla
// existe para que no rellenes una semana de memoria; si lo fuiste pintando en
// papel día a día, el dato es honesto y lo único que se hace es digitalizarlo.

/** Lo que Gemma dice que leyó de la hoja, ya saneado. */
export type FilaLeida = { titulo: string; dias: number[] };
export type HojaLeida = {
  /** Mes de la hoja como YYYY-MM, si lo pudo leer del encabezado. */
  mes: string | null;
  filas: FilaLeida[];
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Sin acentos, sin dobles espacios y en minúscula, para comparar títulos. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "julio 2026", "2026-07", "Julio de 2026" → "2026-07". */
export function normalizarMes(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().toLowerCase();

  const iso = t.match(/^(\d{4})-(\d{1,2})/);
  if (iso) {
    const m = Number(iso[2]);
    if (m >= 1 && m <= 12) return `${iso[1]}-${String(m).padStart(2, '0')}`;
  }

  const sinAcento = normalizar(t);
  const anio = sinAcento.match(/(\d{4})/);
  if (!anio) return null;
  const idx = MESES.findIndex((m) => sinAcento.includes(normalizar(m)));
  if (idx < 0) return null;
  return `${anio[1]}-${String(idx + 1).padStart(2, '0')}`;
}

function dias(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<number>();
  for (const x of v) {
    const n = typeof x === 'number' ? x : parseInt(String(x).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 31) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Parsea el JSON crudo del rol `hoja`. null si no es una hoja o no hay nada. */
export function parsearHoja(crudo: string): HojaLeida | null {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (j.esHoja === false) return null;

  const crudas = Array.isArray(j.actividades) ? j.actividades : [];
  const filas: FilaLeida[] = [];
  for (const x of crudas) {
    if (!x || typeof x !== 'object') continue;
    const o = x as { titulo?: unknown; dias?: unknown };
    const titulo = typeof o.titulo === 'string' ? o.titulo.trim().slice(0, 90) : '';
    if (!titulo) continue;
    filas.push({ titulo, dias: dias(o.dias) });
  }
  if (filas.length === 0) return null;

  return { mes: normalizarMes(j.mes), filas };
}

export type Actividad = { id: number; titulo: string };
export type Emparejada = { lineaId: number; titulo: string; dias: number[] };
export type Emparejado = { encontradas: Emparejada[]; sinReconocer: string[] };

/**
 * Cruza lo que Gemma leyó con las actividades que existen en la app. La foto de
 * un papel escrito a mano nunca devuelve el título exacto, así que se compara
 * normalizado y, si no hay exacto, por "uno contiene al otro".
 *
 * Lo que no matchea NO se inventa: vuelve en `sinReconocer` para avisarle.
 */
export function emparejar(filas: FilaLeida[], actividades: Actividad[]): Emparejado {
  const encontradas: Emparejada[] = [];
  const sinReconocer: string[] = [];
  const usadas = new Set<number>();

  for (const fila of filas) {
    const buscado = normalizar(fila.titulo);
    if (!buscado) continue;

    const libres = actividades.filter((a) => !usadas.has(a.id));
    const exacta = libres.find((a) => normalizar(a.titulo) === buscado);
    const parcial =
      exacta ??
      libres.find((a) => {
        const t = normalizar(a.titulo);
        return t.includes(buscado) || buscado.includes(t);
      });

    if (parcial) {
      usadas.add(parcial.id);
      encontradas.push({ lineaId: parcial.id, titulo: parcial.titulo, dias: fila.dias });
    } else {
      sinReconocer.push(fila.titulo);
    }
  }

  return { encontradas, sinReconocer };
}

/**
 * Pasa los números de día a fechas YYYY-MM-DD del mes de la hoja. Descarta los
 * que no existen en ese mes (un 31 de febrero) y los que todavía no pasaron:
 * no se puede haber pintado en papel un día que no llegó.
 */
export function fechasDelMes(mes: string, dias: number[], hoy: Date = new Date()): string[] {
  const m = mes.match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const anio = Number(m[1]);
  const mesNum = Number(m[2]);
  if (mesNum < 1 || mesNum > 12) return [];

  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  const hoyYmd = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  return dias
    .filter((d) => d >= 1 && d <= ultimoDia)
    .map((d) => `${mes}-${String(d).padStart(2, '0')}`)
    .filter((f) => f <= hoyYmd);
}

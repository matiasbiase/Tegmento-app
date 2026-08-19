// Calendario interno: cosas a futuro (turnos, planes, deadlines) que viven en la
// tabla eventos con gcalId null. Convención de inicio: "YYYY-MM-DDTHH:MM" si el
// evento tiene hora, "YYYY-MM-DD" solo si es de todo el día.

// La IA propone agendar con [+agenda: título | YYYY-MM-DD | HH:MM] (la hora es
// opcional). Mismo patrón que [+actividad:] y [+hecho:]: se vuelve un botón.
export const MARCA_AGENDA = /\[\+agenda:\s*([^\]\n|]+)\|([^\]\n|]+)(?:\|([^\]\n|]+))?\]/i;

export type MarcaAgenda = { titulo: string; fecha: string; hora: string | null };

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Extrae la propuesta de agenda de la marca, o null si no hay o la fecha no sirve. */
export function extraerMarcaAgenda(texto: string): MarcaAgenda | null {
  const m = texto.match(MARCA_AGENDA);
  if (!m) return null;
  const titulo = m[1].trim().replace(/\s+/g, ' ').slice(0, 120);
  const fecha = m[2].trim();
  const hora = m[3]?.trim() ?? '';
  if (!titulo || !FECHA_VALIDA.test(fecha)) return null;
  const d = new Date(`${fecha}T12:00`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) return null;
  return { titulo, fecha, hora: HORA_VALIDA.test(hora) ? hora : null };
}

/** Saca la marca [+agenda:] del texto (para mostrar/leer el mensaje limpio). */
export function limpiarMarcaAgenda(texto: string): string {
  return texto.replace(MARCA_AGENDA, '').trim();
}

/** Arma el campo inicio a partir de fecha y hora opcional. */
export function inicioDe(fecha: string, hora: string | null): string {
  return hora ? `${fecha}T${hora}` : fecha;
}

/** La fecha (YYYY-MM-DD) de un inicio, venga del calendario interno o de Google. */
export function fechaDeInicio(inicio: string): string {
  return inicio.slice(0, 10);
}

/** La hora (HH:MM) de un inicio, o null si es de todo el día. */
export function horaDeInicio(inicio: string): string | null {
  return inicio.length > 10 ? inicio.slice(11, 16) : null;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Etiqueta humana del día de un evento: "Hoy · miércoles 22", "Mañana · jueves 23",
 *  "Sábado 25", y con el mes si cae en otro mes ("Lunes 3 de agosto"). */
export function etiquetaDiaAgenda(ymd: string, hoy: Date): string {
  const [a, m, d] = ymd.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const clave = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const base = `${DIAS[fecha.getDay()]} ${d}`;
  if (clave(fecha) === clave(hoy)) return `Hoy · ${base}`;
  if (clave(fecha) === clave(manana)) return `Mañana · ${base}`;
  if (a === hoy.getFullYear() && m - 1 === hoy.getMonth()) return cap(base);
  return `${cap(base)} de ${MESES[m - 1]}`;
}

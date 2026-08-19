/**
 * Un chat que se recicla deja de ser una lista de mensajes y pasa a ser un
 * cuaderno: cada vez que volvés, lo de antes queda plegado como una hoja vieja
 * y escribís abajo.
 *
 * Idea de Matías (29/07): *"la conversación que quedó arriba que aparezca todo
 * en un rectangulito junto, marcando de un lado al otro quién habló, y que
 * diga: este fue de tal día"*. La palabra que usó es la que manda: **papelitos**.
 * Sin esto, reciclar chats produce un scroll infinito donde lo de hoy queda
 * enterrado bajo lo de la semana pasada, y volver a un chat se vuelve un castigo.
 *
 * Una SESIÓN es un día de conversación. Se corta por día del calendario y no
 * por huecos de tiempo porque es como la gente se acuerda de lo que habló:
 * "eso lo hablamos el martes", nunca "eso fue en la ventana de las cuatro horas".
 */

export type MensajeSesion = { rol: string; contenido: string; creado?: string | null };

export type Sesion<T> = {
  /** YYYY-MM-DD del día. Vacío si los mensajes no traen fecha. */
  dia: string;
  mensajes: T[];
};

/** El día local de un ISO. Local y no UTC: a las 22h de Núremberg, UTC ya es
 *  mañana, y un mensaje de anoche aparecería como de otro día. */
function diaDe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parte los mensajes en sesiones por día, respetando el orden en que vienen.
 * Los que no traen fecha caen en la sesión que se está armando: son mensajes
 * recién enviados que todavía no volvieron del server, y pertenecen a hoy.
 */
export function agruparEnSesiones<T extends MensajeSesion>(mensajes: T[]): Sesion<T>[] {
  const out: Sesion<T>[] = [];
  for (const m of mensajes) {
    const dia = diaDe(m.creado);
    const ultima = out[out.length - 1];
    // Sin fecha se pega a la sesión abierta; si no hay ninguna, abre una.
    if (ultima && (dia === ultima.dia || dia === '')) ultima.mensajes.push(m);
    else out.push({ dia, mensajes: [m] });
  }
  return out;
}

/**
 * Cuáles se pliegan y cuál queda abierta.
 *
 * Siempre la ÚLTIMA queda abierta, aunque sea de hace un mes: si volvés a un
 * chat viejo y se pliega todo, abrís un chat vacío y no entendés dónde estás.
 * Lo que se pliega es lo anterior, que es lo que ya leíste.
 */
export function partirSesiones<T extends MensajeSesion>(mensajes: T[]): { plegadas: Sesion<T>[]; abierta: Sesion<T> | null } {
  const s = agruparEnSesiones(mensajes);
  if (s.length === 0) return { plegadas: [], abierta: null };
  return { plegadas: s.slice(0, -1), abierta: s[s.length - 1] };
}

/** "Hoy", "Ayer" o "martes 22 de julio", para el rótulo del papelito. */
export function etiquetaSesion(dia: string, ahora: Date = new Date()): string {
  if (!dia) return '';
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  if (dia === hoy) return 'Hoy';
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
  if (dia === ayerStr) return 'Ayer';
  const d = new Date(`${dia}T12:00:00`);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Las carpetas del historial: las que crea el usuario, a mano.
//
// ── Por qué esto vive en `config` y no en una tabla ──────────────────────────
// Decisión de Matías (aprobada el 26/07): **sin migración**. Todo el estado —qué
// carpetas hay y en cuál cayó cada chat— es un JSON en la fila `carpetas` de la
// tabla `config`. Son decenas de entradas, no miles: no hace falta una tabla, y
// una migración por una feature que puede cambiar de forma es cara.
//
// ⚠️ NO CONFUNDIR CON LAS 8 ÁREAS DE LA RUEDA. Esas se siguen clasificando
// solas y **el Analista las sigue usando**, pero **dejaron de mostrarse**: el
// historial agrupaba las charlas por área y eso era un orden que el usuario no
// eligió ni entiende. Las áreas quedan de motor por detrás; las carpetas son
// del usuario.
//
// Todo acá es lógica pura sobre un objeto: se puede probar sin base.

export type Carpeta = { id: string; nombre: string };

export type EstadoCarpetas = {
  carpetas: Carpeta[];
  /** chatId (como string, porque viene de JSON) → id de carpeta. */
  asignados: Record<string, string>;
};

export const CLAVE_CARPETAS = 'carpetas';

export const VACIO: EstadoCarpetas = { carpetas: [], asignados: {} };

/** Lee el JSON guardado. Ante cualquier cosa rara, vuelve vacío: perder el
 *  orden de las carpetas es molesto, romper la pantalla del historial es peor. */
export function leerCarpetas(json: string | null | undefined): EstadoCarpetas {
  if (!json) return VACIO;
  try {
    const j = JSON.parse(json);
    const carpetas: Carpeta[] = Array.isArray(j?.carpetas)
      ? j.carpetas
          .filter((c: unknown): c is Carpeta => !!c && typeof (c as Carpeta).id === 'string' && typeof (c as Carpeta).nombre === 'string')
          .map((c: Carpeta) => ({ id: c.id, nombre: c.nombre }))
      : [];
    const asignados: Record<string, string> = {};
    if (j?.asignados && typeof j.asignados === 'object') {
      for (const [k, v] of Object.entries(j.asignados)) {
        if (typeof v === 'string' && carpetas.some((c) => c.id === v)) asignados[k] = v;
      }
    }
    return { carpetas, asignados };
  } catch {
    return VACIO;
  }
}

export function serializarCarpetas(e: EstadoCarpetas): string {
  return JSON.stringify(e);
}

/** Un id corto y estable. Se puede inyectar para poder testear. */
export function nuevoId(semilla: () => number = Math.random): string {
  return `c${Date.now().toString(36)}${Math.floor(semilla() * 1e4).toString(36)}`;
}

/**
 * Crea una carpeta. Si ya hay una con ese nombre (sin importar mayúsculas ni
 * espacios), devuelve el estado igual: dos carpetas "Terapia" no le sirven a
 * nadie y el usuario no entendería por qué sus chats quedaron repartidos.
 */
export function crearCarpeta(e: EstadoCarpetas, nombre: string, id = nuevoId()): EstadoCarpetas {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!limpio) return e;
  if (e.carpetas.some((c) => c.nombre.toLowerCase() === limpio.toLowerCase())) return e;
  return { ...e, carpetas: [...e.carpetas, { id, nombre: limpio }] };
}

/** Mueve un chat a una carpeta, o lo saca de todas con `null`. */
export function asignarChat(e: EstadoCarpetas, chatId: number, carpetaId: string | null): EstadoCarpetas {
  const asignados = { ...e.asignados };
  if (carpetaId === null) delete asignados[String(chatId)];
  else if (e.carpetas.some((c) => c.id === carpetaId)) asignados[String(chatId)] = carpetaId;
  return { ...e, asignados };
}

/** Borra la carpeta y suelta sus chats: los chats NUNCA se borran con ella. */
export function borrarCarpeta(e: EstadoCarpetas, carpetaId: string): EstadoCarpetas {
  const asignados: Record<string, string> = {};
  for (const [chat, carpeta] of Object.entries(e.asignados)) {
    if (carpeta !== carpetaId) asignados[chat] = carpeta;
  }
  return { carpetas: e.carpetas.filter((c) => c.id !== carpetaId), asignados };
}

export function renombrarCarpeta(e: EstadoCarpetas, carpetaId: string, nombre: string): EstadoCarpetas {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!limpio) return e;
  return { ...e, carpetas: e.carpetas.map((c) => (c.id === carpetaId ? { ...c, nombre: limpio } : c)) };
}

/** Cuántos chats hay en cada carpeta. */
export function contarPorCarpeta(e: EstadoCarpetas): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const c of e.carpetas) cuenta[c.id] = 0;
  for (const carpeta of Object.values(e.asignados)) {
    if (carpeta in cuenta) cuenta[carpeta] += 1;
  }
  return cuenta;
}

/** En qué carpeta está un chat (null si está suelto). */
export function carpetaDe(e: EstadoCarpetas, chatId: number): string | null {
  return e.asignados[String(chatId)] ?? null;
}

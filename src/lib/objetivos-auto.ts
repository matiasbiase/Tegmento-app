/**
 * Los movimientos que se suman SOLOS a un objetivo.
 *
 * Decisión de Matías (30/07): *"los movimientos, creo que sí, que está bueno que
 * se hagan directamente de lo que vas completando semana a semana"*.
 *
 * ── HASTA DÓNDE LLEGA, Y POR QUÉ NO MÁS ───────────────────────────────────────
 * Él mismo puso el límite: *"si veo películas, o escucho cosas o mensajes,
 * estaría bueno también que los asocie, pero creo que la inteligencia todavía no
 * es muy buena para eso"*. Tiene razón, así que la línea quedó acá:
 *
 *  ✅ **Coincidencia de nombres, sin IA.** Una actividad llamada "Alemán" cuenta
 *     para el objetivo "Aprender alemán". Es comparar texto: no interpreta nada,
 *     así que no se puede equivocar de formas raras.
 *  ✅ **Un evento de agenda** que diga "clase de alemán". Mismo mecanismo.
 *  ⛔ **Deducir que ver una película en alemán cuenta.** Eso necesita entender
 *     el contenido, y con el modelo local va a acertar unas veces e inventar
 *     otras. **Un objetivo con horas inventadas es peor que uno con menos
 *     horas**: la cifra deja de significar algo, y con ella toda la sección.
 *     Si algún día se quiere, que PREGUNTE antes de sumar, no que sume solo.
 *
 * Nada de esto se guarda en una tabla: se calcula al leer. Copiarlo sería
 * duplicar el dato y necesitar un proceso que lo sincronice — y si después borrás
 * la marca de la actividad, el movimiento copiado quedaría inflando el total.
 */

import { normalizar } from '@/lib/notas';
import type { Movimiento } from '@/lib/objetivos';

/** Palabras que no distinguen nada y no deberían disparar una asociación. */
const VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'y', 'o',
  'mi', 'mis', 'me', 'se', 'lo', 'que',
  // Verbos de intención que aparecen en casi cualquier objetivo: si "aprender"
  // contara, "aprender alemán" matchearía con "aprender a soldar".
  'aprender', 'buscar', 'volver', 'empezar', 'seguir', 'hacer', 'terminar',
  'conseguir', 'mejorar', 'estudiar', 'practicar',
]);

/** Las palabras con contenido de un título, normalizadas. */
export function clavesDe(titulo: string): string[] {
  return normalizar(titulo)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length >= 3 && !VACIAS.has(p));
}

/**
 * ¿Este texto (una actividad, un evento) cuenta para este objetivo?
 *
 * Alcanza con que compartan UNA palabra con contenido: "Aprender alemán" y
 * "Alemán" comparten "aleman". Pedir todas las palabras haría que "Alemán" no
 * matcheara con "Aprender alemán", que es justo el caso que pidió Matías.
 *
 * ⚠️ Si el objetivo no tiene ninguna palabra propia (se llama "Mi objetivo"),
 * devuelve false SIEMPRE. Un título vacío de contenido matchearía con medio
 * historial, y es mejor que no sume nada que sumar cualquier cosa.
 */
export function asociaA(tituloObjetivo: string, texto: string): boolean {
  const claves = clavesDe(tituloObjetivo);
  if (claves.length === 0) return false;
  const otras = new Set(clavesDe(texto));
  return claves.some((c) => otras.has(c));
}

/** Horas de un evento de agenda, si se pueden calcular de verdad. */
export function horasDeEvento(inicio: string, fin: string): number | null {
  // Los eventos de todo el día vienen como "YYYY-MM-DD", sin hora: no se sabe
  // cuánto duraron de verdad, y suponer 8 horas sería inventar.
  if (!inicio.includes('T') || !fin.includes('T')) return null;
  const a = Date.parse(inicio);
  const b = Date.parse(fin);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  const horas = (b - a) / 3_600_000;
  // Un "evento" de 14 horas es un viaje o un error de sincronización, no una
  // sesión de trabajo. Se cuenta como movimiento, sin horas.
  if (horas > 12) return null;
  return Math.round(horas * 10) / 10;
}

export type FuenteActividad = {
  titulo: string;
  marcas: { fecha: string }[];
  /** El objetivo que Matías eligió a mano para esta actividad, si eligió alguno.
   *  Ver la nota de `lineas.objetivoId` en el schema. */
  objetivoId?: number | null;
  /**
   * TODOS los objetivos de los que cuelga, desde la tabla `objetivo_lineas`
   * (06/08). ⚠️ Reemplaza en la práctica a `objetivoId`, que era uno solo:
   * Matías pidió que una actividad pueda sumarle a varios (*"puede constituir a
   * más de uno"*) — escalada le suma a Salud y a un objetivo social a la vez.
   * `objetivoId` se sigue mirando para no romper lo que guardó el desplegable
   * del chat, pero **manda esta lista**.
   */
  objetivosColgados?: number[];
};
export type FuenteEvento = { titulo: string; inicio: string; fin: string };

/**
 * ¿Esta actividad suma a este objetivo?
 *
 * ⚠️ **LO ELEGIDO A MANO LE GANA AL PARECIDO, EN LOS DOS SENTIDOS.** Es toda la
 * regla, y el segundo sentido es el que importa:
 *
 *   - Si eligió ESTE objetivo, cuenta. Aunque no se parezcan de nombre
 *     ("Duolingo" no se parece a "Aprender alemán" y sin embargo es lo mismo).
 *   - Si eligió OTRO objetivo, **no cuenta acá aunque el nombre coincida.** Sin
 *     esto, "Correr" elegido para "Correr una maratón" también sumaría a
 *     "Volver a entrenar" por parecido, y el mismo día se contaría dos veces.
 *   - Si no eligió ninguno, vale el cruce por nombre de siempre.
 *
 * Lo que NO se hace es tratar "ninguno" como "todavía no decidió": si eligió no
 * colgarlo de nada y la app lo sumara igual por parecerse, le estaría ignorando
 * la respuesta. Pero como el desplegable arranca vacío y se puede saltear,
 * "ninguno" y "no contestó" son el mismo valor — así que el parecido sigue
 * valiendo ahí, que es el comportamiento que ya existía.
 */
function cuentaPara(act: FuenteActividad, tituloObjetivo: string, objetivoId?: number): boolean {
  // ⚠️ LA TABLA MANDA, Y SI TIENE ALGO EL PARECIDO NI SE CONSULTA. Una actividad
  // colgada a mano de dos objetivos cuenta en los dos y en ningún otro: si
  // después del `some` cayéramos al parecido, una colgada de "Salud" también
  // sumaría a "Volver a entrenar" por nombre, y el mismo día se contaría dos
  // veces — el bug exacto que este archivo ya evitaba con `objetivoId`.
  const colgados = act.objetivosColgados;
  if (colgados && colgados.length > 0) return objetivoId != null && colgados.includes(objetivoId);
  if (act.objetivoId != null) return act.objetivoId === objetivoId;
  return asociaA(tituloObjetivo, act.titulo);
}

/**
 * Junta los movimientos automáticos de un objetivo.
 *
 * Las marcas de actividad NO traen horas (marcar un día no dice cuánto duró):
 * quedan con `horas: null` y las traduce a horas `horasPuestas`, solo si Matías
 * dijo cuánto le lleva cada vez. Ver el comentario de `horasPorVez` en el schema.
 */
export function movimientosAutomaticos(
  tituloObjetivo: string,
  actividades: FuenteActividad[],
  eventos: FuenteEvento[],
  /** El id del objetivo del que se están juntando los movimientos. Hace falta
   *  para saber cuáles actividades lo eligieron a mano. */
  objetivoId?: number,
): Movimiento[] {
  const salida: Movimiento[] = [];

  for (const act of actividades) {
    if (!cuentaPara(act, tituloObjetivo, objetivoId)) continue;
    for (const m of act.marcas) {
      salida.push({ fecha: m.fecha, horas: null, nota: act.titulo, origen: 'actividad' });
    }
  }

  for (const ev of eventos) {
    if (!asociaA(tituloObjetivo, ev.titulo)) continue;
    salida.push({
      fecha: ev.inicio.slice(0, 10),
      horas: horasDeEvento(ev.inicio, ev.fin),
      nota: ev.titulo,
      origen: 'evento',
    });
  }

  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Lo que se sumó solo en los últimos días, agrupado por fuente, para mostrarlo.
 *
 * ⚠️ ESTO NO ES DECORACIÓN: es lo que hace que el número no sea magia. Si la
 * pantalla dijera "31 movimientos solos" sin poder abrir de dónde salieron,
 * Matías no tendría forma de saber si están bien contados.
 */
export function resumenAutomatico(
  movimientos: Movimiento[],
  desde: string,
): { fuente: string; cuantos: number; horas: number | null }[] {
  const recientes = movimientos.filter((m) => m.origen !== 'manual' && m.fecha >= desde);
  const mapa = new Map<string, { cuantos: number; horas: number | null }>();

  for (const m of recientes) {
    const clave = m.nota ?? 'Otra cosa';
    const antes = mapa.get(clave) ?? { cuantos: 0, horas: null };
    mapa.set(clave, {
      cuantos: antes.cuantos + 1,
      horas: m.horas == null ? antes.horas : (antes.horas ?? 0) + m.horas,
    });
  }

  return [...mapa.entries()]
    .map(([fuente, v]) => ({ fuente, ...v, horas: v.horas == null ? null : Math.round(v.horas * 10) / 10 }))
    .sort((a, b) => b.cuantos - a.cuantos);
}

/**
 * LOS AVISOS DEL RITUAL, ADENTRO DEL HOME.
 *
 * Pedido de Matías el 05/08: *"estaría bueno que aparezcan como notificaciones
 * adelante; por el momento que aparezcan en el home, después vamos a hacer que
 * salgan por fuera de la app"*.
 *
 * ── ⚠️ POR QUÉ ESTO NO ES UN PARCHE HASTA QUE ESTÉ iOS ──────────────────────
 *
 * Parece la versión pobre de la notificación de verdad, y es al revés: **es
 * donde se prueban los textos y la frecuencia sin depender de un build de
 * Xcode.** Una notificación local se programa por adelantado y se la lleva el
 * sistema; si el texto molesta, te enterás cuando ya la mandaste. Acá se ve,
 * se cambia y se vuelve a ver en el mismo minuto.
 *
 * Por eso **el texto es EL MISMO que el de la notificación** (`lib/ritual.ts`),
 * y no uno parecido: si acá se prueba una cosa y afuera sale otra, esto no sirve
 * para nada.
 *
 * ── ⚠️⚠️ LA REGLA QUE EVITA QUE SEAN DOS APPS PIDIENDO LO MISMO ────────────
 *
 * La tarjeta que frena (1.8) ya pide el sueño y el ánimo, a pantalla completa.
 * **Si la tarjeta apareció en esta apertura, el aviso del Home NO muestra lo
 * mismo.** Sin esto, abrís la app y dos cosas distintas te piden el mismo dato
 * en la misma pantalla — que es exactamente lo que hace que la gente apague las
 * dos.
 */

import { avisoDe, type EstadoRitual, type LoCargado, type Momento } from '@/lib/ritual';

export type AvisoEnHome = {
  momento: Momento;
  titulo: string;
  cuerpo: string;
  /** Qué hoja abre el botón principal. */
  hoja: 'sueno' | 'animo';
};

/**
 * ⚠️ LAS FRANJAS NO SON LA HORA EXACTA DEL AVISO, Y ESA ES LA DIFERENCIA.
 *
 * La notificación suena a una hora puntual (8:30). Esto es distinto: es lo que
 * ves **cuando abrís**, y podés abrir a las 10. Con la hora exacta, el aviso de
 * la mañana no aparecería nunca salvo que entres a las 8:30 clavadas.
 *
 * La mañana termina a las 12 y la noche arranca a las 19: son las mismas franjas
 * que ya usa el saludo del Home, así que el aviso y el "buenas noches" nunca se
 * contradicen.
 */
const FIN_MANANA = 12;
const INICIO_NOCHE = 19;

export function momentoDe(hora: number): Momento | null {
  if (hora >= 5 && hora < FIN_MANANA) return 'manana';
  if (hora >= INICIO_NOCHE || hora < 5) return 'noche';
  return null;
}

/**
 * El aviso que corresponde ahora, o `null`.
 *
 * ⚠️ DEVUELVE UNO O NINGUNO, NUNCA DOS. Es la misma regla que `queTeFrena`: si
 * el Home pudiera mostrar los dos avisos a la vez, dejaría de ser un recordatorio
 * y sería una lista de tareas — y la app decidió no ser eso en ningún lado.
 *
 * @param frenoYaMostro Si la tarjeta que frena ya apareció y por qué dato. Se
 *   pasa desde el cliente porque ese estado vive en `localStorage`.
 */
export function avisoDelHome(
  estado: EstadoRitual,
  cargado: LoCargado,
  hora: number,
  frenoYaMostro: 'sueno' | 'animo' | null = null,
): AvisoEnHome | null {
  // ⚠️ SE RESPETA EL INTERRUPTOR DEL RITUAL. Si lo apagó en Perfil, apagó el
  // ritual entero: mostrarlo igual "porque acá adentro no molesta" sería
  // desobedecer el único control que tiene.
  if (!estado.activo) return null;

  const momento = momentoDe(hora);
  if (!momento) return null;

  const hoja = momento === 'manana' ? 'sueno' : 'animo';

  // Ya lo cargó: no hay nada que pedir.
  if (momento === 'manana' ? cargado.sueno : cargado.animo) return null;

  // La tarjeta que frena ya pidió esto mismo en esta apertura.
  if (frenoYaMostro === hoja) return null;

  const a = avisoDe(momento, momento === 'manana' ? estado.manana : estado.noche);
  return { momento, titulo: a.titulo, cuerpo: a.cuerpo, hoja };
}

import { seMuestra } from '@/lib/notas';

/**
 * LO QUE UNA NOTA TIENE ADENTRO.
 *
 * Decisión de Matías (31/07): *"una lista de rectángulos por nota, como está
 * ahora, y que cuando tenga chats, relaciones o lo que sea, no sea solo una
 * nota"*. La nota pasó de ser un texto a ser un **contenedor**, y la lista tiene
 * que poder decir de un vistazo qué hay adentro sin abrirla.
 *
 * ⚠️ HOY LA ÚNICA PIEZA QUE EXISTE DE VERDAD ES EL CHAT, Y SE MUESTRA SOLO ESA.
 * El mockup dibujaba también fotos, relaciones y marcas, y quedaron afuera a
 * propósito: no hay forma de meterlas en una nota todavía, así que una pastilla
 * de "1 foto" sería un número inventado en pantalla — justo lo que la app tiene
 * prohibido. Cuando exista el camino para meterlas, se suman acá y la lista las
 * muestra sola.
 */

export type TipoPieza = 'chat';

export type Pieza = { tipo: TipoPieza; cuantas: number };

/** Una charla colgada de una nota, con lo que hace falta para dibujar su fila. */
export type ChatDeNota = {
  id: number;
  titulo: string;
  mensajes: number;
  ultimaActividad: string;
};

/**
 * Las piezas que se anuncian en la fila de la lista.
 *
 * ⚠️ SIN PIEZAS EN CERO. Una nota que es solo texto no muestra nada: la fila
 * vacía la haría ver incompleta, y "0 charlas" es informar de una ausencia que
 * nadie preguntó. La lista de hoy ya se entiende sin eso.
 */
export function piezasDeNota(chats: number): Pieza[] {
  const piezas: Pieza[] = [];
  if (chats > 0) piezas.push({ tipo: 'chat', cuantas: chats });
  return piezas;
}

/**
 * ⚠️ LA MISMA PUERTA QUE EL TÍTULO, Y POR EL MISMO MOTIVO.
 *
 * Una nota privada tapada no puede anunciar que tiene tres charlas adentro: el
 * número solo ya cuenta algo de ella —que hablaste de eso, y cuánto— aunque el
 * título salga tapado. Es exactamente el agujero que se tapó el 31/07 con la
 * búsqueda: no alcanza con esconder el texto si el envoltorio lo delata.
 *
 * Por eso NO se decide en cada pantalla: se pregunta acá, igual que `seMuestra`.
 */
export function piezasVisibles(
  nota: { privada?: boolean },
  chats: number,
  desbloqueado: boolean,
): Pieza[] {
  if (!seMuestra(nota, desbloqueado)) return [];
  return piezasDeNota(chats);
}

/**
 * Las charlas que se pueden dibujar adentro de la nota abierta.
 *
 * Misma regla, un escalón más adentro: si la nota está bajo llave, adentro no
 * hay nada que mostrar. Que la pantalla de detalle esté detrás del PIN no
 * alcanza —esa es una decisión de otra pantalla— y la promesa tiene que valer
 * en un solo lugar.
 */
export function chatsVisibles(
  nota: { privada?: boolean },
  chats: ChatDeNota[],
  desbloqueado: boolean,
): ChatDeNota[] {
  return seMuestra(nota, desbloqueado) ? chats : [];
}

/**
 * ¿Se puede mandar una charla a esta nota?
 *
 * ⚠️ LAS NOTAS PRIVADAS NO APARECEN EN EL SELECTOR mientras están tapadas. Si
 * aparecieran, el selector sería una lista de todos tus títulos privados a un
 * toque de distancia, sin PIN: la cortina se correría desde otra pantalla.
 */
export function notasQueRecibenChats<T extends { privada?: boolean }>(
  notas: T[],
  desbloqueado: boolean,
): T[] {
  return notas.filter((n) => seMuestra(n, desbloqueado));
}

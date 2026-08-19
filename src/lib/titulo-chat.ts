import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { chats } from '@/lib/db/schema';
import { llamarRol } from '@/lib/llm/roles';
import { titular } from '@/lib/titulos';

// EL TÍTULO DEL CHAT LO ESCRIBE LA IA (27/07, pedido de Matías).
//
// Hasta hoy el título era `contenido.slice(0, 60)`: la primera frase cortada.
// En el historial eso se lee como un error —"estuve pensando que si me mudo en
// sept…"— y era justo lo que a él le molestaba: *"usa la primera frase en vez de
// hacer un resumen o un título, no tiene ningún sentido"*.
//
// Un título no es un recorte: es otra cosa que hay que escribir. Por eso va un
// modelo, con el rol `titulo` (el rápido: es una tarea mecánica).

/** Máximo de caracteres. Más largo que esto no entra en la lista del historial. */
const LARGO = 52;

/**
 * Limpia lo que devuelve el modelo. Los modelos chicos adoran las comillas, el
 * punto final y el "Título:" adelante, aunque el prompt lo prohíba.
 */
export function limpiarTitulo(crudo: string): string {
  const linea = crudo.trim().split('\n')[0] ?? '';
  const sinPrefijo = linea.replace(/^\s*(t[íi]tulo|title)\s*:\s*/i, '');
  const sinComillas = sinPrefijo.replace(/^["“'«\s]+|["”'»\s.]+$/g, '');
  const limpio = sinComillas.replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  const corto = limpio.length > LARGO ? titular(limpio, LARGO) : limpio;
  return corto.charAt(0).toUpperCase() + corto.slice(1);
}

/**
 * Genera y guarda el título de un chat. Nunca tira: si el modelo no está o
 * contesta cualquier cosa, **se queda el título que ya tenía**. Un título feo es
 * mucho mejor que una pantalla rota o un chat sin nombre.
 */
export async function ponerTituloChat(chatId: number, texto: string, respuesta?: string): Promise<void> {
  try {
    const entrada = respuesta ? `Matías: ${texto}\nAsistente: ${respuesta}` : `Matías: ${texto}`;
    const crudo = await llamarRol('titulo', [{ rol: 'user', contenido: entrada.slice(0, 1500) }]);
    const titulo = limpiarTitulo(crudo);
    if (!titulo) return;
    await db.update(chats).set({ titulo }).where(eq(chats.id, chatId));
  } catch {
    // sin modelo o con respuesta rara: se queda el título de fallback
  }
}

/** El título provisorio, mientras el modelo no contestó. Ya no es un `slice`. */
export function tituloProvisorio(texto: string, esFoto = false): string {
  const base = titular(texto, LARGO) || 'Sin título';
  return esFoto ? `Foto: ${base}` : base;
}

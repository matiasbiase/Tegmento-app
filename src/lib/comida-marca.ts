/**
 * `[+comida: qué comiste]` — la marca que faltaba.
 *
 * ⚠️ EL AGUJERO QUE TAPA, CON FECHA. El 01/08 Matías le escribió al chat *"comí
 * una hamburguesa con papas y huevo, tomé fernet"*. El bot contestó bárbaro —
 * *"suena a un planazo, ¿cómo te sentís después de ese festín?"*— y él tuvo que
 * preguntar: *"¿podés anotarlo en mis comidas?"*.
 *
 * **No podía.** El asistente sabía emitir ocho marcas (actividad, gasto, ticket,
 * hecho, agenda, período, contraste, cómo lo leyó el otro) y ninguna era comida.
 * O sea: le contabas lo que comiste, en palabras, y la única forma de que quedara
 * guardado era abrir un formulario.
 *
 * Eso es exactamente lo que él mismo dijo que nadie va a hacer: *"no creo que
 * haya gente que tenga ganas de llenar datos"*. La comida es lo que más se cuenta
 * hablando y era lo único que no se podía guardar hablando.
 *
 * Mismo patrón que `hecho.ts`: la marca se vuelve un botón y **la app no guarda
 * nada hasta que lo tocás**.
 */

export const MARCA_COMIDA = /\[\+comida:\s*([^\]\n]+)\]/i;

/** Lo que comió, o null si el mensaje no trae la marca. */
export function extraerMarcaComida(texto: string): string | null {
  const m = texto.match(MARCA_COMIDA);
  const que = m?.[1]?.trim();
  return que ? que : null;
}

/** El mensaje sin la marca, para mostrarlo y para leerlo en voz alta. */
export function limpiarMarcaComida(texto: string): string {
  return texto.replace(MARCA_COMIDA, '').trim();
}

/**
 * Recorta y normaliza lo que comió.
 *
 * 120 igual que `hecho`: es una descripción de una comida, no un menú. Si el
 * modelo se entusiasma y devuelve tres renglones, lo que sobra no aporta y
 * ensucia la lista de Cuerpo.
 */
export function normalizarComida(que: string): string {
  return que.trim().replace(/\s+/g, ' ').slice(0, 120);
}

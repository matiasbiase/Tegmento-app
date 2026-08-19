import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ⚠️⚠️ QUE NINGUNA MARCA SE LE MUESTRE CRUDA A MATÍAS.
 *
 * Las marcas (`[+foco: …]`, `[+plan: …]`, `[+gasto: …]`…) son instrucciones que
 * el modelo escribe para que la app las convierta en un botón. **El usuario no
 * tiene que verlas nunca.** `ChatUI` las saca del texto en DOS lugares —
 * `limpiarLinks`, que arma el texto que se lee en voz alta, y `ContenidoMensaje`,
 * que arma el que se ve— y agregar una marca nueva significa acordarse de las
 * dos.
 *
 * ⚠️ ESTE TEST EXISTE PORQUE ES UN OLVIDO SILENCIOSO: si falta, `tsc` compila,
 * los tests pasan, el botón funciona **y el mensaje muestra `[+plan: entrenar |
 * 2026-10-15]` en el medio de la frase**. No hay nada que lo delate hasta que se
 * ve en pantalla.
 *
 * Lee el fuente en vez de renderizar: no hay jsdom en este proyecto, y para lo
 * que hay que garantizar —que el nombre aparezca en las dos listas— alcanza.
 */

const FUENTE = readFileSync(join(process.cwd(), 'src/components/chat/ChatUI.tsx'), 'utf8');

/** Los `MARCA_*` que ChatUI importa de `lib/`. Son los que tiene que limpiar. */
function marcasImportadas(): string[] {
  const nombres = new Set<string>();
  for (const linea of FUENTE.split('\n')) {
    if (!linea.startsWith('import ') || !linea.includes("@/lib/")) continue;
    for (const m of linea.matchAll(/\bMARCA[A-Z_]*\b/g)) nombres.add(m[0]);
  }
  return [...nombres];
}

describe('ninguna marca se le muestra cruda al usuario', () => {
  it('hay marcas que revisar (si esto falla, cambió la forma de importarlas)', () => {
    expect(marcasImportadas().length).toBeGreaterThan(5);
  });

  for (const marca of marcasImportadas()) {
    it(`${marca} se saca del texto en los DOS lugares`, () => {
      const veces = FUENTE.split(`.replace(${marca}, '')`).length - 1;
      expect(veces).toBeGreaterThanOrEqual(2);
    });
  }
});

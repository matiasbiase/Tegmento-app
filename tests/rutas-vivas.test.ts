import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ⚠️⚠️ EL TEST QUE FALTABA, Y HOY FALLÓ TRES VECES A MANO (06/08).
 *
 * En un día se borraron tres pantallas (`/relaciones`, `/animo` y las que dejaron
 * de tener entrada) y **cada vez quedó al menos un link apuntando a la nada**:
 * en `prompts/asistente.md`, en `lib/sugeridos.ts` y en `lib/llm/roles.ts`.
 * Ninguno lo ve `tsc` ni el build: son strings.
 *
 * Los dos primeros los encontró Matías usando la app; el tercero apareció
 * barriendo a mano. Este test los habría encontrado a los tres en un segundo.
 *
 * ⚠️ Cubre los links de la app Y los de los prompts, que es donde más duele:
 * un link roto en el prompt se lo ofrece el bot al usuario.
 */

const RAIZ = new URL('../', import.meta.url).pathname;
const APP = join(RAIZ, 'src/app/(app)');

/** Las carpetas de `app/(app)` son las rutas reales. */
function rutasReales(): Set<string> {
  const salida = new Set<string>();
  for (const e of readdirSync(APP)) {
    if (e.startsWith('.') || e.includes('.')) continue;
    salida.add(`/${e}`);
    // Un nivel más: /rueda/editar, /bitacora/nueva…
    const sub = join(APP, e);
    if (!statSync(sub).isDirectory()) continue;
    for (const h of readdirSync(sub)) {
      if (h.startsWith('.') || h.includes('.') || h.startsWith('[')) continue;
      salida.add(`/${e}/${h}`);
    }
  }
  return salida;
}

function archivos(dir: string, ext: string[]): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) salida.push(...archivos(p, ext));
    else if (ext.some((x) => e.endsWith(x))) salida.push(p);
  }
  return salida;
}

/** `[texto](/ruta)` — el formato con el que la app y el prompt ofrecen pantallas. */
const LINK = /\[[^\]]+\]\((\/[a-z0-9/-]*)\)/g;

describe('ningún link apunta a una pantalla que no existe', () => {
  const rutas = rutasReales();
  const fuentes = [
    ...archivos(join(RAIZ, 'src'), ['.ts', '.tsx']),
    ...archivos(join(RAIZ, 'prompts'), ['.md']),
  ];

  it('las rutas se leen bien (el test se estaría probando a sí mismo si no)', () => {
    expect(rutas.has('/chat')).toBe(true);
    expect(rutas.has('/cuerpo')).toBe(true);
    expect(rutas.has('/animo')).toBe(false); // borrada el 05/08
  });

  for (const f of fuentes) {
    const texto = readFileSync(f, 'utf8');
    const encontrados = [...texto.matchAll(LINK)].map((m) => m[1]);
    // Solo los archivos que tienen links: uno por archivo, para que el nombre
    // del test diga dónde está el roto.
    if (encontrados.length === 0) continue;
    const corto = f.replace(RAIZ, '');
    it(`${corto}`, () => {
      const rotos = encontrados.filter((r) => {
        if (r === '/ruta') return false; // el ejemplo del prompt, no es un link
        return !rutas.has(r) && !rutas.has(`/${r.split('/')[1]}`);
      });
      expect(rotos).toEqual([]);
    });
  }
});

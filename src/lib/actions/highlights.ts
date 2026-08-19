'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { datosHighlight, fallbackHighlight, promptHighlight } from '@/lib/highlights';

async function setConfig(clave: string, valor: string) {
  await db
    .insert(config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

export async function generarHighlight() {
  const datos = await datosHighlight();
  let texto = fallbackHighlight(datos);
  let ia = false;

  if (await ollamaDisponible()) {
    try {
      const r = await llamarRol('highlights', [{ rol: 'user', contenido: promptHighlight(datos) }]);
      if (r.trim()) {
        texto = r.trim();
        ia = true;
      }
    } catch {
      // queda el fallback
    }
  }

  await setConfig('highlight_texto', texto);
  await setConfig('highlight_fecha', new Date().toISOString().slice(0, 10));
  await setConfig('highlight_ia', ia ? '1' : '0');
  revalidatePath('/chat');
}

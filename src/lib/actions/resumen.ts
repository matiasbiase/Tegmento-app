'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { ollamaDisponible } from '@/lib/llm/proveedor';
import { llamarRol } from '@/lib/llm/roles';
import { claveSemana, datosResumen, fallbackResumen, promptResumen } from '@/lib/resumen';

async function setConfig(clave: string, valor: string) {
  await db
    .insert(config)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

/** Genera el resumen semanal y lo cachea para la semana en curso. */
export async function generarResumen(): Promise<{ ok: boolean }> {
  const datos = await datosResumen();
  let texto = fallbackResumen(datos);
  let ia = false;

  if (await ollamaDisponible()) {
    try {
      const r = await llamarRol('resumen', [{ rol: 'user', contenido: promptResumen(datos) }]);
      if (r.trim()) {
        texto = r.trim();
        ia = true;
      }
    } catch {
      // queda el fallback
    }
  }

  await setConfig('resumen_texto', texto);
  await setConfig('resumen_clave', claveSemana(new Date()));
  await setConfig('resumen_ia', ia ? '1' : '0');
  revalidatePath('/cosas-chicas');
  return { ok: ia };
}

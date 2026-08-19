/**
 * Vuelca el contexto del Analista a un archivo, para leerlo con otro modelo.
 *
 * Es la primera mitad de "correr el Analista sin Ollama": este script arma
 * EXACTAMENTE los mismos datos que ve el modelo local (`armarDatos()`, sin
 * copiar ni reescribir nada), los escribe a un archivo, y ahí termina. Quien
 * lea ese archivo —Claude Code hoy, la API de Anthropic mañana— devuelve el
 * JSON y lo guarda con `scripts/analisis-guardar.ts`.
 *
 *   npx tsx scripts/analisis-contexto.ts [ruta-de-salida]
 *
 * Por defecto escribe en `data/analisis-contexto.txt`, que NO se versiona:
 * son 30 días de la vida de Matías.
 *
 * Imprime también el prompt del Analista (`prompts/analista.md`), porque las
 * reglas duras —las fechas van en la evidencia, la confianza se cuenta, nada
 * de relaciones forzadas— son parte del trabajo, no decoración.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { armarDatos } from '@/lib/analista';

const salida = resolve(process.argv[2] ?? 'data/analisis-contexto.txt');

armarDatos()
  .then((datos) => {
    const prompt = readFileSync(resolve('prompts/analista.md'), 'utf8');
    const hasta = new Date().toISOString().slice(0, 10);
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    writeFileSync(
      salida,
      [
        `# VENTANA ANALIZADA: ${desde} → ${hasta}`,
        '# (cualquier fecha fuera de esta ventana está inventada y se descarta)',
        '',
        '='.repeat(70),
        '# INSTRUCCIONES DEL ANALISTA (prompts/analista.md)',
        '='.repeat(70),
        '',
        prompt,
        '',
        '='.repeat(70),
        '# LOS DATOS',
        '='.repeat(70),
        '',
        datos,
      ].join('\n'),
      'utf8',
    );

    console.log(`✓ contexto en ${salida}`);
    console.log(`  ventana ${desde} → ${hasta} · ${datos.length.toLocaleString('es-AR')} caracteres de datos`);
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ falló:', e instanceof Error ? e.message : e);
    process.exit(1);
  });

/**
 * Corre el Analista a mano, sin esperar al cron de los lunes.
 *
 * Útil después de tocar `prompts/analista.md`: el análisis viejo queda guardado
 * en la tabla `analisis` y se sigue mostrando en Relaciones hasta que hay uno
 * nuevo, así que un cambio de prompt no se ve hasta la semana siguiente.
 *
 *   npx tsx scripts/analizar-ahora.ts
 *
 * No borra nada: inserta una lectura nueva, la anterior queda en el historial.
 */
import { analizar } from '@/lib/analista';

analizar()
  .then((ok) => {
    console.log(ok ? '✓ análisis nuevo guardado' : '✗ sin cambios (asistente offline o sin datos suficientes)');
    process.exit(0);
  })
  .catch((e) => {
    console.error('✗ falló:', e instanceof Error ? e.message : e);
    process.exit(1);
  });

/**
 * Guarda una lectura del Analista escrita por fuera del modelo local.
 *
 * Segunda mitad de `scripts/analisis-contexto.ts`: recibe el JSON que devolvió
 * quien leyó el contexto y lo persiste por el MISMO camino que usa el worker
 * (`guardarAnalisis`), así que toca las tres cosas que toca una lectura de
 * verdad: la tabla `analisis`, las sugerencias pendientes y el perfil vivo en
 * `conocimiento`. La app no puede notar la diferencia: lee la misma tabla.
 *
 *   npx tsx scripts/analisis-guardar.ts data/analisis-nuevo.json
 *
 * El JSON tiene la forma de `ResultadoAnalisis`:
 *   { "hiloCentral": "...",
 *     "observaciones": [{ "patron": "...", "evidencia": "...",
 *                         "confianza": "alta|media|baja", "experimento": "..." }],
 *     "sugerencias": [] }
 *
 * ⚠️ VALIDA ANTES DE GUARDAR, con las mismas reglas que se le exigen al modelo
 * local: la observación tiene que ser una frase que cruce dos cosas, y no puede
 * citar fechas de afuera de la ventana de 30 días. Escribir la lectura a mano no
 * es motivo para saltearse los filtros — son justamente contra lo que a
 * cualquiera (modelo o persona) le sale fácil: el rótulo lindo y la fecha que
 * suena bien.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guardarAnalisis, type ResultadoAnalisis } from '@/lib/analista';
import { esObservacionValida, esHiloValido, evidenciaCoherente } from '@/lib/observacion-valida';

const ruta = process.argv[2];
if (!ruta) {
  console.error('Uso: npx tsx scripts/analisis-guardar.ts <archivo.json>');
  process.exit(1);
}

const hasta = new Date().toISOString().slice(0, 10);
const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

const crudo: ResultadoAnalisis = JSON.parse(readFileSync(resolve(ruta), 'utf8'));
if (!Array.isArray(crudo.observaciones)) {
  console.error('✗ el JSON no tiene `observaciones`');
  process.exit(1);
}

if (!esHiloValido(crudo.hiloCentral ?? '')) {
  console.error('✗ el hiloCentral tiene que ser una frase, no un título');
  process.exit(1);
}

const buenas = crudo.observaciones.filter((o) => {
  if (!esObservacionValida(o.patron)) {
    console.warn(`  ⨯ descartada (es un rótulo, no una relación): ${o.patron.slice(0, 60)}…`);
    return false;
  }
  if (!evidenciaCoherente(o.evidencia ?? '', desde, hasta)) {
    console.warn(`  ⨯ descartada (cita fechas de afuera de ${desde}→${hasta}): ${o.patron.slice(0, 60)}…`);
    return false;
  }
  return true;
});

if (buenas.length === 0) {
  console.error('✗ no quedó ninguna observación válida: no se guarda nada');
  process.exit(1);
}

guardarAnalisis({ hiloCentral: crudo.hiloCentral, observaciones: buenas, sugerencias: crudo.sugerencias ?? [] })
  .then((ok) => {
    console.log(ok ? `✓ lectura guardada · ${buenas.length} observaciones` : '✗ no se guardó');
    process.exit(ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('✗ falló:', e instanceof Error ? e.message : e);
    process.exit(1);
  });

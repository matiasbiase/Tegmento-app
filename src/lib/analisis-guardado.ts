import { confianzaSegunEvidencia } from '@/lib/observacion-valida';
import { limpiarExperimento } from '@/lib/experimentos';
import type { AnalisisView } from '@/components/animo/Analista';

/**
 * Lee el JSON del último análisis guardado y lo deja como lo consumen las
 * pantallas.
 *
 * ⚠️ VIVE ACÁ Y NO EN UNA PÁGINA porque lo usan DOS: `/relaciones` (la lectura
 * del Analista) y `/cosas-chicas` (los cruces livianos). Cuando esas dos se
 * separaron —30/07— esta función estaba escrita dentro de la primera, y copiarla
 * a la segunda era repetir exactamente el problema que la bitácora ya anotó con
 * `ymd()` reescrita en cuatro archivos: dos copias que todavía no divergieron,
 * que es justo el momento de unificarlas.
 *
 * Las dos correcciones que aplica al leer (y no solo al guardar) son a propósito:
 * los análisis que ya están en la base se escribieron sin ellas, y así se
 * arreglan solos al mostrarse en vez de esperar la próxima lectura.
 */
export function verAnalisis(fecha: string | undefined, resultado: string | null | undefined): AnalisisView {
  if (!fecha || !resultado) return null;
  try {
    const j = JSON.parse(resultado);
    if (!j?.hiloCentral) return null;
    return {
      hiloCentral: String(j.hiloCentral),
      observaciones: Array.isArray(j.observaciones)
        ? j.observaciones.map((o: { patron?: unknown; evidencia?: unknown; confianza?: unknown; experimento?: unknown }) => ({
            patron: String(o.patron ?? ''),
            evidencia: String(o.evidencia ?? ''),
            // Topeada por las fechas que la evidencia cita, igual que al
            // guardar: así los análisis ya guardados con la confianza inflada
            // se corrigen solos al mostrarse.
            confianza: confianzaSegunEvidencia(String(o.evidencia ?? ''), String(o.confianza ?? 'baja')),
            // Los análisis viejos traen el experimento con el texto cortado a la
            // mitad; `limpiarExperimento` lo deja usable como título.
            experimento: o.experimento ? limpiarExperimento(String(o.experimento)) || undefined : undefined,
          }))
        : [],
      fecha,
    };
  } catch {
    return null;
  }
}

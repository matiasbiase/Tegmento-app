/**
 * CÓMO SE LEE LO QUE EL ANALISTA DEVUELVE — la parte del Analista que no toca la
 * base.
 *
 * ── POR QUÉ ESTO VIVE EN UN ARCHIVO APARTE (14/08) ───────────────────────────
 *
 * `lib/analista.ts` importa `db/client`, y `db/client` **abre la base al
 * importarse**: `new Database('data/bitacora.db')` corre en la línea 10, antes de
 * que nadie llame a nada. O sea que cualquier test que importara `analista.ts`
 * —aunque solo quisiera probar un `JSON.parse`— abría la base real de Matías en
 * modo escritura. **Ese, y no la dificultad, era el motivo de que R.3 dijera
 * "495 líneas, CERO tests".**
 *
 * Es exactamente lo que se hizo el 13/08 con `lib/aprendizajes`, y por el mismo
 * motivo: la regla estaba enterrada adentro de una función que escribe en cuatro
 * tablas, así que no se podía probar sin una base.
 *
 * ⚠️ **NO CAMBIÓ NINGÚN COMPORTAMIENTO.** Las dos funciones se mudaron con sus
 * comentarios y su código tal cual estaban; `analista.ts` las importa de acá. Si
 * algún test de este archivo falla algún día, es porque cambió la regla, no
 * porque cambió de casa.
 */

import { confianzaSegunEvidencia, esObservacionValida, evidenciaCoherente } from '@/lib/observacion-valida';
import { limpiarExperimento } from '@/lib/experimentos';

export type ResultadoAnalisis = {
  hiloCentral: string;
  observaciones: { patron: string; evidencia: string; confianza: string; experimento?: string }[];
  /** Queda por compatibilidad con los análisis ya guardados, que la traen. Los
   *  nuevos vienen siempre vacíos: ver el comentario en ESQUEMA_ANALISIS. */
  sugerencias: { texto: string }[];
};

export function parsear(crudo: string): ResultadoAnalisis | null {
  try {
    const j = JSON.parse(crudo) as Partial<ResultadoAnalisis>;
    if (!j.hiloCentral) return null;
    return {
      hiloCentral: String(j.hiloCentral),
      observaciones: Array.isArray(j.observaciones)
        ? j.observaciones.slice(0, 6).map((o) => ({
            patron: String(o.patron ?? ''),
            evidencia: String(o.evidencia ?? ''),
            // La confianza no se cree, se cuenta: `confianzaSegunEvidencia` la
            // baja a lo que las fechas citadas banquen. Nunca la sube.
            confianza: confianzaSegunEvidencia(
              String(o.evidencia ?? ''),
              ['alta', 'media', 'baja'].includes(String(o.confianza)) ? String(o.confianza) : 'baja',
            ),
            // Se limpia acá y no en la pantalla: así queda guardado prolijo y
            // no hay que acordarse de limpiarlo en cada lugar donde se muestre.
            experimento: o.experimento ? limpiarExperimento(String(o.experimento)) || undefined : undefined,
          }))
        : [],
      sugerencias: Array.isArray(j.sugerencias)
        ? j.sugerencias.slice(0, 3).map((s) => ({ texto: String(s.texto ?? '') })).filter((s) => s.texto)
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Se queda solo con las observaciones que son frases de verdad Y que citan datos
 * que existen. Al pedirle frases concretas, el modelo empezó a inventar fechas y
 * montos: una observación con evidencia falsa se descarta entera.
 */
export function filtrarObservaciones(res: ResultadoAnalisis, desde: string, hasta: string): ResultadoAnalisis {
  return {
    ...res,
    observaciones: res.observaciones.filter(
      (o) => esObservacionValida(o.patron) && evidenciaCoherente(o.evidencia, desde, hasta),
    ),
  };
}

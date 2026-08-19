'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { correrAnalisis } from '@/lib/actions/analista';
import { seguirObservacion, descartarObservacion, observacionAActividad } from '@/lib/actions/observaciones';
import { sonarExito } from '@/lib/sonido';
import { tituloDesdePatron } from '@/lib/observaciones';

export type Observacion = {
  patron: string;
  evidencia: string;
  confianza: string;
  /** Algo chico para probar unos días y ver qué pasa. Puede no venir: no toda
   *  relación da para probar nada, y uno inventado es peor que ninguno. */
  experimento?: string;
};
export type AnalisisView = { hiloCentral: string; observaciones: Observacion[]; fecha: string } | null;
/** Lo que Matías ya decidió sobre cada patrón (clave: el texto del patrón). */
export type Veredictos = Record<string, 'anotada' | 'descartada'>;

const CONFIANZA: Record<string, { label: string; color: string; tint: string }> = {
  alta: { label: 'Confianza alta', color: 'var(--color-verde)', tint: 'var(--color-verde-tint)' },
  media: { label: 'Confianza media', color: 'var(--color-oro-2)', tint: 'var(--color-ambar-tint)' },
  baja: { label: 'A confirmar', color: 'var(--color-niebla)', tint: 'var(--color-gris-tint)' },
};

// Panel del Analista en Patrones: muestra la lectura (hilo central + observaciones)
// y se actualiza solo cuando hay algo nuevo, sin que Matías lo dispare a mano.
//
// Cada observación se puede responder: "me pasa" o "no es así". Esa respuesta se
// guarda y vuelve al próximo análisis, así el Analista deja de ser un cartel que
// se lee y empieza a aprender. Y lo que le pasa lo puede convertir en una
// actividad, para seguirlo día a día.
export function Analista({
  analisis,
  necesitaActualizar,
  veredictos = {},
}: {
  analisis: AnalisisView;
  necesitaActualizar: boolean;
  veredictos?: Veredictos;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<'listo' | 'trabajando' | 'error'>('listo');
  // Copia local para que el botón responda al toque, sin esperar al server.
  const [decididas, setDecididas] = useState<Veredictos>(veredictos);
  // Qué observación está en modo "sumarla a actividades", con el título editable.
  const [sumando, setSumando] = useState<{ patron: string; titulo: string } | null>(null);
  const [sumada, setSumada] = useState<Record<string, string>>({});

  async function correr() {
    if (estado === 'trabajando') return;
    setEstado('trabajando');
    try {
      const { ok } = await correrAnalisis();
      if (ok) {
        setEstado('listo');
        router.refresh();
      } else {
        setEstado('error');
        setTimeout(() => setEstado('listo'), 4000);
      }
    } catch {
      setEstado('error');
      setTimeout(() => setEstado('listo'), 4000);
    }
  }

  async function responder(o: Observacion, veredicto: 'anotada' | 'descartada') {
    setDecididas((prev) => ({ ...prev, [o.patron]: veredicto }));
    if (veredicto === 'anotada') {
      sonarExito();
      setSumando({ patron: o.patron, titulo: tituloDesdePatron(o.patron) });
      await seguirObservacion(o.patron, o.evidencia);
    } else {
      sonarExito();
      setSumando((s) => (s?.patron === o.patron ? null : s));
      await descartarObservacion(o.patron, o.evidencia);
    }
    router.refresh();
  }

  async function sumarActividad() {
    if (!sumando?.titulo.trim()) return;
    const { patron, titulo } = sumando;
    setSumando(null);
    // Si la observación traía experimento, la actividad queda marcada como tal
    // y el chat después pregunta cómo fue, en vez de "¿cómo viene?".
    const esExperimento = Boolean(analisis?.observaciones.find((o) => o.patron === patron)?.experimento);
    const puesta = await observacionAActividad(titulo, esExperimento);
    if (puesta) {
      setSumada((prev) => ({ ...prev, [patron]: puesta }));
      sonarExito();
      router.refresh();
    }
  }

  // Al abrir Patrones, si hay datos nuevos y pasó un tiempo, buscá patrones solo.
  useEffect(() => {
    if (necesitaActualizar && estado === 'listo') correr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trabajando = estado === 'trabajando';

  return (
    <div className="tarjeta bg-white shadow-[0_4px_20px_rgba(50,50,90,.06)]">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Lo que noté</p>
        <button
          type="button"
          onClick={correr}
          disabled={trabajando}
          className="font-mono text-[12px] font-semibold text-iris disabled:opacity-50"
        >
          {trabajando ? 'buscando…' : estado === 'error' ? 'prendé el asistente' : 'buscar de nuevo'}
        </button>
      </div>

      {trabajando ? (
        // El "estoy pensando" en grande: el ícono de Patrones destellando y una
        // barra que corre. Reemplaza el texto chiquito de antes.
        <div className="flex flex-col items-center gap-4 py-7">
          <span className="destello-patron text-iris">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-14">
              <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="18" r="2.4" />
              <path d="M6 8.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5M12 13v2.5" />
            </svg>
          </span>
          <p className="text-[15px] font-semibold text-tinta-soft">Buscando conexiones entre tus datos…</p>
          <span className="barra-cargando relative h-[3px] w-32 overflow-hidden rounded-full bg-[#eeeef6]" />
        </div>
      ) : !analisis ? (
        <p className="py-2 text-[15px] leading-relaxed text-niebla text-pretty">
          Todavía no hice una lectura de tus datos. Cuando registres un poco más (ánimo, sueño, lo que hacés),
          voy a empezar a notar patrones y a contártelos acá.
        </p>
      ) : (
        <>
          <p className="mb-3.5 font-serif text-[19px] font-semibold leading-[1.3] tracking-[-0.2px] text-tinta text-pretty">
            {analisis.hiloCentral}
          </p>
          <div className="flex flex-col gap-3">
            {analisis.observaciones.map((o, i) => {
              const c = CONFIANZA[o.confianza] ?? CONFIANZA.baja;
              const veredicto = decididas[o.patron];
              const abierta = sumando?.patron === o.patron;
              const yaEsActividad = sumada[o.patron];
              return (
                <div key={i} className="tarjeta border border-gris-tint bg-[#fbfbfe]">
                  <p className="mb-1.5 text-[15px] leading-[1.42] text-tinta text-pretty">{o.patron}</p>
                  {o.evidencia && (
                    <p className="mb-2 text-[12px] leading-snug text-niebla text-pretty">{o.evidencia}</p>
                  )}
                  <span
                    className="inline-block rounded-lg px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.2px]"
                    style={{ background: c.tint, color: c.color }}
                  >
                    {c.label}
                  </span>

                  {/* la respuesta de Matías: es lo que hace que el Analista aprenda */}
                  {!veredicto ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => responder(o, 'anotada')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2 font-mono text-[12px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Me pasa
                      </button>
                      <button
                        type="button"
                        onClick={() => responder(o, 'descartada')}
                        className="flex flex-none items-center justify-center rounded-[12px] border border-[#e4e4ef] bg-white px-3.5 py-2 font-mono text-[12px] font-semibold text-niebla"
                      >
                        No es así
                      </button>
                    </div>
                  ) : veredicto === 'anotada' ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-verde-tint px-2 py-1 font-mono text-[11px] font-bold text-verde">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          La estás siguiendo
                        </span>
                        <button
                          type="button"
                          onClick={() => responder(o, 'descartada')}
                          className="font-mono text-[11px] font-semibold text-niebla-2"
                        >
                          deshacer
                        </button>
                      </div>

                      {yaEsActividad ? (
                        <p className="mt-2 font-mono text-[11px] font-semibold text-verde">
                          Quedó en Seguimiento como “{yaEsActividad}”.
                        </p>
                      ) : abierta ? (
                        // Convertirla en algo concreto que se pueda pintar día a
                        // día. El título viene propuesto pero se edita: la frase
                        // del Analista es una observación, no un buen título.
                        <div className="mt-2.5">
                          <p className="mb-1.5 font-mono text-[11px] font-semibold text-niebla">
                            {o.experimento ? '¿Lo probamos unos días?' : '¿La seguimos como actividad?'}
                          </p>
                          <div className="flex gap-2">
                            <input
                              value={sumando.titulo}
                              onChange={(e) => setSumando({ patron: o.patron, titulo: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && sumarActividad()}
                              placeholder="Caminar a la mañana…"
                              className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3 py-2 text-[16px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
                            />
                            <button
                              type="button"
                              onClick={sumarActividad}
                              disabled={!sumando.titulo.trim()}
                              className="flex-none rounded-[12px] px-3 font-mono text-[12px] font-bold text-white disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
                            >
                              {o.experimento ? 'Probar' : 'Sumar'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSumando(null)}
                            className="mt-1.5 font-mono text-[11px] font-semibold text-niebla-2"
                          >
                            ahora no
                          </button>
                        </div>
                      ) : (
                        // Con experimento, el título ya viene escrito por el
                        // Analista y el botón invita a PROBAR, no a sumar una
                        // tarea más: la diferencia entre "hacé esto" y "probemos
                        // esto a ver qué pasa" es todo el punto (28/07).
                        <button
                          type="button"
                          onClick={() =>
                            setSumando({ patron: o.patron, titulo: o.experimento ?? tituloDesdePatron(o.patron) })
                          }
                          className="mt-2 text-left font-mono text-[11px] font-semibold text-iris"
                        >
                          {o.experimento ? `+ probar: ${o.experimento}` : '+ seguirla como actividad'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block rounded-lg bg-gris-tint px-2 py-1 font-mono text-[11px] font-semibold text-niebla">
                        No te cerró · no voy a insistir
                      </span>
                      <button
                        type="button"
                        onClick={() => responder(o, 'anotada')}
                        className="font-mono text-[11px] font-semibold text-niebla-2"
                      >
                        deshacer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

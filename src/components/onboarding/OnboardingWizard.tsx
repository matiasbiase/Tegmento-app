'use client';

import { useState } from 'react';
import { AREAS_GUIA, CLAVE_PUNTUACION } from '@/lib/rueda-vida';
import { relacionEntre } from '@/lib/conexiones';
import { completarOnboarding, guardarRueda } from '@/lib/actions/onboarding';
import { RadarRueda } from '@/components/rueda/RadarRueda';

// Gradiente lila de marca (prototipo "Bitácora Simple").
const GRAD_IRIS = 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))';
const SOMBRA_CTA = '0 8px 20px rgba(108,120,238,.35)';

// soloRueda: rehacer la rueda sin resetear la app (no borra chats ni líneas).
export function OnboardingWizard({ soloRueda = false }: { soloRueda?: boolean } = {}) {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState('Matías');
  const [scores, setScores] = useState<number[]>(AREAS_GUIA.map(() => 3));
  const [notas, setNotas] = useState('');
  const [foco, setFoco] = useState<number[]>([]);
  const [porques, setPorques] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [popup, setPopup] = useState<{ a: string; b: string; nota: string } | null>(null);

  const PASO_RESUMEN = 3 + foco.length;
  const total = PASO_RESUMEN + 1;
  const progreso = Math.round((paso / (total - 1)) * 100);

  const datosRueda = AREAS_GUIA.map((a, i) => ({
    nombre: a.nombre,
    actual: scores[i],
    deseado: scores[i],
    color: a.color,
  }));

  function toggleFoco(i: number) {
    setFoco((f) => {
      if (f.includes(i)) return f.filter((x) => x !== i);
      if (f.length >= 3) return f;
      // si el área que agrego tiene relación con alguna ya elegida, mostrar pop-up
      for (const j of f) {
        const rel = relacionEntre(AREAS_GUIA[i].nombre, AREAS_GUIA[j].nombre);
        if (rel) {
          setPopup({ a: AREAS_GUIA[i].nombre, b: AREAS_GUIA[j].nombre, nota: rel.nota });
          break;
        }
      }
      return [...f, i];
    });
  }

  async function finalizar() {
    setGuardando(true);
    try {
      const accion = soloRueda ? guardarRueda : completarOnboarding;
      await accion({
        nombre,
        notas,
        areas: AREAS_GUIA.map((a, i) => ({
          nombre: a.nombre,
          color: a.color,
          actual: scores[i],
          deseado: Math.min(5, scores[i] + 1),
        })),
        focos: foco.map((i) => ({ nombre: AREAS_GUIA[i].nombre, porque: porques[i] ?? '' })),
      });
    } catch {
      setGuardando(false);
    }
  }

  const enPorque = paso >= 3 && paso < PASO_RESUMEN;
  const focoActual = enPorque ? foco[paso - 3] : -1;
  const puedeAvanzar = paso !== 2 || foco.length > 0;
  const ctaLabel =
    paso === 0 ? 'Empezar' : paso === 2 ? 'Continuar' : paso === PASO_RESUMEN ? (soloRueda ? 'Guardar mi rueda' : 'Abrir mi bitácora') : 'Siguiente';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-lavanda">
      {/* progreso */}
      <div className="px-[22px] pb-3 pt-[max(24px,env(safe-area-inset-top))]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(108,120,238,.14)]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progreso}%`, background: 'linear-gradient(90deg,var(--color-iris),var(--color-iris-2))' }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[22px] py-2.5">
        {paso === 0 && (
          <div className="flotar flex flex-col gap-3.5 pt-2">
            <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-iris">Tegmento</p>
            <h1 className="font-serif text-[32px] font-semibold leading-[1.12] tracking-[-0.4px] text-tinta">
              Hola. Empecemos por vos.
            </h1>
            <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
              Vamos a mirar tu vida en 8 áreas y a marcar cómo venís en cada una. No es un examen: es una foto honesta
              para arrancar. Toma 3 minutos.
            </p>
            <div className="rounded-2xl border border-iris-borde bg-blanco p-4">
              <p className="mb-2.5 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">¿Cómo te llamás?</p>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[16px] text-tinta outline-none"
              />
            </div>
          </div>
        )}

        {paso === 1 && (
          <div className="flotar flex flex-col gap-4">
            <div className="text-center">
              <h1 className="font-serif text-[24px] font-semibold tracking-[-0.3px] text-tinta">Tu rueda de la vida</h1>
              <p className="mt-1 text-[15px] text-niebla">Marcá cómo estás hoy en cada área.</p>
            </div>
            <RadarRueda datos={datosRueda} mostrarLeyenda={false} />
            <div className="flex flex-col gap-2.5">
              {AREAS_GUIA.map((a, i) => (
                <div key={a.nombre} className="rounded-2xl border border-[rgba(108,120,238,.1)] bg-blanco p-3.5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                    <span className="font-mono text-[12px] font-semibold tracking-[0.2px] text-tinta">{a.nombre}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const sel = scores[i] === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setScores((s) => s.map((v, j) => (j === i ? n : v)))}
                          className={`flex-1 rounded-[12px] py-2.5 font-mono text-[15px] ${
                            sel ? 'border border-transparent text-white' : 'border border-iris-borde bg-blanco text-niebla'
                          }`}
                          style={sel ? { background: a.color } : undefined}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-[12px] leading-snug text-niebla text-pretty">
                    {CLAVE_PUNTUACION[scores[i] - 1][1]}
                  </p>
                </div>
              ))}
            </div>
            <label className="mt-1 flex flex-col gap-2">
              <span className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">
                ¿Querés anotar algo? <span className="opacity-60">(opcional)</span>
              </span>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Lo que se te venga sobre cómo estás hoy."
                className="resize-none rounded-[12px] border border-iris-borde bg-blanco px-3.5 py-3 text-[15px] leading-relaxed text-tinta outline-none placeholder:text-niebla"
              />
            </label>
          </div>
        )}

        {paso === 2 && (
          <div className="flotar flex flex-col gap-4">
            <div>
              <h1 className="font-serif text-[24px] font-semibold tracking-[-0.3px] text-tinta">
                ¿En qué querés enfocarte ahora?
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-niebla text-pretty">
                Elegí hasta 3 áreas para arrancar. No tienen que ser las más bajas, sino las que querés mover.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {AREAS_GUIA.map((a, i) => {
                const activa = foco.includes(i);
                return (
                  <button
                    key={a.nombre}
                    type="button"
                    onClick={() => toggleFoco(i)}
                    className={`flex items-center gap-3 rounded-2xl bg-blanco p-3.5 text-left ${
                      activa ? 'border-2' : 'border-2 border-transparent shadow-[0_3px_14px_rgba(50,50,90,.05)]'
                    }`}
                    style={activa ? { borderColor: a.color } : undefined}
                  >
                    <span className="size-3 rounded-full" style={{ background: a.color }} />
                    <span className="flex-1 truncate font-mono text-[12px] font-semibold tracking-[0.2px] text-tinta">
                      {a.nombre}
                    </span>
                    <span className="font-mono text-[12px] text-niebla">{scores[i]}/5</span>
                    <span
                      className="rounded-[8px] px-2 py-1 font-mono text-[11px] font-bold tracking-[0.2px] text-white transition-opacity"
                      style={{ background: a.color, opacity: activa ? 1 : 0 }}
                    >
                      Foco
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-center font-mono text-[12px] text-niebla">{foco.length} de 3 elegidas</p>
          </div>
        )}

        {enPorque && (
          <div key={focoActual} className="flotar flex flex-col gap-4 pt-2">
            <div className="flex flex-col items-center text-center">
              <span className="size-3 rounded-full" style={{ background: AREAS_GUIA[focoActual].color }} />
              <h1 className="mt-3 font-serif text-[24px] font-semibold tracking-[-0.3px] text-tinta">
                {AREAS_GUIA[focoActual].nombre}
              </h1>
              <p className="mt-1 text-[15px] text-niebla">¿Por qué querés trabajar esta área ahora?</p>
            </div>
            <textarea
              value={porques[focoActual] ?? ''}
              onChange={(e) => setPorques((p) => ({ ...p, [focoActual]: e.target.value }))}
              rows={5}
              autoFocus
              placeholder="Contame con tus palabras. Esto lo voy a tener presente cuando hablemos."
              className="resize-none rounded-2xl border border-iris-borde bg-blanco p-3.5 text-[15px] leading-relaxed text-tinta outline-none placeholder:text-niebla"
            />
            <p className="text-center text-[12px] text-niebla">Tu respuesta queda como contexto del asistente.</p>
          </div>
        )}

        {paso === PASO_RESUMEN && (
          <div className="flotar flex flex-col gap-3.5">
            <p className="font-mono text-[12px] font-semibold tracking-[0.4px] text-iris">Listo</p>
            <h1 className="font-serif text-[26px] font-semibold tracking-[-0.3px] text-tinta">Tu punto de partida</h1>
            <RadarRueda datos={datosRueda} mostrarLeyenda={false} />
            <div className="rounded-2xl border border-iris-borde bg-blanco p-4">
              <p className="mb-2 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Vas a enfocarte en</p>
              {foco.map((i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: AREAS_GUIA[i].color }} />
                  <span className="font-mono text-[12px] font-semibold tracking-[0.2px] text-tinta">
                    {AREAS_GUIA[i].nombre}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
              Podés rehacer la rueda cuando quieras desde la pestaña Rueda. Ahora abrimos tu bitácora.
            </p>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex gap-2.5 border-t border-[rgba(108,120,238,.08)] bg-lavanda/90 px-[22px] py-3 pb-[max(24px,env(safe-area-inset-bottom))] backdrop-blur-sm">
        {paso > 0 && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="rounded-2xl border border-iris-borde bg-blanco px-5 py-[15px] font-mono text-[13px] font-semibold tracking-[0.3px] text-niebla"
          >
            Atrás
          </button>
        )}
        {paso < PASO_RESUMEN ? (
          <button
            type="button"
            disabled={!puedeAvanzar}
            onClick={() => setPaso((p) => p + 1)}
            className="flex-1 rounded-2xl py-[15px] font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-45"
            style={{ background: GRAD_IRIS, boxShadow: SOMBRA_CTA }}
          >
            {ctaLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={finalizar}
            disabled={guardando}
            className="flex-1 rounded-2xl py-[15px] font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-60"
            style={{ background: GRAD_IRIS, boxShadow: SOMBRA_CTA }}
          >
            {guardando ? (soloRueda ? 'Guardando…' : 'Abriendo tu bitácora…') : ctaLabel}
          </button>
        )}
      </div>

      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
          style={{ background: 'rgba(20,18,40,.42)', animation: 'flotar .25s ease both' }}
          onClick={() => setPopup(null)}
        >
          <div
            className="w-full max-w-md rounded-[18px] bg-blanco p-[22px] shadow-[0_24px_60px_rgba(20,18,40,.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-iris">Se conectan</p>
            <p className="mt-2 text-[19px] font-bold text-tinta">
              {popup.a} y {popup.b}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-tinta-soft text-pretty">{popup.nota}</p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-niebla text-pretty">
              Trabajar una probablemente mueva la otra. Buena combinación para enfocarte.
            </p>
            <button
              type="button"
              onClick={() => setPopup(null)}
              className="mt-4 w-full rounded-2xl py-3.5 font-mono text-[13px] font-bold tracking-[0.3px] text-white"
              style={{ background: GRAD_IRIS }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

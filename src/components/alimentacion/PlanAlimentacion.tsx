'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archivarPlan, guardarPlan, tildarComida, type PlanVista } from '@/lib/actions/plan';
import {
  cruceConSueno,
  parsearPlan,
  semanaDelPlan,
  type ComidaDelPlan,
  type DiaDelPlan,
} from '@/lib/plan-alimentacion';

/**
 * EL PLAN DE ALIMENTACIÓN, DE PUNTA A PUNTA.
 *
 * Cuatro estados, y son los cuatro teléfonos de
 * `docs/maquetas/2026-08-04-alimentacion-plan-nutricionista.html`:
 *
 *  1. **Sin plan** — una tarjeta punteada con DOS caminos: la foto y escribirlo.
 *     ⚠️ Los dos, y no solo la foto: si el modelo local no lee bien el papel, no
 *     te podés quedar afuera de la función.
 *  2. **Revisión** — lo que leyó el modelo, editable. **No guarda solo.**
 *  3. **El día** — las comidas del plan, que se tildan de un toque.
 *  4. **La semana y el cruce** — que es donde está el valor de verdad.
 *
 * ── ⚠️ LO QUE COMÉS FUERA DEL PLAN NO SE PINTA DE ROJO ──────────────────────
 *
 * Aparece abajo como "fuera del plan", que es un hecho, no una nota de conducta.
 * Un color de alarma ahí convertiría Alimentación en la app de dieta con culpa,
 * que es exactamente lo que este proyecto decidió no ser en ningún lado. *"Se
 * anota igual. El plan es una guía, no un examen."*
 */

type Estado =
  | { paso: 'nada' }
  | { paso: 'revision'; comidas: ComidaDelPlan[]; foto: string | null; crudo?: string };

export function PlanAlimentacion({
  plan,
  marcas,
  sueno,
}: {
  plan: PlanVista | null;
  marcas: { comidaId: number; fecha: string }[];
  /** Minutos dormidos por día, para el cruce. */
  sueno: { fecha: string; minutos: number }[];
}) {
  const router = useRouter();
  const [trabajando, empezar] = useTransition();
  const [estado, setEstado] = useState<Estado>({ paso: 'nada' });
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function leerFoto(archivo: File | undefined) {
    if (!archivo) return;
    setLeyendo(true);
    setError(null);
    const fd = new FormData();
    fd.set('foto', archivo);
    try {
      const res = await fetch('/api/plan-foto', { method: 'POST', body: fd });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? 'No se pudo leer la foto.');
        // ⚠️ Aunque falle el parseo, si vino texto crudo se abre la revisión con
        // lo que salió: el modelo puede haber leído bien y solo haber errado el
        // formato. Decir "no se pudo" ahí sería tirar un plan leído entero.
        if (datos.crudo) {
          setEstado({ paso: 'revision', comidas: parsearPlan(datos.crudo), foto: datos.foto ?? null, crudo: datos.crudo });
        }
        return;
      }
      setEstado({ paso: 'revision', comidas: datos.comidas, foto: datos.foto ?? null });
    } catch {
      setError('No se pudo leer la foto. Probá escribirlo a mano.');
    } finally {
      setLeyendo(false);
    }
  }

  // ── REVISIÓN ─────────────────────────────────────────────────────────────
  if (estado.paso === 'revision') {
    return (
      <Revision
        inicial={estado.comidas}
        foto={estado.foto}
        crudo={estado.crudo}
        onCancelar={() => setEstado({ paso: 'nada' })}
        onGuardado={() => {
          setEstado({ paso: 'nada' });
          router.refresh();
        }}
      />
    );
  }

  // ── SIN PLAN ─────────────────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="mb-3 tarjeta border border-dashed border-niebla-2 bg-white/60">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void leerFoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p className="text-[14.5px] font-semibold text-tinta">¿Tenés un plan de alimentación?</p>
        <p className="mt-1 text-[12.5px] leading-[1.45] text-niebla text-pretty">
          Si alguien te armó uno, sacale una foto y lo paso a la app. También podés escribirlo.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={leyendo}
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-[12px] px-3 py-2.5 font-mono text-[12px] font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#2f7f68,#3d9b80)' }}
          >
            {leyendo ? 'Leyendo…' : 'Foto del plan'}
          </button>
          <button
            type="button"
            onClick={() => setEstado({ paso: 'revision', comidas: [], foto: null })}
            className="flex-1 rounded-[12px] border border-iris-borde bg-white px-3 py-2.5 font-mono text-[12px] font-semibold text-tinta-soft"
          >
            Escribirlo
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] leading-[1.4] text-rosa text-pretty">{error}</p>}
      </div>
    );
  }

  // ── CON PLAN: EL DÍA, LA SEMANA Y EL PAPEL ───────────────────────────────
  const hoy = new Date();
  const hoyYmd = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const ids = plan.comidas.map((c) => c.id);
  const marcadasHoy = new Set(marcas.filter((m) => m.fecha === hoyYmd).map((m) => m.comidaId));
  const dias = semanaDelPlan(ids, marcas, hoy, 7);
  const paraCruce = semanaDelPlan(ids, marcas, hoy, 35);
  const cruce = cruceConSueno(paraCruce, sueno);

  return (
    <>
      {/* ── HOY, SEGÚN TU PLAN ───────────────────────────────────────────── */}
      <div className="mb-3 tarjeta border border-iris-borde bg-white">
        <div className="mb-2 flex items-baseline gap-2">
          <p className="text-[13px] font-bold text-tinta">Hoy, según tu plan</p>
          <span className="ml-auto font-mono text-[11.5px] font-bold text-verde">
            {marcadasHoy.size} de {plan.comidas.length}
          </span>
        </div>
        <ul>
          {plan.comidas.map((c) => {
            const hecha = marcadasHoy.has(c.id);
            return (
              <li key={c.id} className="border-b border-[#f1f0f7] last:border-none">
                <button
                  type="button"
                  disabled={trabajando}
                  onClick={() =>
                    empezar(async () => {
                      await tildarComida(c.id);
                      router.refresh();
                    })
                  }
                  aria-pressed={hecha}
                  className="flex w-full items-center gap-2.5 py-2.5 text-left"
                >
                  <span className="w-[38px] flex-none font-mono text-[10.5px] text-niebla">{c.hora}</span>
                  <span className="min-w-0 flex-1">
                    <b className={`block text-[13.5px] leading-[1.3] ${hecha ? 'font-semibold text-tinta' : 'font-normal text-tinta-soft'}`}>
                      {c.que}
                    </b>
                    {c.detalle && <small className="text-[11px] text-niebla">{c.detalle}</small>}
                  </span>
                  <span
                    className={`grid size-[22px] flex-none place-items-center rounded-full border text-[11px] font-bold ${
                      hecha ? 'border-verde bg-verde text-white' : 'border-niebla-2 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── LA SEMANA, Y EL CRUCE ─────────────────────────────────────────── */}
      <div className="mb-3 tarjeta border border-iris-borde bg-white">
        <p className="mb-2.5 text-[13px] font-bold text-tinta">Cómo venís con el plan</p>
        <BarrasSemana dias={dias} />

        {/* ⚠️ EL VALOR NO ES EL PORCENTAJE, ES ESTO. "Cumpliste 5 de 7" lo hace
            cualquiera; "los días que seguís el plan dormís 40 minutos más" solo
            lo puede decir una app que ya tiene tu sueño.

            ⚠️ Y ESTÁ ESCRITO COMO CORRELACIÓN, NO COMO CAUSA: "los días que
            seguís el plan dormiste X más" y no "seguir el plan te hace dormir
            mejor". Dormir bien puede ser lo que te deja seguir el plan. */}
        {cruce && cruce.minutos !== 0 && (
          <>
            <p className="mt-2.5 border-l-[3px] border-verde pl-2.5 text-[12.5px] leading-[1.45] text-tinta text-pretty">
              Los días que seguís el plan dormiste{' '}
              <b>
                {Math.abs(cruce.minutos)} min {cruce.minutos > 0 ? 'más' : 'menos'}
              </b>
              , en promedio.
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-niebla-2">
              Sale de tus datos: {cruce.diasConPlan} días con plan y {cruce.diasSinPlan} sin.
            </p>
          </>
        )}
      </div>

      {/* ── EL PAPEL, ABAJO DE TODO ───────────────────────────────────────────
          ⚠️ EL ORDEN SIGUE AL USO, no a la importancia: el plan del día lo mirás
          varias veces por día y el papel original lo tocás una vez cada tres
          meses. Ponerlo arriba habría puesto lo más raro en el lugar de lo más
          frecuente. */}
      <details className="mb-3 tarjeta border border-iris-borde bg-white">
        <summary className="cursor-pointer text-[13px] font-bold text-tinta">El plan</summary>
        <p className="mt-1.5 text-[12px] text-niebla">
          {plan.dequien ? `De ${plan.dequien} · ` : ''}desde el {plan.desde.split('-').reverse().slice(0, 2).join('/')}
          {plan.fuente === 'foto' ? ' · leído de una foto' : ' · escrito a mano'}
        </p>
        {plan.foto && (
          // La foto original queda: si solo guardáramos lo que la IA entendió,
          // un error de lectura sería para siempre.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/adjuntos/${plan.foto}`}
            alt="La foto del plan, como te la dieron"
            className="mt-2.5 w-full rounded-[12px] border border-iris-borde"
          />
        )}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-[12px] border border-iris-borde px-3 py-1.5 font-mono text-[11.5px] font-semibold text-iris-deep"
          >
            Cambiarlo
          </button>
          <button
            type="button"
            disabled={trabajando}
            onClick={() => {
              if (!window.confirm('El plan deja de mostrarse. Lo tildado queda guardado y podés cargar otro.')) return;
              empezar(async () => {
                await archivarPlan();
                router.refresh();
              });
            }}
            className="rounded-[12px] border border-iris-borde px-3 py-1.5 font-mono text-[11.5px] font-semibold text-niebla"
          >
            Dejar de seguirlo
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void leerFoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {leyendo && <p className="mt-2 text-[12px] text-niebla">Leyendo la foto…</p>}
        {error && <p className="mt-2 text-[12px] leading-[1.4] text-rosa text-pretty">{error}</p>}
      </details>
    </>
  );
}

function BarrasSemana({ dias }: { dias: DiaDelPlan[] }) {
  const maximo = Math.max(1, ...dias.map((d) => d.total));
  return (
    <>
      <div className="flex h-[52px] items-end gap-[5px]">
        {dias.map((d) => (
          <div
            key={d.fecha}
            title={`${d.cumplidas} de ${d.total}`}
            className={`flex-1 rounded-[4px] ${d.esHoy ? 'ring-1 ring-verde/40' : ''}`}
            style={{
              height: `${Math.max(8, (d.cumplidas / maximo) * 100)}%`,
              background:
                d.cumplidas > 0
                  ? `oklch(0.58 0.10 165 / ${0.35 + (d.cumplidas / maximo) * 0.55})`
                  : 'var(--color-verde-tint)',
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[5px]">
        {dias.map((d) => (
          <span key={d.fecha} className="flex-1 text-center font-mono text-[9.5px] text-niebla-2">
            {d.inicial}
          </span>
        ))}
      </div>
    </>
  );
}

/**
 * LA PANTALLA DE REVISIÓN — la que hace que la foto sea segura.
 *
 * ⚠️ TODO ES EDITABLE Y NADA SE GUARDA HASTA QUE TOCA "GUARDAR". Es la regla de
 * la casa aplicada a la foto: la IA propone y él confirma. Y sirve igual para el
 * camino de "escribirlo", que arranca con la lista vacía.
 */
function Revision({
  inicial,
  foto,
  crudo,
  onCancelar,
  onGuardado,
}: {
  inicial: ComidaDelPlan[];
  foto: string | null;
  crudo?: string;
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const [comidas, setComidas] = useState<ComidaDelPlan[]>(
    inicial.length > 0 ? inicial : [{ hora: '08:00', que: '', detalle: null }],
  );
  const [dequien, setDequien] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  function cambiar(i: number, campo: 'hora' | 'que' | 'detalle', valor: string) {
    setComidas((cs) => cs.map((c, j) => (j === i ? { ...c, [campo]: campo === 'detalle' ? valor || null : valor } : c)));
  }

  return (
    <div className="mb-3 tarjeta border border-iris-borde bg-white">
      <p className="text-[14.5px] font-semibold text-tinta">
        {inicial.length > 0 ? 'Esto es lo que leí' : 'Escribí tu plan'}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.45] text-niebla text-pretty">
        {inicial.length > 0
          ? 'Revisalo antes de guardar. Lo que esté mal, corregilo — la foto queda igual.'
          : 'Una comida por renglón, con su horario.'}
      </p>

      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/adjuntos/${foto}`} alt="La foto del plan" className="mt-2.5 max-h-[180px] w-full rounded-[12px] border border-iris-borde object-cover" />
      )}

      {crudo && (
        <details className="mt-2.5 rounded-[10px] bg-papel-2 p-2.5">
          <summary className="cursor-pointer font-mono text-[11px] font-semibold text-niebla">
            Lo que salió, tal cual
          </summary>
          <pre className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-[1.45] text-tinta-soft">{crudo}</pre>
        </details>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {comidas.map((c, i) => (
          <li key={i} className="flex flex-col gap-1.5 rounded-[12px] bg-papel-2 p-2">
            <div className="flex gap-2">
              <input
                value={c.hora}
                onChange={(e) => cambiar(i, 'hora', e.target.value)}
                aria-label="Hora"
                placeholder="08:00"
                className="h-9 w-[70px] flex-none rounded-[9px] border border-iris-borde bg-white px-2 text-center font-mono text-[13px] text-tinta outline-none focus:border-iris"
              />
              <input
                value={c.que}
                onChange={(e) => cambiar(i, 'que', e.target.value)}
                aria-label="Qué se come"
                placeholder="Avena con fruta"
                className="h-9 min-w-0 flex-1 rounded-[9px] border border-iris-borde bg-white px-2.5 text-[14px] text-tinta outline-none focus:border-iris"
              />
              <button
                type="button"
                aria-label="Sacar esta comida"
                onClick={() => setComidas((cs) => cs.filter((_, j) => j !== i))}
                className="flex-none px-1 font-mono text-[12px] text-niebla-2"
              >
                ✕
              </button>
            </div>
            <input
              value={c.detalle ?? ''}
              onChange={(e) => cambiar(i, 'detalle', e.target.value)}
              aria-label="Detalle (opcional)"
              placeholder="1 taza (opcional)"
              className="h-8 w-full rounded-[9px] border border-iris-borde bg-white px-2.5 text-[12.5px] text-tinta-soft outline-none focus:border-iris"
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setComidas((cs) => [...cs, { hora: '', que: '', detalle: null }])}
        className="mt-2 w-full rounded-[12px] border border-dashed border-niebla-2 p-2 font-mono text-[11.5px] font-semibold text-niebla"
      >
        + Agregar una comida
      </button>

      <input
        value={dequien}
        onChange={(e) => setDequien(e.target.value)}
        placeholder="Quién te lo dio (opcional)"
        className="mt-2.5 h-10 w-full rounded-[12px] border border-iris-borde px-3 text-[14px] text-tinta outline-none focus:border-iris"
      />

      {error && <p className="mt-2 text-[12px] text-rosa">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={() =>
            empezar(async () => {
              setError(null);
              const r = await guardarPlan({ comidas, foto, dequien });
              if (!r.ok) {
                setError(r.error ?? 'No se pudo guardar.');
                return;
              }
              onGuardado();
            })
          }
          className="flex-1 rounded-[12px] p-2.5 font-mono text-[12px] font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#2f7f68,#3d9b80)' }}
        >
          {guardando ? '…' : 'Guardar este plan'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-none rounded-[12px] border border-iris-borde px-4 font-mono text-[11.5px] font-semibold text-niebla"
        >
          Cancelar
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-niebla-2">Lo vas a poder cambiar cuando quieras.</p>
    </div>
  );
}

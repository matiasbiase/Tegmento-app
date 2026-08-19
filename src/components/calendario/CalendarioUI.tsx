'use client';

import { createContext, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearEvento, editarEvento, borrarEvento } from '@/lib/actions/eventos';
import { borrarFoto } from '@/lib/actions/fotos';
import { etiquetaDiaAgenda } from '@/lib/agenda';
import { moodDe, type MoodKey } from '@/lib/animo';
import { diaVacio, type DetalleDia } from '@/lib/dia';
import { montoConSimbolo } from '@/lib/moneda';
import { ymd } from '@/lib/marcas';
import type { MarcaCiclo } from '@/lib/ciclo';
import { IconLapiz } from '@/components/ui/iconos';
import { Tira } from '@/components/calendario/Tira';
import { armarTira } from '@/lib/tira';

export type EventoVista = {
  id: number;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  hora: string | null; // HH:MM o null (todo el día)
  areaId: number | null;
  area: string | null;
  areaColor: string | null;
  nota: string | null;
  externo?: boolean; // viene del calendario del iPhone: se muestra, no se edita
};

export type AreaOpcion = { id: number; nombre: string };
export type MarcaDia = { mood: MoodKey | null; ciclo?: MarcaCiclo | null };

const CORAL = '#d1567a';

const GRAD_IRIS = 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))';

const FormAreasContexto = createContext<AreaOpcion[]>([]);


// El balance de un día: todo lo que registraste, en secciones. Aparece al tocar
// una casilla, sea de hoy, de ayer o de la semana que viene.
const TXT_CICLO: Record<MarcaCiclo, string> = {
  periodo: 'Estabas con el período',
  pred: 'Próximo período estimado',
  ovulacion: 'Ovulación estimada',
};

// Una foto del día: se abre en grande al tocarla, y tiene una X para borrarla
// (subir dos veces la misma pasa; sin esto no había cómo limpiar).
function Miniatura({ path, hora, clave }: { path: string; hora: string; clave: string }) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function borrar() {
    setBorrando(true);
    await borrarFoto(path);
    router.refresh();
  }

  if (borrando) {
    return <div className="grid size-16 place-items-center rounded-[12px] bg-[#f4f4f9] font-mono text-[11px] text-niebla">…</div>;
  }

  return (
    <div className="relative size-16">
      <a
        href={`/api/adjuntos/${path}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block size-full overflow-hidden rounded-[12px] border border-[rgba(108,120,238,.14)]"
        title={`Foto de las ${hora}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/adjuntos/${path}`} alt={`Foto del ${clave} a las ${hora}`} loading="lazy" className="size-full object-cover" />
      </a>
      {confirmar ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[12px] bg-[rgba(28,28,43,.72)] p-1">
          <button type="button" onClick={borrar} className="rounded-full bg-rosa px-2 py-0.5 font-mono text-[11px] font-bold text-white">
            Borrar
          </button>
          <button type="button" onClick={() => setConfirmar(false)} className="font-mono text-[11px] text-white/80">
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          aria-label="Borrar foto"
          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[rgba(28,28,43,.7)] text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="size-3">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function DiaBalance({
  clave,
  detalle,
  ciclo,
  onCerrar,
}: {
  clave: string;
  detalle: DetalleDia;
  ciclo: MarcaCiclo | null;
  /**
   * ⚠️ OPCIONAL DESDE EL 06/08, cuando la grilla se fue. Antes el balance
   * aparecía solo al TOCAR una casilla, así que necesitaba una salida. Ahora
   * cuelga de la tira y está siempre: el día enfocado es el del centro, y no hay
   * de qué salir. Sin este botón, "ver lo que viene" ya está ahí abajo.
   */
  onCerrar?: () => void;
}) {
  const mood = moodDe(detalle.animo.length ? detalle.animo[0].estado : null);
  const vacio =
    detalle.animo.length === 0 &&
    !detalle.sueno &&
    detalle.comidas.length === 0 &&
    detalle.gastos.length === 0 &&
    detalle.hechas.length === 0 &&
    detalle.eventos.length === 0 &&
    detalle.notas.length === 0 &&
    detalle.charlas.length === 0 &&
    detalle.fotos.length === 0;

  return (
    <div className="tarjeta bg-white sombra-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-serif text-[19px] font-semibold text-tinta">{etiquetaDiaAgenda(clave, new Date())}</p>
        {onCerrar && (
          <button type="button" onClick={onCerrar} className="font-mono text-[12px] font-semibold text-iris">
            ver lo que viene
          </button>
        )}
      </div>

      {ciclo && (
        <div className="mb-3 flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: '#fbe4ec' }}>
          <span
            className="size-2 flex-none rounded-full"
            style={ciclo === 'ovulacion' ? { background: 'var(--color-iris)' } : ciclo === 'pred' ? { border: `1.5px solid ${CORAL}` } : { background: CORAL }}
          />
          <span className="text-[13px] font-semibold text-[#9c3457]">{TXT_CICLO[ciclo]}</span>
        </div>
      )}

      {vacio && !ciclo ? (
        <p className="text-[15px] leading-relaxed text-niebla text-pretty">
          Ese día no registraste nada. Lo que vayas cargando (ánimo, sueño, comida, tickets, actividades) va a aparecer acá.
        </p>
      ) : vacio ? null : (
        <div className="flex flex-col gap-3.5">
          {detalle.animo.length > 0 && (
            <Bloque etiqueta="Ánimo" color={mood?.color ?? 'var(--color-iris)'}>
              {detalle.animo.map((a, i) => {
                const m = moodDe(a.estado);
                return (
                  <p key={i} className="text-[13px] text-tinta-soft">
                    <span className="font-semibold" style={{ color: m?.color }}>{m?.label ?? a.estado}</span>
                    <span className="ml-1.5 font-mono text-[11px] text-niebla">{a.hora}</span>
                    {a.nota ? <span className="text-tinta-soft"> · {a.nota}</span> : null}
                  </p>
                );
              })}
            </Bloque>
          )}
          {detalle.sueno && (
            <Bloque etiqueta="Sueño" color="var(--color-iris-2)">
              <p className="text-[13px] text-tinta-soft">
                {detalle.sueno.hs.toLocaleString('es-AR')} h
                {detalle.sueno.calidad
                  ? ` · ${detalle.sueno.calidad === 'bien' ? 'descansaste' : detalle.sueno.calidad === 'mal' ? 'dormiste mal' : 'regular'}`
                  : ''}
              </p>
            </Bloque>
          )}
          {detalle.comidas.length > 0 && (
            <Bloque etiqueta="Alimentación" color="var(--color-rosa)">
              {detalle.comidas.map((c, i) => (
                <p key={i} className="text-[13px] text-tinta-soft">
                  {c.nota} <span className="font-mono text-[11px] text-niebla">{c.hora}</span>
                </p>
              ))}
            </Bloque>
          )}
          {detalle.gastos.length > 0 && (
            <Bloque etiqueta="Gastos" color="var(--color-iris-deep)">
              {detalle.gastos.map((g, i) => (
                <p key={i} className="flex items-baseline justify-between gap-3 text-[13px] text-tinta-soft">
                  <span>{g.comercio ?? 'Ticket'}</span>
                  {g.total != null && (
                    <span className="font-mono text-[12px] tabular-nums text-tinta">
                      {montoConSimbolo(g.total, g.moneda)}
                    </span>
                  )}
                </p>
              ))}
            </Bloque>
          )}
          {detalle.hechas.length > 0 && (
            <Bloque etiqueta="Hiciste" color="var(--color-verde)">
              {detalle.hechas.map((h, i) => (
                <p key={i} className="text-[13px] text-tinta-soft">{h}</p>
              ))}
            </Bloque>
          )}
          {detalle.eventos.length > 0 && (
            <Bloque etiqueta="Agenda" color="var(--color-oro)">
              {detalle.eventos.map((e, i) => (
                <p key={i} className="text-[13px] text-tinta-soft">
                  {e.hora && <span className="font-mono text-[11px] text-oro">{e.hora} </span>}
                  {e.titulo}
                </p>
              ))}
            </Bloque>
          )}
          {detalle.notas.length > 0 && (
            <Bloque etiqueta="Anotaste" color="var(--color-niebla)">
              {detalle.notas.map((n, i) => (
                <p key={i} className="text-[13px] leading-snug text-tinta-soft text-pretty">
                  {n.texto} <span className="font-mono text-[11px] text-niebla">{n.hora}</span>
                </p>
              ))}
            </Bloque>
          )}
          {detalle.charlas.length > 0 && (
            <Bloque etiqueta={`Charlas (${detalle.charlas.length})`} color="var(--color-niebla)">
              {detalle.charlas.map((c, i) => (
                <p key={i} className="line-clamp-2 text-[13px] leading-snug text-tinta-soft text-pretty">
                  <span className="font-mono text-[11px] text-niebla">{c.hora}</span> {c.texto}
                </p>
              ))}
            </Bloque>
          )}
          {detalle.fotos.length > 0 && (
            <Bloque etiqueta={`Fotos (${detalle.fotos.length})`} color="#7b5cd6">
              <div className="flex flex-wrap gap-2">
                {detalle.fotos.map((f, i) => (
                  <Miniatura key={i} path={f.path} hora={f.hora} clave={clave} />
                ))}
              </div>
            </Bloque>
          )}
        </div>
      )}
    </div>
  );
}

function Bloque({ etiqueta, color, children }: { etiqueta: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">
        <span className="size-1.5 rounded-full" style={{ background: color }} />
        {etiqueta}
      </p>
      <div className="flex flex-col gap-0.5 pl-3">{children}</div>
    </div>
  );
}

// Form compartido para crear y editar (mínimo: qué, cuándo, hora y área opcionales).
function FormEvento({
  inicial,
  fechaPorDefecto,
  guardando,
  onGuardar,
  onCancelar,
}: {
  inicial?: EventoVista;
  fechaPorDefecto?: string;
  guardando: boolean;
  onGuardar: (titulo: string, fecha: string, hora: string | null, areaId: number | null) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaPorDefecto ?? ymd(new Date()));
  const [hora, setHora] = useState(inicial?.hora ?? '');
  const [areaId, setAreaId] = useState<number | null>(inicial?.areaId ?? null);
  const listo = titulo.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(fecha);

  return (
    <FormAreasContexto.Consumer>
      {(areas) => (
        <div className="tarjeta bg-white sombra-card">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold text-tinta">{inicial ? 'Editar evento' : '¿Qué tenés que recordar?'}</p>
            <button type="button" onClick={onCancelar} className="flex-none font-mono text-[12px] font-semibold text-niebla">
              Cancelar
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              autoFocus={!inicial}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Turno, plan, deadline…"
              className="w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[16px] text-tinta outline-none"
            />
            <div className="flex gap-2.5">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[15px] text-tinta outline-none"
              />
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-[110px] flex-none rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2.5 text-[15px] text-tinta outline-none"
              />
            </div>
            <p className="-mt-1 font-mono text-[11px] text-niebla">Sin hora = todo el día.</p>
            <select
              value={areaId ?? ''}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2.5 text-[15px] text-tinta outline-none"
            >
              <option value="">Sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!listo || guardando}
              onClick={() => onGuardar(titulo, fecha, hora || null, areaId)}
              className="mt-1 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
              style={{ background: GRAD_IRIS, boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
            >
              {guardando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Agendar'}
            </button>
          </div>
        </div>
      )}
    </FormAreasContexto.Consumer>
  );
}

// Una fila de evento futuro: tocás y se expande con Editar / Borrar (dos toques).
function FilaEvento({ e }: { e: EventoVista }) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, startOcupado] = useTransition();
  const router = useRouter();

  function guardar(titulo: string, fecha: string, hora: string | null, areaId: number | null) {
    startOcupado(async () => {
      await editarEvento(e.id, titulo, fecha, hora, areaId);
      setEditando(false);
      setAbierto(false);
      router.refresh();
    });
  }

  function borrar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    startOcupado(async () => {
      await borrarEvento(e.id);
      router.refresh();
    });
  }

  if (editando) return <FormEvento inicial={e} guardando={ocupado} onGuardar={guardar} onCancelar={() => setEditando(false)} />;

  return (
    <div
      onClick={() => {
        if (e.externo) return; // los del iPhone son de solo lectura
        setAbierto((a) => !a);
        setConfirmando(false);
      }}
      className={`rounded-[18px] bg-white p-[12px_14px] sombra-card transition-opacity ${ocupado ? 'opacity-40' : ''} ${e.externo ? '' : 'cursor-pointer'}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex-none rounded-lg px-2 py-1 font-mono text-[11px] font-bold tabular-nums ${
            e.hora ? 'bg-iris-soft text-iris-deep' : 'bg-oro-tint text-oro'
          }`}
        >
          {e.hora ?? 'Todo el día'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px] leading-snug text-tinta">
            {e.titulo}
            {e.externo && (
              <span className="flex-none rounded-md bg-gris-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-niebla">
                iPhone
              </span>
            )}
          </p>
          {(e.area || e.nota) && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-niebla">
              {e.area && (
                <>
                  <span className="size-1.5 flex-none rounded-full" style={{ background: e.areaColor ?? 'var(--color-iris)' }} />
                  {e.area}
                </>
              )}
              {e.area && e.nota && ' · '}
              {e.nota}
            </p>
          )}
        </div>
      </div>
      {abierto && !e.externo && (
        <div className="mt-2.5 flex justify-end gap-2 border-t border-gris-tint-2 pt-2.5">
          <button
            type="button"
            disabled={ocupado}
            onClick={(ev) => {
              ev.stopPropagation();
              setEditando(true);
            }}
            className="flex items-center gap-1.5 rounded-[12px] border border-iris-borde px-2.5 py-1.5 font-mono text-[11px] font-semibold text-iris-deep"
          >
            <IconLapiz className="size-[13px]" />
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={(ev) => {
              ev.stopPropagation();
              borrar();
            }}
            className={`flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              confirmando ? 'border-rosa bg-rosa text-white' : 'border-[#f0d0d8] text-rosa'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
            {ocupado ? 'Borrando…' : confirmando ? '¿Seguro? Tocá de nuevo' : 'Borrar'}
          </button>
        </div>
      )}
    </div>
  );
}

export function CalendarioUI({
  eventos,
  areas,
  marcas,
  detalles,
}: {
  eventos: EventoVista[];
  areas: AreaOpcion[];
  marcas: Record<string, MarcaDia>;
  detalles: Record<string, DetalleDia>;
}) {
  const hoy = ymd(new Date());
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  /**
   * ⚠️ LA TIRA REEMPLAZÓ A LA GRILLA (06/08). Matías: *"yo sacaría el calendario…
   * calendario tenés en todos lados, para qué vamos a hacer un calendario igual
   * que los otros"*. Lo que se fue es SOLO la grilla del mes: el balance del día
   * y la agenda de abajo quedaron enteros.
   *
   * ⚠️ El ciclo se saca de `marcas` y no de una prop nueva: la página ya lo
   * mezcla ahí, y pedirlo aparte sería que los dos lados pudieran discrepar
   * sobre qué días son de período.
   */
  const ciclo = useMemo(
    () => Object.fromEntries(Object.entries(marcas).map(([k, v]) => [k, v.ciclo])),
    [marcas],
  );
  const dias = useMemo(() => armarTira(detalles, ciclo, hoy), [detalles, ciclo, hoy]);
  const [guardando, startGuardando] = useTransition();
  const router = useRouter();

  // Solo lo que viene; lo pasado no hace ruido (igual está tocando la casilla).
  const proximos = eventos.filter((e) => e.fecha >= hoy);
  const porDia = useMemo(() => {
    const grupos = new Map<string, EventoVista[]>();
    for (const e of proximos) {
      if (!grupos.has(e.fecha)) grupos.set(e.fecha, []);
      grupos.get(e.fecha)!.push(e);
    }
    return [...grupos.entries()];
  }, [proximos]);

  function crear(titulo: string, fecha: string, hora: string | null, areaId: number | null) {
    startGuardando(async () => {
      await crearEvento(titulo, fecha, hora, areaId);
      setCreando(false);
      router.refresh();
    });
  }

  return (
    <FormAreasContexto.Provider value={areas}>
      <div className="flex flex-col gap-4">
        <Tira dias={dias} hoy={hoy} marcas={marcas} onDia={setSeleccion} />

        {/* ⚠️ EL BALANCE AHORA ESTÁ SIEMPRE, y no solo al tocar una casilla: es
            el día que quedó en el centro de la tira. Matías: *"que abajo se vean
            las fotos y todo eso… cuadraditos de cositas abajo que aparezcan
            ahí"*. Ya los dibujaba `Miniatura`; lo que cambió es que ahora se ven
            sin tener que ir a buscarlos. */}
        {seleccion && (
          <DiaBalance
            clave={seleccion}
            detalle={detalles[seleccion] ?? diaVacio()}
            ciclo={marcas[seleccion]?.ciclo ?? null}
          />
        )}

        {/* ⚠️ ESTO NO SE FUE CON LA GRILLA, Y NO PODÍA IRSE: la agenda de abajo
            es el ÚNICO lugar donde un evento se edita y se borra (`FilaEvento`).
            El balance los muestra —título y hora— pero no los deja tocar, así
            que sacarla habría sido sacar una función con la excusa de cambiar un
            dibujo. Antes se veía en lugar del balance; ahora convive con él. */}
        <>
            {/* alta */}
            {creando ? (
              <FormEvento guardando={guardando} onGuardar={crear} onCancelar={() => setCreando(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white"
                style={{ background: GRAD_IRIS, boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Anotar algo a futuro
              </button>
            )}

            {/* lo que viene */}
            {porDia.length === 0 && !creando ? (
              <div className="tarjeta bg-white sombra-card">
                <p className="text-[15px] leading-relaxed text-niebla text-pretty">
                  Nada agendado por ahora. Anotá turnos, planes o deadlines y te los recuerdo en las charlas.
                  También podés decírmelo en el chat: &ldquo;el jueves a las 10 tengo dentista&rdquo;.
                </p>
              </div>
            ) : (
              porDia.map(([fecha, items]) => (
                <section key={fecha}>
                  <p className="mb-2 px-1.5 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">
                    {etiquetaDiaAgenda(fecha, new Date())}
                  </p>
                  <div className="flex flex-col gap-2">
                    {items.map((e) => (
                      <FilaEvento key={e.id} e={e} />
                    ))}
                  </div>
                </section>
              ))
            )}
        </>
      </div>
    </FormAreasContexto.Provider>
  );
}

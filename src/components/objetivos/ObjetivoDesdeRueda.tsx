'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearObjetivoDesdeRueda } from '@/lib/actions/objetivos';
import {
  TIPOS_OBJETIVO,
  areasParaElegir,
  fechaLimitePorDefecto,
  propuestaDeRueda,
  type TipoObjetivo,
} from '@/lib/objetivos-onboarding';
import { GLIFO_RUEDA, GLIFO_SEGUIMIENTO } from '@/components/ui/glifos';

/**
 * Un dibujo por tipo, y los tres salen de lo que ya existe: la rueda para mover
 * un área, la bandera de meta para llegar a algo, las barritas del seguimiento
 * para el hábito — que es, literalmente, un seguimiento sostenido.
 */
/** YYYY-MM-DD de hoy en hora local, para prellenar la fecha límite. */
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ICO_TIPO: Record<TipoObjetivo, React.ReactNode> = {
  rueda: GLIFO_RUEDA,
  llegar: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4.5h11l-2.2 3.6L17 12H6z" />
    </>
  ),
  habito: GLIFO_SEGUIMIENTO,
};

/**
 * ARMAR UN OBJETIVO DESDE LA RUEDA — área → objetivo → seguimientos (06/08).
 *
 * ⚠️⚠️ LOS TRES PASOS SON LA JERARQUÍA, no una comodidad. La primera maqueta
 * proponía **seguimientos disfrazados de objetivos** y Matías la cortó:
 * *"volver a entrenar dos veces por semana… eso es un seguimiento. El objetivo
 * es más como cuál es lo que se quiere lograr"*. Un objetivo dice **qué querés
 * lograr**; lo que vas a hacer cuelga de él. Poner las dos cosas en un solo
 * formulario es exactamente lo que hacía que se confundieran.
 *
 * ⚠️ ARRANCA POR EL ÁREA Y NO POR EL TÍTULO porque de ahí sale la medida: el
 * puntaje que ya te pusiste. Escribir el título primero deja al objetivo sin
 * ninguna forma de saber cuándo terminó.
 *
 * ⚠️ SE PROPONE ANTES DE PREGUNTAR, igual que `ArranqueObjetivos`: el paso 2 ya
 * viene con "Subir de 2 a 3 en Salud física" escrito. Un campo en blanco te deja
 * todo el trabajo.
 */
export function ObjetivoDesdeRueda({
  areas,
  actividades,
  abrirYa = false,
  sinArea = false,
}: {
  areas: { id: number; nombre: string; scoreActual: number | null; foco: boolean; color: string | null }[];
  /** Las actividades vivas, para colgar en el paso 3. */
  actividades: { id: number; titulo: string; diaria: boolean }[];
  /** Llega desde `?nuevo=1`, o sea del "Sí, anotarlo" del Home: abre desplegado. */
  abrirYa?: boolean;
  /**
   * La variante "uno propio": saltea el paso del área y arranca en el tipo.
   * ⚠️ Sigue preguntando TODO lo demás — es el mismo flujo, no el formulario en
   * blanco que se borró. Lo único que pierde es la propuesta "subir de 2 a 3",
   * que sale del puntaje del área.
   */
  sinArea?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(abrirYa);
  const [paso, setPaso] = useState<1 | 2 | 3>(sinArea ? 2 : 1);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoObjetivo>('rueda');
  const [titulo, setTitulo] = useState('');
  const [fechaMeta, setFechaMeta] = useState('');
  const [monto, setMonto] = useState('');
  const [meta, setMeta] = useState('');
  const [horasEstimadas, setHorasEstimadas] = useState('');
  const [horasPorVez, setHorasPorVez] = useState('');
  const [arranco, setArranco] = useState('');
  const [colgadas, setColgadas] = useState<number[]>([]);
  const [guardando, empezar] = useTransition();

  const ordenadas = areasParaElegir(areas);
  const area = areas.find((a) => a.id === areaId) ?? null;
  const propuesta = area ? propuestaDeRueda(area) : null;

  function cerrar() {
    setAbierto(false);
    setPaso(sinArea ? 2 : 1);
    setAreaId(null);
    setTipo('rueda');
    setTitulo('');
    setFechaMeta('');
    setMonto('');
    setMeta('');
    setHorasEstimadas('');
    setHorasPorVez('');
    setArranco('');
    setColgadas([]);
  }

  function elegirArea(id: number) {
    setAreaId(id);
    const a = areas.find((x) => x.id === id);
    const p = a ? propuestaDeRueda(a) : null;
    // ⚠️ Si el área está en 5 no hay propuesta de rueda, así que el tipo arranca
    // en "llegar": ofrecer "subir de 5 a 6" sería ofrecer algo que no existe.
    setTipo(p ? 'rueda' : 'llegar');
    setTitulo(p ? p.titulo : '');
    // ⚠️ LA FECHA LÍMITE LLEGA PUESTA A 60 DÍAS. El paso 2 tiene que mostrarla ya
    // escrita, no en blanco: un campo vacío con el default aplicándose recién al
    // guardar es una fecha que aparece de la nada en la tarjeta.
    if (!fechaMeta) setFechaMeta(fechaLimitePorDefecto(hoyLocal()));
    setPaso(2);
  }

  function elegirTipo(t: TipoObjetivo) {
    setTipo(t);
    // El de rueda trae su título hecho; los otros dos lo piden, y arrancan
    // vacíos en vez de con el de rueda adentro, que sería un título que dice una
    // cosa para un objetivo que mide otra.
    setTitulo(t === 'rueda' && propuesta ? propuesta.titulo : '');
  }

  function crear() {
    if (!titulo.trim()) return;
    empezar(async () => {
      await crearObjetivoDesdeRueda({
        areaId,
        tipo,
        titulo,
        scoreDesde: propuesta?.desde ?? null,
        scoreHasta: propuesta?.hasta ?? null,
        fechaMeta: fechaMeta || null,
        montoMeta: tipo === 'llegar' ? monto || null : null,
        meta: meta || null,
        horasEstimadas: horasEstimadas || null,
        horasPorVez: horasPorVez || null,
        arranco: arranco || null,
        lineaIds: colgadas,
      });
      cerrar();
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      // ⚠️ CON EL CUADRADITO DEL ÍCONO, COMO LAS TARJETAS (06/08, Matías:
      // *"el ícono ese que teníamos de la rueda y que tenía el más, eso no
      // aparece, está vacío"*). Un botón de alta que no tiene la anatomía de la
      // tarjeta que va a crear se lee como si fuera de otra app.
      //
      // ⚠️ Y SIN TROQUELADO (12/08). Matías: *"los botones estos que dicen armar
      // un objetivo desde la rueda, armar un objetivo propio, no me gusta que
      // tengan el punteito; sacar el troquelado ese"*.
      //
      // El borde punteado decía "acá todavía no hay nada, esto es un hueco para
      // llenar" — el idioma de los `placeholder`. Pero estos dos no son huecos:
      // son **las dos puertas de entrada de la sección**, lo más sólido que hay
      // en la pantalla. La línea cortada los dibujaba como algo provisorio.
      // Queda el mismo borde, continuo.
      <button
        type="button"
        onClick={() => {
          if (sinArea) {
            setTipo('llegar');
            setTitulo('');
            if (!fechaMeta) setFechaMeta(fechaLimitePorDefecto(hoyLocal()));
            setPaso(2);
          }
          setAbierto(true);
        }}
        className="flex w-full items-center gap-3 tarjeta border-[1.5px] border-iris/40 text-left glass-tinte"
      >
        <span className="relative grid size-[46px] flex-none place-items-center rounded-[13px] bg-iris-soft text-iris-deep">
          {/* La rueda para el que parte de la rueda; la bandera de meta para el
              propio — el mismo dibujo que va a tener su tarjeta si no elige otro. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[23px]">
            {sinArea ? ICO_TIPO.llegar : GLIFO_RUEDA}
          </svg>
          {/* El `+` en la esquina: dice que esto CREA, no que te lleva a la rueda. */}
          <span
            className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="size-[10px]">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          {/* ⚠️ CON LA PALABRA "OBJETIVO" (06/08, Matías: *"armar un qué, armar
              un objetivo desde la rueda, falta el nombre ahí"*). Decía "armar
              uno": el "uno" solo se entiende si ya leíste el título de la
              sección, y en la pestaña de Seguimiento ese título no está. */}
          <span className="block text-[14.5px] font-semibold text-iris-deep">
            {sinArea ? 'Armar un objetivo propio' : 'Armar un objetivo desde la rueda'}
          </span>
          <span className="mt-[3px] block text-[12.5px] leading-[1.4] text-niebla text-pretty">
            {sinArea
              ? 'Un hábito, o cualquier cosa que no salga de la rueda.'
              : 'Empieza por el área que te importa y termina con lo que va a moverla.'}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="tarjeta border border-iris-borde glass-tinte">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10.5px] font-bold tracking-[0.3px] text-niebla">
          {paso === 1 ? 'Paso 1 · el área' : paso === 2 ? `${sinArea ? 'Paso 1' : 'Paso 2'} · qué querés lograr` : `${sinArea ? 'Paso 2' : 'Paso 3'} · qué lo va a mover`}
        </p>
        <button type="button" onClick={cerrar} className="font-mono text-[11px] font-semibold text-niebla">
          Cancelar
        </button>
      </div>

      {/* ── PASO 1 ─────────────────────────────────────────────────────────────
          El orden lo decide `areasParaElegir`: manda el foco y no el puntaje más
          bajo. Ver la nota larga — son dos preguntas distintas. */}
      {paso === 1 && (
        <div className="flex flex-col gap-1.5">
          {ordenadas.map((a) => {
            const p = propuestaDeRueda(a);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => elegirArea(a.id)}
                className="flex items-center gap-2.5 rounded-[12px] border border-iris-borde bg-white/55 px-3 py-2.5 text-left"
              >
                {/* ⚠️ EL QUESITO CON EL COLOR DEL ÁREA, no un cuadrado vacío: es
                    el mismo color que esa área tiene en la rueda, así que el
                    paso 1 se lee como la rueda y no como ocho palabras sueltas. */}
                <span
                  aria-hidden
                  className="grid size-[30px] flex-none place-items-center rounded-[9px]"
                  style={{ background: `${a.color ?? '#6c78ee'}22`, color: a.color ?? 'var(--color-iris)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
                    {GLIFO_RUEDA}
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-tinta">{a.nombre}</span>
                  <span className="mt-[1px] block font-mono text-[10.5px] text-niebla">
                    {a.scoreActual != null ? `${a.scoreActual} de 5` : 'sin puntaje'}
                    {p ? ` · subir a ${p.hasta}` : ' · ya está arriba'}
                  </span>
                </span>
                {a.foco && (
                  <span className="flex-none rounded-[6px] bg-iris-soft px-[7px] py-0.5 font-mono text-[9.5px] font-bold text-iris-deep">
                    foco
                  </span>
                )}
              </button>
            );
          })}
          {ordenadas.length === 0 && (
            <p className="text-[13px] leading-[1.45] text-niebla text-pretty">
              Todavía no hiciste la rueda, así que no hay áreas de dónde partir. Podés crear el objetivo a mano acá
              abajo.
            </p>
          )}
        </div>
      )}

      {/* ── PASO 2 ───────────────────────────────────────────────────────────── */}
      {paso === 2 && (
        <div>
          <div className="mb-3 flex flex-col gap-1.5">
            {TIPOS_OBJETIVO.map((t) => {
              // Sin propuesta no se ofrece "mover la rueda": el área ya está en 5.
              if (t.tipo === 'rueda' && !propuesta) return null;
              const sel = t.tipo === tipo;
              return (
                <button
                  key={t.tipo}
                  type="button"
                  onClick={() => elegirTipo(t.tipo)}
                  aria-pressed={sel}
                  className={`flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5 text-left ${
                    sel ? 'border-iris bg-iris-soft' : 'border-iris-borde bg-white/55'
                  }`}
                >
                  {/* Cada tipo con su dibujo: la rueda, la bandera de meta y las
                      barritas del seguimiento — los tres ya existen en la app y
                      significan lo mismo acá que allá. */}
                  <span
                    aria-hidden
                    className={`grid size-[30px] flex-none place-items-center rounded-[9px] ${
                      sel ? 'bg-white text-iris-deep' : 'bg-iris-soft text-iris-deep'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
                      {ICO_TIPO[t.tipo]}
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] ${sel ? 'font-semibold text-iris-deep' : 'text-tinta'}`}>
                    {t.nombre}
                  </span>
                  {/* Cada tipo dice CÓMO CIERRA, y eso no es un detalle: un
                      objetivo que no sabe cuándo terminó se queda abierto para
                      siempre, que es la forma silenciosa de hacerte sentir en
                      falta cada vez que abrís la pantalla. */}
                  <span className="mt-[1px] block font-mono text-[10.5px] leading-[1.4] text-niebla">
                    {t.ejemplo} · cierra {t.cierra}
                  </span>
                  </span>
                </button>
              );
            })}
          </div>

          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={tipo === 'habito' ? 'que entrenar deje de costarme' : 'qué querés lograr'}
            aria-label="Qué querés lograr"
            className="w-full rounded-[14px] px-1 py-2.5 text-[16px] text-tinta outline-none placeholder:text-niebla"
          />

          {/* ── LAS VARIABLES DEL TIPO, CON SU ÍCONO Y SIN RÓTULO (06/08) ────
              Matías: *"dependiendo lo que es, no sé si es reducir gastos, si
              tiene una fecha límite, estas variables tienen que estar bien
              comunicadas"*, y aparte *"usemos la iconografía para evitar tanto
              texto"*.
              ⚠️ EL MONTO SOLO EN "LLEGAR A ALGO": es lo que vuelve de plata al
              objetivo y le da la barra que se mueve apartando. En un hábito o
              en uno de rueda no significa nada, así que no se pregunta. */}
          {tipo === 'llegar' && (
            <label className="mt-1.5 flex items-center gap-1.5 rounded-[12px] border border-iris-borde bg-white/55 px-2">
              <span aria-hidden className="flex-none text-niebla">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
                  <path d="M4 5h16v14l-2.5-1.5L15 19l-3-1.5L9 19l-2.5-1.5L4 19z" />
                  <path d="M8 9h8M8 12.5h5" />
                </svg>
              </span>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                inputMode="decimal"
                placeholder="1500 €"
                aria-label="Cuánto hay que juntar"
                className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-tinta outline-none placeholder:text-niebla-2"
              />
            </label>
          )}

          {/* ── LA FECHA LÍMITE, EN LOS TRES TIPOS Y YA PUESTA (06/08) ───────
              Matías: *"la mayoría debería tener una fecha límite… si no tiene
              fecha límite le ponés sesenta; si tiene una, la que él quiera"*, y
              *"el hábito tarda sesenta días en generarse"*.

              ⚠️ ANTES SOLO SE PREGUNTABA EN "LLEGAR A ALGO", y por eso los de
              rueda y los de hábito nacían sin fecha — o sea **sin cuenta
              regresiva, sin proyección y sin barra**: la regla de los dos tipos
              cuelga entera de este campo. Un objetivo sin fecha es uno que la
              app mira sin poder opinar.

              ⚠️ VIENE CON LOS 60 DÍAS PUESTOS, y se corre o se borra. Un default
              es una sugerencia; una fecha que no se puede tocar es una promesa
              que otro hizo por vos. */}
          <label className="mt-1.5 flex items-center gap-1.5 rounded-[12px] border border-iris-borde bg-white/55 px-2">
            <span aria-hidden className="flex-none text-niebla">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[14px]">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4.5l3 2" />
              </svg>
            </span>
            <input
              type="date"
              value={fechaMeta}
              onChange={(e) => setFechaMeta(e.target.value)}
              aria-label="Fecha límite"
              className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-tinta outline-none"
            />
            <span className="flex-none font-mono text-[10px] text-niebla-2">límite</span>
          </label>

          {/* ── LO QUE ANTES VIVÍA EN EL FORMULARIO VIEJO (06/08) ────────────
              Matías, sobre la unificación: *"que agarres toda la información
              que sea necesaria y que esté"*.
              ⚠️ Estos tres se habían quedado sin entrada al borrar el
              formulario en blanco, y dos de ellos **no son un adorno: son el
              denominador de la barra de progreso**. Sin `horasEstimadas`, un
              objetivo con fecha no tiene barra. Van plegados porque no se
              contestan siempre — pero existen. */}
          <details className="mt-1.5">
            <summary className="cursor-pointer list-none font-mono text-[10.5px] font-semibold text-niebla">
              Más detalles ·<span className="ml-1 font-normal">qué cuenta como llegar, y cuántas horas</span>
            </summary>
            <div className="mt-1.5 flex flex-col gap-1.5">
              <input
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="Qué cuenta como llegar (aprobar el B2…)"
                aria-label="Qué cuenta como llegar"
                className="rounded-[12px] border border-iris-borde bg-white/55 px-2.5 py-2 text-[13px] text-tinta outline-none placeholder:text-niebla-2"
              />
              <div className="flex gap-2">
                <input
                  value={horasEstimadas}
                  onChange={(e) => setHorasEstimadas(e.target.value)}
                  inputMode="decimal"
                  placeholder="horas en total"
                  aria-label="Horas estimadas en total"
                  className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white/55 px-2.5 py-2 text-[13px] text-tinta outline-none placeholder:text-niebla-2"
                />
                <input
                  value={horasPorVez}
                  onChange={(e) => setHorasPorVez(e.target.value)}
                  inputMode="decimal"
                  placeholder="h por vez"
                  aria-label="Horas por vez"
                  className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white/55 px-2.5 py-2 text-[13px] text-tinta outline-none placeholder:text-niebla-2"
                />
              </div>
            </div>
          </details>

          {/* Desde cuándo venís con esto. ⚠️ No es un campo de más: sin él, algo
              que arrastrás hace meses nace hoy y la tarjeta pierde justo lo que
              lo vuelve un objetivo y no una tarea. */}
          <label className="mt-1.5 flex items-center gap-1.5 rounded-[12px] border border-iris-borde bg-white/55 px-2">
            <span aria-hidden className="flex-none text-niebla">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
                <path d="M4 12h6l2-5 3 10 2-5h3" />
              </svg>
            </span>
            <input
              type="date"
              value={arranco}
              onChange={(e) => setArranco(e.target.value)}
              aria-label="Desde cuándo venís con esto"
              className="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-tinta outline-none"
            />
            <span className="flex-none font-mono text-[10px] text-niebla-2">desde</span>
          </label>

          <div className="mt-3 flex items-center justify-between">
            {sinArea ? (
              <span />
            ) : (
              <button type="button" onClick={() => setPaso(1)} className="font-mono text-[11px] font-semibold text-niebla">
                ← el área
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaso(3)}
              disabled={!titulo.trim()}
              className="rounded-[14px] px-4 py-2 font-mono text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
            >
              Seguir
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3 ─────────────────────────────────────────────────────────────
          ⚠️ SE PUEDE SALTEAR, y tiene que poder. Un objetivo sin seguimientos es
          un objetivo válido —"1.500 € para octubre" no necesita ninguno— y
          obligar acá convertiría el paso en un peaje. */}
      {paso === 3 && (
        <div>
          <p className="mb-2 text-[13px] leading-[1.45] text-tinta-soft text-pretty">
            Lo que ya venís haciendo y suma a esto. Podés dejarlo vacío y colgarlo después.
          </p>
          <div className="flex flex-col gap-1">
            {actividades.map((a) => {
              const puesta = colgadas.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setColgadas((c) => (puesta ? c.filter((x) => x !== a.id) : [...c, a.id]))}
                  aria-pressed={puesta}
                  className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left ${
                    puesta ? 'border-iris bg-iris-soft' : 'border-iris-borde bg-white/55'
                  }`}
                >
                  {/* Las barritas para lo diario y el cuadrado para la tarea: los
                      mismos dos dibujos que usa "Lo que suma a esto" en la
                      tarjeta, así una actividad se ve igual en los dos lados. */}
                  <span aria-hidden className={`flex-none ${puesta ? 'text-iris-deep' : 'text-niebla'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
                      {a.diaria ? GLIFO_SEGUIMIENTO : <rect x="4" y="4" width="16" height="16" rx="3.5" />}
                    </svg>
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13.5px] ${puesta ? 'text-iris-deep' : 'text-tinta'}`}>
                    {a.titulo}
                  </span>
                  <span className="flex-none font-mono text-[10px] text-niebla">{a.diaria ? 'seguimiento' : 'tarea'}</span>
                </button>
              );
            })}
            {actividades.length === 0 && (
              <p className="font-mono text-[11px] text-niebla">
                Todavía no seguís nada. Se cuelga después, desde la tarjeta.
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => setPaso(2)} className="font-mono text-[11px] font-semibold text-niebla">
              ← el objetivo
            </button>
            <button
              type="button"
              onClick={crear}
              disabled={guardando || !titulo.trim()}
              className="rounded-[14px] px-4 py-2 font-mono text-[12px] font-bold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
            >
              {guardando ? 'Creando…' : 'Crear el objetivo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

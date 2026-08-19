'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MOODS, FACTORES_ANIMO, PALABRAS_ANIMO, type MoodKey } from '@/lib/animo';
import { registrarCheckinHoy } from '@/lib/actions/checkin';
import { registrarSueno, registrarComida, registrarSenalCuerpo, type CalidadSueno } from '@/lib/actions/cuerpo';
import { crearActividad, marcarHecho } from '@/lib/actions/actividades';
import { guardarGastoManual } from '@/lib/actions/gastos';
import { suenaRecurrente } from '@/lib/recurrencia';
import { grabarAudio, reducirImagen, type Grabacion } from '@/lib/media';
import { sonarExito } from '@/lib/sonido';

// 'cuerpo' pide energía Y libido juntas; 'energia' y 'libido' piden una sola.
// Las tres usan el mismo formulario: separarlas fue un pedido de Matías (29/07)
// para que cada una tenga su propio botón y su propio anillo.
export type TipoHoja = 'animo' | 'sueno' | 'comida' | 'hecho' | 'cuerpo' | 'energia' | 'libido' | 'gasto';

// Hoja que sube desde abajo para capturar un dato sin salir del chat.
// Completás, se guarda y se cierra; el resultado vuelve por onGuardado.
export function HojaRegistro({
  tipo,
  onClose,
  onGuardado,
}: {
  tipo: TipoHoja;
  onClose: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  // `montado` habilita el portal: en el server no hay document, así que el
  // primer render tiene que devolver null o la hidratación se rompe.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function cerrar() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  // El tin de recompensa al guardar. Antes solo sonaba en las pantallas
  // dedicadas (Ánimo, Cuerpo); registrar desde la Casa (estas hojas) era mudo,
  // y como es donde más se registra, parecía que los sonidos habían desaparecido.
  function conSonido(mensaje: string) {
    sonarExito();
    onGuardado(mensaje);
  }

  // ⚠️ LA HOJA VA POR PORTAL AL <body>, Y NO ES UN LUJO (27/07).
  // En Cuerpo los anillos no abrían nada: se tocaban, se oscurecían y no pasaba
  // nada. La causa es de manual de CSS — esa página está dentro de `.flotar`,
  // que tiene `animation ... both`, o sea que el `transform` del último keyframe
  // QUEDA APLICADO para siempre. **Un ancestro con transform se convierte en el
  // bloque contenedor de sus hijos `position: fixed`**, así que el `inset-0` de
  // la hoja dejaba de ser la pantalla y pasaba a ser esa columna de contenido:
  // la hoja se dibujaba, pero fuera de la vista.
  // En el Home funcionaba de casualidad, porque ahí no hay ningún ancestro con
  // transform. Con el portal deja de depender de la suerte del contenedor.
  if (!montado) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrar}
        className="absolute inset-0 bg-[rgba(28,28,43,.4)] transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[24px] bg-white p-[18px_18px_max(22px,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(28,28,43,.22)] transition-transform duration-200"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0e0ee]" />
        {tipo === 'sueno' ? (
          <FormSueno onGuardado={conSonido} onCerrar={cerrar} />
        ) : tipo === 'comida' ? (
          <FormComida onGuardado={conSonido} onCerrar={cerrar} />
        ) : tipo === 'hecho' ? (
          <FormHecho onGuardado={conSonido} onCerrar={cerrar} />
        ) : tipo === 'cuerpo' || tipo === 'energia' || tipo === 'libido' ? (
          <FormCuerpo onGuardado={conSonido} onCerrar={cerrar} solo={tipo === 'cuerpo' ? undefined : tipo} />
        ) : (
          <FormAnimo onGuardado={conSonido} onCerrar={cerrar} />
        )}
      </div>
    </div>
    ,
    document.body,
  );
}

function Carita({ k, color, size = 24 }: { k: MoodKey; color: string; size?: number }) {
  const eyes = (
    <>
      <circle cx="9" cy="10.2" r="0.95" fill={color} stroke="none" />
      <circle cx="15" cy="10.2" r="0.95" fill={color} stroke="none" />
    </>
  );
  const boca: Record<MoodKey, React.ReactNode> = {
    genial: (
      <>
        <path d="M7.3 10.8c.5-.9 1.7-.9 2.2 0" />
        <path d="M14.5 10.8c.5-.9 1.7-.9 2.2 0" />
        <path d="M7.6 13.8c1.1 2 7.7 2 8.8 0" />
      </>
    ),
    bien: (
      <>
        {eyes}
        <path d="M8.4 13.8c1 1.3 6.2 1.3 7.2 0" />
      </>
    ),
    neutral: (
      <>
        {eyes}
        <path d="M8.6 14.6h6.8" />
      </>
    ),
    bajon: (
      <>
        {eyes}
        <path d="M8.4 15c1-1.3 6.2-1.3 7.2 0" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.3" />
      {boca[k]}
    </svg>
  );
}

function FormAnimo({ onGuardado, onCerrar }: { onGuardado: (m: string) => void; onCerrar: () => void }) {
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [factores, setFactores] = useState<string[]>([]);
  const [palabras, setPalabras] = useState<string[]>([]);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  function toggleFactor(f: string) {
    setFactores((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function togglePalabra(p: string) {
    setPalabras((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function guardar() {
    if (!mood || guardando) return;
    setGuardando(true);
    try {
      const { reflejo } = await registrarCheckinHoy({ estado: mood, lineaIds: [], nota, factores, palabras });
      onGuardado(reflejo);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="text-[19px] font-semibold text-tinta">¿Cómo venís hoy?</p>
      <div className="mt-3.5 flex gap-2">
        {MOODS.map((m) => {
          const sel = m.key === mood;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMood(m.key)}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl p-[10px_4px] transition-colors"
              style={{ background: sel ? m.color : '#fff', border: `1.5px solid ${sel ? m.color : 'rgba(108,120,238,.14)'}` }}
            >
              <Carita k={m.key} color={sel ? '#fff' : m.color} size={22} />
              <span className="font-mono text-[11px] font-semibold tracking-[0.2px]" style={{ color: sel ? '#fff' : 'var(--color-niebla)' }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Qué influye y cómo te sentís: los mismos chips que la pantalla de Ánimo,
          acá mismo, para completar todo de una sin ir a otra pantalla.
          Se ven SIEMPRE, no recién al elegir la carita: escondidos detrás del
          mood no se descubrían, y Matías registraba desde la Casa sin ellos
          ("se abre la tarjeta pero no te muestra todo"). Las palabras faltaban
          directamente: la Casa guardaba la mitad de lo que la pantalla pregunta. */}
      <div className="mt-3.5">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2px] text-niebla">¿Qué influye más hoy?</p>
        <div className="flex flex-wrap gap-1.5">
          {FACTORES_ANIMO.map((f) => {
            const on = factores.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFactor(f)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: on ? 'var(--color-iris)' : '#fff',
                  color: on ? '#fff' : 'var(--color-tinta-soft)',
                  border: `1.5px solid ${on ? 'var(--color-iris)' : 'rgba(108,120,238,.16)'}`,
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3.5">
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.2px] text-niebla">¿Cómo te sentís?</p>
        <div className="flex flex-wrap gap-1.5">
          {PALABRAS_ANIMO.map((p) => {
            const on = palabras.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePalabra(p)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: on ? 'var(--color-verde)' : '#fff',
                  color: on ? '#fff' : 'var(--color-tinta-soft)',
                  border: `1.5px solid ${on ? 'var(--color-verde)' : 'rgba(61,155,128,.18)'}`,
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="¿Algo que quieras sumar? (opcional)"
        className="mt-3 w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-niebla"
      />
      <button
        type="button"
        onClick={guardar}
        disabled={!mood || guardando}
        className="mt-3.5 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}

const CALIDADES: { key: CalidadSueno; label: string; color: string; tint: string }[] = [
  { key: 'bien', label: 'Descansé', color: 'var(--color-verde)', tint: 'var(--color-verde-tint)' },
  { key: 'regular', label: 'Regular', color: 'var(--color-oro-2)', tint: 'var(--color-ambar-tint)' },
  { key: 'mal', label: 'Dormí mal', color: 'var(--color-rosa)', tint: 'var(--color-rosa-tint)' },
];

// Energía y libido de hoy, en un toque. Antes vivían al fondo de Cuerpo como un
// formulario que había que ir a buscar; ahora se cargan desde la Casa, como una
// más de las cosas del día, y en Cuerpo quedan como gráfico.
function FormCuerpo({
  onGuardado,
  onCerrar,
  solo,
}: {
  onGuardado: (m: string) => void;
  onCerrar: () => void;
  /** Con esto la hoja pide UNA sola señal, y el título cambia. Sin esto, las dos. */
  solo?: 'energia' | 'libido';
}) {
  const [energia, setEnergia] = useState<number | null>(null);
  const [libido, setLibido] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const TODAS = [
    { tipo: 'energia' as const, label: 'Energía', ayuda: '¿Con cuánta pila andás?', color: 'var(--color-oro-2)', valor: energia, set: setEnergia },
    { tipo: 'libido' as const, label: 'Libido', ayuda: '¿Cómo viene el deseo?', color: 'var(--color-rosa)', valor: libido, set: setLibido },
  ];
  const SENALES = solo ? TODAS.filter((s) => s.tipo === solo) : TODAS;

  async function guardar() {
    if ((energia == null && libido == null) || guardando) return;
    setGuardando(true);
    try {
      if (energia != null) await registrarSenalCuerpo('energia', energia);
      if (libido != null) await registrarSenalCuerpo('libido', libido);
      onGuardado('Anotado cómo venís hoy. Lo cruzo con tu sueño y tu ánimo; lo ves en Cuerpo.');
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="text-[19px] font-semibold text-tinta">
        {solo === 'energia' ? '¿Con cuánta pila andás?' : solo === 'libido' ? '¿Cómo viene el deseo?' : '¿Cómo venís hoy?'}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-niebla text-pretty">
        Autoobservación, del 1 al 5.{solo ? '' : ' Con una alcanza.'}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {SENALES.map((s) => (
          <div key={s.tipo}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[15px] font-semibold text-tinta">{s.label}</span>
              <span className="font-mono text-[11px] text-niebla">{s.ayuda}</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = s.valor != null && n <= s.valor;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => s.set(n)}
                    aria-label={`${s.label} ${n} de 5`}
                    className="h-9 flex-1 rounded-[8px] border transition-colors"
                    style={{ background: on ? s.color : 'var(--color-papel-2)', borderColor: on ? s.color : 'rgba(108,120,238,.14)' }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={(energia == null && libido == null) || guardando}
        className="mt-5 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
      >
        {guardando ? 'Guardando…' : 'Anotar'}
      </button>
    </div>
  );
}

function FormSueno({ onGuardado, onCerrar }: { onGuardado: (m: string) => void; onCerrar: () => void }) {
  const [horas, setHoras] = useState(7.5);
  const [calidad, setCalidad] = useState<CalidadSueno | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!calidad || guardando) return;
    setGuardando(true);
    try {
      await registrarSueno(horas, calidad);
      const hs = horas.toLocaleString('es-AR');
      onGuardado(`Anotado: dormiste ${hs}h. El sueño es de lo que más explica tu ánimo, buen dato.`);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="text-[19px] font-semibold text-tinta">¿Cómo dormiste anoche?</p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Menos"
          onClick={() => setHoras((h) => Math.max(0, Math.round((h - 0.5) * 10) / 10))}
          className="flex size-10 flex-none items-center justify-center rounded-full border border-iris-borde bg-white text-[19px] font-bold text-iris"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="font-serif text-[32px] font-semibold tracking-[-0.5px] text-tinta">{horas.toLocaleString('es-AR')}</span>
          <span className="ml-1 text-[15px] font-semibold text-niebla">horas</span>
        </div>
        <button
          type="button"
          aria-label="Más"
          onClick={() => setHoras((h) => Math.min(16, Math.round((h + 0.5) * 10) / 10))}
          className="flex size-10 flex-none items-center justify-center rounded-full border border-iris-borde bg-white text-[19px] font-bold text-iris"
        >
          +
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        {CALIDADES.map((c) => {
          const sel = c.key === calidad;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCalidad(c.key)}
              className="flex-1 rounded-2xl py-2.5 text-[13px] font-semibold transition-colors"
              style={{ background: sel ? c.color : c.tint, color: sel ? '#fff' : c.color, border: `1.5px solid ${sel ? c.color : 'transparent'}` }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={!calidad || guardando}
        className="mt-4 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
      >
        {guardando ? 'Guardando…' : 'Anotar mi sueño'}
      </button>
    </div>
  );
}

function FormHecho({ onGuardado, onCerrar }: { onGuardado: (m: string) => void; onCerrar: () => void }) {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Cuando lo escrito suena a algo que hace seguido, en vez de guardarlo como
  // puntual se repregunta. Pasó de verdad: "Hago bouldern los martes" quedó como
  // si hubiera ido una sola vez, y no había forma de arreglarlo desde la app.
  const [repreguntar, setRepreguntar] = useState(false);

  function intentarGuardar() {
    if (!texto.trim() || guardando) return;
    if (suenaRecurrente(texto)) setRepreguntar(true);
    else guardarHecho();
  }

  async function guardarHecho() {
    setGuardando(true);
    try {
      const t = await marcarHecho(texto, 'manual');
      onGuardado(t ? `Anotado: ${t}. Lo sumé a tus actividades como hecho, para cruzarlo con cómo venís.` : 'Anotado.');
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  // Queda en curso y ya lista para pintar día a día.
  async function guardarEnCurso() {
    setGuardando(true);
    try {
      await crearActividad(texto, undefined, true);
      onGuardado(`Listo: "${texto.trim()}" quedó en tus actividades para seguirla. Marcá los días que la hagas.`);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  if (repreguntar) {
    return (
      <div>
        <p className="text-[19px] font-semibold text-tinta">¿Esto lo hacés seguido?</p>
        <p className="mt-1 text-[13px] leading-snug text-niebla text-pretty">
          Por cómo lo escribiste, suena a algo que se repite. Si es así conviene seguirlo, así podés ir marcando los
          días y ver cómo venís. Si fue una sola vez, lo dejo como hecho.
        </p>
        <p className="mt-2.5 rounded-[12px] bg-papel-2 px-3 py-2 text-[15px] text-tinta-soft text-pretty">{texto}</p>
        <button
          type="button"
          onClick={guardarEnCurso}
          disabled={guardando}
          className="mt-3.5 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
        >
          {guardando ? 'Guardando…' : 'Lo hago seguido, seguilo'}
        </button>
        <button
          type="button"
          onClick={guardarHecho}
          disabled={guardando}
          className="mt-2 w-full rounded-[18px] border border-iris-borde py-2.5 font-mono text-[13px] font-semibold text-niebla disabled:opacity-50"
        >
          Fue una sola vez
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[19px] font-semibold text-tinta">¿Qué hiciste?</p>
      <p className="mt-1 text-[13px] leading-snug text-niebla text-pretty">
        Algo puntual que pasó hoy: mandaste un mail, arrancaste un trámite, tuviste una charla. Queda en tus
        actividades como hecho.
      </p>
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && intentarGuardar()}
        placeholder="Mandé el mail a la médica…"
        className="mt-3.5 w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[16px] text-tinta outline-none placeholder:text-niebla"
      />
      <button
        type="button"
        onClick={intentarGuardar}
        disabled={!texto.trim() || guardando}
        className="mt-3.5 w-full rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
      >
        {guardando ? 'Guardando…' : 'Marcar como hecho'}
      </button>
    </div>
  );
}


/**
 * UN GASTO, DE UN TOQUE (pedido 1.6, del 31/07 · construido el 04/08).
 *
 * *"Más chips en Anotar rápido, que estén todas las importantes."* Y la
 * aclaración que lo destrabó, suya (03/08): *"solo aparece cuando pagás, así que
 * por eso cambia la cosa"* — los chips de más son de los apartados PAGOS.
 *
 * ⚠️ NO CONTRADICE EL PEDIDO DEL 27/07 de sacar cosas de Anotar rápido. Aquello
 * sobraba porque duplicaba lo que ya estaba en el anillo del día. Un gasto no
 * tiene anillo y se carga varias veces por día, que es exactamente la regla que
 * quedó: *lo que se cierra una vez por día vive en el anillo; lo que se carga
 * varias veces vive en los chips*.
 *
 * ⚠️ SIN CATEGORÍA ACÁ, A PROPÓSITO. Un selector de ocho categorías convierte
 * "de un toque" en un formulario, y la categoría ya la pone el modelo cuando el
 * gasto entra hablando (`gastos-marca.ts`). Acá se guarda sin clasificar, que es
 * la verdad, y se corrige en Finanzas donde el chip ya es editable.
 */
function FormGasto({ onGuardado, onCerrar }: { onGuardado: (m: string) => void; onCerrar: () => void }) {
  const [monto, setMonto] = useState('');
  const [enQue, setEnQue] = useState('');
  const [guardando, setGuardando] = useState(false);

  const valor = Number(monto.replace(',', '.'));
  const puede = Number.isFinite(valor) && valor > 0;

  async function guardar() {
    if (!puede || guardando) return;
    setGuardando(true);
    try {
      const r = await guardarGastoManual({ total: valor, comercio: enQue.trim() || null, moneda: '€' });
      if (!r.ok) {
        setGuardando(false);
        return;
      }
      onGuardado(`Anotado en Finanzas: €${valor.toLocaleString('es-AR')}${enQue.trim() ? ` en ${enQue.trim()}` : ''}.`);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <>
      <p className="mb-3 text-center font-serif text-[19px] font-semibold tracking-[-0.3px] text-tinta">
        ¿Cuánto gastaste?
      </p>
      <div className="flex gap-2">
        <div className="flex flex-none items-center gap-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3">
          <span className="text-[17px] font-semibold text-niebla">€</span>
          <input
            autoFocus
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label="Monto"
            className="w-[74px] bg-transparent py-3 text-[17px] font-semibold text-tinta outline-none placeholder:text-niebla-2"
          />
        </div>
        <input
          value={enQue}
          onChange={(e) => setEnQue(e.target.value)}
          placeholder="En qué (súper, café…)"
          aria-label="En qué"
          className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-3 text-[14px] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
        />
      </div>
      <button
        type="button"
        disabled={!puede || guardando}
        onClick={guardar}
        className="grad-iris mt-3 w-full rounded-[14px] py-3 font-mono text-[14px] font-bold text-white disabled:opacity-50"
      >
        {guardando ? 'Anotando…' : 'Anotar'}
      </button>
    </>
  );
}

function FormComida({ onGuardado, onCerrar }: { onGuardado: (m: string) => void; onCerrar: () => void }) {
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [grabando, setGrabando] = useState<Grabacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);

  async function guardar() {
    if (!nota.trim() || guardando) return;
    setGuardando(true);
    try {
      await registrarComida(nota);
      onGuardado(`Anotado: ${nota.trim()}. Buen dato para cruzar con tu energía y tu ánimo.`);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  async function toggleMic() {
    setAviso(null);
    if (!grabando) {
      try {
        setGrabando(await grabarAudio());
      } catch {
        setAviso('No pude usar el micrófono. Revisá el permiso.');
      }
      return;
    }
    const grabacion = grabando;
    setGrabando(null);
    setProcesando(true);
    try {
      const audio = await grabacion.detener();
      const form = new FormData();
      form.append('audio', audio, 'comida.m4a');
      const res = await fetch('/api/transcribir', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.texto?.trim()) {
        await registrarComida(data.texto);
        onGuardado(`Anotado: ${data.texto.trim()}.`);
        onCerrar();
      } else {
        setAviso(data?.error ?? 'No se pudo transcribir. Probá de nuevo.');
        setProcesando(false);
      }
    } catch {
      setAviso('No se pudo procesar el audio.');
      setProcesando(false);
    }
  }

  async function foto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || procesando) return;
    setAviso(null);
    setProcesando(true);
    try {
      const img = await reducirImagen(file);
      const form = new FormData();
      form.append('foto', img, 'comida.jpg');
      const res = await fetch('/api/comida-foto', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.descripcion) {
        onGuardado(`Anotado: ${data.descripcion}.`);
        onCerrar();
      } else {
        setAviso(data?.error ?? 'No se pudo analizar la foto.');
        setProcesando(false);
      }
    } catch {
      setAviso('No se pudo enviar la foto.');
      setProcesando(false);
    }
  }

  const ocupado = guardando || procesando || grabando != null;

  return (
    <div>
      <p className="text-[19px] font-semibold text-tinta">¿Qué comiste?</p>
      <div className="mt-3.5 flex gap-2">
        <input
          autoFocus
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          placeholder="Milanesas con puré, un café…"
          className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[16px] text-tinta outline-none placeholder:text-niebla"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={!nota.trim() || guardando}
          className="flex-none rounded-[12px] px-4 font-mono text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
        >
          {guardando ? '…' : 'Anotar'}
        </button>
      </div>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={toggleMic}
          disabled={procesando || guardando}
          className={`flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] border font-mono text-[13px] font-semibold ${
            grabando ? 'animate-pulse border-transparent bg-brick text-white' : 'border-iris-borde bg-white text-iris-deep'
          } disabled:opacity-50`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          {grabando ? 'Enviar' : 'Dictar'}
        </button>
        <button
          type="button"
          onClick={() => !ocupado && camara.current?.click()}
          disabled={ocupado}
          className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-iris-borde bg-white font-mono text-[13px] font-semibold text-iris-deep disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
          Foto
        </button>
      </div>
      <input ref={camara} type="file" accept="image/*" hidden onChange={foto} />

      {(grabando || procesando || aviso) && (
        <p className="mt-2.5 text-[13px] leading-snug text-iris-deep text-pretty">
          {grabando ? '● Grabando… tocá "Enviar".' : procesando ? 'Un segundo, lo estoy leyendo…' : aviso}
        </p>
      )}
    </div>
  );
}

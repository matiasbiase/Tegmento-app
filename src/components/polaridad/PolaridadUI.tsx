'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reducirImagen } from '@/lib/media';
import { TarjetaContraste, type ResultadoContraste } from '@/components/contraste/TarjetaContraste';
import { TarjetaAccion } from '@/components/ui/TarjetaAccion';
import { BotonCerrar } from '@/components/ui/BotonCerrar';
import { nivelCuidado } from '@/lib/cuidado';
import { borrarAnalisisPolaridad } from '@/lib/actions/polaridad';

export type PolaridadGuardada = {
  id: number;
  entrada: string | null;
  cuidado: number;
  fecha: string;
  resultado: ResultadoContraste;
};

/** Los dos caminos: mirar algo que leíste, o mirar algo entre vos y otra persona. */
type Camino = 'otracara' | 'mapa';

const IconoPersonas = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[27px]">
    <circle cx="9" cy="8" r="3.2" />
    <circle cx="17.5" cy="9.2" r="2.6" />
    <path d="M3 19.5a6 6 0 0 1 12 0M15.8 19.5a4.2 4.2 0 0 1 5.2-3.9" />
  </svg>
);

const IconoTexto = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[27px]">
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M7 9h10M7 12.5h10M7 16h6" />
  </svg>
);

export function PolaridadUI({ guardadas = [], textoInicial }: { guardadas?: PolaridadGuardada[]; textoInicial?: string }) {
  const router = useRouter();
  // Sin camino elegido se ven las dos tarjetas. Si viene un texto de Descubrir,
  // ya sabemos que es contenido externo y se salta la elección.
  const [camino, setCamino] = useState<Camino | null>(textoInicial?.trim() ? 'mapa' : null);
  const [texto, setTexto] = useState(textoInicial ?? '');
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'error'>('idle');
  const [res, setRes] = useState<ResultadoContraste | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [verId, setVerId] = useState<number | null>(null);
  const camara = useRef<HTMLInputElement>(null);

  // Si viene un texto por la URL (?texto=…, desde una noticia de Descubrir), se
  // analiza solo al abrir.
  //
  // El ref no es adorno: en desarrollo React monta dos veces, el efecto corría
  // dos veces y cada análisis quedaba GUARDADO DOS VECES en el historial. Las
  // ocho entradas que había eran cuatro análisis duplicados.
  const yaAnalizo = useRef(false);
  useEffect(() => {
    if (yaAnalizo.current) return;
    if (textoInicial?.trim()) {
      yaAnalizo.current = true;
      analizarTexto('mapa');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analizarTexto(modo: Camino) {
    if (!texto.trim() || estado === 'cargando') return;
    setEstado('cargando');
    setErr(null);
    try {
      const r = await fetch('/api/contraste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El modo personal usa 'interpretacion': no mide cuidado ni arma un lado
        // contrario, muestra cómo puede haberle llegado al otro.
        body: JSON.stringify({ modo: modo === 'otracara' ? 'interpretacion' : 'mapa', texto, tema: texto }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data) {
        setRes(data as ResultadoContraste);
        setEstado('listo');
      } else {
        setErr(data?.error ?? 'No se pudo analizar, probá de nuevo.');
        setEstado('error');
      }
    } catch {
      setErr('No se pudo, revisá la conexión.');
      setEstado('error');
    }
  }

  async function analizarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || estado === 'cargando') return;
    setEstado('cargando');
    setErr(null);
    try {
      const img = await reducirImagen(file);
      const form = new FormData();
      form.append('foto', img, 'contenido.jpg');
      const r = await fetch('/api/contraste', { method: 'POST', body: form });
      const data = await r.json().catch(() => null);
      if (r.ok && data) {
        setRes(data as ResultadoContraste);
        setEstado('listo');
      } else {
        setErr(data?.error ?? 'No se pudo analizar la imagen.');
        setEstado('error');
      }
    } catch {
      setErr('No se pudo procesar la imagen.');
      setEstado('error');
    }
  }

  function volver() {
    setRes(null);
    setEstado('idle');
    setErr(null);
    setTexto('');
    setCamino(null);
    router.refresh(); // trae al historial lo que se acaba de analizar
  }

  if (estado === 'listo' && res) {
    return (
      <div>
        <TarjetaContraste r={res} />
        <button
          type="button"
          onClick={volver}
          className="mt-4 w-full rounded-[18px] border border-iris-borde bg-white py-3 font-mono text-[13px] font-semibold text-iris-deep"
        >
          Mirar otra cosa
        </button>
      </div>
    );
  }

  return (
    <div>
      {camino === null ? (
        // Las dos puertas. Son dos cosas muy distintas y hasta ahora había una
        // sola: pegar contenido externo. Lo personal vivía escondido en el chat.
        <div className="flex flex-col gap-2.5">
          <TarjetaAccion
            icono={IconoPersonas}
            titulo="Ver la otra cara"
            bajada="Algo que te dijo alguien, o un mensaje que vas a mandar."
            color="#3b46b8"
            tint="#e4e6fb"
            destacada
            onClick={() => setCamino('otracara')}
          />
          <TarjetaAccion
            icono={IconoTexto}
            titulo="Analizar un contenido"
            bajada="Una noticia, un tweet, un posteo."
            color="#9a5a12"
            tint="#f8ead0"
            onClick={() => setCamino('mapa')}
          />
        </div>
      ) : (
        <div className="relative">
          {/* Volver sube un paso; la cruz cierra lo que estás haciendo. Las dos,
              porque son dos intenciones distintas. */}
          <BotonCerrar onClick={() => setCamino(null)} etiqueta="Cerrar" />
          <button
            type="button"
            onClick={() => setCamino(null)}
            className="mb-2.5 inline-flex items-center gap-1 font-mono text-[12px] font-semibold text-niebla"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            volver
          </button>

          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              camino === 'otracara'
                ? 'Pegá el mensaje que vas a mandar, o contame qué pasó y con quién…'
                : 'Pegá un titular, un tweet, un párrafo… o sacale una foto.'
            }
            rows={5}
            className="w-full resize-none tarjeta border border-iris-borde bg-white text-[16px] leading-snug text-tinta outline-none placeholder:text-niebla focus:border-iris"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => analizarTexto(camino)}
              disabled={!texto.trim() || estado === 'cargando'}
              className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.3)' }}
            >
              {estado === 'cargando'
                ? camino === 'otracara'
                  ? 'Poniéndome en su lugar…'
                  : 'Analizando…'
                : camino === 'otracara'
                  ? 'Ver cómo se lee del otro lado'
                  : 'Ver con qué cuidado leerlo'}
            </button>
            {/* la foto solo tiene sentido para contenido externo */}
            {camino === 'mapa' && (
              <button
                type="button"
                onClick={() => estado !== 'cargando' && camara.current?.click()}
                disabled={estado === 'cargando'}
                aria-label="Analizar una foto"
                className="flex size-[46px] flex-none items-center justify-center rounded-[18px] border border-iris-borde bg-white text-iris disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
                  <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                  <circle cx="12" cy="12.5" r="3.2" />
                </svg>
              </button>
            )}
          </div>
          <input ref={camara} type="file" accept="image/*" hidden onChange={analizarFoto} />
          {estado === 'error' && err && <p className="mt-2.5 text-[13px] text-brick">{err}</p>}
          {estado === 'cargando' && (
            <p className="mt-2.5 text-[13px] text-iris-deep">Un segundo, le estoy dando una vuelta…</p>
          )}
        </div>
      )}

      {/* historial: lo que ya miraste, de los dos tipos, para volver a verlo */}
      {guardadas.length > 0 && (
        <div className="mt-7">
          <p className="mb-2.5 font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Lo que ya miraste</p>
          <div className="flex flex-col gap-2">
            {guardadas.map((g) => {
              const personal = g.resultado?.modo === 'interpretacion';
              const n = nivelCuidado(g.cuidado);
              return (
                <div key={g.id} className="overflow-hidden rounded-[18px] bg-white sombra-card">
                  <button
                    type="button"
                    onClick={() => setVerId(verId === g.id ? null : g.id)}
                    className="flex w-full items-center gap-3 p-[12px_14px] text-left"
                  >
                    {/* lo personal no tiene nivel de cuidado: se marca por lo que es */}
                    {personal ? (
                      <span className="flex-none rounded-md bg-iris-soft px-2 py-1 font-mono text-[11px] font-bold tracking-[0.3px] text-iris-deep">
                        otra cara
                      </span>
                    ) : (
                      <span
                        className="flex-none rounded-md px-2 py-1 font-mono text-[11px] font-bold tracking-[0.3px] text-white"
                        style={{ background: n.color }}
                      >
                        {n.nivel}
                      </span>
                    )}
                    <p className="min-w-0 flex-1 truncate text-[13px] text-tinta">{g.entrada ?? 'Análisis'}</p>
                    <span className="flex-none font-mono text-[11px] text-niebla-2">{g.fecha}</span>
                  </button>
                  {/* Borrar va FUERA del botón que despliega: adentro, tocarlo
                      abriría la tarjeta además de borrar. */}
                  <BotonBorrar id={g.id} />
                  {verId === g.id && (
                    <div className="p-[0_10px_12px]">
                      <TarjetaContraste r={g.resultado} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Borrar un análisis guardado. Pide confirmación EN EL LUGAR (el botón se
// convierte en "¿Seguro?") y no con un `confirm()` del navegador: dentro de la
// app nativa esos diálogos se ven como una alerta de web, no de la app.
function BotonBorrar({ id }: { id: number }) {
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, empezar] = useTransition();

  if (!confirmando) {
    return (
      <div className="flex justify-end px-[10px] pb-2">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="rounded-lg px-2 py-1 font-mono text-[11px] font-semibold text-niebla-2"
        >
          Borrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5 px-[10px] pb-2">
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-lg px-2 py-1 font-mono text-[11px] font-semibold text-niebla"
      >
        No
      </button>
      <button
        type="button"
        disabled={borrando}
        onClick={() => empezar(async () => { await borrarAnalisisPolaridad(id); })}
        className="rounded-lg bg-alerta px-2.5 py-1 font-mono text-[11px] font-bold text-white disabled:opacity-60"
      >
        {borrando ? 'Borrando…' : 'Sí, borrar'}
      </button>
    </div>
  );
}

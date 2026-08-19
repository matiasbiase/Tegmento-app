'use client';

import { useRef, useState } from 'react';
import { reducirImagen } from '@/lib/media';
import { tinte, trozos, type Marca } from '@/lib/como-se-lee';
import { IconLapiz } from '@/components/ui/iconos';

/**
 * "Cómo se lee": traer un mensaje y ver qué partes podrían leerse distinto.
 *
 * El caso de uso, en palabras de Matías (30/07): *"alguien dice: quiero mandar
 * este mensaje, estoy un poco ansioso, pero entiendo que la otra persona lo
 * puede leer bien"*. Es una GUÍA SECUNDARIA, un botón chico y puntual, no "la
 * app es de IA".
 *
 * Las reglas de la pantalla están en `lib/como-se-lee.ts`; acá están las de la
 * zona de entrada, que salieron todas de correcciones suyas sobre la maqueta.
 */

const Ico = {
  captura: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className="size-[20px]">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3 16l5-4 4 3 3-2 6 5" />
    </svg>
  ),
  pegar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" className="size-[20px]">
      <rect x="8" y="3" width="12" height="15" rx="2" />
      <path d="M16 18v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1.5" />
    </svg>
  ),
  escribir: (
    <IconLapiz className="size-[20px]" />
  ),
};

type Estado = 'idle' | 'cargando' | 'listo' | 'error';

export function ComoSeLeeUI() {
  const [abierto, setAbierto] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<Estado>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ mensaje: string; marcas: Marca[] } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  async function analizarTexto(t: string) {
    if (!t.trim() || estado === 'cargando') return;
    setEstado('cargando');
    setErr(null);
    try {
      const r = await fetch('/api/como-se-lee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data) {
        setRes(data);
        setEstado('listo');
      } else {
        setErr(data?.error ?? 'No se pudo mirar el mensaje, probá de nuevo.');
        setEstado('error');
      }
    } catch {
      setErr('No se pudo, revisá la conexión.');
      setEstado('error');
    }
  }

  async function analizarFoto(file: File) {
    if (estado === 'cargando') return;
    setEstado('cargando');
    setErr(null);
    try {
      const img = await reducirImagen(file);
      const form = new FormData();
      form.append('foto', img, 'captura.jpg');
      const r = await fetch('/api/como-se-lee', { method: 'POST', body: form });
      const data = await r.json().catch(() => null);
      if (r.ok && data) {
        setRes(data);
        setEstado('listo');
      } else {
        setErr(data?.error ?? 'No se pudo leer la captura.');
        setEstado('error');
      }
    } catch {
      setErr('No se pudo procesar la captura.');
      setEstado('error');
    }
  }

  /** Pegar del portapapeles. Si el navegador no lo permite, abre el campo. */
  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) {
        setTexto(t);
        setEscribiendo(true);
        setAbierto(false);
        return;
      }
    } catch {
      // Sin permiso de portapapeles (pasa en la PWA del iPhone): que al menos
      // se abra el campo para pegar a mano. Un botón que no hace nada es peor
      // que uno que hace la mitad.
    }
    setEscribiendo(true);
    setAbierto(false);
  }

  function volver() {
    setRes(null);
    setEstado('idle');
    setErr(null);
    setTexto('');
    setEscribiendo(false);
    setAbierto(false);
  }

  // ── EL RESULTADO ───────────────────────────────────────────────────────────
  if (estado === 'listo' && res) {
    return (
      <div>
        <p className="mb-2 font-mono text-[10.5px] font-bold tracking-[0.3px] text-niebla">
          {res.marcas.length > 0 ? 'Lo que puede leerse distinto' : 'El mensaje'}
        </p>

        <div className="mb-2.5 tarjeta border border-iris-borde bg-white">
          {/* Las frases subrayadas EN EL MENSAJE MISMO, numeradas. Lo que evita
              que venga "masticado": se ve dónde mirar, no un dictamen. */}
          <p className="text-[14.5px] leading-[1.6] text-tinta">
            {trozos(res.mensaje, res.marcas).map((t, i) =>
              t.marca === null ? (
                <span key={i}>{t.texto}</span>
              ) : (
                <mark
                  key={i}
                  className="rounded-[2px] px-0 py-px text-inherit"
                  style={{ background: tinte(t.marca).fondo, borderBottom: `2px solid ${tinte(t.marca).borde}` }}
                >
                  {t.texto}
                </mark>
              ),
            )}
          </p>

          {res.marcas.map((m) => (
            <div key={m.numero} className="mt-0 flex gap-[9px] border-t border-iris-borde py-[11px] first-of-type:mt-[11px]">
              <span
                className="h-fit flex-none rounded-[6px] px-[7px] py-0.5 font-mono text-[11px] font-bold text-tinta"
                style={{ background: tinte(m.numero).fondo }}
              >
                {m.numero}
              </span>
              <span className="text-[13px] leading-[1.45] text-tinta-soft text-pretty">{m.lectura}</span>
            </div>
          ))}

          {/* SIN MARCAS NO ES UNA APROBACIÓN. El primer mockup tenía acá un
              bloque VERDE que decía "se entiende igual" y Matías lo cortó: *"como
              que está diciendo algo que está bien o mal"*. Así que se dice lo
              único que se sabe de verdad: que no se encontró nada, no que el
              mensaje esté bien. */}
          {res.marcas.length === 0 && (
            <p className="mt-3 border-t border-iris-borde pt-3 text-[13px] leading-[1.5] text-niebla text-pretty">
              No encontré ninguna frase que se pueda torcer. Eso no quiere decir que esté bien ni mal: quiere decir que
              no vi nada.
            </p>
          )}
        </div>

        {/* El descargo, siempre, con marcas o sin ellas. */}
        <p className="border-t border-iris-borde px-0.5 pt-2.5 text-[12.5px] leading-[1.5] text-niebla text-pretty">
          Son lecturas posibles, no lo que la otra persona va a sentir. Vos conocés el vínculo; esto solo marca dónde se
          puede torcer.
        </p>

        <button
          type="button"
          onClick={volver}
          className="mt-4 w-full rounded-[18px] border border-iris-borde bg-white py-3 font-mono text-[13px] font-semibold text-iris-deep"
        >
          Mirar otro mensaje
        </button>
      </div>
    );
  }

  // ── EL CAMPO DE ESCRIBIR ───────────────────────────────────────────────────
  if (escribiendo) {
    return (
      <div>
        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí o pegá lo que ibas a mandar…"
          rows={6}
          className="w-full resize-none tarjeta border border-iris-borde bg-white text-[16px] leading-snug text-tinta outline-none placeholder:text-niebla focus:border-iris"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEscribiendo(false)}
            className="h-[46px] flex-none rounded-[14px] border border-iris-borde bg-white px-4 font-mono text-[13px] font-semibold text-niebla"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => analizarTexto(texto)}
            disabled={!texto.trim() || estado === 'cargando'}
            className="grad-iris flex h-[46px] flex-1 items-center justify-center rounded-[14px] font-mono text-[13px] font-bold tracking-[0.3px] text-white shadow-[0_8px_20px_rgba(108,120,238,.3)] disabled:opacity-50"
          >
            {estado === 'cargando' ? 'Leyéndolo…' : 'Ver cómo se lee'}
          </button>
        </div>
        {estado === 'error' && err && <p className="mt-2.5 text-[13px] text-brick">{err}</p>}
      </div>
    );
  }

  // ── LA ZONA DE ENTRADA ─────────────────────────────────────────────────────
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith('image/')) void analizarFoto(f);
        }}
        // Recuadro PUNTEADO y el título a 19px: pedido de Matías, que dé
        // "estabilidad y orden".
        className={`rounded-[18px] border-[1.5px] border-dashed p-[26px_16px_20px] text-center transition-colors ${
          arrastrando ? 'border-iris bg-iris-soft' : 'border-niebla-2 bg-white/55'
        }`}
      >
        <p className="mb-[5px] text-[19px] font-semibold tracking-[-0.2px] text-tinta">Traé el mensaje</p>
        <p className="text-[13px] leading-[1.5] text-niebla">
          Soltalo acá, pegalo,
          <br />
          o escribí lo que ibas a mandar.
        </p>

        {/* AL TOCAR EL "+" SE DESPLIEGAN SOLO ÍCONOS, SIN TEXTO (pedido textual:
            *"no hace falta que esté escrito cada cosa"*). El aria-label sí está,
            para que se puedan usar sin ver. */}
        {abierto && (
          <div className="mt-3.5 flex justify-center gap-2.5">
            <Op etiqueta="Subir una captura" onClick={() => archivo.current?.click()}>
              {Ico.captura}
            </Op>
            <Op etiqueta="Pegar del portapapeles" onClick={pegar}>
              {Ico.pegar}
            </Op>
            <Op
              etiqueta="Escribirlo"
              onClick={() => {
                setEscribiendo(true);
                setAbierto(false);
              }}
            >
              {Ico.escribir}
            </Op>
          </div>
        )}

        {/* EL "+" VA ABAJO Y GRANDE. La primera versión lo tenía arriba con las
            opciones listadas debajo; Matías: el "+" va último. */}
        <button
          type="button"
          aria-label={abierto ? 'Cerrar las opciones' : 'Traer un mensaje'}
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
          className="grad-iris mx-auto mt-4 grid size-[48px] place-items-center rounded-full shadow-[0_6px_18px_rgba(108,120,238,.34)] transition-transform duration-200"
          style={{ transform: abierto ? 'rotate(45deg)' : 'none' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" className="size-[21px]">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <input
        ref={archivo}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void analizarFoto(f);
        }}
      />

      {estado === 'cargando' && <p className="mt-3 text-[13px] text-iris-deep">Leyéndolo del otro lado…</p>}
      {estado === 'error' && err && <p className="mt-3 text-[13px] text-brick">{err}</p>}

      {/* Qué es esto, en dos líneas y abajo: no arriba, donde competiría con la
          zona de entrada. Dice lo que NO hace, que es lo que lo distingue. */}
      <p className="mt-5 px-0.5 text-[12.5px] leading-[1.55] text-niebla text-pretty">
        Marca frases que podrían leerse distinto de lo que quisiste decir. No corrige, no reescribe y no te dice si
        mandarlo: eso lo decidís vos.
      </p>
    </div>
  );
}

function Op({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="grid size-[46px] place-items-center rounded-[18px] border border-iris-borde bg-white text-iris/85 shadow-[0_3px_12px_rgba(50,50,90,.07)]"
    >
      {children}
    </button>
  );
}

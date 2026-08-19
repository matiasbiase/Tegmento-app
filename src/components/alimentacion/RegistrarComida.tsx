'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { registrarComida, editarComida, borrarComida } from '@/lib/actions/cuerpo';
import { reducirImagen, grabarAudio, type Grabacion } from '@/lib/media';
import { IconLapiz } from '@/components/ui/iconos';

type Comida = { id: number; nota: string; hora: string };

export function RegistrarComida({ recientes }: { recientes: Comida[] }) {
  const router = useRouter();
  const [modo, setModo] = useState<'idle' | 'escribir'>('idle');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [grabando, setGrabando] = useState<Grabacion | null>(null);
  const [procesando, setProcesando] = useState(false); // audio o foto en curso
  const [aviso, setAviso] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null); // comida en edición
  const [editTexto, setEditTexto] = useState('');
  const camara = useRef<HTMLInputElement>(null);

  async function guardarEdicion(id: number) {
    if (!editTexto.trim()) return;
    await editarComida(id, editTexto);
    setEditId(null);
    router.refresh();
  }

  async function borrar(id: number) {
    setEditId(null);
    await borrarComida(id);
    router.refresh();
  }

  async function guardar() {
    if (!nota.trim() || guardando) return;
    setGuardando(true);
    try {
      await registrarComida(nota);
      setNota('');
      setModo('idle');
      setAviso(null);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  // Audio: se graba, el server lo transcribe (Whisper) y se registra el texto.
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
        router.refresh();
      } else {
        setAviso(data?.error ?? 'No se pudo transcribir. Probá de nuevo.');
      }
    } catch {
      setAviso('No se pudo procesar el audio.');
    } finally {
      setProcesando(false);
    }
  }

  // Foto: la IA (Gemma multimodal) describe qué comida es y la registra.
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
        setAviso(`Anotado: ${data.descripcion}`);
        router.refresh();
      } else {
        setAviso(data?.error ?? 'No se pudo analizar la foto.');
      }
    } catch {
      setAviso('No se pudo enviar la foto.');
    } finally {
      setProcesando(false);
    }
  }

  const ocupado = guardando || procesando || grabando != null;

  return (
    <div className="tarjeta bg-white sombra-card">
      {/* comidas de hoy, ya hechas */}
      {recientes.length > 0 ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-verde-tint px-2.5 py-1 font-mono text-[11px] font-semibold text-verde">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-3">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {recientes.length} {recientes.length === 1 ? 'comida anotada hoy' : 'comidas anotadas hoy'}
          </span>
          <div className="mt-3 flex flex-col gap-1.5">
            {recientes.map((c) =>
              editId === c.id ? (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') guardarEdicion(c.id);
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2 text-[16px] text-tinta outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => guardarEdicion(c.id)}
                    className="flex-none rounded-[12px] px-3 py-2 font-mono text-[12px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => borrar(c.id)}
                    aria-label="Borrar comida"
                    className="flex-none rounded-[12px] border border-[#f0d0d8] px-2.5 py-2 text-rosa"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setEditId(c.id);
                    setEditTexto(c.nota);
                  }}
                  className="flex items-baseline gap-2.5 rounded-lg px-1 py-0.5 text-left active:bg-[#f5f5fb]"
                >
                  <span className="font-mono text-[11px] text-niebla">{c.hora}</span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-tinta-soft text-pretty">{c.nota}</span>
                  <IconLapiz className="size-[13px] flex-none self-center" />
                </button>
              ),
            )}
          </div>
        </>
      ) : (
        <p className="text-[13px] text-niebla text-pretty">Todavía no anotaste comidas hoy. Sumá una cuando quieras.</p>
      )}

      {/* escribir (se abre desde el +) */}
      {modo === 'escribir' && (
        <div className="mt-3.5 flex gap-2">
          <input
            autoFocus
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar();
              if (e.key === 'Escape') {
                setModo('idle');
                setNota('');
              }
            }}
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
      )}

      {/* fila de acciones: +, audio, foto (mismo alto y borde) */}
      <div className="mt-3.5 flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setModo((m) => (m === 'escribir' ? 'idle' : 'escribir'))}
          className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-dashed border-iris font-mono text-[13px] font-semibold text-iris-deep"
          style={{ background: 'var(--color-iris-soft)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Anotar comida
        </button>
        <button
          type="button"
          onClick={toggleMic}
          disabled={procesando || guardando}
          aria-label={grabando ? 'Enviar audio' : 'Dictar por voz'}
          className={`flex size-[44px] flex-none items-center justify-center rounded-[12px] border ${
            grabando ? 'animate-pulse border-transparent bg-brick text-white' : 'border-iris-borde bg-white text-iris'
          } disabled:opacity-50`}
        >
          {grabando ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]">
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
              <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => !ocupado && camara.current?.click()}
          disabled={ocupado}
          aria-label="Sacarle una foto a la comida"
          className="flex size-[44px] flex-none items-center justify-center rounded-[12px] border border-iris-borde bg-white text-iris disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
            <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
        </button>
      </div>
      <input ref={camara} type="file" accept="image/*" hidden onChange={foto} />

      {(grabando || procesando || aviso) && (
        <p className="mt-2.5 text-[13px] leading-snug text-iris-deep text-pretty">
          {grabando ? '● Grabando… tocá el cuadrado para enviar.' : procesando ? 'Un segundo, lo estoy leyendo…' : aviso}
        </p>
      )}
    </div>
  );
}

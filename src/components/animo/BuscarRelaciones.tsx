'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { correrAnalisis } from '@/lib/actions/analista';

/**
 * EL BOTÓN QUE BUSCA RELACIONES AHORA (05/08, pedido de Matías).
 *
 * *"Me gustaría que haya un botón en el que yo le pueda apretar, si no hay
 * ninguna, y que aparezca una animación como de los tres puntitos que se van
 * conectando y rotando mientras se va generando alguna relación."*
 *
 * ── ⚠️ POR QUÉ HACÍA FALTA, Y NO ERA UN BUG ────────────────────────────────
 *
 * Él notó que las relaciones no se actualizaban. La causa está en `worker.ts`:
 * el Analista corre **los lunes a las 9, una vez por semana**. No estaba roto —
 * estaba esperando el lunes. Y encima necesita que el worker esté prendido, que
 * no siempre lo está.
 *
 * ⚠️ Eso convierte la pantalla en algo que "a veces tiene cosas nuevas y a veces
 * no, sin que se entienda por qué". El botón lo vuelve una acción tuya: si
 * querés más, apretás.
 *
 * ── ⚠️ LO QUE TARDA, Y POR QUÉ LA ANIMACIÓN NO ES DECORACIÓN ───────────────
 *
 * `analizar()` le pide una lectura completa a Gemma: son ~30 segundos, a veces
 * más. **Sin nada que mirar, medio minuto de botón apagado se lee como que la
 * app se colgó** — y el segundo toque dispara otra corrida encima de la primera.
 * Los puntitos que se conectan dicen dos cosas a la vez: que está pensando, y
 * qué está haciendo (uniendo cosas que registraste).
 */

export function BuscarRelaciones({ vacio = false }: { vacio?: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'listo' | 'buscando' | 'error'>('listo');

  async function buscar() {
    if (estado === 'buscando') return;
    setEstado('buscando');
    try {
      const { ok } = await correrAnalisis();
      if (!ok) {
        // ⚠️ `ok: false` es un resultado NORMAL, no un error: el Analista
        // devuelve false cuando no hay datos nuevos suficientes para decir algo.
        // Se dice tal cual — inventar una relación para que el botón "funcione"
        // es la regla que este proyecto no cruza en ningún lado.
        setEstado('error');
        setTimeout(() => setEstado('listo'), 5000);
        return;
      }
      setEstado('listo');
      router.refresh();
    } catch {
      setEstado('error');
      setTimeout(() => setEstado('listo'), 5000);
    }
  }

  if (estado === 'buscando') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[18px] border border-iris-borde bg-white p-[22px_16px]">
        {/* Los tres puntitos conectándose. Es el dibujo de Relaciones —los tres
            nodos— puesto a girar: la espera muestra lo que la pantalla hace. */}
        <svg viewBox="0 0 48 48" className="size-[54px]" aria-hidden>
          <g className="gira-nodos">
            <line x1="14" y1="16" x2="34" y2="21" stroke="var(--color-iris)" strokeWidth="1.6" strokeLinecap="round" opacity="0.35">
              <animate attributeName="opacity" values="0.15;0.7;0.15" dur="1.8s" repeatCount="indefinite" />
            </line>
            <line x1="14" y1="16" x2="20" y2="34" stroke="var(--color-iris)" strokeWidth="1.6" strokeLinecap="round" opacity="0.35">
              <animate attributeName="opacity" values="0.7;0.15;0.7" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
            </line>
            <line x1="34" y1="21" x2="20" y2="34" stroke="var(--color-iris)" strokeWidth="1.6" strokeLinecap="round" opacity="0.35">
              <animate attributeName="opacity" values="0.15;0.7;0.15" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
            </line>
            <circle cx="14" cy="16" r="4.4" fill="var(--color-iris)">
              <animate attributeName="r" values="4.4;5.4;4.4" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="34" cy="21" r="4.4" fill="var(--color-iris-2)">
              <animate attributeName="r" values="5.4;4.4;5.4" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="20" cy="34" r="4.4" fill="var(--color-iris-deep)">
              <animate attributeName="r" values="4.4;5.4;4.4" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
        <p className="text-center text-[13px] leading-[1.4] text-tinta-soft text-pretty" role="status">
          Buscando relaciones entre lo que registraste…
        </p>
        {/* ⚠️ SE DICE QUE TARDA. Medio minuto sin aviso se lee como colgado, y el
            segundo toque dispara otra corrida encima de la primera. */}
        <p className="font-mono text-[10.5px] text-niebla-2">Puede tardar medio minuto</p>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="tarjeta border border-dashed border-niebla-2 bg-white/60">
        <p className="text-[13px] leading-[1.45] text-tinta-soft text-pretty">
          No encontré nada nuevo para cruzar. Suele pasar cuando hace poco que buscó: hacen falta unos días más
          de registros para que aparezca algo que valga.
        </p>
        <p className="mt-1.5 font-mono text-[10.5px] text-niebla-2">
          (O la IA está apagada: necesita Ollama corriendo.)
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={buscar}
      className={
        vacio
          ? 'flex w-full items-center justify-center gap-2 rounded-[14px] p-3 font-mono text-[12px] font-bold text-white'
          : 'flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-niebla-2 p-2.5 font-mono text-[12px] font-semibold text-niebla'
      }
      style={vacio ? { background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' } : undefined}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="18" cy="10" r="2.2" />
        <circle cx="9" cy="18" r="2.2" />
        <path d="M8.1 8.3l7.8 1M7.4 9.1l1.3 6.6M16.3 12l-5.6 4.5" />
      </svg>
      {vacio ? 'Buscar relaciones' : 'Buscar más relaciones'}
    </button>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { sonarExito, sonarHito } from '@/lib/sonido';

// Una celebración breve: un puñado de confeti que cae desde el punto que se tocó,
// con su sonidito. En tono con la calma de la app: dura ~1s y desaparece sola.
// Respeta prefers-reduced-motion (sin confeti, pero el sonido igual suena).

type Props = {
  hito?: boolean; // celebración más grande
  origen?: { x: number; y: number }; // desde dónde sale (coords de viewport)
  onFin: () => void;
};

// Literales a propósito: esto se dibuja en un <canvas> y `ctx.fillStyle` no
// resuelve var(). Si acá entra una variable CSS, el confeti sale negro.
const COLORES = ['#6c78ee', '#8a7cf0', '#3d9b80', '#c79238', '#c25571'];

export function Celebracion({ hito = false, origen, onFin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (hito) sonarHito();
    else sonarExito();

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dur = hito ? 1500 : 1000;
    if (reduce) {
      const id = setTimeout(onFin, 400);
      return () => clearTimeout(id);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      const id = setTimeout(onFin, dur);
      return () => clearTimeout(id);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const ox = origen?.x ?? window.innerWidth / 2;
    const oy = origen?.y ?? window.innerHeight / 3;
    const n = hito ? 60 : 32;
    const parts = Array.from({ length: n }, () => {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const vel = 4 + Math.random() * (hito ? 9 : 6);
      return {
        x: ox,
        y: oy,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 5 + Math.random() * 5,
        color: COLORES[(Math.random() * COLORES.length) | 0],
      };
    });

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of parts) {
        p.vy += 0.22; // gravedad
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / dur);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (t < dur) raf = requestAnimationFrame(tick);
      else onFin();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⚠️ EL CANVAS VA POR PORTAL AL BODY (30/07, Matías: *"cuando marco la
  // actividad en Seguimiento no aparece el confeti"*).
  //
  // El canvas es `fixed inset-0` y se dibuja en coordenadas de VIEWPORT: el
  // origen sale de un `getBoundingClientRect()` y el tamaño de
  // `window.innerWidth/Height`. Eso solo funciona si su contenedor ES el
  // viewport — y no lo era: la pantalla de Seguimiento vive dentro de
  // `.flotar`, cuya animación usa `transform` con `fill-mode: both`, así que
  // el transform **queda aplicado para siempre** aunque la animación haya
  // terminado. Un ancestro con transform pasa a ser el contenedor de sus
  // hijos `fixed`, con dos consecuencias: el confeti se dibuja corrido
  // (coordenadas de viewport dentro de una caja que no arranca en 0,0) y
  // encima lo recorta el `overflow-hidden` de la tarjeta de la actividad.
  //
  // Es exactamente el mismo bug que ya documentaron `HojaTemas` y
  // `HojaCarpetas` con las hojas que se dibujaban fuera de la vista. Misma
  // cura: sacarlo del árbol y colgarlo del body, donde `fixed` vuelve a
  // significar viewport.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden />,
    document.body,
  );
}

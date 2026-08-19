'use client';

import { useEffect, useState } from 'react';
import { AvatarIA } from '@/components/ui/AvatarIA';
import { pintarDia } from '@/lib/actions/actividades';

// EL CHAT QUE ARRANCA ÉL — la app te habla primero, en el Home.
//
// Pedido de Matías (27/07): *"que cada tanto la app te ponga un mensaje o te
// hable directamente"*. Es la pieza que convierte el Home en un diario con
// alguien del otro lado: hasta ahora, la app solo contestaba.
//
// ── Las tres reglas que lo hacen soportable ─────────────────────────────────
// 1. **UNA VEZ POR DÍA.** Se guarda el día que lo mostró; si ya salió hoy, no
//    vuelve a salir aunque recargues.
// 2. **NO SIEMPRE.** Si la página no tiene nada contextual para decir, no manda
//    nada: mejor callado que pesado. Esa decisión la toma quien lo renderiza
//    (si no hay mensaje, no monta el componente).
// 3. **SE PUEDE CORTAR.** "Ahora no" lo apaga por hoy sin culpa y sin insistir.
//    Un asistente que no se puede callar deja de ser compañía y pasa a ser una
//    notificación con cara.
//
// El estado vive en localStorage y no en la base a propósito: es cómo querés
// ver la pantalla, no un dato tuyo. No viaja al Analista ni a los backups.

const CLAVE = 'tegmento:proactivo-dia';

function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function MensajeProactivo({
  mensaje,
  onResponder,
  marcar = null,
  onMarcado,
}: {
  mensaje: string;
  onResponder: () => void;
  /**
   * La actividad de la que está hablando, cuando habla de una que se pinta día a
   * día y todavía no está marcada hoy.
   *
   * ⚠️ Pedido de Matías (30/07): *"que no me ponga a contestar, sino que me dé la
   * opción de tocar y que se marque solo"*. Los dos únicos botones eran
   * "Contestar" y "Ahora no": preguntarte "¿pudiste con LID?" y que la única
   * salida sea escribir "sí" es hacerte tipear un dato que la app guarda de un
   * toque. null = está hablando de otra cosa y el botón no aparece.
   */
  marcar?: { lineaId: number; titulo: string } | null;
  onMarcado?: () => void;
}) {
  // Arranca oculto y se decide después de montar: en el server no hay
  // localStorage, y mostrarlo primero para esconderlo después es peor que nada.
  const [mostrar, setMostrar] = useState(false);
  // ⚠️ El "ya lo hice" NO apaga el mensaje: queda el "Anotado" y los otros dos
  // botones siguen ahí. Marcar que lo hiciste no es lo mismo que no querer
  // hablar del tema, y hacer desaparecer el mensaje al tocar te cerraría la
  // conversación justo cuando quizás tenías algo para contar.
  const [marcando, setMarcando] = useState(false);
  const [hecho, setHecho] = useState(false);

  useEffect(() => {
    try {
      setMostrar(window.localStorage.getItem(CLAVE) !== hoyStr());
    } catch {
      setMostrar(true); // sin localStorage (modo privado), que igual funcione
    }
  }, []);

  function apagar() {
    setMostrar(false);
    try {
      window.localStorage.setItem(CLAVE, hoyStr());
    } catch {
      // si no se puede guardar, vuelve a aparecer mañana: no es grave
    }
  }

  if (!mostrar) return null;

  return (
    <div className="mb-4">
      <div className="flex items-start gap-2.5">
        <AvatarIA px={44} className="-mt-0.5" />
        <p className="min-w-0 flex-1 pt-[3px] text-[16px] font-medium leading-[1.35] text-tinta text-pretty">
          {mensaje}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2 pl-[38px]">
        {/* ⚠️ VA PRIMERO, ANTES DE "CONTESTAR". Cuando el bot pregunta por algo
            que hiciste, "ya lo hice" es la respuesta más frecuente y la más
            barata de dar; dejarla tercera sería volver a empujar hacia el
            teclado. Y no reemplaza a "Contestar": a veces querés contar cómo
            te fue, no solo que pasó. */}
        {marcar && !hecho && (
          <button
            type="button"
            disabled={marcando}
            onClick={async () => {
              if (marcando) return;
              setMarcando(true);
              try {
                await pintarDia(marcar.lineaId, hoyStr());
                setHecho(true);
                onMarcado?.();
              } finally {
                setMarcando(false);
              }
            }}
            className="flex h-[34px] items-center gap-1.5 rounded-full bg-verde px-4 font-mono text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {marcando ? 'Marcando…' : 'Ya lo hice'}
          </button>
        )}

        {hecho && (
          <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-verde-tint px-4 font-mono text-[12.5px] font-bold text-verde">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Anotado
          </span>
        )}

        <button
          type="button"
          onClick={onResponder}
          className="h-[34px] rounded-full bg-iris px-4 font-mono text-[12.5px] font-bold text-white shadow-[0_4px_12px_rgba(108,120,238,.28)]"
        >
          Contestar
        </button>
        <button
          type="button"
          onClick={apagar}
          className="h-[34px] rounded-full border border-iris-borde bg-white/70 px-4 font-mono text-[12.5px] font-semibold text-niebla"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}

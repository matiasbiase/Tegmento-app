'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cerrarActividad, crearActividad, reactivarActividad, renombrarActividad } from '@/lib/actions/actividades';
import type { Actividad } from '@/components/actividades/ActividadesUI';
import { IconLapiz } from '@/components/ui/iconos';

/**
 * LAS TAREAS COMO LISTA SUELTA (03/08, pedido de Matías).
 *
 * Va entre la tarjeta "Este mes" y las pestañas — exactamente el hueco que
 * dejó el input de "Sumar". Palabras suyas: *"lo de tareas me lo imaginaba
 * arriba justamente de esta parte donde escribías, arriba de donde están las
 * tres cosas para seleccionar"*.
 *
 * ⚠️ NO ES UNA TARJETA, Y ES A PROPÓSITO. Una tarea no tiene racha, ni meta, ni
 * mes que mostrar: no hay nada que encerrar en un rectángulo. El rectángulo se
 * lo gana el seguimiento, que sí tiene qué poner adentro. *"Que se vea simple"*.
 *
 * ⚠️ Y ES LA PUERTA DE LAS TAREAS, LA ÚNICA. El botón de abajo de la pantalla
 * crea seguimientos y nada más. Antes había un solo "Sumar" que creaba algo sin
 * tipo —siempre nacía tarea— y había que abrirlo y tocar "Seguir día a día"
 * para convertirlo: **el tipo se decidía después de crear la cosa**, y de ahí
 * salía el desorden que Matías nombró como "problemas de arquitectura de
 * información". Ahora cada puerta dice qué crea.
 */

export function ListaTareas({ tareas, cerradasHoy = [] }: { tareas: Actividad[]; cerradasHoy?: Actividad[] }) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  const [nueva, setNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  // ⚠️ EL TACHADO DURA EL DÍA, NO EL REFRESCO (05/08). Quién está tildada lo
  // dice el server con `cerradasHoy` (las que cerraste hoy siguen en la lista);
  // estos dos sets son solo el adelanto optimista para que el tilde pinte al
  // toque, sin esperar la vuelta. Antes esto era la única memoria que había, y
  // por eso la tarea se esfumaba apenas contestaba el server.
  const [hechas, setHechas] = useState<Set<number>>(new Set());
  const [reabiertas, setReabiertas] = useState<Set<number>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [texto, setTexto] = useState('');

  async function agregar() {
    const t = nueva.trim();
    if (!t || guardando) return;
    setGuardando(true);
    try {
      await crearActividad(t); // diaria = false → es una tarea
      setNueva('');
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  // Tildar cierra, destildar reabre. ⚠️ Antes destildar no hacía nada ("ya está
  // cerrada"): tenía sentido cuando el tilde vivía tres segundos y no había cómo
  // equivocarse. Ahora la marca se queda todo el día, así que tiene que haber
  // marcha atrás en el mismo lugar donde la pusiste.
  function tildar(a: Actividad) {
    if (estaHecha(a.id)) {
      setReabiertas((prev) => new Set(prev).add(a.id));
      setHechas((prev) => {
        const s = new Set(prev);
        s.delete(a.id);
        return s;
      });
      arrancar(async () => {
        await reactivarActividad(a.id);
        router.refresh();
      });
      return;
    }
    setReabiertas((prev) => {
      const s = new Set(prev);
      s.delete(a.id);
      return s;
    });
    setHechas((prev) => new Set(prev).add(a.id));
    arrancar(async () => {
      await cerrarActividad(a.id);
      router.refresh();
    });
  }

  function guardarNombre(id: number) {
    const t = texto.trim();
    setEditId(null);
    if (!t) return;
    arrancar(async () => {
      await renombrarActividad(id, t, '');
      router.refresh();
    });
  }

  // Las cerradas hoy se quedan en la lista, tachadas, hasta que cambie el día.
  // ⚠️ ORDENADAS POR ID (o sea, por cuándo las escribiste) y no por movimiento:
  // si el orden fuera por lo último que tocaste, tildar una la mandaría de golpe
  // a otro lugar de la lista. Una lista de tareas no se reordena sola abajo del
  // dedo.
  const visibles = [...tareas, ...cerradasHoy.filter((c) => !tareas.some((t) => t.id === c.id))].sort(
    (x, y) => x.id - y.id,
  );

  function estaHecha(id: number) {
    if (reabiertas.has(id)) return false;
    return hechas.has(id) || cerradasHoy.some((c) => c.id === id);
  }

  return (
    // ⚠️ SIN TÍTULO "TAREAS" (05/08): vive adentro de la pestaña Tareas, y el
    // rótulo de la pestaña ya lo dice a 20px de distancia. El h2 se justificaba
    // cuando la lista estaba suelta arriba de la barrita, no ahora.
    <div className="mb-2">
      {visibles.map((a) => {
        const lista = estaHecha(a.id);
        return editId === a.id ? (
          <div key={a.id} className="flex items-center gap-2 py-1.5">
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') guardarNombre(a.id);
                if (e.key === 'Escape') setEditId(null);
              }}
              onBlur={() => guardarNombre(a.id)}
              aria-label={`Cambiarle el nombre a ${a.titulo}`}
              className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3 py-2 text-[15px] text-tinta outline-none focus:border-iris"
            />
          </div>
        ) : (
          <div key={a.id} className="flex items-center gap-2.5 border-b border-[rgba(108,120,238,.10)] py-2.5">
            <button
              type="button"
              onClick={() => tildar(a)}
              aria-pressed={lista}
              aria-label={lista ? `${a.titulo}, hecha. Desmarcar` : `Marcar ${a.titulo} como hecha`}
              className="grid size-[19px] flex-none place-items-center rounded-[6px] transition-colors"
              style={{
                background: lista ? 'var(--color-verde)' : 'transparent',
                boxShadow: lista ? undefined : 'inset 0 0 0 1.8px var(--color-niebla-2)',
              }}
            >
              {lista && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[11px]"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <p
              className={`min-w-0 flex-1 text-[15px] tracking-[-0.1px] ${
                lista ? 'text-niebla-2 line-through' : 'text-tinta'
              }`}
            >
              {a.titulo}
            </p>

            {/* El lápiz NO es nuevo: renombrar ya existía adentro del renglón
                grande. Acá cambia de forma, no de función. */}
            {!lista && (
              <button
                type="button"
                onClick={() => {
                  setTexto(a.titulo);
                  setEditId(a.id);
                }}
                aria-label={`Cambiarle el nombre a ${a.titulo}`}
                className="flex size-6 flex-none items-center justify-center rounded-full text-niebla-2"
              >
                <IconLapiz className="size-[13px]" />
              </button>
            )}
          </div>
        );
      })}

      {/* LA LÍNEA VACÍA. Escribís y ya está, sin abrir nada — es lo que
          reemplaza al input con botón "Sumar". El cuadradito de la izquierda
          está apagado a propósito: dice qué va a ser esto sin explicarlo. */}
      <div className="flex items-center gap-2.5 py-2.5">
        <span
          className="size-[19px] flex-none rounded-[6px]"
          style={{ boxShadow: 'inset 0 0 0 1.8px rgba(108,120,238,.35)' }}
          aria-hidden="true"
        />
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          onBlur={agregar}
          placeholder="Escribí una tarea…"
          aria-label="Escribir una tarea nueva"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] tracking-[-0.1px] text-tinta outline-none placeholder:text-niebla-2"
        />
      </div>
    </div>
  );
}

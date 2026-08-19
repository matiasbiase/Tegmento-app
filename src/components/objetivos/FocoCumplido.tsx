'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { posponerFocoCumplido, sacarFocoArea } from '@/lib/actions/objetivos';
import { textoFocoCumplido } from '@/lib/foco-caduca';
import { GLIFO_RUEDA } from '@/components/ui/glifos';

/**
 * "YA TENÉS ESTO RESUELTO, ¿QUERÉS CAMBIAR DE FOCO?" (06/08).
 *
 * ⚠️⚠️ APARECE CUANDO CUMPLISTE LOS OBJETIVOS DEL ÁREA, no a los X meses ni al
 * rehacer la rueda. Es la regla que eligió Matías —*"cuando ve que cumpliste los
 * objetivos relacionados"*— y es la única de las tres que mira lo que hiciste en
 * vez del calendario. Llega justo cuando el foco se quedó sin trabajo: un área
 * enfocada sin nada abierto no está enfocando nada, está ocupando uno de los
 * tres lugares.
 *
 * ⚠️ NO ES UN CARTEL DE FELICITACIONES, ES UNA PREGUNTA CON SALIDA. Un aviso que
 * solo dice "lo lograste" te deja el trabajo de ir a buscar dónde se cambia. Las
 * tres puertas están acá: soltar el foco, ponerle otro objetivo, o rehacer la
 * rueda.
 *
 * ⚠️ Y "AHORA NO" NO LO APAGA PARA SIEMPRE. Guarda contra QUÉ ÁREAS se dijo que
 * no (ver `posponerFocoCumplido`): el día que cumplas otra, la pregunta vuelve,
 * porque es una pregunta nueva. Un "visto" pelado habría matado el aviso entero
 * la primera vez que no tenías ganas de decidir.
 */
export function FocoCumplido({ areas, conLogro }: { areas: { id: number; nombre: string }[]; conLogro: boolean }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  if (areas.length === 0) return null;

  function soltar(id: number) {
    empezar(async () => {
      await sacarFocoArea(id);
      router.refresh();
    });
  }

  function ahoraNo() {
    empezar(async () => {
      await posponerFocoCumplido(areas.map((a) => a.id));
      router.refresh();
    });
  }

  return (
    // ⚠️ CON LA ANATOMÍA DE LAS TARJETAS NUEVAS (06/08, Matías: *"se ve con
    // texto, pero tendría que verse con la identidad de las tarjetas nuevas"*).
    // Antes era un párrafo suelto en una caja blanca: el mismo contenido, pero
    // sin el cuadradito del ícono ni el vidrio, o sea sin nada que dijera que
    // pertenece a esta pantalla. Ahora comparte las tres cosas que hacen a una
    // tarjeta de acá: `glass-tinte`, el cuadradito de 46px y el título con su
    // línea de contexto debajo.
    <div className="tarjeta border border-iris-borde glass-tinte">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-[46px] flex-none place-items-center rounded-[13px] bg-verde-tint text-verde"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[23px]">
            {GLIFO_RUEDA}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16.5px] font-semibold tracking-[-0.2px] text-tinta">Tu foco se quedó sin trabajo</h3>
          <p className="mt-[3px] font-mono text-[11px] text-niebla">
            {areas.length === 1 ? '1 área sin nada abierto' : `${areas.length} áreas sin nada abierto`}
          </p>
        </div>
      </div>

      <p className="mt-3 border-t border-iris-borde pt-[11px] text-[13.5px] leading-[1.45] text-tinta text-pretty">
        {textoFocoCumplido(areas.map((a) => a.nombre), conLogro)} ¿Lo dejás ahí o lo movés a otra cosa?
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => soltar(a.id)}
            disabled={pendiente}
            className="rounded-full border border-iris-borde bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-iris-deep disabled:opacity-60"
          >
            Soltar {a.nombre}
          </button>
        ))}
        {/* La rueda entera, para cuando lo que cambió no es un área sino el
            momento. Va como link y no como acción: es una pantalla, no un
            cambio que se pueda hacer desde acá. */}
        <Link
          href="/rueda"
          className="rounded-full border border-dashed border-iris-borde px-3 py-1.5 font-mono text-[11px] font-semibold text-iris"
        >
          Rehacer la rueda
        </Link>
        <button
          type="button"
          onClick={ahoraNo}
          disabled={pendiente}
          className="rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold text-niebla disabled:opacity-60"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}

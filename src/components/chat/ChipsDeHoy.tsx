'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pintarDia } from '@/lib/actions/actividades';
import { ymd } from '@/lib/marcas';
import { Celebracion } from '@/components/ui/Celebracion';
import type { ChipDeHoy } from '@/lib/chips-hoy';
import { GLIFO_SEGUIMIENTO } from '@/components/ui/glifos';

/**
 * "HOY, DE UN TOQUE" — marcar lo del día sin salir del Home (07/08).
 *
 * El argumento está medido: en 47 días **marcó 43 y escribió 17**. Marcar es lo
 * que viene a hacer, y hasta hoy el Home no tenía dónde: había que ir a
 * Seguimiento. La regla que decide QUÉ entra —y por qué esto no contradice la
 * decisión del 31/07— vive en `lib/chips-hoy.ts` y tiene tests.
 *
 * ── ⚠️ EL HECHO VA EN IRIS, NO EN VERDE, Y ES UN CAMBIO CONTRA LA MAQUETA ────
 *
 * La maqueta pinta el chip marcado de verde. Acá va en iris, por dos razones que
 * se suman:
 *
 *  1. **En Seguimiento, marcar una actividad ya es iris** (el tilde de
 *     `ActividadesHoy`). Es el mismo acto en la misma app: dos colores para lo
 *     mismo es justo lo que la regla de la casa prohíbe con los íconos.
 *  2. **El verde ya significa otra cosa acá arriba**: es el tinte de la
 *     relectura, que en esta misma pantalla queda dos centímetros más arriba. Y
 *     ese verde se eligió *para que no se confunda* con lo demás — gastarlo
 *     también en "marcado" le saca justo lo que lo hacía distinto.
 *
 * ── EL TOQUE ALTERNA, Y ESO ESTÁ BIEN ACÁ ───────────────────────────────────
 *
 * ── ⚠️⚠️ Y DESDE EL 18/08 COMPARTE RENGLÓN CON "ANOTAR RÁPIDO" ──────────────
 *
 * Fundir las dos filas es **lo que él mismo bajó el 31/07**, y el motivo que dio
 * entonces era bueno: mezclar *tipos de registro* con *cuáles de tus cosas
 * hiciste* son dos niveles distintos, y dos pastillas iguales harían cosas
 * distintas. 👉 **Hoy no se cumple ninguna de las dos cosas que lo hacían malo:**
 *
 *  1. **La fila ya no crece sin fin**: el tope y el "+N" son del 07/08.
 *  2. **Y las dos formas ya se distinguen solas**, por la escala de redondeos
 *     que él mismo pidió el 11/08 y que está escrita abajo: *pastilla = abre
 *     algo*, *rectangular = se marca acá mismo*. Cuando esa regla se escribió,
 *     las dos filas estaban separadas y la forma era un refuerzo. Al juntarlas,
 *     **la forma pasa a ser lo único que las separa — y alcanza.**
 *
 * ⚠️ O SEA QUE LA REGLA DEL 31/07 NO SE TIRÓ: se quedó sin los dos hechos que la
 * sostenían. Si algún día los chips volvieran a ser todos de la misma forma,
 * vuelve a valer entera y hay que volver a partir la fila.
 *
 * `pintarDia` marca y desmarca. En la tarjeta del bot eso obligaba a esconder
 * "Ya lo hice" cuando ya estaba marcada (el botón habría hecho lo contrario de
 * lo que decía). Acá **el chip muestra su estado**, con tilde o sin tilde, así
 * que alternar es lo que el dibujo promete — igual que la lista de Seguimiento.
 */
export function ChipsDeHoy({ visibles, resto }: { visibles: ChipDeHoy[]; resto: number }) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  // Copia local para que el chip pinte al toque, sin esperar al server. Mismo
  // patrón que `ActividadesHoy`: la acción es un round-trip y el dedo no espera.
  const [extra, setExtra] = useState<Record<number, boolean>>({});
  const [fiesta, setFiesta] = useState<{ hito: boolean; origen: { x: number; y: number } } | null>(null);

  if (visibles.length === 0) return null;

  const hecha = (c: ChipDeHoy) => extra[c.id] ?? c.hecha;

  function tocar(c: ChipDeHoy, e: React.MouseEvent<HTMLButtonElement>) {
    const yaEstaba = hecha(c);
    setExtra((prev) => ({ ...prev, [c.id]: !yaEstaba }));

    // Desmarcar no festeja: sacar un tilde no es un logro.
    if (!yaEstaba) {
      const r = e.currentTarget.getBoundingClientRect();
      const origen = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      // ⚠️ EL HITO SOLO SI LA FILA MUESTRA TODAS. Con un "+2" afuera no se puede
      // saber si esta cierra el día, y festejar "cerraste el día" sobre una fila
      // recortada sería inventar un logro — que es la regla de la casa sobre no
      // afirmar lo que no se puede sostener con los datos que hay.
      const cierraElDia =
        resto === 0 && visibles.every((o) => (o.id === c.id ? true : hecha(o)));
      setFiesta({ hito: cierraElDia && visibles.length > 1, origen });
    }

    arrancar(async () => {
      await pintarDia(c.id, ymd(new Date()));
      router.refresh();
    });
  }

  // ── ⚠️⚠️ YA NO TRAE NI RÓTULO NI CAJA: LOS PONE LA FILA ÚNICA (18/08) ──────
  //
  // Hasta hoy esto era su propio bloque, con su `mb-5` y su rótulo "Hoy, de un
  // toque". Matías pidió fundirlo con "Anotar rápido": *"que saques lo de hoy de
  // un toque, directamente que eso sea como en anotar rápido"*. Así que devuelve
  // los chips sueltos y el renglón lo arma `AsistenteEntrada`.
  //
  // ⚠️ LO QUE SE QUEDA ACÁ ES LO QUE NO PODÍA MUDARSE: el estado optimista, el
  // alternar de `pintarDia` y la `Celebracion`. Mover eso al padre habría sido
  // mudar la lógica por acompañar al layout.
  //
  // ⚠️ EL GLIFO DE SEGUIMIENTO SE FUE CON EL RÓTULO, y a propósito: decía *de
  // dónde salen estas actividades*, y arriba de una fila mixta estaría rotulando
  // también a los chips de registro, que no vienen de ahí. El "+N" sigue siendo
  // la puerta a Seguimiento, que era la otra mitad de su trabajo.
  return (
    <>
        {visibles.map((c) => {
          const ok = hecha(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={(e) => tocar(c, e)}
              aria-pressed={ok}
              aria-label={ok ? `${c.titulo}, hecho hoy. Tocá para desmarcar` : `Marcar ${c.titulo} hoy`}
              className="chip-papel flex flex-none items-center gap-1.5 rounded-[12px] border py-[5px] pl-[7px] pr-2.5"
              style={{
                // El mismo degradé que "Anotar rápido", con el final del tinte
                // fuera del alto visible: adentro se ve el arranque y hay curva
                // sin mancha. El hecho arranca antes, que es lo que mantiene la
                // diferencia de un vistazo.
                // ⚠️ COLOR PAREJO, NO DEGRADÉ (11/08). El degradé blanco→tinte
                // es lo que dibuja una superficie CURVA: es el otro pilar del
                // vidrio, junto con el rim. Una hoja de papel no tiene curva —
                // tiene un color y ya. Dejarlo habría sido sacarle el brillo a
                // algo que seguía teniendo forma de vidrio.
                background: ok ? 'var(--color-iris-soft)' : '#fdfdff',
                borderColor: ok ? '#4a56c844' : 'var(--color-iris-borde)',
              }}
            >
              {/* Tilde cuando está, aro hueco cuando no. Es el mismo par que usa
                  la lista de Seguimiento: un concepto, un dibujo. */}
              <span
                className="grid size-[13px] flex-none place-items-center rounded-[4px]"
                style={{
                  background: ok ? 'var(--color-iris)' : 'transparent',
                  boxShadow: ok ? undefined : 'inset 0 0 0 1.5px var(--color-niebla-2)',
                }}
              >
                {ok && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-[8px]"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span
                className="whitespace-nowrap text-[12px] font-semibold"
                style={{ color: ok ? 'var(--color-iris-deep)' : '#1c1c2b' }}
              >
                {c.titulo}
              </span>
            </button>
          );
        })}

        {/* ⚠️ EL "+N" ES LA ÚNICA PUERTA A SEGUIMIENTO QUE QUEDA EN ESTA FILA, y
            por eso existe: sin él, las que no entran no tendrían dónde. Aparece
            solo cuando sobran DOS o más — con una sola, esa una entra (ver la
            nota del tope). */}
        {resto > 0 && (
          <button
            type="button"
            onClick={() => router.push('/actividades')}
            className="chip-papel flex flex-none items-center rounded-[12px] border border-iris-borde bg-white/70 px-2.5 py-[5px] font-mono text-[11px] font-semibold text-niebla"
          >
            +{resto}
          </button>
        )}
      {fiesta && <Celebracion hito={fiesta.hito} origen={fiesta.origen} onFin={() => setFiesta(null)} />}
    </>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarCierre, type ContextoDeCierre } from '@/lib/actions/cierre-objetivo';
import { AvatarIA } from '@/components/ui/AvatarIA';

/**
 * "TOMATE UN MOMENTO" — la pantalla al cerrar un objetivo.
 *
 * Pedido de Matías (10/08): *"cuando termina un objetivo estaría bueno que se
 * ponga la pantalla así y diga: tomate un momento para reflexionar acerca de
 * este objetivo, a ver si cambiamos esto de la rueda y empezamos un objetivo
 * nuevo o lo hacemos después"*.
 *
 * ── ⚠️ POR QUÉ OCUPA LA PANTALLA ENTERA ─────────────────────────────────────
 *
 * El modelo que él nombró son las tarjetas de la mañana (*"¿cómo dormiste?"*),
 * pero **ocupando la pantalla**. Y hay un motivo que no es estético: esto pasa
 * **una vez cada varios meses**, cuando terminás algo largo. Una tarjeta más en
 * el Home se descarta con el pulgar como cualquier otra; la pantalla entera dice
 * que este momento no es uno más. Es lo contrario del ritmo del resto de la app,
 * y por eso funciona: **si esto apareciera seguido, estaría mal.**
 *
 * ── ⚠️⚠️ NO FELICITA ────────────────────────────────────────────────────────
 *
 * No dice "¡lo lograste!" ni tiene confeti. La regla de la casa es vieja y clara:
 * *una app que no puede felicitarte tampoco puede retarte*, y el empuje sale del
 * hecho contado. Dice **qué cerraste** y pregunta. `FocoCumplido` ya había
 * resuelto esto igual el 06/08: *"no es un cartel de felicitaciones, es una
 * pregunta con salida"*.
 *
 * ── ⚠️ TODO ES SALTEABLE ────────────────────────────────────────────────────
 *
 * Se puede cerrar sin escribir nada, sin mover la rueda y sin arrancar otro.
 * **Que no pase nada es un final válido.** Una pantalla que te obliga a producir
 * algo para salir es un formulario con otra cara.
 */
export function CierreObjetivo({ ctx, onCerrar }: { ctx: ContextoDeCierre; onCerrar: () => void }) {
  const router = useRouter();
  const [nota, setNota] = useState('');
  // `null` = no tocó la rueda. Es distinto de "la dejó igual": si no la tocó, no
  // se escribe ningún check-in.
  const [score, setScore] = useState<number | null>(null);
  const [guardando, empezar] = useTransition();

  const scoreActual = ctx.area?.score ?? null;

  function salir(destino?: string) {
    empezar(async () => {
      await guardarCierre({
        objetivoId: ctx.objetivoId,
        nota,
        areaId: ctx.area?.id ?? null,
        score,
      });
      onCerrar();
      if (destino) router.push(destino);
      else router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-papel px-[26px] pb-[max(30px,env(safe-area-inset-bottom))] pt-[max(56px,calc(env(safe-area-inset-top)+26px))]"
      role="dialog"
      aria-modal="true"
      aria-label="Un momento para reflexionar sobre el objetivo que cerraste"
    >
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-start gap-3">
          <AvatarIA px={52} className="-mt-1" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-semibold tracking-[0.4px] text-niebla">
              Cerraste
            </p>
            <h1 className="mt-1 font-serif text-[26px] font-semibold leading-[1.15] tracking-[-0.3px] text-tinta text-pretty">
              {ctx.titulo}
            </h1>
          </div>
        </div>

        {/* ⚠️ LA PREGUNTA VA PRIMERO Y ES ABIERTA. No "¿cuántas horas le
            pusiste?" ni ninguna métrica: lo que la app no tiene y solo él sabe
            es cómo lo vivió. Lo medible ya lo midió sola. */}
        <div>
          <label htmlFor="cierre-nota" className="block font-serif text-[19px] leading-[1.3] text-tinta text-pretty">
            ¿Cómo lo viviste?
          </label>
          <p className="mt-1 text-[13.5px] leading-[1.5] text-niebla text-pretty">
            Lo que quieras. Si no sale nada, seguí de largo.
          </p>
          <textarea
            id="cierre-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={4}
            placeholder="Costó más de lo que pensaba, pero…"
            className="mt-3 w-full resize-none rounded-[12px] border border-iris-borde bg-white p-3 text-[15px] leading-[1.5] text-tinta outline-none placeholder:text-niebla-2 focus:border-iris"
          />
        </div>

        {/* ── LA RUEDA, SOLO SI EL OBJETIVO TIENE ÁREA ──────────────────────
            ⚠️ SIN ÁREA NO SE PREGUNTA. Un objetivo que no cuelga de ningún área
            no tiene qué mover, y ofrecer subir un puntaje que no existe sería
            inventar una relación. Los que crea `#plan` hoy son de este tipo. */}
        {ctx.area && (
          <div className="rounded-[18px] border border-iris-borde bg-white p-[16px]">
            <p className="font-serif text-[19px] leading-[1.3] text-tinta text-pretty">
              ¿Sentís que subiste un punto en {ctx.area.nombre}?
            </p>
            <p className="mt-1 text-[13.5px] leading-[1.5] text-niebla text-pretty">
              {scoreActual != null
                ? `La última vez lo pusiste en ${scoreActual} de 5.`
                : 'Todavía no le pusiste puntaje a esta área.'}
            </p>

            {/* ⚠️ TRES BOTONES Y NO UN SLIDER. Un slider invita a afinar un
                número que no es una medición: es cómo te sentís. Las opciones
                son las tres respuestas reales a la pregunta, y "igual" está a la
                vista para que no mover nada sea tan fácil como mover. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {scoreActual != null && scoreActual < 5 && (
                <Opcion
                  activa={score === scoreActual + 1}
                  onClick={() => setScore(score === scoreActual + 1 ? null : scoreActual + 1)}
                >
                  Sí, subí a {scoreActual + 1}
                </Opcion>
              )}
              <Opcion activa={score === scoreActual} onClick={() => setScore(score === scoreActual ? null : scoreActual)}>
                Sigue igual
              </Opcion>
              {scoreActual != null && scoreActual > 1 && (
                <Opcion
                  activa={score === scoreActual - 1}
                  onClick={() => setScore(score === scoreActual - 1 ? null : scoreActual - 1)}
                >
                  Bajó a {scoreActual - 1}
                </Opcion>
              )}
            </div>
            {/* ⚠️ "Bajó" existe a propósito. Terminar un objetivo no garantiza
                que el área esté mejor —se puede cerrar algo y sentir que el área
                sigue floja—, y una pantalla que solo ofrece subir estaría
                empujando a un número lindo. Es la misma regla que hace que la
                app diga las cosas aunque vayan atrasadas. */}
          </div>
        )}

        {/* ── Y AHORA QUÉ ───────────────────────────────────────────────────
            ⚠️ LAS DOS SALIDAS TIENEN EL MISMO PESO VISUAL. "Después" no es un
            link chiquito abajo: cerrar un objetivo y no arrancar otro es una
            respuesta legítima, y hacer que cueste encontrarla sería empujar a
            producir. */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={guardando}
            onClick={() => salir('/objetivos?nuevo=1')}
            className="h-[46px] rounded-[14px] bg-iris font-mono text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(108,120,238,.3)] disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Arrancar otro'}
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => salir()}
            className="h-[46px] rounded-[14px] border border-iris-borde bg-white font-mono text-[13px] font-semibold text-niebla disabled:opacity-60"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
}

function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className="rounded-full border px-3.5 py-2 font-mono text-[12px] font-semibold transition-colors"
      style={{
        background: activa ? 'var(--color-iris)' : '#fff',
        borderColor: activa ? 'var(--color-iris)' : 'var(--color-iris-borde)',
        color: activa ? '#fff' : 'var(--color-tinta)',
      }}
    >
      {children}
    </button>
  );
}

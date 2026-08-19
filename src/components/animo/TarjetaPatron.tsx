'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  seguirObservacion,
  descartarObservacion,
  dudarObservacion,
  observacionAActividad,
} from '@/lib/actions/observaciones';

// UN patrón, UNA tarjeta, y una sola pregunta: ¿te pasa o no?
//
// ── Por qué se rehizo (27/07, Matías: "no me gusta cómo ofrece la información") ─
// Antes las observaciones salían tres veces en la misma pantalla —en la tira de
// chips, adentro del panel del Analista y otra vez en la lista de abajo— y en
// las tres se leían como párrafos. Con todo repetido y nada jerarquizado, la
// pantalla decía mucho y no se entendía nada.
// Ahora: una tarjeta por patrón, con la evidencia A LA VISTA y las dos
// respuestas abajo. La pregunta es el punto: sin respuesta la app no aprende, y
// contestarla es lo que hace que la próxima lectura sea mejor.
//
// ⚠️ La confianza se dice CON PALABRAS y no con porcentajes: nadie sabe qué
// significa "73% de confianza", y un número finito inventado por un modelo suena
// más exacto de lo que es.

const CONFIANZA: Record<string, { texto: string; clase: string }> = {
  alta: { texto: 'Pasa casi siempre', clase: 'bg-verde-tint text-[#2f7d67]' },
  media: { texto: 'Viene pasando', clase: 'bg-ambar-tint text-[#9a6a1e]' },
  baja: { texto: 'Puede ser casualidad', clase: 'bg-gris-tint text-niebla' },
};

export function TarjetaPatron({
  patron,
  evidencia,
  confianza,
  icono,
  experimento,
}: {
  patron: string;
  evidencia: string;
  confianza: string;
  icono: React.ReactNode;
  /** Algo chico para probar unos días, si esta relación da para probar algo. */
  experimento?: string;
}) {
  const [respuesta, setRespuesta] = useState<'anotada' | 'descartada' | 'en_duda' | null>(null);
  const [guardando, empezar] = useTransition();
  // El título con el que quedó el experimento, una vez que lo aceptó.
  const [probando, setProbando] = useState<string | null>(null);
  const router = useRouter();

  function probar() {
    if (!experimento || probando) return;
    empezar(async () => {
      const puesto = await observacionAActividad(experimento, true);
      if (puesto) setProbando(puesto);
      // Sin esto la tarjeta con el campo para anotar ("Lo que estás probando")
      // recién aparecía en la próxima visita: aceptás el experimento y la
      // pantalla se queda igual, como si no hubiera pasado nada.
      router.refresh();
    });
  }

  const conf = CONFIANZA[confianza] ?? CONFIANZA.baja;

  function responder(v: 'anotada' | 'descartada' | 'en_duda') {
    setRespuesta(v); // optimista: el toque tiene que sentirse al toque
    empezar(async () => {
      if (v === 'anotada') await seguirObservacion(patron, evidencia);
      else if (v === 'en_duda') await dudarObservacion(patron, evidencia);
      else await descartarObservacion(patron, evidencia);
    });
  }

  // Ya contestada: se queda como acuse de recibo, chiquita, sin volver a pedir
  // nada. Desaparecer de golpe haría dudar de si se guardó.
  if (respuesta) {
    return (
      <div className="mb-2.5 flex items-start gap-2.5 tarjeta border border-iris-borde bg-white">
        <span
          className={`mt-0.5 grid size-[18px] flex-none place-items-center rounded-[6px] ${
            respuesta === 'anotada' ? 'bg-verde' : 'bg-niebla-2'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
            {respuesta === 'anotada' ? (
              <path d="M5 13l4 4L19 7" />
            ) : respuesta === 'en_duda' ? (
              <path d="M12 17h.01M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.6" />
            ) : (
              <path d="M6 6l12 12M18 6L6 18" />
            )}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-niebla text-pretty">
            {respuesta === 'anotada'
              ? 'Anotado: te pasa.'
              : respuesta === 'en_duda'
                ? 'Queda cocinándose. Te la vuelvo a preguntar con más días.'
                : 'Listo, lo dejo de lado.'}{' '}
            <span className="text-niebla-2">{patron}</span>
          </p>

          {/* EL EXPERIMENTO VA ACÁ Y NO ANTES (28/07): primero confirmás que la
              relación te pasa, y recién entonces tiene sentido probar algo sobre
              ella. Ofrecerlo de entrada sería proponerte una prueba sobre algo
              que todavía no dijiste que fuera cierto.
              Solo con "me pasa": si la descartaste, no hay nada que probar. */}
          {respuesta === 'anotada' && experimento && (
            probando ? (
              // ⚠️ Este texto decía "más abajo, en «Lo que estás probando»" y dejó
              // de ser cierto el 30/07: los experimentos se mudaron a `/probando`.
              // Si se vuelven a mover, hay que tocar acá también.
              <p className="mt-2 font-mono text-[11px] font-semibold leading-snug text-verde text-pretty">
                Lo estás probando. En{' '}
                <Link href="/probando" className="underline">
                  Probando
                </Link>{' '}
                tenés dónde anotar lo que veas.
              </p>
            ) : (
              <div className="mt-2.5">
                <p className="text-[13px] leading-snug text-tinta text-pretty">
                  ¿Probamos algo? <span className="font-medium">{experimento}</span>
                </p>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={probar}
                  className="mt-1.5 h-[32px] rounded-[12px] bg-iris px-3.5 font-mono text-[12px] font-bold text-white disabled:opacity-60"
                >
                  Probar unos días
                </button>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-tinte mb-2.5 tarjeta border border-iris-borde">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-white shadow-[0_2px_8px_rgba(108,120,238,.16)] text-iris">
          {icono}
        </span>
        <span className={`ml-auto flex-none rounded-full px-2 py-[3px] font-mono text-[10px] font-semibold ${conf.clase}`}>
          {conf.texto}
        </span>
      </div>

      <p className="mb-2 text-[15.5px] font-medium leading-[1.35] text-tinta text-pretty">{patron}</p>

      {evidencia && (
        <p className="mb-3 font-mono text-[11px] leading-snug text-niebla text-pretty">{evidencia}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={() => responder('anotada')}
          className="h-[36px] flex-1 rounded-[11px] bg-iris font-mono text-[12.5px] font-bold text-white shadow-[0_4px_12px_rgba(108,120,238,.28)] disabled:opacity-60"
        >
          Me pasa
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => responder('descartada')}
          className="h-[36px] flex-1 rounded-[11px] border border-iris-borde bg-white/80 font-mono text-[12.5px] font-bold text-niebla disabled:opacity-60"
        >
          No me pasa
        </button>
        {/* ⚠️ "NO SÉ" ES UNA SALIDA, NO UNA TERCERA OPCIÓN DEL MISMO PESO, y por
            eso va más angosto y con borde punteado. Con los tres botones iguales
            el del medio se vuelve el cómodo y se toca por default: la app
            terminaría llena de "no sé" y sin aprender nada. Acá está para
            cuando de verdad no sabés. */}
        <button
          type="button"
          disabled={guardando}
          onClick={() => responder('en_duda')}
          className="h-[36px] flex-none rounded-[12px] border border-dashed border-niebla-2 px-3.5 font-mono text-[12.5px] font-bold text-niebla disabled:opacity-60"
        >
          No sé
        </button>
      </div>
    </div>
  );
}

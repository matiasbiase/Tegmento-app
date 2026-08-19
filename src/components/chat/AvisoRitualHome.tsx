'use client';

import { useEffect, useState } from 'react';
import { HojaRegistro } from '@/components/captura/HojaRegistro';
import { avisoDelHome, type AvisoEnHome } from '@/lib/avisos-ritual';
import type { EstadoRitual, LoCargado } from '@/lib/ritual';

/**
 * EL AVISO DEL RITUAL, COMO TARJETA EN EL HOME (05/08, pedido de Matías).
 *
 * *"Que aparezcan quizás como notificaciones adelante; por el momento que
 * aparezcan en el home, después vamos a hacer que salgan por fuera de la app."*
 *
 * ⚠️ NO ES EL PLAN B DE LA NOTIFICACIÓN: es donde se prueban los textos sin
 * depender de un build de Xcode. Ver el docstring de `lib/avisos-ritual.ts`.
 *
 * ── ⚠️ TRES COSAS QUE LO SEPARAN DE LA TARJETA QUE FRENA ────────────────────
 *
 * 1. **No tapa nada.** Va en el flujo del Home, no a pantalla completa. Podés
 *    scrollear por al lado y seguir con lo tuyo.
 * 2. **Se puede cerrar con la ✕**, y el cierre dura hasta que cambie el momento
 *    del día. No es "hasta mañana": si lo cerrás a la mañana, a la noche vuelve
 *    el de la noche, que pide otra cosa.
 * 3. **Se calla si la tarjeta ya pidió lo mismo.** Eso lo decide `avisoDelHome`
 *    con `frenoYaMostro`, que se lee del mismo `localStorage` que usa la tarjeta.
 */

/** La misma clave que escribe `TarjetaQueFrena`. Se LEE, nunca se escribe acá. */
const CLAVE_FRENA = 'tegmento_frena_visto';
/** Qué aviso cerró a mano, y en qué momento del día. */
const CLAVE_CERRADO = 'tegmento_aviso_cerrado';

export function AvisoRitualHome({
  estado,
  cargado,
  /** Qué dato pidió la tarjeta que frena en esta apertura, si pidió alguno. */
  pidioElFreno,
}: {
  estado: EstadoRitual;
  cargado: LoCargado;
  pidioElFreno: 'sueno' | 'animo' | null;
}) {
  const [aviso, setAviso] = useState<AvisoEnHome | null>(null);
  const [hoja, setHoja] = useState<'sueno' | 'animo' | null>(null);

  useEffect(() => {
    // ⚠️ LA HORA SE MIRA EN EL CLIENTE, no en el server. El server puede estar
    // en otra zona horaria que el teléfono —pasa apenas la app sale de la Mac—
    // y un aviso de "buenas noches" a las 3 de la tarde es peor que ninguno.
    const ahora = new Date();

    // Si la tarjeta que frena ya se mostró hoy, se sabe por su propia marca en
    // localStorage. Se lee acá y no se pasa desde el server porque ese estado es
    // de ESTE dispositivo, por decisión de la tarjeta (ver su docstring).
    let frenoHoy: 'sueno' | 'animo' | null = pidioElFreno;
    try {
      const crudo = localStorage.getItem(CLAVE_FRENA);
      const hoy = ahora.toISOString().slice(0, 10);
      if (crudo && !crudo.startsWith(hoy) && !crudo.includes(hoy)) frenoHoy = null;
    } catch {
      // sin localStorage se sigue con lo que dijo el server
    }

    const siguiente = avisoDelHome(estado, cargado, ahora.getHours(), frenoHoy);
    if (!siguiente) return;

    // ¿Lo cerró a mano en este mismo momento del día?
    try {
      const cerrado = localStorage.getItem(CLAVE_CERRADO);
      if (cerrado === `${ahora.toISOString().slice(0, 10)}:${siguiente.momento}`) return;
    } catch {
      // sin localStorage no se puede recordar el cierre: se muestra igual, que
      // es preferible a esconder el aviso para siempre.
    }

    setAviso(siguiente);
  }, [estado, cargado, pidioElFreno]);

  function cerrar() {
    if (!aviso) return;
    try {
      localStorage.setItem(CLAVE_CERRADO, `${new Date().toISOString().slice(0, 10)}:${aviso.momento}`);
    } catch {
      // no poder recordarlo no puede impedir cerrarlo
    }
    setAviso(null);
  }

  if (!aviso) return null;

  const esNoche = aviso.momento === 'noche';

  return (
    <>
      <div
        className="mt-2.5 flex items-start gap-2.5 tarjeta border border-iris-borde"
        style={esNoche ? { background: 'linear-gradient(135deg,#f4f2fd,#eceafe)' } : { background: '#fff' }}
        role="status"
      >
        <span
          className="grid size-[34px] flex-none place-items-center rounded-[11px] text-[16px]"
          style={{ background: esNoche ? 'var(--color-iris-soft)' : 'var(--color-oro-tint)' }}
          aria-hidden
        >
          {esNoche ? '🌙' : '☀️'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold tracking-[-0.1px] text-tinta">{aviso.titulo}</p>
          <p className="mt-0.5 text-[12.5px] leading-[1.4] text-niebla text-pretty">{aviso.cuerpo}</p>
          <div className="mt-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setHoja(aviso.hoja)}
              className="grad-iris rounded-[12px] px-3.5 py-[7px] font-mono text-[11.5px] font-bold text-white"
            >
              {esNoche ? 'Cerrarlo' : 'Marcarlo'}
            </button>
            {/* ⚠️ "Ahora no" pesa lo mismo que la ✕ y las dos hacen lo mismo: es
                la regla de la tarjeta que frena, que si una salida cuesta más que
                la otra el aviso deja de ofrecer y pasa a exigir. */}
            <button
              type="button"
              onClick={cerrar}
              className="rounded-[12px] border border-iris-borde bg-white px-3 py-[7px] font-mono text-[11.5px] font-semibold text-niebla"
            >
              Ahora no
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar el aviso"
          className="flex-none px-1 pt-0.5 font-mono text-[13px] text-niebla-2"
        >
          ✕
        </button>
      </div>

      {hoja && (
        <HojaRegistro
          tipo={hoja}
          onClose={() => setHoja(null)}
          onGuardado={() => {
            setHoja(null);
            setAviso(null);
          }}
        />
      )}
    </>
  );
}

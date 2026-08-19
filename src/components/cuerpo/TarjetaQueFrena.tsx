'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HojaRegistro, type TipoHoja } from '@/components/captura/HojaRegistro';

/**
 * LA TARJETA QUE TE FRENA (pedido 1.8, del 26/07).
 *
 * *"Pantalla completa con el anillo grande, 'te falta el sueño de anoche', y dos
 * salidas. Máximo una vez por día."*
 *
 * ── ⚠️ POR QUÉ ESTO PUEDE SALIR MAL, Y QUÉ LO SOSTIENE ──────────────────────
 *
 * Es lo único de toda la app que se pone ADELANTE sin que lo pidas. Todo lo demás
 * —los chips, los destacados, las preguntas del bot— espera a que mires. Una
 * pantalla completa que te frena es, por definición, la app interrumpiéndote.
 *
 * Cuatro límites la hacen tolerable, y sacarle cualquiera la convierte en la app
 * de hábitos con culpa que Matías dijo explícitamente que no quiere:
 *
 * 1. **UN TOPE DIARIO**, con distancia mínima entre apariciones y algo de azar.
 *    (Era "una sola por día" hasta el 04/08; ver la nota de los tres frenos.)
 * 2. **SOLO SI FALTA ALGO DE VERDAD.** Sin nada que decir, no aparece.
 * 3. **LAS DOS SALIDAS PESAN IGUAL.** "Ahora no" no es un `cancelar` chiquito
 *    abajo: es un botón del mismo tamaño. Si una salida cuesta más que la otra,
 *    la tarjeta deja de ofrecer y pasa a exigir.
 * 4. **NO DICE QUE ESTÁS MAL.** Dice qué falta, que es un hecho. "Te falta el
 *    sueño de anoche" describe un dato ausente; "no estás cuidándote" sería un
 *    juicio, y esa es la línea que la app no cruza en ningún lado.
 *
 * ⚠️ EL "UNA VEZ POR DÍA" VIVE EN localStorage Y NO EN `config`, a propósito: es
 * estado de INTERFAZ de este dispositivo, no un dato de Matías. Meterlo en la
 * base lo volvería parte de su historial y lo sincronizaría entre teléfonos,
 * cuando lo único que dice es "esta pantalla ya se mostró acá hoy".
 *
 * ⚠️ Y VA POR PORTAL. Es `fixed` a pantalla completa y el Home vive dentro de
 * `.flotar`, que deja un transform puesto: sin portal se mediría contra la caja
 * del contenido. Es el bug que mordió cinco veces entre el 31/07 y el 02/08.
 */

const CLAVE = 'tegmento_frena_visto';

/**
 * ── ⚠️ DE "UNA VEZ POR DÍA" A INTERMITENTE (04/08, pedido de Matías) ─────────
 *
 * *"Estaría bueno que estas tarjetas del día puedan ser varias veces al día y
 * que sean intermitentes cuando abrís la app."*
 *
 * Cambia la regla que 1.8 defendió dos veces, y es su decisión: la vio funcionar
 * y quiere más. **Pero la palabra que la salva es "intermitentes"**: no pidió
 * que aparezca siempre, pidió que aparezca A VECES. Eso no es lo mismo que sacar
 * el límite, y la diferencia es toda la función.
 *
 * Tres frenos, y los tres importan:
 *
 * 1. **TOPE DIARIO.** Más alto que uno, no infinito.
 * 2. ⚠️ **DISTANCIA MÍNIMA ENTRE APARICIONES.** Sin esto, abrir y cerrar la app
 *    dos veces seguidas la trae dos veces: eso no es un recordatorio, es acoso.
 *    Es el freno que más hace por que la función siga siendo tolerable.
 * 3. ⚠️ **NO APARECE EN CADA APERTURA AUNQUE CORRESPONDA.** Es lo que quiere
 *    decir "intermitente" y es lo menos obvio de programar: si con el cupo
 *    disponible apareciera siempre, sería una vez por apertura hasta agotar el
 *    tope — previsible y pesada. Con azar, no sabés cuándo viene, y por eso no
 *    se vuelve un peaje que aprendés a saltear.
 *
 * Si molesta, los tres números se mueven acá y en una línea.
 */
const TOPE_DIARIO = 3;
const MINUTOS_ENTRE = 90;
/** Probabilidad de aparecer cuando ya podría. Ver el punto 3 de arriba. */
const CHANCE = 0.5;

type Registro = { dia: string; veces: number; ultimo: number };

function leerRegistro(): Registro | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    // ⚠️ El formato viejo era la fecha pelada ("2026-08-04"). Si aparece, se
    // trata como "ya se mostró una vez hoy" en vez de romper: hay teléfonos con
    // ese valor guardado desde anoche.
    if (!crudo.startsWith('{')) return { dia: crudo, veces: 1, ultimo: 0 };
    const r = JSON.parse(crudo) as Registro;
    return typeof r?.dia === 'string' ? r : null;
  } catch {
    return null;
  }
}

export type LoQueFalta = {
  /** "el sueño de anoche", "cómo estuvo tu día". Se escribe después de "Te falta". */
  texto: string;
  hoja: TipoHoja;
  /** 0 a 1: cuánto del día está registrado. Es lo que dibuja el anillo. */
  progreso: number;
};

export function TarjetaQueFrena({ falta }: { falta: LoQueFalta | null }) {
  const [montado, setMontado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hoja, setHoja] = useState<TipoHoja | null>(null);

  useEffect(() => {
    setMontado(true);
    if (!falta) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const ahora = Date.now();
    try {
      const r = leerRegistro();
      const deHoy = r?.dia === hoy ? r : { dia: hoy, veces: 0, ultimo: 0 };

      if (deHoy.veces >= TOPE_DIARIO) return;
      if (ahora - deHoy.ultimo < MINUTOS_ENTRE * 60_000) return;
      // ⚠️ El azar va ÚLTIMO, después de los dos frenos duros: primero se
      // comprueba que PODRÍA aparecer, y recién ahí se tira la moneda. Al revés,
      // un "no" del azar gastaría el chequeo y la lógica quedaría ilegible.
      //
      // Y la primera del día NO se sortea: si abrís a la mañana con el sueño sin
      // cargar, ese es el momento en que la tarjeta sirve. La intermitencia es
      // para las siguientes.
      if (deHoy.veces > 0 && Math.random() > CHANCE) return;

      // Se marca AL MOSTRARLA, no al cerrarla: si se marcara al cerrar, salir de
      // la app sin tocar nada la traería de vuelta en la siguiente apertura.
      localStorage.setItem(
        CLAVE,
        JSON.stringify({ dia: hoy, veces: deHoy.veces + 1, ultimo: ahora } satisfies Registro),
      );
    } catch {
      // Sin localStorage (modo privado) no se muestra. Una tarjeta que frena y
      // no puede acordarse de que ya frenó es peor que ninguna.
      return;
    }
    setVisible(true);
  }, [falta]);

  if (!montado || !visible || !falta) return null;

  const R = 2 * Math.PI * 52;

  return createPortal(
    <>
      {/* ⚠️⚠️ MIENTRAS LA HOJA ESTÁ ABIERTA, ESTA CAPA NO SE DIBUJA. Sin el
          `!hoja`, tocar "Anotarlo" era un callejón sin salida: la hoja de
          registro se monta en `z-50` (ver `HojaRegistro`) y esta tarjeta vive en
          `z-70`, **así que la hoja se abría DEBAJO** y todos los toques le
          pegaban a la tarjeta. Se veía como que el botón no hacía nada, y "Ahora
          no" sí funcionaba —porque ese desmonta la tarjeta entera—, que es
          exactamente lo que reportó Matías el 05/08.

          ⚠️ Y NO SE ARREGLA SUBIÉNDOLE EL z A `HojaRegistro`: esa hoja se abre
          desde otros cuatro lugares (los anillos, las pastillas, el asistente,
          las señales) donde `z-50` está bien, y moverlo global la pondría encima
          de cosas que hoy la tapan a propósito. El que sobra es este overlay, y
          solo mientras la hoja está arriba.

          Al cerrar la hoja sin guardar, la tarjeta vuelve: sigue estando "Ahora
          no" a un toque, así que no es una trampa — es volver de donde entraste. */}
      {!hoja && (
      <div
        className="fixed inset-0 z-[70] mx-auto flex max-w-md flex-col justify-center px-[26px]"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, #f7f7fd 0%, #eceafe 70%, #e3e3f1 100%)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center">
          <div className="relative size-[132px]">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(108,120,238,.15)" strokeWidth="9" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="var(--color-iris)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(Math.min(1, Math.max(0, falta.progreso)) * R).toFixed(1)} ${R.toFixed(1)}`}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-serif text-[30px] font-semibold tracking-[-0.5px] text-iris-deep">
                {Math.round(Math.min(1, Math.max(0, falta.progreso)) * 100)}%
              </span>
            </div>
          </div>

          <h2 className="mt-7 text-center font-serif text-[24px] font-semibold tracking-[-0.4px] text-tinta text-balance">
            Te falta {falta.texto}
          </h2>
          {/* Un hecho y para qué sirve. Nada de "no estás cuidándote". */}
          <p className="mt-2 text-center text-[14.5px] leading-[1.45] text-tinta-soft text-pretty">
            Es de lo que más explica cómo venís. Un toque y sigo cruzándolo con el resto.
          </p>
        </div>

        {/* ⚠️ LAS DOS DEL MISMO TAMAÑO. Ver la nota de arriba: si "Ahora no" fuera
            un link chiquito, esto dejaría de ofrecer y pasaría a exigir. */}
        <div className="mt-9 flex gap-2.5">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="flex-1 rounded-[18px] border border-iris-borde bg-white py-3.5 font-mono text-[13px] font-semibold text-tinta-soft"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={() => setHoja(falta.hoja)}
            className="grad-iris flex-1 rounded-[16px] py-3.5 font-mono text-[13px] font-bold text-white"
          >
            Anotarlo
          </button>
        </div>
      </div>
      )}

      {hoja && (
        <HojaRegistro
          tipo={hoja}
          onClose={() => setHoja(null)}
          onGuardado={() => {
            setHoja(null);
            setVisible(false);
          }}
        />
      )}
    </>,
    document.body,
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { esNativo, programarRitual } from '@/lib/nativo';
import { guardarEstadoRitual, loCargadoHoy } from '@/lib/actions/ritual';
import {
  avisosDelRitual,
  comoTexto,
  desdeTexto,
  idsACancelar,
  type EstadoRitual,
} from '@/lib/ritual';

/**
 * EL RITUAL, EN PERFIL.
 *
 * Pedido de Matías del 26/07 —*"al final es lo más importante"*— y la parte que
 * faltaba: la fase 1 hizo que la Casa cambie según la hora, pero **seguía
 * dependiendo de que él abriera la app.** El problema medido es ese: 27 de 33
 * chats con un solo mensaje, 3 días marcados en total.
 *
 * ⚠️ ARRANCA APAGADO, Y NO ES POR PRUDENCIA: prender avisos sin que los pidas es
 * exactamente cómo una app deja de ser tuya. Se prende una vez, con una frase
 * que dice qué va a pasar.
 *
 * ⚠️ Y DICE EL LÍMITE EN VEZ DE ESCONDERLO. El aviso llega aunque la Mac esté
 * apagada —es local, lo dispara iOS— pero al tocarlo la app no abre, porque la
 * app vive en la Mac. Descubrir eso solo, a las 22:00, se vive como una promesa
 * incumplida; leerlo antes es un dato.
 */

export function RitualPerfil({ inicial }: { inicial: EstadoRitual }) {
  const [estado, setEstado] = useState<EstadoRitual>(inicial);
  const [nativo, setNativo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, empezar] = useTransition();

  useEffect(() => setNativo(esNativo()), []);

  function aplicar(siguiente: EstadoRitual) {
    setEstado(siguiente);
    setMsg(null);
    empezar(async () => {
      const limpio = await guardarEstadoRitual(siguiente);
      setEstado(limpio);

      // ⚠️ SE REPROGRAMA CONTRA LO QUE YA CARGASTE HOY, no a ciegas: si el sueño
      // de hoy ya está, el aviso de mañana se cancela en vez de programarse. Un
      // recordatorio para algo que ya hiciste enseña a ignorar los
      // recordatorios, y de eso no se vuelve.
      const cargado = await loCargadoHoy();
      const avisos = avisosDelRitual(limpio, cargado);
      const r = await programarRitual(avisos, idsACancelar(avisos));
      setMsg({ ok: r.ok, texto: r.mensaje });
    });
  }

  function cambiarHora(cual: 'manana' | 'noche', texto: string) {
    const h = desdeTexto(texto);
    if (!h) return;
    aplicar({ ...estado, [cual]: h });
  }

  return (
    <div className="tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-9 flex-none place-items-center rounded-[11px]"
          style={{ background: 'var(--color-oro-tint)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-oro)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-tinta">El ritual del día</p>
          <p className="mt-0.5 text-[12.5px] leading-[1.45] text-niebla text-pretty">
            A la noche cerrás el día; a la mañana marcás cuánto dormiste. Dos avisos, y nada más.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={estado.activo}
          aria-label="Prender el ritual del día"
          disabled={guardando}
          onClick={() => aplicar({ ...estado, activo: !estado.activo })}
          className={`mt-0.5 h-[26px] w-[44px] flex-none rounded-full p-[3px] transition-colors ${
            estado.activo ? 'bg-oro-2' : 'bg-[#dcdce8]'
          }`}
        >
          <span
            className={`block size-5 rounded-full bg-white shadow-sm transition-transform ${
              estado.activo ? 'translate-x-[18px]' : ''
            }`}
          />
        </button>
      </div>

      {estado.activo && (
        <div className="mt-3 flex gap-2 border-t border-[#f1f0f7] pt-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-mono text-[10.5px] font-bold tracking-[0.2px] text-niebla">
              A la mañana
            </span>
            <input
              type="time"
              value={comoTexto(estado.manana)}
              onChange={(e) => cambiarHora('manana', e.target.value)}
              className="h-10 w-full rounded-[12px] border border-iris-borde bg-papel-2 px-2.5 font-mono text-[14px] text-tinta outline-none focus:border-iris"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-mono text-[10.5px] font-bold tracking-[0.2px] text-niebla">
              A la noche
            </span>
            <input
              type="time"
              value={comoTexto(estado.noche)}
              onChange={(e) => cambiarHora('noche', e.target.value)}
              className="h-10 w-full rounded-[12px] border border-iris-borde bg-papel-2 px-2.5 font-mono text-[14px] text-tinta outline-none focus:border-iris"
            />
          </label>
        </div>
      )}

      {msg && (
        <p className={`mt-2.5 text-[12px] leading-[1.45] text-pretty ${msg.ok ? 'text-verde' : 'text-rosa'}`}>
          {msg.texto}
        </p>
      )}

      {/* ⚠️ LAS DOS ADVERTENCIAS QUE HAY QUE LEER ANTES, NO DESPUÉS. */}
      <p className="mt-2.5 border-t border-[#f1f0f7] pt-2.5 text-[11.5px] leading-[1.5] text-niebla text-pretty">
        {nativo ? (
          <>
            Los avisos los da el iPhone, así que <b className="text-tinta-soft">llegan aunque la Mac esté apagada</b>.
            Pero al tocarlos la app necesita la Mac prendida para abrir. Y si ya cargaste algo, ese aviso no
            aparece.
          </>
        ) : (
          <>
            Esto se prende desde la app del iPhone. En Safari se ve pero no se puede activar: el aviso lo tiene
            que dar el sistema del teléfono, no la página.
          </>
        )}
      </p>
    </div>
  );
}

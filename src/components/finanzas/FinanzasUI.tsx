'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { editarGasto, borrarGasto } from '@/lib/actions/gastos';
import { montoConSimbolo, montoConCodigo } from '@/lib/moneda';
import { IconLapiz } from '@/components/ui/iconos';

/**
 * GASTADO EN {MES}, CON LOS GASTOS ADENTRO.
 *
 * ⚠️ "ÚLTIMOS GASTOS" DEJÓ DE SER UNA SECCIÓN (04/08, maqueta
 * `2026-08-04-una-sola-pantalla.html`). Matías: *"lo ideal sería que todo entre
 * en una pantalla"*, y esto es lo primero que pidió aplicar de esa maqueta.
 *
 * ⚠️ PERO EL MOTIVO NO ES EL ESPACIO, Y ESO ES LO QUE LO HACE CORRECTO: **los
 * gastos SON el detalle de ese número**. Tenerlos en una tarjeta aparte los
 * presentaba como otra cosa y obligaba a leer dos títulos para entender que
 * hablaban de lo mismo. Si fuera solo por lugar, cualquier otro plegado servía
 * igual; acá el contenedor dice qué es lo que hay adentro.
 *
 * ⚠️ Y LOS DE ANTES NO SE PIERDEN. La flechita abre los del mes —que son los que
 * suman el número de arriba— y abajo queda una línea para ver los anteriores.
 * Mostrar todo mezclado rompería la promesa del título; esconderlos para siempre
 * borraría lo que ya habías anotado, que es peor que dos toques.
 */

export type GastoVista = {
  id: number;
  comercio: string | null;
  total: number | null;
  moneda: string | null;
  categoria: string | null;
  fecha: string; // etiqueta corta (ej "22/7")
  /** Si entra en el total de arriba. Lo decide la página con la fecha efectiva. */
  delMes: boolean;
};

const CAT_COLOR: Record<string, [string, string]> = {
  super: ['#eef0fe', '#4a56c8'],
  comida: ['#fbe7ec', '#c25571'],
  farmacia: ['#e3f1ec', '#3d9b80'],
  transporte: ['#faf0dd', '#b5762a'],
  ocio: ['#f0e9fb', '#7b5cd6'],
  otros: ['#eef0f4', '#6d6d87'],
};

function monto(total: number | null, moneda: string | null): string {
  return total == null ? 's/d' : montoConSimbolo(total, moneda);
}

export function FinanzasUI({
  gastos,
  mes,
  total,
  moneda,
}: {
  gastos: GastoVista[];
  /** "agosto", para el título. */
  mes: string;
  total: number;
  moneda: string;
}) {
  const router = useRouter();
  const [desplegado, setDesplegado] = useState(false);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [comercio, setComercio] = useState('');
  const [montoEd, setMontoEd] = useState('');

  const delMes = gastos.filter((g) => g.delMes);
  const anteriores = gastos.filter((g) => !g.delMes);
  const visibles = verAnteriores ? [...delMes, ...anteriores] : delMes;

  async function guardar(id: number) {
    const t = parseFloat(montoEd.replace(',', '.'));
    await editarGasto(id, { comercio, total: Number.isFinite(t) ? t : undefined });
    setEditId(null);
    router.refresh();
  }

  async function borrar(id: number) {
    setEditId(null);
    setAbierto(null);
    await borrarGasto(id);
    router.refresh();
  }

  return (
    <div className="mb-4 overflow-hidden rounded-[18px] bg-white sombra-card">
      {/* La cabecera ES el botón. La flechita no es un control aparte: el número
          y su detalle son la misma cosa, así que se toca donde se lee. */}
      <button
        type="button"
        onClick={() => setDesplegado((v) => !v)}
        aria-expanded={desplegado}
        className="flex w-full items-center gap-3 p-[18px_20px] text-left active:bg-[#f7f7fc]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">
            Gastado en {mes}
          </p>
          <p className="mt-1 font-serif text-[32px] font-semibold tracking-[-0.5px] text-tinta tabular-nums">
            {montoConCodigo(total, moneda)}
          </p>
          <p className="mt-0.5 text-[13px] text-niebla">
            {/* ⚠️ DECÍA "tickets" Y YA NO SON TICKETS (03/08): el gasto se cuenta
                hablando, así que llamarlos por el papel que ya no existe era
                nombrar la cosa por una puerta cerrada. */}
            {delMes.length} {delMes.length === 1 ? 'gasto' : 'gastos'} este mes
          </p>
        </div>
        {(delMes.length > 0 || anteriores.length > 0) && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-[18px] flex-none text-niebla-2 transition-transform duration-200 ${desplegado ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {desplegado && (
        <div className="border-t border-[#f1f0f7]">
          {visibles.length === 0 && (
            <p className="p-[16px_20px] text-[13px] leading-relaxed text-niebla text-pretty">
              Todavía no anotaste nada este mes. Agregá uno acá abajo, o contámelo en el chat
              (“gasté 40 en el súper”).
            </p>
          )}

          {visibles.map((g) => {
            const [bg, color] = CAT_COLOR[g.categoria ?? 'otros'] ?? CAT_COLOR.otros;
            const exp = abierto === g.id;
            return (
              <div key={g.id} className="border-b border-[#f1f0f7] last:border-none">
                {editId === g.id ? (
                  <div className="flex flex-col gap-2 p-[13px_16px]">
                    <input
                      value={comercio}
                      onChange={(e) => setComercio(e.target.value)}
                      placeholder="Comercio"
                      className="rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2 text-[16px] text-tinta outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        value={montoEd}
                        onChange={(e) => setMontoEd(e.target.value)}
                        inputMode="decimal"
                        placeholder="Total"
                        className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3 py-2 text-[16px] text-tinta outline-none"
                      />
                      <button type="button" onClick={() => guardar(g.id)} className="flex-none rounded-[12px] px-4 font-mono text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}>
                        OK
                      </button>
                      <button type="button" onClick={() => setEditId(null)} className="flex-none rounded-[12px] border border-iris-borde px-3 font-mono text-[12px] font-semibold text-niebla">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAbierto(exp ? null : g.id)} className="flex w-full items-center gap-3 p-[13px_16px] text-left active:bg-[#f7f7fc]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-tinta">{g.comercio ?? 'Gasto'}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-niebla">{g.fecha}</span>
                        {g.categoria && (
                          <span className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold" style={{ background: bg, color }}>
                            {g.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex-none font-serif text-[18px] font-semibold tabular-nums text-tinta">{monto(g.total, g.moneda)}</span>
                  </button>
                )}

                {/* ⚠️ ACÁ IBA EL TICKET DESMEMBRADO —la lista de items con su precio—
                    y se sacó a pedido de Matías (03/08): *"no es necesario que te lo
                    muestren y que esté esa función ahí, la podrías sacar"*.
                    Lo que queda es el total y el comercio, que es lo que se usa. La
                    columna `items` se sigue guardando: lo que se fue es el dibujo,
                    no el dato. */}
                {exp && editId !== g.id && (
                  <div className="px-[16px] pb-[14px]">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(g.id);
                          setComercio(g.comercio ?? '');
                          setMontoEd(g.total != null ? String(g.total) : '');
                        }}
                        aria-label={`Editar ${g.comercio ?? 'el gasto'}`}
                        className="flex items-center rounded-[12px] border border-iris-borde px-3 py-1.5 text-iris-deep"
                      >
                        <IconLapiz className="size-[14px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => borrar(g.id)}
                        className="rounded-[12px] border border-[#f0d0d8] px-3 py-1.5 font-mono text-[12px] font-semibold text-rosa"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Los de antes, a un toque. Sin esto, plegar los gastos adentro del
              mes habría borrado de la pantalla todo lo anotado hasta el 31. */}
          {anteriores.length > 0 && !verAnteriores && (
            <button
              type="button"
              onClick={() => setVerAnteriores(true)}
              className="w-full border-t border-[#f1f0f7] p-[11px_16px] text-center font-mono text-[11.5px] font-semibold text-iris-deep"
            >
              Ver los {anteriores.length} de antes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

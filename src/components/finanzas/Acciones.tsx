'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  actualizarPrecios,
  anotarCompra,
  borrarCompra,
  buscarPapeles,
  dejarDeSeguir,
  precioAMano,
  seguirPapel,
  type PapelVista,
} from '@/lib/actions/acciones';
import type { PapelBuscado } from '@/lib/precios';
import { haceCuantoLlego } from '@/lib/tiempo-relativo';
import { cantidadTotal, cartera, contraUltimaCompra, porCompra, promedio, resultado } from '@/lib/acciones';

/**
 * ACCIONES — UN SUBGRUPO DE FINANZAS, EN UNA SOLA PANTALLA.
 *
 * Aprobado por Matías el 04/08 (§0.13) con cuatro condiciones suyas, y las
 * cuatro están acá:
 *
 *  1. **No aconseja qué invertir.** *"Solo que sea un buscador y que puedas
 *     buscar uno que te interesa."*
 *  2. **Es un subgrupo, no una sección hermana.** *"Que no pague el de
 *     Finanzas."*
 *  3. **Una sola pantalla, adentro de Finanzas.** Sin ruta nueva, sin barra que
 *     cambie — la barra contextual (§0.14) era la otra solución al mismo
 *     problema y quedó descartada.
 *  4. **Cuánto ganás de CADA COMPRA**, en plata y en porcentaje, no solo del
 *     promedio.
 *
 * ── ⚠️ EL TÍTULO SE DISTINGUE POR FAMILIA, NO POR TAMAÑO ────────────────────
 *
 * "Finanzas" es serif grande; "Acciones" es mono chica, gris, en mayúsculas y
 * con una línea al lado. Bajarle el tamaño a un serif habría hecho que compitan
 * igual: se leerían como dos títulos del mismo tipo, uno más chico. Con otra
 * familia se lee como lo que es, una parte de lo de arriba.
 */

const fmt = (n: number, moneda: string | null) =>
  `${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda ?? ''}`.trim();

const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`;
const conSigno = (n: number, moneda: string | null) =>
  `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n), moneda)}`;

const claseSigno = (n: number) => (n >= 0 ? 'text-verde' : 'text-rosa');

// ⚠️ ACÁ VIVÍA `hace()`, UNA DE LAS DOS COPIAS QUE REDONDEABAN DISTINTO. Se fue
// a `lib/tiempo-relativo` el 11/08, junto con la de `Noticias.tsx`: las dos
// hacían lo mismo y **el mismo instante se contaba de dos maneras en dos
// pantallas** (floor contra round, "hace 3 días" contra "hace 3 d").
// El "sin traer" se queda ACÁ, que es donde significa algo: la cotización no se
// pudo pedir. La función común devuelve `null` y cada pantalla pone su excusa.

export function Acciones({ papeles }: { papeles: PapelVista[] }) {
  const router = useRouter();
  const [trabajando, empezar] = useTransition();
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<PapelBuscado[] | null>(null);
  const [buscandoAhora, setBuscandoAhora] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);

  // ⚠️ LA MONEDA SALE DE LOS PAPELES, NO DE UNA CONSTANTE. Un papel de Nueva
  // York cotiza en dólares aunque él piense en euros. El total solo se muestra
  // si TODOS comparten moneda — ver más abajo por qué no se convierte.
  const monedas = [...new Set(papeles.map((p) => p.moneda).filter(Boolean))] as string[];
  const monedaUnica = monedas.length === 1 ? monedas[0] : null;
  const total = cartera(papeles.map((p) => ({ simbolo: p.simbolo, nombre: p.nombre, precio: p.precio, compras: p.compras })));
  const hayCompras = papeles.some((p) => p.compras.length > 0);
  const ultimoPrecio = papeles.map((p) => p.precioFecha).filter(Boolean).sort().at(-1) ?? null;

  async function buscar() {
    if (consulta.trim().length < 2) return;
    setBuscandoAhora(true);
    const r = await buscarPapeles(consulta);
    setResultados(r);
    setBuscandoAhora(false);
  }

  return (
    <section className="mb-4">
      {/* El título de subgrupo: mono, gris, en mayúsculas, con la línea al lado. */}
      <div className="mb-2.5 flex items-center gap-2.5 px-0.5">
        <h3 className="font-mono text-[11px] font-bold tracking-[0.2px] text-niebla">Acciones</h3>
        <span className="h-px flex-1 bg-iris-borde" />
        <button
          type="button"
          onClick={() => setBuscando((v) => !v)}
          className="font-mono text-[11px] font-semibold text-iris-deep"
        >
          {buscando ? 'Cerrar' : 'Buscar'}
        </button>
      </div>

      {/* ── EL BUSCADOR ──────────────────────────────────────────────────────
          ⚠️ Escribís vos y sale lo que coincide. No hay lista de "las que te
          pueden interesar" ni orden por conveniencia: eso sería recomendar
          instrumentos financieros, que es la línea que Matías mismo confirmó
          (§0.13) y que en la UE necesita licencia. */}
      {buscando && (
        <div className="mb-3 tarjeta border border-iris-borde bg-white">
          <div className="flex gap-2">
            <input
              autoFocus
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void buscar()}
              placeholder="Nombre o símbolo (AAPL, Iberdrola…)"
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-papel-2 px-3 text-[15px] text-tinta outline-none focus:border-iris"
            />
            <button
              type="button"
              onClick={() => void buscar()}
              disabled={buscandoAhora || consulta.trim().length < 2}
              className="h-10 flex-none rounded-[12px] bg-oro-2 px-4 font-mono text-[12px] font-bold text-white disabled:opacity-40"
            >
              {buscandoAhora ? '…' : 'Buscar'}
            </button>
          </div>

          <p className="mt-2.5 rounded-[12px] bg-gris-tint p-[10px_12px] text-[11.5px] leading-[1.45] text-niebla text-pretty">
            Esto es un buscador, no una recomendación. Te muestro lo que coincide con lo que escribiste;
            cuál seguís lo elegís vos. <b className="text-tinta-soft">La app no aconseja en qué invertir.</b>
          </p>

          {resultados?.length === 0 && (
            <p className="mt-2.5 text-[12.5px] text-niebla">
              No encontré nada con eso. Probá con el símbolo (AAPL, IBE.MC) o revisá si hay internet.
            </p>
          )}

          {resultados && resultados.length > 0 && (
            <ul className="mt-1">
              {resultados.map((r) => (
                <li key={r.simbolo} className="flex items-center gap-2.5 border-b border-[#f1f0f7] py-2.5 last:border-none">
                  <span className="grid h-8 min-w-[44px] flex-none place-items-center rounded-[9px] bg-iris-soft px-1.5 font-mono text-[10.5px] font-extrabold text-iris-deep">
                    {r.simbolo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-semibold text-tinta">{r.nombre}</b>
                    <small className="font-mono text-[10.5px] text-niebla">
                      {[r.mercado, r.sector].filter(Boolean).join(' · ') || '—'}
                    </small>
                  </span>
                  <button
                    type="button"
                    disabled={trabajando || papeles.some((p) => p.simbolo === r.simbolo)}
                    onClick={() =>
                      empezar(async () => {
                        await seguirPapel(r);
                        setResultados(null);
                        setConsulta('');
                        setBuscando(false);
                        router.refresh();
                      })
                    }
                    className="flex-none rounded-full border border-iris-borde px-3 py-1.5 font-mono text-[11.5px] font-semibold text-iris-deep disabled:opacity-40"
                  >
                    {papeles.some((p) => p.simbolo === r.simbolo) ? 'Ya lo seguís' : 'Seguir'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {papeles.length === 0 ? (
        <button
          type="button"
          onClick={() => setBuscando(true)}
          className="flex w-full flex-col items-start gap-1 tarjeta border border-dashed border-niebla-2 bg-white/60 text-left"
        >
          <span className="text-[14.5px] font-semibold text-tinta">¿Tenés acciones?</span>
          <span className="text-[12.5px] leading-[1.4] text-niebla text-pretty">
            Anotá a cuánto las compraste y te digo a cuánto están hoy — contra tu promedio y contra tu
            última compra.
          </span>
        </button>
      ) : (
        <>
          {/* ── LO QUE TENÉS ────────────────────────────────────────────────
              ⚠️ SOLO SI TODOS LOS PAPELES COMPARTEN MONEDA. Sumar dólares con
              euros es el bug que hubo que arreglar en el gráfico de gastos el
              03/08; acá se prefiere no mostrar el total antes que mostrar uno
              que suma peras con manzanas. Convertir pediría otra fuente (el
              cambio del día) y otra decisión suya. */}
          {hayCompras && (
            <div className="mb-2.5 tarjeta bg-white sombra-card">
              <p className="font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Lo que tenés</p>
              {monedaUnica ? (
                <>
                  <p className="mt-1 font-serif text-[29px] font-semibold tracking-[-0.5px] text-tinta tabular-nums">
                    {fmt(total.valor, monedaUnica)}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-niebla">
                    <span className={claseSigno(total.euros)}>
                      {conSigno(total.euros, monedaUnica)} desde que compraste
                    </span>{' '}
                    · pagaste {fmt(total.puesto, monedaUnica)}
                  </p>
                  <p className="mt-2 border-t border-[#f1f0f7] pt-2 text-[12.5px] leading-[1.45] text-tinta-soft">
                    Si vendieras todo ahora: <b className="text-tinta">{fmt(total.valor, monedaUnica)}</b>, es decir{' '}
                    <b className={claseSigno(total.euros)}>{conSigno(total.euros, monedaUnica)}</b> ({pct(total.pct)}).
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[12.5px] leading-[1.45] text-niebla text-pretty">
                  Tus papeles cotizan en {monedas.join(' y ')}, así que no sumo un total: sería mezclar
                  monedas. Cada uno de abajo tiene su cuenta hecha en la suya.
                </p>
              )}
              {total.sinPrecio > 0 && (
                <p className="mt-1.5 text-[11.5px] text-niebla">
                  {total.sinPrecio === 1 ? 'Un papel quedó' : `${total.sinPrecio} papeles quedaron`} afuera de la
                  cuenta: todavía no tengo su precio.
                </p>
              )}
            </div>
          )}

          {/* ── TUS POSICIONES ──────────────────────────────────────────────── */}
          <div className="mb-2.5 overflow-hidden rounded-[18px] bg-white sombra-card">
            {papeles.map((p) => {
              const prom = promedio(p.compras);
              const res = resultado(p.compras, p.precio);
              const exp = abierto === p.id;
              return (
                <div key={p.id} className="border-b border-[#f1f0f7] last:border-none">
                  <button
                    type="button"
                    onClick={() => setAbierto(exp ? null : p.id)}
                    className="flex w-full items-center gap-2.5 p-[12px_15px] text-left active:bg-[#f7f7fc]"
                  >
                    <span className="grid h-8 min-w-[44px] flex-none place-items-center rounded-[9px] bg-iris-soft px-1.5 font-mono text-[10.5px] font-extrabold text-iris-deep">
                      {p.simbolo.split('.')[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-semibold text-tinta">{p.nombre}</b>
                      <small className="font-mono text-[10.5px] text-niebla">
                        {prom != null
                          ? `${cantidadTotal(p.compras).toLocaleString('es-AR', { maximumFractionDigits: 4 })} · prom. ${prom.toFixed(2)}`
                          : 'todavía sin compras anotadas'}
                      </small>
                    </span>
                    <span className="flex-none text-right">
                      <b className={`block font-mono text-[12.5px] font-bold tabular-nums ${res ? claseSigno(res.euros) : 'text-niebla'}`}>
                        {p.precio != null ? p.precio.toFixed(2) : 's/d'}
                      </b>
                      {res && (
                        <small className={`font-mono text-[10.5px] ${claseSigno(res.euros)}`}>
                          {conSigno(res.euros, null)} · {pct(res.pct)}
                        </small>
                      )}
                    </span>
                  </button>

                  {exp && <DetallePapel papel={p} />}
                </div>
              );
            })}
          </div>

          {/* ── EL PRECIO: DE DÓNDE SALE, Y CUÁNDO SE TRAJO ─────────────────
              ⚠️ LA FECHA VA AL LADO DEL BOTÓN A PROPÓSITO. Un precio sin fecha
              es la forma más fácil de mentir acá: si la fuente no contesta, lo
              último que se sabe puede ser de hace tres días y la cuenta seguiría
              teniendo cara de estar al día. */}
          <div className="mb-2.5 flex items-center gap-2 rounded-[18px] border border-iris-borde bg-white p-[10px_13px]">
            <p className="min-w-0 flex-1 font-mono text-[10.5px] leading-[1.4] text-niebla">
              Precios: {haceCuantoLlego(ultimoPrecio) ?? 'sin traer'}
            </p>
            <button
              type="button"
              disabled={trabajando}
              onClick={() =>
                empezar(async () => {
                  await actualizarPrecios();
                  router.refresh();
                })
              }
              className="flex-none rounded-full border border-iris-borde px-3 py-1.5 font-mono text-[11.5px] font-semibold text-iris-deep disabled:opacity-40"
            >
              {trabajando ? '…' : 'Actualizar'}
            </button>
          </div>

          {/* ⚠️ EL AVISO NO SE ESCONDE: es la pregunta que él hace en voz alta
              —"¿me conviene vender?"— y es justo la que la app no puede
              contestar. Es lo mismo que hace Alimentación cuando dice que
              todavía no cuenta proteína. */}
          <p className="rounded-[12px] bg-gris-tint p-[11px_13px] text-[11.5px] leading-[1.5] text-niebla text-pretty">
            No te puedo decir si conviene vender. Eso depende de cosas que no sé —tus impuestos, cuándo
            necesitás la plata, qué va a hacer el mercado—. Los números están para que decidas vos.
          </p>
        </>
      )}
    </section>
  );
}

/**
 * EL DETALLE DE UN PAPEL: cada compra con su ganancia, y las dos comparaciones.
 *
 * ⚠️ LAS DOS COMPARACIONES SON DISTINTAS Y VAN LAS DOS. Contra el promedio
 * contesta "¿gano con esto?"; contra la última compra contesta lo que él
 * preguntó textual: *"si vuelvo a comprar, ¿está más alto o más bajo?"*. Podés
 * estar arriba de una y abajo de la otra — ver el test que lo fija.
 */
function DetallePapel({ papel }: { papel: PapelVista }) {
  const router = useRouter();
  const [trabajando, empezar] = useTransition();
  const [anotando, setAnotando] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [precio, setPrecio] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  const prom = promedio(papel.compras);
  const filas = porCompra(papel.compras, papel.precio);
  const contraUltima = contraUltimaCompra(papel.compras, papel.precio);
  const contraProm = prom != null && papel.precio != null ? ((papel.precio - prom) / prom) * 100 : null;

  function guardar() {
    const c = Number(cantidad.replace(',', '.'));
    const p = Number(precio.replace(',', '.'));
    setError(null);
    empezar(async () => {
      const r = await anotarCompra({ papelId: papel.id, cantidad: c, precio: p, fecha });
      if (!r.ok) {
        setError(r.error ?? 'No se pudo.');
        return;
      }
      setCantidad('');
      setPrecio('');
      setAnotando(false);
      router.refresh();
    });
  }

  return (
    <div className="border-t border-[#f1f0f7] bg-papel-2 p-[13px_15px]">
      {filas.length > 0 && (
        <>
          <p className="mb-1.5 font-mono text-[10.5px] font-bold tracking-[0.2px] text-niebla">
            Tus compras
          </p>
          <ul className="mb-2.5">
            {filas.map((f) => (
              <li key={f.id} className="flex items-center gap-2 border-b border-[#eeedf6] py-2 last:border-none">
                <span className="min-w-0 flex-1">
                  <b className="block text-[13px] font-semibold text-tinta">
                    {f.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 4 })} a {f.precio.toFixed(2)}
                  </b>
                  <small className="font-mono text-[10.5px] text-niebla">{f.fecha.split('-').reverse().slice(0, 2).join('/')}</small>
                </span>
                <span className={`flex-none text-right font-mono text-[11px] font-semibold ${claseSigno(f.euros)}`}>
                  {conSigno(f.euros, papel.moneda)}
                  <small className="block font-normal">{pct(f.pct)}</small>
                </span>
                <button
                  type="button"
                  aria-label={`Borrar la compra del ${f.fecha}`}
                  onClick={() =>
                    empezar(async () => {
                      await borrarCompra(f.id);
                      router.refresh();
                    })
                  }
                  className="flex-none px-1 font-mono text-[11px] text-niebla-2"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {(contraProm != null || contraUltima != null) && (
            <p className="mb-2.5 text-[12.5px] leading-[1.45] text-tinta text-pretty">
              Hoy está{' '}
              {contraProm != null && (
                <>
                  <b className={claseSigno(contraProm)}>{pct(contraProm)}</b> de tu promedio
                </>
              )}
              {contraProm != null && contraUltima != null && ', y '}
              {contraUltima != null && (
                <>
                  <b className={claseSigno(contraUltima)}>{pct(contraUltima)}</b> de tu última compra
                </>
              )}
              .
            </p>
          )}
        </>
      )}

      {papel.compras.length > 0 && papel.precio == null && (
        <p className="mb-2.5 text-[12.5px] leading-[1.45] text-niebla text-pretty">
          Todavía no tengo el precio de hoy, así que no hay cuenta que hacer. Tocá “Actualizar” o
          ponelo a mano acá abajo.
        </p>
      )}

      {/* Anotar una compra. */}
      {anotando ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              autoFocus
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Cuántas"
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3 text-[15px] text-tinta outline-none focus:border-iris"
            />
            <input
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="A cuánto"
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3 text-[15px] text-tinta outline-none focus:border-iris"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Qué día la compraste"
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3 font-mono text-[13px] text-tinta outline-none focus:border-iris"
            />
            <button
              type="button"
              onClick={guardar}
              disabled={trabajando || !cantidad.trim() || !precio.trim()}
              className="h-10 flex-none rounded-[12px] bg-oro-2 px-4 font-mono text-[12px] font-bold text-white disabled:opacity-40"
            >
              {trabajando ? '…' : 'Anotar'}
            </button>
            <button
              type="button"
              onClick={() => { setAnotando(false); setError(null); }}
              className="flex-none px-1 font-mono text-[11px] font-semibold text-niebla-2"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-[12px] text-rosa">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnotando(true)}
            className="rounded-[12px] border border-iris-borde px-3 py-1.5 font-mono text-[11.5px] font-semibold text-iris-deep"
          >
            Anotar una compra
          </button>
          <input
            inputMode="decimal"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const n = Number(manual.replace(',', '.'));
              if (!(n > 0)) return;
              empezar(async () => {
                await precioAMano(papel.id, n);
                setManual('');
                router.refresh();
              });
            }}
            placeholder="Precio a mano"
            aria-label="Poner el precio de hoy a mano"
            className="h-8 w-[112px] rounded-[12px] border border-iris-borde bg-white px-2.5 text-[13px] text-tinta outline-none focus:border-iris"
          />
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Dejás de seguir ${papel.nombre}. Se borran también las compras que anotaste.`)) return;
              empezar(async () => {
                await dejarDeSeguir(papel.id);
                router.refresh();
              });
            }}
            className="ml-auto px-1 font-mono text-[11px] font-semibold text-niebla-2"
          >
            Dejar de seguir
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarAporte,
  borrarObjetivoPlata,
  crearObjetivoPlata,
  editarObjetivoPlata,
  pausarObjetivoPlata,
  quitarPortadaObjetivo,
  subirPortadaObjetivo,
} from '@/lib/actions/objetivo-plata';
import { FilaMenu, MenuFlotante } from '@/components/ui/MenuFlotante';
import {
  avance,
  cuandoLlegas,
  juntado,
  mesDe,
  ritmoMensual,
  ritmoNecesario,
  siApartaras,
  type Aporte,
} from '@/lib/objetivo-plata';
import { IconLapiz } from '@/components/ui/iconos';

/**
 * EL OBJETIVO ARRIBA DE TODO EN FINANZAS.
 *
 * Sale del mockup del 02/08 y de una crítica de Matías que reencuadró todo:
 * *"darle valor al usuario, no darle cosas para que haga"*. La pantalla no dice
 * "Finanzas": dice **el viaje a Japón**. La sección es el contenedor; lo que
 * mirás es tu cosa.
 *
 * ⚠️ LA SEGUNDA LÍNEA ES UNA RESPUESTA, NO UN DATO. *"A este ritmo llegás en
 * mayo"* contesta la pregunta con la que abriste la app. Un gráfico de barras no
 * contesta nada: te deja el trabajo a vos.
 *
 * ⚠️ Y LA PALANCA NO RECOMIENDA. Movés vos y la app hace la cuenta. Es la
 * diferencia entre *"gastás mucho en salidas"* (juicio, y en plata roza el
 * asesoramiento financiero que en la UE necesita licencia) y *"si apartaras 200,
 * sería enero"* (aritmética). Ver `lib/objetivo-plata.ts`.
 */

export type ObjetivoPlataVista = {
  id: number;
  titulo: string;
  montoMeta: number;
  moneda: string;
  arranco: string;
  /** Para cuándo lo querés. Sin esto no se puede decir cuánto por semana. */
  fechaMeta: string | null;
  /** Nombre del adjunto, o null. Ver `objetivos.portada` en el schema. */
  portada: string | null;
  aportes: Aporte[];
};

const fmt = (n: number, moneda: string) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${moneda}`;

export function ObjetivoPlata({ objetivo }: { objetivo: ObjetivoPlataVista }) {
  const router = useRouter();
  const [aportando, setAportando] = useState(false);
  const [monto, setMonto] = useState('');
  const [guardando, empezar] = useTransition();

  // Corregir y borrar (03/08). El menú va por portal —ver `MenuFlotante`—
  // porque esta tarjeta vive dentro de un `.flotar` y un desplegable normal
  // quedaría atrapado en su caja.
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [tituloEd, setTituloEd] = useState(objetivo.titulo);
  const [metaEd, setMetaEd] = useState(String(objetivo.montoMeta));

  // La portada (04/08). El input vive escondido y lo dispara el menú: un
  // `<input type=file>` visible en la cabecera habría sido un control más
  // compitiendo con el título, para algo que se toca una vez.
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  async function elegirFoto(archivo: File | undefined) {
    if (!archivo) return;
    setSubiendo(true);
    setErrorFoto(null);
    const fd = new FormData();
    fd.set('foto', archivo);
    const r = await subirPortadaObjetivo(objetivo.id, fd);
    setSubiendo(false);
    if (!r.ok) {
      setErrorFoto(r.error ?? 'No se pudo subir la foto.');
      return;
    }
    router.refresh();
  }

  const llevo = juntado(objetivo.aportes);
  const pct = avance(objetivo.aportes, objetivo.montoMeta);
  const ritmo = ritmoMensual(objetivo.aportes, objetivo.arranco);
  const llegada = cuandoLlegas(objetivo.aportes, objetivo, new Date());
  const listo = llevo >= objetivo.montoMeta;

  // La palanca arranca en el ritmo real redondeado, no en cero: mover una barra
  // desde tu propio número dice "y si fuera un poco más"; desde cero dice
  // "empezá de nuevo".
  const [simulado, setSimulado] = useState(() => Math.max(10, Math.round(ritmo / 10) * 10));
  const conPalanca = siApartaras(objetivo.aportes, objetivo, simulado, new Date());
  // Cuánto hay que apartar para llegar a la fecha, si hay fecha.
  const necesario = ritmoNecesario(objetivo.aportes, objetivo, objetivo.fechaMeta, new Date());

  function guardar() {
    const n = Number(monto.replace(',', '.'));
    if (!Number.isFinite(n) || n === 0) return;
    empezar(async () => {
      await agregarAporte(objetivo.id, n);
      setMonto('');
      setAportando(false);
      router.refresh();
    });
  }

  function guardarEdicion() {
    const n = Number(metaEd.replace(',', '.'));
    if (!tituloEd.trim() || !(n > 0)) return;
    empezar(async () => {
      await editarObjetivoPlata(objetivo.id, { titulo: tituloEd, montoMeta: n });
      setEditando(false);
      router.refresh();
    });
  }

  function pausar() {
    // ⚠️ SE AVISA ANTES, porque el objetivo desaparece de esta pantalla. Pausar
    // no pierde nada —queda entero en Objetivos, con su botón de reanudar— pero
    // desde acá no hay forma de volver a ponerlo en marcha, y un elemento que se
    // esfuma sin explicación se lee como que se borró.
    const va = window.confirm(
      `"${objetivo.titulo}" se va a guardar en pausa.\n\nSale de Finanzas hasta que lo reanudes desde Objetivos. Lo apartado no se toca.`,
    );
    if (!va) return;
    empezar(async () => {
      await pausarObjetivoPlata(objetivo.id);
      setMenuAbierto(false);
      router.refresh();
    });
  }

  function borrar() {
    // ⚠️ Se pregunta SOLO si ya hay aportes. Borrar un objetivo recién cargado
    // con el monto mal no tiene nada que perder, y una confirmación ahí es
    // fricción sobre el caso que motivó la función. Con plata apartada adentro
    // sí: eso es un registro real que no vuelve.
    if (objetivo.aportes.length > 0) {
      const va = window.confirm(
        `"${objetivo.titulo}" tiene ${objetivo.aportes.length} ${objetivo.aportes.length === 1 ? 'aporte anotado' : 'aportes anotados'}. Si lo borrás se van con él.\n\nPara dejarlo sin perder lo anotado, cerralo en vez de borrarlo.`,
      );
      if (!va) return;
    }
    empezar(async () => {
      await borrarObjetivoPlata(objetivo.id);
      setMenuAbierto(false);
      router.refresh();
    });
  }

  return (
    <div className="mb-4 overflow-hidden rounded-[20px] border border-iris-borde">
      {/* La cabecera con el color del apartado: entrar acá tiene que sentirse
          como entrar a otro lado, no como una tarjeta más del lavanda.

          ⚠️ CON FOTO, EL DEGRADÉ NO SE VA: se apoya ENCIMA. La foto entra por
          debajo y el degradé se vuelve un velo oscuro, así que el título y el
          monto siguen siendo blancos sobre algo oscuro pase lo que pase. Poner
          la foto sola habría dejado el texto a merced de la imagen —una playa
          clara y no se lee nada—, y eso convierte "ponele una foto" en "elegí
          una foto que funcione", que es una tarea, no una opción. */}
      <div
        className="relative bg-cover bg-center p-[16px_16px_18px] text-white"
        style={
          objetivo.portada
            ? {
                backgroundImage: `linear-gradient(150deg,#8a5518e6,#b5762acc 55%,#cf924399), url(/api/adjuntos/${objetivo.portada})`,
              }
            : { background: 'linear-gradient(150deg,#8a5518,#b5762a 55%,#cf9243)' }
        }
      >
        <div className="flex items-start">
          <p className="font-mono text-[10.5px] font-bold tracking-[0.2px] opacity-85">Objetivo</p>
          <button
            ref={menuRef}
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Opciones del objetivo"
            className="-mr-1 -mt-1.5 ml-auto flex size-7 flex-none items-center justify-center rounded-full text-white/80"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-[17px]">
              <circle cx="12" cy="5" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="12" cy="19" r="1.9" />
            </svg>
          </button>
        </div>

        {editando ? (
          /* Corregir en el lugar: el título y el monto se ven donde van a
             quedar, no en una pantalla aparte. */
          <div className="mt-1.5 flex flex-col gap-2">
            <input
              autoFocus
              value={tituloEd}
              onChange={(e) => setTituloEd(e.target.value)}
              aria-label="Para qué es el objetivo"
              className="w-full rounded-[12px] border border-white/35 bg-white/15 px-3 py-2 font-serif text-[18px] font-bold text-white outline-none placeholder:text-white/60 focus:border-white/70"
            />
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={metaEd}
                onChange={(e) => setMetaEd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && guardarEdicion()}
                aria-label={`Cuánto querés juntar (${objetivo.moneda})`}
                className="min-w-0 flex-1 rounded-[12px] border border-white/35 bg-white/15 px-3 py-2 font-mono text-[14px] text-white outline-none focus:border-white/70"
              />
              <button
                type="button"
                onClick={guardarEdicion}
                disabled={guardando || !tituloEd.trim() || !metaEd.trim()}
                className="h-9 flex-none rounded-[12px] bg-white px-3.5 font-mono text-[12px] font-bold text-[#8a5518] disabled:opacity-40"
              >
                {guardando ? '…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setTituloEd(objetivo.titulo);
                  setMetaEd(String(objetivo.montoMeta));
                }}
                className="flex-none px-1 font-mono text-[11px] font-semibold text-white/75"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mt-1 font-serif text-[24px] font-bold leading-[1.1] tracking-[-0.02em]">{objetivo.titulo}</h2>
            <p className="mt-2 font-mono text-[12px] opacity-90">
              <b className="text-[15px]">{fmt(llevo, objetivo.moneda)}</b> de {fmt(objetivo.montoMeta, objetivo.moneda)}
            </p>
            <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
          </>
        )}
      </div>

      {/* El input de la foto: escondido, lo abre la fila del menú. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void elegirFoto(e.target.files?.[0]);
          // Se limpia para que elegir DOS VECES la misma foto vuelva a disparar
          // el change — sin esto, corregir un intento fallido no hace nada.
          e.target.value = '';
        }}
      />

      {/* ── LOS TRES PUNTITOS, CON LAS CUATRO PUERTAS (04/08) ──────────────────
          De la maqueta `2026-08-04-una-sola-pantalla.html`: cambiar la foto,
          corregir el monto, ponerlo en pausa, borrarlo. Las dos últimas ya
          existían; lo que hace el pedido es juntarlas con la foto en un solo
          lugar, arriba a la derecha, que es donde en esta app ya significa
          "control" (el menú y la cruz viven ahí). */}
      <MenuFlotante abierto={menuAbierto} anclaRef={menuRef} onCerrar={() => setMenuAbierto(false)}>
        <FilaMenu
          primera
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-2h8.4l1.1 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
              <circle cx="12" cy="12.5" r="3.2" />
            </svg>
          }
          onClick={() => {
            setMenuAbierto(false);
            fileRef.current?.click();
          }}
        >
          {objetivo.portada ? 'Cambiar la foto' : 'Ponerle una foto'}
        </FilaMenu>
        {objetivo.portada && (
          <FilaMenu
            icono={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                <path d="M4 4l16 16M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-2h8.4l1.1 2h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-.4 1" />
              </svg>
            }
            onClick={() => {
              setMenuAbierto(false);
              empezar(async () => {
                await quitarPortadaObjetivo(objetivo.id);
                router.refresh();
              });
            }}
          >
            Sacar la foto
          </FilaMenu>
        )}
        <FilaMenu
          icono={
            <IconLapiz className="size-[15px]" />
          }
          onClick={() => {
            setEditando(true);
            setMenuAbierto(false);
          }}
        >
          Corregir el monto
        </FilaMenu>
        <FilaMenu
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
              <path d="M9.5 5v14M14.5 5v14" />
            </svg>
          }
          onClick={pausar}
        >
          Ponerlo en pausa
        </FilaMenu>
        <FilaMenu
          tono="alerta"
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          }
          onClick={borrar}
        >
          Borrarlo
        </FilaMenu>
      </MenuFlotante>

      {/* El estado de la subida. Va acá abajo y no sobre la foto: un cartel
          encima de la portada taparía justo lo que acabás de elegir. */}
      {(subiendo || errorFoto) && (
        <p
          className={`px-4 py-2 text-[12px] ${errorFoto ? 'bg-rosa-tint text-rosa' : 'bg-papel-2 text-niebla'}`}
          role="status"
        >
          {errorFoto ?? 'Subiendo la foto…'}
        </p>
      )}

      <div className="flex flex-col gap-2 bg-papel-2 p-2.5">
        {/* LA RESPUESTA. Los tres casos en que no hay fecha se dicen distinto:
            callarse acá dejaría la tarjeta sin su renglón principal. */}
        <div className="tarjeta border border-iris-borde bg-white">
          <p className="font-serif text-[17px] leading-[1.3] tracking-[-0.015em] text-tinta">
            {listo ? (
              <>Ya juntaste lo que te propusiste.</>
            ) : llegada ? (
              <>A este ritmo llegás <span className="text-oro">{mesDe(llegada)}</span>.</>
            ) : objetivo.aportes.length === 0 ? (
              <>Todavía no apartaste nada.</>
            ) : (
              <>Con este ritmo no se puede decir cuándo.</>
            )}
          </p>
          {ritmo > 0 && !listo && (
            <p className="mt-1 text-[12.5px] text-niebla">
              Venís apartando {fmt(ritmo, objetivo.moneda)} por mes.
            </p>
          )}

          {/* ── CUÁNTO POR SEMANA PARA LLEGAR A LA FECHA (06/08) ──────────────
              Matías: *"estaría bueno que sea inteligente y me diga, tendrías que
              ahorrar más o menos tanto por semana o por día"*.

              ⚠️ CONTESTA OTRA PREGUNTA QUE EL RENGLÓN DE ARRIBA, por eso va
              además y no en lugar de. Arriba: *"con lo que venís haciendo,
              ¿cuándo llego?"*. Acá: *"tengo fecha, ¿cuánto tengo que poner?"*.
              La segunda es la que se hace uno cuando el viaje ya tiene día.

              ⚠️ NO DICE "DEBERÍAS": dice lo que falta dividido en el tiempo que
              queda. La app no sabe qué entra ni qué podés recortar, así que un
              "deberías ahorrar" sería un consejo financiero sin los datos para
              darlo — la misma línea que ya cuidaba la palanca de abajo. */}
          {necesario && !necesario.cumplido && (
            <p className="mt-2 border-t border-[#f1f0f7] pt-2 text-[12.5px] leading-relaxed text-tinta-soft">
              {necesario.diasRestantes === 0 ? (
                <>La fecha ya pasó. Te faltan {fmt(necesario.falta, objetivo.moneda)}: podés correrla desde los tres puntitos.</>
              ) : (
                <>
                  Para llegar te faltan <b>{fmt(necesario.falta, objetivo.moneda)}</b> en {necesario.diasRestantes} días:
                  son <b className="text-iris-deep">{fmt(necesario.porSemana, objetivo.moneda)} por semana</b>
                  {necesario.porDia != null && <>, o {fmt(necesario.porDia, objetivo.moneda)} por día</>}.
                </>
              )}
            </p>
          )}
        </div>

        {/* LA PALANCA. Solo si hay algo que proyectar: sin aportes no hay ritmo
            del que partir, y una barra que arranca en la nada no simula nada. */}
        {!listo && objetivo.aportes.length > 0 && (
          <div className="tarjeta border border-iris-borde bg-white">
            <div className="mb-2 flex items-baseline">
              <b className="text-[13px] font-bold text-tinta">Si apartaras</b>
              <span className="ml-auto font-mono text-[13px] font-bold text-oro">
                {fmt(simulado, objetivo.moneda)}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={Math.max(60, Math.round(ritmo * 4))}
              step={10}
              value={simulado}
              onChange={(e) => setSimulado(Number(e.target.value))}
              aria-label="Cuánto apartarías por mes"
              className="w-full accent-[#b5762a]"
            />
            <p className="mt-1.5 text-[12.5px] text-niebla">
              {conPalanca ? (
                <>
                  Llegarías <b className="text-oro">{mesDe(conPalanca)}</b> en vez de{' '}
                  {llegada ? mesDe(llegada) : 'nunca'}.
                </>
              ) : (
                <>Con eso no alcanza para decir cuándo.</>
              )}
            </p>
          </div>
        )}

        {/* APARTAR. Un número y un toque: ver por qué el progreso se carga a mano
            y no se deduce de los gastos en `lib/objetivo-plata.ts`. */}
        {aportando ? (
          <div className="flex items-center gap-2 rounded-[18px] border border-iris-borde bg-white p-2">
            <input
              autoFocus
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              placeholder={`Cuánto apartaste (${objetivo.moneda})`}
              className="min-w-0 flex-1 rounded-[12px] border border-iris-borde px-3 py-2 text-[15px] text-tinta outline-none focus:border-iris"
            />
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || !monto.trim()}
              className="h-9 flex-none rounded-[12px] bg-oro-2 px-3.5 font-mono text-[12px] font-bold text-white disabled:opacity-40"
            >
              {guardando ? '…' : 'Sumar'}
            </button>
            <button
              type="button"
              onClick={() => { setAportando(false); setMonto(''); }}
              className="flex-none px-1 font-mono text-[11px] font-semibold text-niebla-2"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAportando(true)}
            className="flex items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-niebla-2 p-2.5 font-mono text-[12px] font-semibold text-niebla"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[13px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Aparté plata
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Alta de un objetivo de plata.
 *
 * ⚠️ SE MUESTRA SIEMPRE, HAYA O NO OBJETIVOS (03/08). Antes vivía en el `else`
 * de "¿hay alguno?" y este docstring decía *"cuando todavía no hay ningún
 * objetivo"* — o sea que **el límite de un solo objetivo estaba escrito acá**,
 * no en el render. Se podía crear el primero y nunca un segundo.
 *
 * `compacto` es lo único que cambia: sin objetivos es una tarjeta que explica
 * qué va a poder contestar; con objetivos arriba, esa explicación ya la leíste y
 * sobra — queda una fila fina, como "Aparté plata".
 */
export function CrearObjetivoPlata({
  compacto = false,
  moneda = '€',
}: {
  compacto?: boolean;
  moneda?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [meta, setMeta] = useState('');
  const [guardando, empezar] = useTransition();

  function crear() {
    const n = Number(meta.replace(',', '.'));
    if (!titulo.trim() || !(n > 0)) return;
    empezar(async () => {
      await crearObjetivoPlata({ titulo, montoMeta: n, moneda });
      setAbierto(false);
      setTitulo('');
      setMeta('');
      router.refresh();
    });
  }

  if (!abierto && compacto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-niebla-2 p-2.5 font-mono text-[12px] font-semibold text-niebla"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[13px]">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Otro objetivo
      </button>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mb-4 flex w-full flex-col items-start gap-1 tarjeta border border-dashed border-niebla-2 bg-white/60 text-left"
      >
        <span className="text-[14.5px] font-semibold text-tinta">¿Estás juntando para algo?</span>
        <span className="text-[12.5px] leading-[1.4] text-niebla text-pretty">
          Anotalo y te digo cuándo llegás al ritmo que vas.
        </span>
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-[18px] border border-iris-borde bg-white p-3">
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Para qué (ej: el viaje a Japón)"
        className="mb-2 h-11 w-full rounded-[12px] border border-iris-borde px-3 text-[15px] text-tinta outline-none focus:border-iris"
      />
      <div className="flex items-center gap-2">
        <input
          inputMode="decimal"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder={`Cuánto (${moneda})`}
          className="h-11 min-w-0 flex-1 rounded-[12px] border border-iris-borde px-3 text-[15px] text-tinta outline-none focus:border-iris"
        />
        <button
          type="button"
          onClick={crear}
          disabled={guardando || !titulo.trim() || !meta.trim()}
          className="h-11 flex-none rounded-[12px] bg-oro-2 px-4 font-mono text-[12px] font-bold text-white disabled:opacity-40"
        >
          {guardando ? '…' : 'Anotarlo'}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="flex-none px-1 font-mono text-[11px] font-semibold text-niebla-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

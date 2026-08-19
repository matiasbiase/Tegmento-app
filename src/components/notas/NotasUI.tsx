'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HojaElegirOCrear } from '@/components/ui/HojaElegirOCrear';
import { etiquetaFecha } from '@/lib/fechas';
import { BarraPestanas } from '@/components/ui/Apartados';
import { IconoNota } from '@/components/notas/IconoNota';
import {
  carpetasDe,
  DIAS_PAPELERA,
  filtrarNotas,
  ordenarNotas,
  resumenNota,
  seMuestra,
  tituloVisible,
  type Nota,
  type Orden,
} from '@/lib/notas';
import { PuertaPrivada, usarLlave } from '@/components/notas/PuertaPrivada';
import { piezasVisibles } from '@/lib/notas-contenido';
import { moverNota, restaurarNota } from '@/lib/actions/notas';

// LA BARRA DE ARRIBA ES DE FUNCIONES, NO DE ETIQUETAS (30/07). La primera
// versión de la maqueta tenía tags de color (Mudanza / Ideas / Suelto) y Matías
// la cortó: quería "un apartado rico" de notas, con lo que se hace con notas —
// nueva, recientes, carpetas, buscar, ordenar.
//
// ⚠️ NINGUNO DE ESTOS BOTONES ES DECORATIVO. Un botón que no hace nada es la
// versión de UI del bug que ya mordió dos veces en `carpetas.ts` (una acción
// escrita sin nadie que la llame). Los cinco filtran o navegan de verdad.

const Ico = {
  mas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" className="size-[17px]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  recientes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
      <path d="M3 3.5v5h5" />
      <path d="M3.6 13a9 9 0 1 0 1.3-5.2" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  ),
  carpeta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
      <path d="M3 7.5a2 2 0 0 1 2-2h3.6l2 2.4H19a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  buscar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[17px]">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  ordenar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[17px]">
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  ),
};

/** Una función de la barra: cuadradito blanco, o gradiente lila si es la primaria. */
function Fn({
  etiqueta,
  activo,
  primaria,
  onClick,
  href,
  children,
}: {
  etiqueta: string;
  activo?: boolean;
  primaria?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const clase = `grid size-[38px] flex-none place-items-center rounded-[12px] border transition-colors ${
    primaria
      ? 'grad-iris border-transparent text-white shadow-[0_4px_12px_rgba(108,120,238,.3)]'
      : activo
        ? 'border-iris bg-iris-soft text-iris-deep'
        : 'border-iris-borde bg-white text-iris/80'
  }`;

  if (href) {
    return (
      <Link href={href} aria-label={etiqueta} className={clase}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={etiqueta} aria-pressed={activo} onClick={onClick} className={clase}>
      {children}
    </button>
  );
}

export type NotaBorrada = { id: number; titulo: string; cuerpo: string; borrada: string };

export function NotasUI({
  notas,
  chatsPorNota = {},
  papelera = [],
}: {
  notas: Nota[];
  /** Cuántas charlas tiene cada nota, por id. Lo cuenta el server. */
  chatsPorNota?: Record<number, number>;
  /** Las que borraste y todavía se pueden recuperar. Ver `DIAS_PAPELERA`. */
  papelera?: NotaBorrada[];
}) {
  // La llave dura lo que dura la pestaña: al recargar vuelve a pedirse. Es lo
  // que uno espera de algo que está bajo llave, y hace que el caso real —dejar
  // el teléfono sobre la mesa— quede cubierto sin ningún trabajo extra.
  const { abierta, pidiendo, pedir, cerrar, confirmar } = usarLlave();
  const router = useRouter();
  const [orden, setOrden] = useState<Orden>('recientes');
  const [soloRecientes, setSoloRecientes] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState('');
  // `undefined` = todas las carpetas; `null` = las que no tienen ninguna.
  const [carpeta, setCarpeta] = useState<string | null | undefined>(undefined);
  const [etiqueta, setEtiqueta] = useState<string | undefined>(undefined);
  const [hoja, setHoja] = useState<'filtrar' | number | null>(null);

  const carpetas = useMemo(() => carpetasDe(notas), [notas]);

  // ⚠️ LAS ETIQUETAS SALEN DE LAS NOTAS, no de una lista aparte. Si viniera un
  // catálogo, una etiqueta que quedó sin notas seguiría ofreciéndose como filtro
  // y elegirla devolvería la lista vacía sin explicación.
  const todasLasEtiquetas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const n of notas) {
      for (const e of n.etiquetas ?? []) if (!vistas.has(e.toLowerCase())) vistas.set(e.toLowerCase(), e);
    }
    return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [notas]);

  const visibles = useMemo(
    () => ordenarNotas(filtrarNotas(notas, { texto, carpeta, etiqueta, soloRecientes, desbloqueado: abierta }), orden),
    [notas, texto, carpeta, etiqueta, soloRecientes, orden, abierta],
  );

  const filtrando = soloRecientes || carpeta !== undefined || etiqueta !== undefined || texto.trim() !== '';

  /**
   * ── GENERAL Y CARPETAS, COMO PESTAÑAS (06/08) ──────────────────────────────
   *
   * Matías: *"no puedas ver todas las carpetas que tenés; yo directamente las
   * mostraría en la pantalla, no como que te abre una tarjetita… que aparezca
   * General y Carpetas, y cuando vas a carpetas te aparecen todas"*.
   *
   * ⚠️ ANTES LAS CARPETAS VIVÍAN DETRÁS DE UNA HOJA que se abría desde un
   * ícono, y esa hoja mezclaba dos cosas: elegir una carpeta y crear una. De ahí
   * salían el *"ver todas"* y el *"agregar más"* al pie que él no entendía —
   * eran el encabezado y el pie de un formulario, no botones de la pantalla.
   * Las carpetas son un LUGAR donde están tus notas, no un filtro escondido.
   */
  const [vista, setVista] = useState<'general' | 'carpetas' | 'papelera'>('general');
  const [, arrancar] = useTransition();

  return (
    <div>
      <BarraPestanas
        apartados={[
          { clave: 'general', label: 'General', n: notas.length },
          { clave: 'carpetas', label: 'Carpetas', n: carpetas.length },
          // ⚠️ SOLO SI HAY ALGO ADENTRO. Una pestaña "Papelera" siempre visible
          // y siempre vacía le recuerda a alguien que puede borrar cosas, que es
          // justo lo contrario de lo que hace una papelera: existe para cuando
          // ya te equivocaste, no para invitarte a equivocarte.
          ...(papelera.length > 0 ? [{ clave: 'papelera' as const, label: 'Papelera', n: papelera.length }] : []),
        ]}
        elegida={vista}
        onElegir={setVista}
        className="mb-3"
      />

      {vista === 'papelera' ? (
        /* ── LA PAPELERA (06/08) ────────────────────────────────────────────
           Matías: *"tener un apartado de dónde están todas las que se borraron,
           y que duren una semana"*.
           ⚠️ Cada una dice CUÁNTO LE QUEDA, no cuándo se borró. "Hace 3 días"
           te hace hacer la cuenta; "quedan 4 días" es la información que
           importa, que es si llegás a rescatarla. */
        <div>
          {papelera.map((n) => {
            const dias = Math.max(
              0,
              DIAS_PAPELERA - Math.floor((Date.now() - new Date(n.borrada).getTime()) / 86_400_000),
            );
            return (
              <div
                key={n.id}
                className="mb-1.5 flex items-center gap-2 tarjeta border border-dashed border-niebla-2 bg-white/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-tinta-soft">{tituloVisible(n)}</p>
                  <p className="mt-[2px] font-mono text-[10.5px] text-niebla">
                    {dias === 0 ? 'se borra hoy' : `${dias} ${dias === 1 ? 'día' : 'días'} para recuperarla`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => arrancar(async () => { await restaurarNota(n.id); router.refresh(); })}
                  className="h-9 flex-none rounded-full px-2.5 font-mono text-[11px] font-semibold text-iris"
                >
                  Recuperar
                </button>
              </div>
            );
          })}
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-niebla">
            Se borran solas a los {DIAS_PAPELERA} días. Hasta entonces, no las lee nadie: siguen tan privadas como
            estaban.
          </p>
        </div>
      ) : vista === 'carpetas' ? (
        <div>
          {carpetas.length === 0 ? (
            <p className="tarjeta border border-dashed border-niebla-2 bg-white/60 text-[14px] leading-[1.45] text-tinta-soft">
              Todavía no tenés carpetas. Se crean solas cuando guardás una nota en una: tocá los tres puntitos de
              cualquier nota y elegí dónde va.
            </p>
          ) : (
            carpetas.map((c) => (
              <button
                key={c.nombre}
                type="button"
                onClick={() => {
                  setCarpeta(c.nombre);
                  setVista('general');
                }}
                className="mb-1.5 flex w-full items-center gap-3 rounded-[14px] border border-iris-borde bg-white p-[13px_14px] text-left"
              >
                <span className="flex-none text-iris">{Ico.carpeta}</span>
                {/* ⚠️ EL NOMBRE EN NEGRO Y EN MONO, como "Anotar rápido" del Home
                    (06/08, Matías: *"acá hay una carpeta que dice ideas y está
                    todo en gris; tenía que ser como el negro del título, como en
                    home donde dice anotar rápido"*). Es el mismo rótulo de grupo
                    de toda la app: **una carpeta no es una nota, es el nombre de
                    un montón**, y en gris se leía como una nota más. */}
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] font-semibold tracking-[0.4px] text-tinta">
                  {c.nombre}
                </span>
                <span className="flex-none font-mono text-[11px] text-niebla-2">{c.cuantas}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
      {/* ⚠️ CORRIDOS UN POCO A LA DERECHA (06/08, Matías: *"los cuatro
          botoncitos los movería un poco más a la derecha para que no empiecen
          en la misma línea, para que se entienda que hacen un saltito ahí, que
          el ojo no se frene"*).
          Alineados al borde exacto de las tarjetas de abajo, la fila se leía
          como el primer renglón de la lista en vez de como su mando. Dos
          píxeles y media pestaña de sangría alcanzan para que se separen. */}
      <div className="flex items-center gap-2 pb-[13px] pl-1.5 pt-0.5">
        <Fn etiqueta="Nueva nota" primaria href="/notas/nueva">
          {Ico.mas}
        </Fn>
        <Fn
          etiqueta="Solo las de esta semana"
          activo={soloRecientes}
          onClick={() => setSoloRecientes((v) => !v)}
        >
          {Ico.recientes}
        </Fn>
        {/* ⚠️ ACÁ ESTABA EL ÍCONO DE CARPETAS, que abría una hoja para elegir
            una. Se fue con la hoja: ahora las carpetas son una pestaña de
            arriba. **Un ícono en la barra y una pestaña para lo mismo serían dos
            puertas al mismo lugar**, que es la regla que esta app viene
            aplicando desde el 30/07 (dos íconos, un destino). */}
        <Fn
          etiqueta="Buscar en las notas"
          activo={buscando}
          onClick={() => {
            // Al cerrar la búsqueda se limpia el texto: si no, quedaba filtrando
            // por algo escrito hace rato con el campo escondido y la lista corta
            // sin explicación visible.
            setBuscando((v) => !v);
            if (buscando) setTexto('');
          }}
        >
          {Ico.buscar}
        </Fn>
        <Fn
          etiqueta={orden === 'recientes' ? 'Ordenar por título' : 'Ordenar por fecha'}
          activo={orden === 'alfabetico'}
          onClick={() => setOrden((o) => (o === 'recientes' ? 'alfabetico' : 'recientes'))}
        >
          {Ico.ordenar}
        </Fn>
      </div>

      {buscando && (
        <input
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar en las notas…"
          className="mb-2.5 h-11 w-full rounded-[12px] border border-iris-borde bg-white px-3.5 text-[15px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
        />
      )}

      {/* ── LA FILA DE ETIQUETAS (04/08) ──────────────────────────────────────
          ⚠️ VA A LA VISTA Y NO ADENTRO DE LA HOJA DE FILTROS, al revés que las
          carpetas. Y es por lo que él dijo del problema: las notas "están como
          medias vacías" — una lista de títulos grises todas iguales. Las
          etiquetas a la vista son lo que le da color y forma a la lista, no un
          filtro más escondido detrás de un ícono.
          Si no hay ninguna, la fila no existe: un carril vacío es peor que nada. */}
      {todasLasEtiquetas.length > 0 && (
        <div className="-mx-[22px] mb-2.5 flex gap-1.5 overflow-x-auto px-[22px] pb-1">
          {todasLasEtiquetas.map((e) => {
            const puesta = etiqueta?.toLowerCase() === e.toLowerCase();
            return (
              <button
                key={e}
                type="button"
                onClick={() => setEtiqueta(puesta ? undefined : e)}
                aria-pressed={puesta}
                className={`flex-none rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ${
                  puesta ? 'bg-iris text-white' : 'bg-iris-soft text-iris-deep'
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      )}

      {/* Qué filtro está puesto, en palabras. Sin este renglón, "solo recientes"
          y una carpeta elegida solo se notaban por el borde del botón. */}
      {filtrando && (
        <div className="mb-2.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-niebla">
            {[
              carpeta === undefined ? null : carpeta === null ? 'sin carpeta' : carpeta,
              etiqueta ?? null,
              soloRecientes ? 'de esta semana' : null,
              orden === 'alfabetico' ? 'por título' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'buscando'}
            {` — ${visibles.length} ${visibles.length === 1 ? 'nota' : 'notas'}`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSoloRecientes(false);
              setCarpeta(undefined);
              setEtiqueta(undefined);
              setTexto('');
              setBuscando(false);
              setOrden('recientes');
            }}
            className="flex-none font-mono text-[11px] font-semibold text-iris"
          >
            limpiar
          </button>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="tarjeta border border-dashed border-niebla-2 bg-white/60">
          <p className="text-[14px] leading-[1.45] text-tinta-soft text-pretty">
            {notas.length === 0
              ? 'Todavía no escribiste ninguna. Acá no lee nadie: es para lo que no querés contarle a nada.'
              : 'Ninguna nota entra en ese filtro.'}
          </p>
        </div>
      ) : (
        visibles.map((n) => (
          <div
            key={n.id}
            /* ⚠️ PAPEL, NO VIDRIO (11/08, pedido de Matías: *"para las notas
               podés usar ese granulado también"*). Y es el caso más claro del
               material: el vidrio se mira, **el papel se escribe**, y una nota
               es literalmente donde escribís. De todas las superficies de la
               app, esta es la que más lo merece. */
            className="papel mb-2 flex items-start gap-2 rounded-[14px] border border-iris-borde bg-white p-[12px_14px]"
          >
            {/* ⚠️ LA FILA TAPADA NO ES UN LINK. Si lo fuera, tocarla abriría la
                nota y la llave sería un adorno. Es un botón que pide el PIN, y
                recién con la llave abierta la fila vuelve a ser una nota. */}
            {!seMuestra(n, abierta) ? (
              <button type="button" onClick={pedir} className="min-w-0 flex-1 text-left">
                <p className="mb-[3px] flex items-center gap-1.5 truncate text-[14.5px] font-semibold text-niebla">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px] flex-none">
                    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
                  </svg>
                  {tituloVisible(n)}
                </p>
                {/* Ni fecha ni carpeta: cuándo la escribiste y dónde la guardaste
                    también dicen algo de ella. */}
                <p className="font-mono text-[10px] text-niebla-2">Tocá para abrirla</p>
              </button>
            ) : (
            <Link href={`/notas/${n.id}`} className="min-w-0 flex-1">
              {/* ⚠️ EL EMOJI VA PEGADO AL TÍTULO Y NO EN SU PROPIA COLUMNA
                  (04/08). En columna, las notas sin emoji quedarían con un hueco
                  alineado a la izquierda y la lista se vería rota justo en las
                  que no lo usan, que son la mayoría. Pegado, la que no tiene
                  simplemente empieza por su título. */}
              <p className="mb-[3px] truncate text-[14.5px] font-semibold text-tinta">
                {/* ⚠️ Puede ser una clave de ícono (lo nuevo) o un emoji viejo:
                    `IconoNota` resuelve los dos, así que la lista no tiene que
                    saber cuál es cuál. Ver `IconoNota.tsx`. */}
                {n.emoji ? (
                  <span className="mr-1.5 inline-flex translate-y-[2px] text-iris-deep">
                    <IconoNota valor={n.emoji} className="size-[14px]" />
                  </span>
                ) : null}
                {tituloVisible(n, abierta)}
              </p>
              {n.cuerpo.trim() && (
                <p className="line-clamp-2 text-[12.5px] leading-[1.4] text-niebla">{resumenNota(n.cuerpo)}</p>
              )}
              {/* ⚠️ LOS CHIPS VAN EN LA FILA, y esto es la mitad del pedido: él
                  dijo que las notas "están como medias vacías". Una etiqueta que
                  solo se ve al abrir la nota no arregla una lista que se ve
                  vacía — hay que verla sin entrar. */}
              {(n.etiquetas ?? []).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(n.etiquetas ?? []).map((e) => (
                    <span key={e} className="rounded-full bg-gris-tint px-[7px] py-[2px] font-mono text-[10px] font-semibold text-tinta-soft">
                      {e}
                    </span>
                  ))}
                </div>
              )}
              {/* ── QUÉ TIENE ADENTRO ────────────────────────────────────────
                  Ícono y número, sin la palabra (31/07, pedido de Matías:
                  *"reemplazá lo que puedas con íconos donde hay mucho texto"*).
                  El globito ya dice que son charlas.
                  ⚠️ La nota que es solo texto no muestra nada: ver `piezasVisibles`.
                  Y la fecha se corre a la derecha en la misma línea, así la fila
                  no crece un renglón por tener una charla adentro. */}
              <div className="mt-1.5 flex items-center gap-1.5">
                {piezasVisibles(n, chatsPorNota[n.id] ?? 0, abierta).map((p) => (
                  <span
                    key={p.tipo}
                    className="inline-flex items-center gap-[3.5px] rounded-full border border-[#6c78ee33] bg-iris-soft px-[7px] py-[3px] text-[10.5px] font-bold text-iris-deep"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
                      <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
                    </svg>
                    {p.cuantas}
                  </span>
                ))}
                <p className="ml-auto font-mono text-[10px] text-niebla-2">
                  {etiquetaNota(n.actualizado)}
                  {n.carpeta ? ` · ${n.carpeta}` : ''}
                </p>
              </div>
            </Link>
            )}
            {/* Mover a carpeta: fuera del Link, si no tocarlo abriría la nota. */}
            <button
              type="button"
              aria-label={`Mover "${tituloVisible(n, abierta)}" a una carpeta`}
              onClick={() => setHoja(n.id)}
              className="mt-0.5 flex-none rounded-[9px] p-1 text-niebla-2"
            >
              {Ico.carpeta}
            </button>
          </div>
        ))
      )}

        </>
      )}

      {hoja === 'filtrar' && (
        <HojaElegirOCrear
          titulo="Ver una carpeta"
          subtitulo="Solo las notas que guardaste ahí"
          items={carpetas.map((c) => ({ id: c.nombre, nombre: c.nombre, cuantas: c.cuantas }))}
          renderFinal={(c) => <span className="flex-none font-mono text-[11px] text-niebla-2">{c.cuantas}</span>}
          quitar={carpeta !== undefined ? { etiqueta: 'Ver todas', accion: () => setCarpeta(undefined) } : undefined}
          placeholderNuevo="Nombre de la carpeta"
          textoNuevo="Ver las que no tienen carpeta"
          onElegir={(c) => setCarpeta(String(c.id))}
          // Acá "crear" no crea nada: una carpeta nace cuando una nota se mueve a
          // ella (ver `carpetasDe`). Se aprovecha la fila de abajo de la hoja para
          // el único filtro que falta: las que no tienen carpeta.
          onCrear={() => setCarpeta(null)}
          onCerrar={() => setHoja(null)}
        />
      )}

      {typeof hoja === 'number' && (
        <HojaElegirOCrear
          titulo="Guardar en una carpeta"
          subtitulo={tituloVisible(notas.find((n) => n.id === hoja) ?? { titulo: '' })}
          items={carpetas.map((c) => ({ id: c.nombre, nombre: c.nombre, cuantas: c.cuantas }))}
          renderFinal={(c) => <span className="flex-none font-mono text-[11px] text-niebla-2">{c.cuantas}</span>}
          quitar={
            notas.find((n) => n.id === hoja)?.carpeta
              ? {
                  etiqueta: 'Sacarla de la carpeta',
                  accion: async () => {
                    await moverNota(hoja, null);
                    router.refresh();
                  },
                }
              : undefined
          }
          placeholderNuevo="Nombre de la carpeta"
          textoNuevo="Carpeta nueva"
          onElegir={async (c) => {
            await moverNota(hoja, String(c.id));
            router.refresh();
          }}
          onCrear={async (nombre) => {
            await moverNota(hoja, nombre);
            router.refresh();
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {pidiendo && <PuertaPrivada onAbrir={confirmar} onCerrar={cerrar} />}
    </div>
  );
}

/**
 * "Hoy · 09:40", "Ayer", "Lun 28".
 *
 * `etiquetaFecha` devuelve solo la hora cuando es de hoy, y una hora suelta no
 * dice de cuándo es. Mismo parche que ya hace el menú lateral con los chats.
 */
function etiquetaNota(iso: string): string {
  const e = etiquetaFecha(iso);
  return /^\d{2}:\d{2}$/.test(e) ? `Hoy · ${e}` : e;
}

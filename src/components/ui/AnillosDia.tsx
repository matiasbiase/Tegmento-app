'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cargarAnillosElegidos, guardarAnillosElegidos } from '@/lib/layout-anillos';

// "Hoy" como UN objeto que se va llenando: anillos concéntricos, uno por cosa
// que podés cargar, con relleno PARCIAL (idea de Matías, estilo Apple).
//
// ── Decisiones que conviene no volver a discutir ──────────────────────────────
//
// 0. QUÉ ENTRA ACÁ: solo lo que se CIERRA UNA VEZ POR DÍA (ánimo, sueño,
//    actividades). Lo que se carga varias veces o cuando pinta —comida, cómo
//    venís, ticket, idea— vive en los chips de "Anotar rápido", a un toque.
//    El criterio no es "lo importante", es "lo que se cierra".
//
// 1. LA RUEDITA VA ADENTRO DE LA TARJETA, ARRIBA A LA DERECHA. Tres intentos:
//    flotando sobre la lista (las filas se angostaban y cortaban el texto:
//    "Activid." en vez de "Actividades"); en un encabezado propio, afuera
//    ("la ruedita está medio lejos" — un control a 40px de lo que modifica no se
//    lee como suyo); y debajo del anillo, que fue lo que rompió lo de abajo.
//
//    ⚠️ DEBAJO DEL ANILLO NO PUEDE IR, aunque ahí sobre lugar: le suma 32px de
//    alto a la columna del dibujo, y como la leyenda se centra CONTRA ESA
//    COLUMNA, quedaba 16px más abajo que el aro (29/07, Matías: *"cuando son
//    tres queda desalineado con la rueda"*). En la esquina no mide: la columna
//    vuelve a medir lo que mide el dibujo y la leyenda queda centrada con él,
//    sean tres o cuatro.
//    El precio es `pr-8` en la columna de la leyenda para que ningún valor pase
//    por debajo de la ruedita. Es el mismo padding para todas las filas, así que
//    se lee como una columna más angosta y no como un escalón.
//    En el encabezado queda el título con "Ver todo", el mismo patrón que
//    "Estás siguiendo · Ver todas".
//
// 2. NO HAY FLECHA DE PLEGAR (29/07, Matías: *"sacá la flechita; la idea es que
//    cuando tocás la ruedita ponés cuál querés ver o no"*). Eran dos controles
//    para lo mismo: uno escondía a la mitad y el otro elegía cuáles. Con la
//    ruedita alcanza, y lo que elegiste se ve entero, siempre.
//
// 3. El tamaño sigue a la cantidad: hasta tres van apaisados (anillo al costado
//    de las filas, alturas iguales, sin hueco muerto); de cuatro en adelante se
//    apila, con el anillo grande y centrado. CON `pie` va SIEMPRE apaisado:
//    cuatro filas de leyenda entran justo al lado del dibujo, y abajo quedan
//    los botones de carga a lo ancho de la tarjeta.
//
// 4. El anillo NO es el área tocable — 11px de ancho es un blanco imposible con
//    el dedo. El dibujo muestra el estado; las filas son los botones.
//
// 5. El relleno mide CUÁNTO REGISTRASTE, no qué tan bien te fue. Si midiera el
//    valor, un día de bajón sería un anillo casi vacío: un día malo se vería
//    como un día fallado. Dormiste 4h y lo anotaste → anillo lleno, y "4h00" en
//    el texto. El anillo premia anotar; el valor lo cuenta el número.
//
// 6. El color del primero es el del mood (cambia si estás genial o de bajón) y
//    los demás son fijos. Por eso la paleta tuvo que hacerse sistema: ver la
//    nota en globals.css.

export type AnilloDia = {
  etiqueta: string;
  /** Tono vivo: el anillo y el puntito. */
  color: string;
  /** El mismo hue oscurecido: el valor, que es texto chico sobre blanco. */
  deep: string;
  /** 0..1 — cuánto de esa área está registrada hoy. */
  progreso: number;
  /** "Bien", "6h30", "2 de 3". null = todavía no cargaste nada. */
  valor: string | null;
  /** Qué pasa si la tocás cuando está vacía. "Sumar +" no decía nada; el verbo
      de cada una sí ("Contar", "Anotar", "Marcar"). */
  accion?: string;
};

/** Radios de afuera hacia adentro, en un viewBox de 112, según cuántos haya. */
const RADIOS: Record<number, number[]> = {
  1: [48],
  2: [48, 31],
  3: [48, 33, 18],
  4: [48, 35.5, 23, 10.5],
};
const TRAZO: Record<number, number> = { 1: 13, 2: 12, 3: 11, 4: 9 };

/** Destellos de un anillo cerrado: [ángulo, escala, opacidad]. Tamaños y
 *  opacidades distintas para que parezca un brillo y no una guarda regular. */
const DESTELLOS: [number, number, number][] = [
  [-90, 1, 0.95],
  [-18, 0.62, 0.75],
  [46, 0.8, 0.6],
  [128, 0.55, 0.7],
  [196, 0.75, 0.5],
];

export function AnillosDia({
  anillos,
  onElegir,
  brillos = false,
  disabled = false,
  verTodo,
  soloVer = false,
  pie,
}: {
  anillos: AnilloDia[];
  onElegir: (i: number) => void;
  /** Los puntitos de calcomanía: solo cuando el ánimo es "genial". */
  brillos?: boolean;
  disabled?: boolean;
  /** Adónde lleva "Ver todo" en el encabezado. Sin esto no se muestra. */
  verTodo?: { href: string; etiqueta?: string };
  /**
   * EL DIBUJO GRANDE Y APILADO, con las filas propias apagadas.
   *
   * Es el modo de la pantalla Cuerpo: ahí las filas las pone `pie` (las
   * pastillas del cuerpo), que además de mostrar el valor son el botón para
   * cargar. Sin `pie`, `soloVer` deja la tarjeta con el anillo solo.
   */
  soloVer?: boolean;
  /**
   * Lo que va DENTRO de la tarjeta, DEBAJO del anillo y su leyenda, a lo ancho
   * entero: los botones para cargar (las pastillas del cuerpo).
   *
   * Recibe qué anillos se están viendo, porque de eso depende cuánto dice cada
   * botón: **si el dato ya está en la leyenda de arriba, el botón muestra solo
   * el `+`**; si no está representado en ningún aro, lo muestra él.
   * Por eso es una función y no un nodo: la elección vive acá adentro (es
   * localStorage) y tiene que llegarle al pie sin que se desincronicen.
   */
  pie?: (visibles: Set<string>) => React.ReactNode;
}) {
  // Se leen después de montar: en el server no hay localStorage, y arrancar con
  // otra cosa que el default rompería la hidratación.
  const [elegidos, setElegidos] = useState<string[] | null>(null);
  const [editando, setEditando] = useState(false);
  useEffect(() => {
    setElegidos(cargarAnillosElegidos());
  }, []);

  // Lo que elegiste, en el orden en que llegan (no en el que los tocaste).
  // Se ven TODOS los elegidos: ya no hay plegado (ver la nota 2).
  const visibles = elegidos ? anillos.filter((a) => elegidos.includes(a.etiqueta)) : anillos;

  const radios = RADIOS[visibles.length] ?? RADIOS[4];
  const trazo = TRAZO[visibles.length] ?? 9;
  const apilado = pie ? false : soloVer || visibles.length > 3;

  function alternarElegido(etiqueta: string) {
    const base = elegidos ?? anillos.map((a) => a.etiqueta);
    const nuevo = base.includes(etiqueta) ? base.filter((e) => e !== etiqueta) : [...base, etiqueta];
    if (nuevo.length === 0) return; // al menos uno tiene que quedar
    setElegidos(nuevo);
    guardarAnillosElegidos(nuevo);
  }

  return (
    <div className="mb-5">
      {/* Encabezado: título a la izquierda y "Ver todo" a la derecha, EXACTAMENTE
          el mismo patrón que "Estás siguiendo · Ver todas". Los controles de la
          tarjeta (engranaje y flecha) ya no viven acá: ver la nota 1. */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-serif text-[19px] font-semibold tracking-[-0.2px] text-tinta">Hoy</h2>
        {verTodo && !editando && (
          <Link
            href={verTodo.href}
            className="flex h-9 flex-none items-center gap-1 rounded-full px-2 font-mono text-[11px] font-semibold text-iris"
          >
            {verTodo.etiqueta ?? 'Ver todo'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>

      {editando ? (
        <div className="glass-tinte tarjeta border border-iris-borde">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="font-serif text-[15px] font-semibold text-tinta">Qué querés ver</p>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="flex h-8 flex-none items-center gap-1 rounded-full px-2 font-mono text-[11px] font-semibold text-iris"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Listo
            </button>
          </div>
          {anillos.map((a, i) => {
            const on = (elegidos ?? anillos.map((x) => x.etiqueta)).includes(a.etiqueta);
            return (
              <button
                key={a.etiqueta}
                type="button"
                onClick={() => alternarElegido(a.etiqueta)}
                aria-pressed={on}
                // ⚠️ MISMO VIDRIO QUE LAS PASTILLAS DE ABAJO (31/07). Estas
                // filas quedaron planas (`bg-papel-2` / `bg-white` a secas)
                // cuando las pastillas de Cuerpo pasaron a vidrio, y las dos
                // listas se ven una arriba de la otra: la de arriba parecía de
                // otra app. `.pastilla-vidrio` pone el desenfoque y el brillo;
                // acá va solo el degradé, que es lo que cambia entre estados.
                className={`pastilla-vidrio flex h-11 w-full items-center gap-2.5 rounded-[12px] border px-[11px] text-left ${
                  i > 0 ? 'mt-1.5' : ''
                } ${
                  on
                    ? 'border-[#e6e6f4] bg-[linear-gradient(155deg,rgba(255,255,255,.95),rgba(244,244,252,.55))]'
                    : 'border-dashed border-niebla-2 bg-[linear-gradient(155deg,rgba(255,255,255,.9),rgba(255,255,255,.45))]'
                }`}
              >
                <span className="size-2.5 flex-none rounded-full" style={{ background: on ? a.color : 'var(--color-anillo-pista)' }} />
                <span className={`flex-1 truncate text-[14px] font-medium ${on ? 'text-tinta' : 'text-niebla'}`}>{a.etiqueta}</span>
                <span
                  className="flex size-5 flex-none items-center justify-center rounded-full border"
                  style={{ background: on ? a.color : 'transparent', borderColor: on ? a.color : 'var(--color-niebla-2)' }}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
          <p className="mt-2.5 px-1 text-[12px] text-niebla text-pretty">
            Lo que elijas se ve entero, al lado del dibujo. Lo que dejes afuera se sigue cargando desde los botones de
            abajo.
          </p>
        </div>
      ) : (
        <div
          // ⚠️ Acá quedaba `bg-white` y por eso la tarjeta NO se veía de vidrio
          // aunque la de "Estás siguiendo" sí: un `bg-white` de Tailwind le pisa
          // el background al .glass-tinte. Si una tarjeta de vidrio se ve
          // opaca, buscá un bg- suelto en la misma clase.
          className="glass-tinte relative tarjeta border border-iris-borde"
        >
          {/* Elegir qué ver. EN LA ESQUINA, fuera del flujo: si ocupa alto o
              ancho, corre el dibujo o la leyenda. Ver la nota 1. */}
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label="Elegir qué ver"
            className="absolute right-1.5 top-1.5 z-10 flex size-8 items-center justify-center rounded-full text-niebla"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
              <circle cx="12" cy="12" r="3.1" />
              <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.55V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9.1a1.7 1.7 0 0 0 1.55 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.37z" />
            </svg>
          </button>

          <div className={apilado ? '' : 'flex items-center gap-3'}>
          {/* Columna del anillo: SOLO el dibujo. Que no tenga nada más es lo que
              hace que la leyenda de al lado quede centrada con el aro. */}
          <div className={`flex flex-col items-center ${apilado ? 'mb-2' : 'flex-none'}`}>
          <svg
            viewBox="0 0 112 112"
            className={apilado ? 'size-[152px]' : 'size-[116px]'}
            role="img"
            aria-label={visibles.map((a) => `${a.etiqueta}: ${a.valor ?? 'sin cargar'}`).join('. ')}
          >
            <g transform="rotate(-90 56 56)">
              {visibles.map((a, i) => {
                const r = radios[i] ?? radios[radios.length - 1];
                const circunferencia = 2 * Math.PI * r;
                // Un pelín de relleno mínimo para que se vea que arrancó, pero
                // nunca en cero: en cero el surco tiene que estar vacío.
                const p = a.progreso <= 0 ? 0 : Math.min(Math.max(a.progreso, 0.06), 1);
                return (
                  <g key={a.etiqueta}>
                    <circle cx="56" cy="56" r={r} fill="none" strokeWidth={trazo} // translúcida, no gris sólida: el surco también es vidrio
                      style={{ stroke: 'rgba(108,120,238,.13)' }} />
                    <circle
                      cx="56"
                      cy="56"
                      r={r}
                      fill="none"
                      strokeWidth={trazo}
                      strokeLinecap="round"
                      strokeDasharray={circunferencia}
                      strokeDashoffset={circunferencia * (1 - p)}
                      // Va por `style` y no por el atributo `stroke=`: Safari no
                      // resuelve var() ni oklch() en atributos de presentación
                      // de SVG y el color cae a negro. Por CSS sí funciona.
                      style={{ stroke: a.color, transition: 'stroke-dashoffset .7s ease-out' }}
                    />
                  </g>
                );
              })}
            </g>
            {/* Los destellos de cada anillo cerrado, REPARTIDOS sobre el aro.
                Antes iba uno solo en la punta de cada uno y, como todas las
                puntas están arriba, quedaban dos estrellitas apiladas en el
                medio que no se entendían. Ahora van a distintos ángulos y con
                distinto tamaño, así el aro entero parece cargado. */}
            <g aria-hidden="true">
              {visibles.flatMap((a, i) =>
                a.progreso < 1
                  ? []
                  : DESTELLOS.map(([grados, escala, op], j) => {
                      const r = radios[i] ?? 18;
                      // el desfasaje por anillo evita que se alineen entre aros
                      const rad = ((grados + i * 37) * Math.PI) / 180;
                      const x = 56 + r * Math.cos(rad);
                      const y = 56 + r * Math.sin(rad);
                      return (
                        // La posición y el tamaño van ACÁ, en el <g>: la
                        // animación de `.destello` usa la propiedad CSS
                        // `transform`, que le gana al atributo del SVG y le
                        // borraría el translate al path. Ver la nota en
                        // globals.css.
                        <g key={`d-${a.etiqueta}-${j}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala})`}>
                          <path
                            className="destello"
                            d="M0 -3.4L.95 -.95L3.4 0L.95 .95L0 3.4L-.95 .95L-3.4 0L-.95 -.95Z"
                            fill="#fff"
                            // Cada uno con su propio retraso: todos titilando
                            // juntos parecen un parpadeo de error.
                            style={{ '--op-destello': op, animationDelay: `${(i * 0.31 + j * 0.42).toFixed(2)}s` } as React.CSSProperties}
                          />
                        </g>
                      );
                    }),
              )}
            </g>
            {/* Y la celebración entera cuando cerraste todo (o estás genial).
                Titila más lento que los destellos del aro: son el fondo de la
                fiesta, no el centro. */}
            {(brillos || (visibles.length > 0 && visibles.every((a) => a.progreso >= 1))) && (
              <g aria-hidden="true">
                <g transform="translate(92 34.7)">
                  <path
                    className="destello"
                    d="M0 -4.7l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z"
                    style={{ fill: visibles[0]?.color, '--op-destello': 0.9, animationDuration: '3.4s' } as React.CSSProperties}
                  />
                </g>
                <g transform="translate(17 27.6)">
                  <path
                    className="destello"
                    d="M0 -3.6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"
                    style={{ fill: visibles[0]?.color, '--op-destello': 0.7, animationDuration: '3.4s', animationDelay: '1.1s' } as React.CSSProperties}
                  />
                </g>
                <circle
                  className="destello"
                  cx="96"
                  cy="72"
                  r="2.4"
                  style={{ fill: visibles[0]?.color, '--op-destello': 0.55, animationDuration: '3.4s', animationDelay: '.6s' } as React.CSSProperties}
                />
              </g>
            )}
          </svg>

          </div>

          {/* `pr-8` = el lugar de la ruedita, que está flotando en la esquina.
              Sin esto el valor de la primera fila le pasa por abajo. */}
          <div className={apilado ? '' : 'min-w-0 flex-1 pr-8'}>
            {visibles.map((a, i) => {
              const vacio = a.valor == null;
              const Caja = (soloVer ? 'div' : 'button') as 'div';
              return (
                // En `soloVer` la fila es un <div>: no es tocable, así que no
                // puede ser un <button> (un botón que no hace nada es una
                // trampa para el dedo y para el lector de pantalla).
                <Caja
                  key={a.etiqueta}
                  {...(soloVer
                    ? {}
                    : {
                        type: 'button' as const,
                        disabled,
                        onClick: () => onElegir(anillos.indexOf(a)),
                        'aria-label': vacio ? `Cargar ${a.etiqueta}` : `${a.etiqueta}: ${a.valor}`,
                      })}
                  // ⚠️ EN `soloVer` LA FILA ES UNA LEYENDA, no una caja: sin
                  // borde, sin fondo y sin alto de botón. Con la caja seguía
                  // leyéndose como tocable y repetía lo que ya dicen las
                  // pastillas de abajo (29/07, Matías: "no tiene sentido que se
                  // repitan si los vas a poner arriba").
                  className={
                    soloVer
                      ? `flex w-full items-center gap-2 px-1 py-[5px] text-left ${i > 0 ? 'mt-0.5' : ''}`
                      : `flex h-11 w-full items-center rounded-[12px] border px-2.5 text-left disabled:opacity-60 ${
                          apilado ? 'gap-2.5' : 'gap-2'
                        } ${i > 0 ? 'mt-1.5' : ''} ${vacio ? 'border-dashed' : ''}`
                  }
                  style={
                    soloVer
                      ? undefined
                      : vacio
                      ? {
                          // Vidrio: translúcido con el rim blanco arriba, igual
                          // que el composer. Se lee como hueco por llenar.
                          background: 'rgba(255,255,255,.5)',
                          borderColor: 'var(--color-niebla-2)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9)',
                        }
                      : {
                          // Cargada: el tinte de SU color, como los chips de
                          // "Anotar rápido" — que son los que él dijo que sí se
                          // entienden. El blanco pálido no distinguía nada.
                          background: `color-mix(in oklab, ${a.color} 13%, #fff)`,
                          borderColor: `color-mix(in oklab, ${a.color} 34%, transparent)`,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9)',
                        }
                  }
                >
                  <span className="size-2.5 flex-none rounded-full" style={{ background: vacio ? 'var(--color-anillo-pista)' : a.color }} />
                  <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${vacio ? 'text-niebla' : 'text-tinta'}`}>
                    {a.etiqueta}
                  </span>
                  <span className="flex-none whitespace-nowrap text-[13px] font-medium" style={{ color: a.deep }}>
                    {a.valor ?? `${a.accion ?? 'Sumar'} +`}
                  </span>
                  {/* El chevrón solo cuando está apilado. Apaisado no entra: la
                      cuenta da 123px para el rótulo y el valor, y "Actividades"
                      + "2 de 3" piden 127 — cortaba en "Activida…". La fila
                      igual se lee como botón por el fondo, el borde y el valor
                      en color. */}
                  {/* Tilde en el color de la fila: cierra la lectura de
                      "esto ya está". Reemplaza al chevrón, que además no
                      entraba a lo ancho cuando la tarjeta va apaisada.
                      En `soloVer` no va: ahí la fila es una leyenda del dibujo
                      —punto, nombre y dato— y el tilde no tiene qué cerrar. */}
                  {!vacio && !soloVer && (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-[13px] flex-none" style={{ stroke: a.deep }}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </Caja>
              );
            })}
          </div>
          </div>

          {/* Los botones de carga, a lo ancho de la tarjeta y debajo de todo.
              Reciben qué anillos se están viendo: lo que ya está en la leyenda
              de arriba no se repite acá. */}
          {pie && <div className="mt-3">{pie(new Set(visibles.map((a) => a.etiqueta)))}</div>}
        </div>
      )}
    </div>
  );
}

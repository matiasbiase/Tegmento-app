'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HojaRegistro, type TipoHoja } from '@/components/captura/HojaRegistro';
import { GLIFO_LUNA, GLIFO_MANZANA, GLIFO_PULSO } from '@/components/ui/glifos';

/**
 * LO QUE PODÉS CARGAR DEL CUERPO: los botones de abajo de la tarjeta, a lo
 * ancho, debajo del aro y de su leyenda.
 *
 * ── Cómo se reparte el trabajo con la leyenda de arriba ──────────────────────
 * Arriba, al lado del aro, **se mira**: punto de color, nombre y dato de hoy.
 * Acá abajo **se carga**. Y por eso cada botón dice distinto según dónde esté
 * su dato (29/07, Matías):
 *
 *   · si la señal ESTÁ en el aro → el botón muestra solo el `+`. El dato ya
 *     está tres centímetros más arriba; repetirlo es ruido.
 *   · si NO está en el aro (alimentación, ciclo) → el botón muestra su dato
 *     ("1 anotada") y el `+` al lado, porque si no, ese dato no se ve en ningún
 *     lado.
 *
 * Y están TODAS las señales, esté o no su aro en el dibujo: decidir qué mirar
 * no debería esconder la puerta para registrar.
 */

export type Pastilla = {
  clave: string;
  nombre: string;
  /** Qué hoja abre. Sin esto el botón es solo informativo y no lleva `+` (el
   *  ciclo, que se muestra pero no se "carga" desde acá). */
  hoja?: TipoHoja;
  /** Si ya lo cargaste hoy: manda el fondo tintado. */
  hecho: boolean;
  /**
   * SE LLENA UNA SOLA VEZ POR DÍA, así que cargado muestra un TILDE en vez del `+`.
   *
   * Pedido de Matías (31/07): *"el de sueño no lo vas a volver a llenar… que se
   * vuelva un tilde"*. Y él mismo puso el límite: ánimo, alimentación, energía y
   * libido **sí** se pueden volver a cargar, así que ahí el `+` se queda — es la
   * verdad de lo que pasa si lo tocás.
   *
   * ⚠️ NO ES DECORACIÓN, ES LO QUE EL BOTÓN PROMETE. Un tilde donde todavía se
   * puede sumar dice "ya está" sobre algo que no está cerrado; un `+` donde ya no
   * hay nada que sumar invita a una acción que no existe. El ícono tiene que
   * decir qué pasa al tocarlo, no si el dato está o no — eso ya lo dicen el
   * fondo tintado y el valor.
   */
  unaVezPorDia?: boolean;
  /** El dato de hoy: "6h30", "Alto", "Bien". null = todavía nada. */
  valor: string | null;
  /** Etiqueta de SU anillo, si tiene. Es la que se compara con lo que se está
   *  viendo arriba para decidir si el botón repite el dato o no. */
  anillo?: string;
  /** Tono vivo: el ícono y el borde. Es el MISMO color que su anillo, y por eso
   *  el botón y la leyenda se leen como la misma cosa. */
  color: string;
  /** El mismo hue oscurecido: el dato y el `+`, que son texto chico sobre
   *  claro. */
  deep: string;
  /**
   * LO QUE HAY DETRÁS DEL DATO, para las señales que son una LISTA y no un número.
   *
   * Pedido de Matías (03/08): *"cuando en el apartado Cuerpo tocás Alimentación,
   * el botón te muestra lo que comiste"*. Hoy la comida decía "2 anotadas" y
   * tocarla abría el formulario de carga — o sea que el único lugar donde veías
   * QUÉ comiste era irte a otra pantalla.
   *
   * ⚠️ CON `detalle`, TOCAR MUESTRA EN VEZ DE CARGAR, y es a propósito: la carga
   * se mudó a `/alimentacion` el mismo día. Cuerpo es donde MIRÁS el día; el
   * apartado es donde lo trabajás. Que el mismo botón hiciera las dos cosas es
   * lo que hacía que el apartado fuera una vidriera.
   */
  detalle?: { texto: string; hora: string }[];
  /** A dónde se va para cargar o ver más. Solo tiene sentido con `detalle`. */
  verEn?: { href: string; etiqueta: string };
  /**
   * TODO LO QUE COMPONE ESTA SEÑAL, desplegado abajo del botón (05/08, pedido de
   * Matías: *"cuando lo tocás se expande y se ve lo que lo compone… que te
   * permita agregar, pero también ver los datos que ya hay adentro"*).
   *
   * ⚠️ ES LA MISMA MECÁNICA QUE `detalle`, PERO CON CONTENIDO LIBRE, y por eso
   * no se hizo un componente nuevo: `detalle` ya desplegaba una lista abajo del
   * botón desde el 03/08. Lo único que faltaba era poder desplegar cualquier
   * cosa —un gráfico, un formulario— en vez de solo líneas de texto.
   *
   * Con `panel`, esta pastilla deja de ser un atajo a otra pantalla y pasa a ser
   * el lugar: por eso Ánimo pudo dejar de tener pantalla propia.
   */
  panel?: React.ReactNode;
};

/**
 * Un ícono por señal (29/07, pedido de Matías). Se reusan los glifos que ya
 * tiene la app: la luna del sueño y la manzana de la comida son las mismas de
 * los chips y del menú. Un concepto, un dibujo.
 */
const ICONOS: Record<string, React.ReactNode> = {
  animo: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="9.2" cy="10.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="10.2" r="0.9" fill="currentColor" stroke="none" />
      <path d="M8.6 14.4a4.2 4.2 0 0 0 6.8 0" />
    </>
  ),
  sueno: GLIFO_LUNA,
  comida: GLIFO_MANZANA,
  energia: GLIFO_PULSO,
  // Libido: una CARA DE SATISFACCIÓN (29/07, pedido de Matías). Antes era una
  // gota, que se leía como agua o como lágrima. La app ya habla con caritas (la
  // de Ánimo, la de Calma) y esta entra en esa familia: ojos cerrados y una
  // sonrisa tranquila. Se distingue de la de Calma porque esa no sonríe tanto.
  libido: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M7.6 10.6c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9M13.2 10.6c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9" strokeWidth="1.5" />
      <path d="M8.4 14.2a4.6 4.6 0 0 0 7.2 0" strokeWidth="1.6" />
    </>
  ),
  // Ciclo: la luna en cuarto, que es como se dibuja el ciclo en todos lados.
  ciclo: <path d="M12 3.4a8.6 8.6 0 1 0 0 17.2 6.4 6.4 0 0 1 0-17.2z" />,
  /**
   * "CÓMO VENÍS": LA LÍNEA QUE SUBE Y BAJA, SIN BASE.
   *
   * ⚠️ TERCER INTENTO, y el que él pidió: *"puede ser directamente esa rayita
   * que teníamos en otros lados, que es como una montañita, pero sin base: una
   * línea que sube y baja y ya"*.
   *
   * Y es **el mismo trazo** que ya usaba la tarjeta "Cómo viene tu ánimo": un
   * concepto, un dibujo. Los dos anteriores fallaron por lo mismo pero al revés
   * —dos líneas cruzándose eran una maraña a 19px, y dos barras de nivel eran
   * dos formas donde alcanza una—. Una sola línea con dos subidas se lee entera
   * a cualquier tamaño y ya significa "cómo viene esto" en el resto de la app.
   *
   * ⚠️ SIN EJE NI BASE a propósito: con una L abajo sería "un gráfico"
   * (una pantalla que se mira), y acá adentro también se carga.
   */
  senales: <path d="M3 16.5l4.5-6 4 3.5 4.5-8 5 6" />,
  // Concentración: un cerebro simple, el mismo trazo que el de "lo que no se ve".
  concentracion: (
    <>
      <path d="M12 5.2a3.1 3.1 0 0 0-5.6 1.4A2.9 2.9 0 0 0 4 9.4c0 .9.4 1.7 1 2.2a2.9 2.9 0 0 0 1.5 4.6A2.9 2.9 0 0 0 12 17.4z" />
      <path d="M12 5.2a3.1 3.1 0 0 1 5.6 1.4A2.9 2.9 0 0 1 20 9.4c0 .9-.4 1.7-1 2.2a2.9 2.9 0 0 1-1.5 4.6A2.9 2.9 0 0 1 12 17.4z" />
      <path d="M12 5.2v12.2" />
    </>
  ),
};

export function PastillasCuerpo({
  pastillas,
  enAnillo,
}: {
  pastillas: Pastilla[];
  /** Etiquetas de los anillos que se están viendo arriba. Lo que está acá NO
   *  repite su dato en el botón. */
  enAnillo?: Set<string>;
}) {
  const router = useRouter();
  const [hoja, setHoja] = useState<TipoHoja | null>(null);
  // Cuál pastilla tiene el detalle abierto. Una sola a la vez: dos listas
  // desplegadas convierten la columna de botones en una pantalla larga.
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <>
      <div>
        {pastillas.map((p, i) => {
          const vacio = !p.hecho;
          // Lo dice el aro de arriba → acá solo el `+`.
          const arriba = p.anillo != null && (enAnillo?.has(p.anillo) ?? false);
          const dato = arriba ? null : p.valor;
          // Con `detalle`, el botón MUESTRA en vez de abrir la hoja de carga.
          const muestra = p.detalle != null || p.panel != null;
          const desplegada = abierta === p.clave;
          return (
            <div key={p.clave}>
            <button
              type="button"
              disabled={!p.hoja && !muestra}
              onClick={() => {
                if (muestra) setAbierta(desplegada ? null : p.clave);
                else if (p.hoja) setHoja(p.hoja);
              }}
              aria-expanded={muestra ? desplegada : undefined}
              aria-label={
                muestra
                  ? `${p.nombre}: ${p.valor ?? 'sin datos'}. Ver el detalle`
                  : !p.hoja
                  ? `${p.nombre}: ${p.valor ?? 'sin datos'}`
                  : vacio
                  ? `Cargar ${p.nombre}`
                  : `${p.nombre}: ${p.valor}. Volver a editar`
              }
              className={`pastilla-vidrio flex h-11 w-full items-center gap-2.5 rounded-[12px] border px-2.5 text-left disabled:cursor-default ${
                i > 0 ? 'mt-1.5' : ''
              } ${vacio ? 'border-dashed' : ''}`}
              style={
                vacio
                  ? {
                      // ⚠️ EL FONDO VA EN DEGRADÉ Y NO PLANO (31/07, Matías: *"que
                      // se vea medio como vidrio, no se vean tan planas"*). El
                      // desenfoque y el brillo de arriba los pone la clase
                      // `.pastilla-vidrio`; acá va solo el color, que es el único
                      // dato que cambia por pastilla.
                      //
                      // ⚠️ Y NO SE PONE `boxShadow` inline: pisaría el de la
                      // clase, que es lo que las despega del fondo. Un estilo
                      // inline le gana siempre a la hoja de estilos.
                      background: 'linear-gradient(155deg, rgba(255,255,255,.9), rgba(255,255,255,.45))',
                      borderColor: 'var(--color-niebla-2)',
                    }
                  : {
                      // Cargada: el tinte de SU color, como los chips de "Anotar
                      // rápido" — que son los que Matías dijo que sí se
                      // entienden. El blanco pálido no distinguía nada.
                      //
                      // ⚠️ `color-mix` y NO `${p.color}44` (29/07): los colores
                      // vienen como `var(--color-…)` y pegarle los dos dígitos
                      // de opacidad a una variable da CSS inválido — el
                      // navegador lo descarta y pinta el borde NEGRO. Se ve como
                      // un bug de diseño y es un error de sintaxis.
                      // Blanco arriba que se ABRE al color abajo (y no dos tonos
                      // del color): es lo que hace que la superficie se lea curva
                      // en vez de pintada. Comparado renderizado contra el plano.
                      background: `linear-gradient(155deg, rgba(255,255,255,.86), color-mix(in oklab, ${p.color} 22%, rgba(255,255,255,.55)))`,
                      borderColor: `color-mix(in oklab, ${p.color} 40%, transparent)`,
                    }
              }
            >
              {/* El ícono va SIEMPRE en el color de su anillo, cargado o no: es
                  lo que hace que la fila se lea como leyenda del dibujo de
                  arriba. Que esté hecho o no lo dicen el fondo y el tilde. */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[19px] flex-none"
                style={{ color: p.color }}
                aria-hidden="true"
              >
                {ICONOS[p.clave]}
              </svg>
              <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${vacio ? 'text-niebla' : 'text-tinta'}`}>
                {p.nombre}
              </span>
              {dato && (
                <span className="flex-none whitespace-nowrap text-[13px] font-medium" style={{ color: p.deep }}>
                  {dato}
                </span>
              )}
              {/* El `+` es todo el verbo que hace falta: antes decía "Anotar +",
                  "Marcar +", "Contar +" y con seis botones eran seis verbos
                  distintos para la misma acción — abrir la hoja. El nombre ya
                  dice qué se carga. Sin hoja no hay `+`: el ciclo se mira.

                  Y cuando ya no queda nada que sumar (`unaVezPorDia` y cargado),
                  el `+` se vuelve TILDE: el ícono dice qué pasa al tocarlo, no si
                  el dato está. Tocarlo sigue abriendo la hoja para corregirlo. */}
              {/* Con detalle no va `+` ni tilde: va el chevron, porque lo que
                  pasa al tocar es que se despliega, no que se carga algo. */}
              {muestra ? (
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="size-[15px] flex-none transition-transform"
                  style={{ color: p.deep, transform: desplegada ? 'rotate(90deg)' : 'none' }}
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              ) : (
                p.hoja && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[15px] flex-none"
                  style={{ color: p.deep }}
                  aria-hidden="true"
                >
                  {p.hecho && p.unaVezPorDia ? <path d="M5 13l4 4L19 7" /> : <path d="M12 5.5v13M5.5 12h13" />}
                </svg>
                )
              )}
            </button>

            {muestra && desplegada && (
              <div className="mt-1.5 rounded-[12px] border border-iris-borde bg-white p-[11px_13px]">
                {p.panel ?? (p.detalle!.length === 0 ? (
                  <p className="text-[12.5px] leading-snug text-niebla text-pretty">
                    Todavía no anotaste nada hoy.
                  </p>
                ) : (
                  p.detalle!.map((d, k) => (
                    <div key={k} className="flex items-baseline gap-2 py-[3px] text-[13px] text-tinta">
                      <span className="min-w-0 flex-1 text-pretty">{d.texto}</span>
                      <span className="flex-none font-mono text-[10.5px] text-niebla-3">{d.hora}</span>
                    </div>
                  ))
                ))}
                {p.verEn && (
                  <Link
                    href={p.verEn.href}
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold"
                    style={{ color: p.deep }}
                  >
                    {p.verEn.etiqueta}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>

      {hoja && (
        <HojaRegistro
          tipo={hoja}
          onClose={() => setHoja(null)}
          // Sin el refresh el anillo de arriba no se mueve y parece que no se
          // guardó (el mismo bug que ya habíamos tenido en el Home).
          onGuardado={() => router.refresh()}
        />
      )}
    </>
  );
}

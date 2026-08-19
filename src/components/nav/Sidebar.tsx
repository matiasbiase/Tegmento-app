'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GLIFO_BUSTO, GLIFO_TILDE_CAJA } from '@/components/ui/glifos';
import { usePathname } from 'next/navigation';
import {
  IconHistorial,
  IconNeurona,
  IconCalma as IconCalmaTabler,
  IconFoco as IconFocoTabler,
  IconPolaridad as IconPolaridadTabler,
  IconProbando as IconProbandoTabler,
  IconComoSeLee as IconComoSeLeeTrazo,
  IconRueda as IconRuedaComp,
} from '@/components/ui/iconos';
import { etiquetaFecha } from '@/lib/fechas';
import { HERRAMIENTAS_CHAT } from '@/lib/herramientas-chat';
import { IconoHerramienta } from '@/components/chat/IconoHerramienta';

// Menú lateral estilo Claude/Perplexity: el chat es la pantalla principal y
// todo lo demás vive acá. Reemplaza a la bottom nav (17-20/07, pedido de Matías).

type ItemDef = {
  href: string;
  etiqueta: string;
  icono: React.ReactNode;
  /** Lleva la insignia "nuevo" al costado. */
  nuevo?: boolean;
  /**
   * ⚠️ LOS DOS MÓDULOS PAGOS (06/08, Matías: *"alimentación y finanzas, en vez
   * de nuevo, le pondría las etiquetitas de premium"*).
   *
   * Es la primera vez que el modelo de negocio aparece EN la app: hasta hoy
   * vivía en `docs/estrategia-modulos.md` y en la bitácora (núcleo gratis,
   * Finanzas y Alimentación pagos). Y reemplaza a "nuevo", que es lo correcto:
   * **"nuevo" caduca solo y esto no**. Una insignia que envejece al lado de una
   * que no envejece se leen como lo mismo y no lo son.
   *
   * ⚠️ HOY NO COBRA NADA NI BLOQUEA NADA: es solo el rótulo. Si algún día hay
   * un muro de pago, este flag es de dónde tiene que colgar, no de una lista
   * nueva en otro archivo.
   */
  premium?: boolean;
};

// La misma rueda que en todos lados desde el 06/08: acá había un dibujo propio
// —dos círculos y cuatro radios— y en `ui/iconos.tsx` otro distinto. Un
// concepto, un dibujo. Ahora son ocho quesitos, uno por área (ver `GLIFO_RUEDA`).
const IconRueda = <IconRuedaComp className="size-[21px]" />;

const IconPersona = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </svg>
);

// ⚠️ EL BUSTO VOLVIÓ EL 04/08. Se había ido cuando Cuerpo pasó a ser tab de la
// barra de abajo; ahora Notas le tomó ese lugar y Cuerpo baja acá. El trazo sale
// de `ui/glifos.tsx`, como corresponde: un concepto, un dibujo.
const IconCuerpo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    {GLIFO_BUSTO}
  </svg>
);

// El tilde-en-caja sale de `ui/glifos.tsx` desde el 06/08: estaba escrito a mano
// acá, en el renglón de una tarea y en los chips del chat — tres copias del
// mismo dibujo, que es como el avión roto de ayer terminó arreglado en un solo
// lado. Un concepto, un dibujo.
const IconActividades = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    {GLIFO_TILDE_CAJA}
  </svg>
);

// La manzana CON EL BRILLITO (05/08, Matías viendo la maqueta: *"esa manzana
// que tiene incluso un brillito, me encanta el ícono, reemplazalo por el de
// alimentación de ahora"*). Los dos trazos cortos de adentro son el brillo.
//
// ⚠️ REEMPLAZA A `GLIFO_MANZANA`, que era la regla anterior ("el mismo trazo que
// Cuerpo y el chat"). ⚠️ ESO DEJA DOS MANZANAS EN LA APP: esta en el menú y la

// (Los íconos de Finanzas y Alimentación vivían acá: se fueron con sus
// ítems del menú, que no están en esta copia pública.)

const IconDescubrir = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
  </svg>
);

// ── LOS CUATRO DE TABLER (05/08) ─────────────────────────────────────────────
// Calma (viento), Foco (diana), Polaridad (flechas opuestas) y Probando (matraz)
// pasaron a los dibujos que Matías eligió mirando la maqueta: *"están perfectos,
// me encantan"*. Los trazos viven en `ui/iconos.tsx`, como manda la regla.
//
// ⚠️ SE PIERDEN TRES DECISIONES VIEJAS, y conviene saber cuáles por si alguna
// hace falta de vuelta: la cara de alivio de Calma (que la metía en la familia
// de las caritas del ánimo, después de tres intentos fallidos de dibujar
// pulmones), el medidor con aguja de Polaridad y el reloj-diana de Foco. El
// viento y la diana son más genéricos; ganaron porque se leen de un vistazo.
const IconCalma = <IconCalmaTabler className="size-[21px]" />;

const IconFoco = <IconFocoTabler className="size-[21px]" />;

const IconCalendario = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01" strokeWidth="2.6" />
  </svg>
);

const IconPolaridad = <IconPolaridadTabler className="size-[21px]" />;

// Los lugares del día a día que NO están en la barra de abajo (27/07, pedido de
// Matías): Home, Patrones, Cuerpo y Polaridad ya son tabs, repetirlos acá
// confunde — la misma pantalla en dos lugares distintos. El menú es para lo
// que la barra no tiene.
const IconBuscar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[21px]">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

// Buscar va SUELTO y no adentro de `ITEMS` (30/07, pedido de Matías: *"que quede
// un espacio entre buscar y el primero de las cosas que se pueden seleccionar,
// para que uno tenga más rápido el ojo de que se puede buscar, que es algo
// diferente"*). Es una ACCIÓN (se usa cuando ya sabés qué querés y no lo
// encontrás); el resto de la lista son LUGARES a los que se entra a mirar, y
// mezclados en la misma fila se leían como si fueran lo mismo.
const BUSCAR: ItemDef = { href: '/buscar', etiqueta: 'Buscar', icono: IconBuscar };

// ── LOS CUATRO LUGARES NUEVOS (30/07) ────────────────────────────────────────
// Notas, Probando, Cómo se lee y Relaciones. Van ARRIBA y con la insignia
// "nuevo": son lo único de la app que Matías todavía no tiene la costumbre de
// visitar, y sin la insignia el menú se ve igual que ayer.
//
// La insignia hay que SACARLA en algún momento; cuando dejen de ser nuevas, se
// borra el `nuevo: true` y listo.

// (El ícono de Notas se fue con el ítem el 04/08: la hoja doblada ahora vive en
// `BarraGlobal`, que es donde quedó la entrada. Dejarlo acá sin uso era
// exactamente el código muerto que nadie corre — la trampa de `gen-icons.mjs`.)

// (El ícono de Objetivos —la montaña— vive en `ui/iconos.tsx`: lo usa la barra de
// abajo, que es donde quedó la entrada. Acá ya no hace falta.)

const IconProbando = <IconProbandoTabler className="size-[21px]" />;

// (El dibujo se mudó a `ui/iconos.tsx` el 05/08: lo usa también el chip del
//  chat, y dos copias del mismo path es cómo la app terminó con dos manzanas.)
const IconComoSeLee = <IconComoSeLeeTrazo className="size-[21px]" />;

/**
 * TRES NODOS CON UNA FLECHA, para «Cosas chicas». A propósito NO es la neurona
 * que Relaciones usa en la barra de abajo (30/07, Matías: "separalo a
 * Relaciones").
 *
 * Los dos dibujos existen porque hay DOS PANTALLAS, y esa es la única razón que
 * los justifica:
 *  - la NEURONA, abajo → `/relaciones`: el Analista cruzando todo. Un racimo
 *    denso donde no se distingue una punta de otra. Así se ve pensar.
 *  - los TRES NODOS → `/cosas-chicas`: dos puntas y una relación, contables con
 *    el dedo.
 *
 * ⚠️ LOS TRES NODOS YA NO VIVEN ACÁ (05/08): se mudaron a `BarraGlobal`, porque
 * Relaciones subió a la barra de abajo y Objetivos bajó a este menú. El dibujo
 * es el MISMO —misma geometría, solo cambia el grosor por el tamaño— y eso no
 * es casualidad: la regla de la casa dice que todos los íconos de lo mismo son
 * el mismo ícono. Si se toca uno, se toca el otro.
 *
 * ⚠️ Si algún día las dos pantallas se vuelven a juntar, ese ícono pierde su
 * razón de ser y hay que volver a la neurona en los dos lados. Dos dibujos para
 * un mismo destino es un dibujo de más para aprender: fue exactamente el
 * problema que llevó a separarlas.
 *
 * Los nodos van más gordos y más separados que los de la neurona (r=2.4 contra
 * r=1.4): de lejos, y a 21px, lo que distingue a los dos dibujos es la densidad,
 * no la forma.
 */
// Los destinos que se miran seguido, sin entrar a nada más. Achicada el 30/07
// (Matías, "limpieza" del menú): Ánimo y Descubrir bajaron a Herramientas —
// ver el comentario ahí de por qué. Calendario es el único que queda: se sigue
// mirando seguido y no tiene reemplazo en otro lado.
// ⚠️ OBJETIVOS SÍ ESTÁ ACÁ DESDE EL 05/08: bajó de la barra y Relaciones tomó su
// lugar (pedido de Matías). Y RELACIONES se fue de esta lista en el mismo
// movimiento — la regla del menú es la misma desde el 27/07: lo que ya es una
// pestaña no se repite acá, porque la misma pantalla en dos lugares confunde.
// Es literalmente lo que él pescó con Notas el 04/08: *"queda en dos lados"*.
//
// ⚠️ Y OJO CON LOS NOMBRES, que no coinciden con las rutas (30/07, decisión de
// Matías: *"cosas chicas podría llamarse relaciones y relaciones patrones"*):
//   "Relaciones" → `/cosas-chicas`  (los cruces de dos puntas: pantalla → ánimo)
//                                    ⚠️ desde el 05/08 vive en la BARRA, no acá
//   "Patrones"   → `/relaciones`    (la lectura completa del Analista)
// Las rutas quedaron como estaban a propósito: `/relaciones` se nombra en 18
// lugares —incluido `revalidatePath` en seis acciones y un link dentro del prompt
// del asistente— y renombrarla no cambia nada para el usuario. Es el mismo
// criterio que la tabla `lupa`, que conservó su nombre cuando la pantalla pasó a
// llamarse Polaridad. Si algún día se renombran, hay que barrer los 18.
// ⚠️ LA LISTA SE ACORTÓ A TRES (31/07, pedido de Matías). Bajaron a la caja
// "Patrones", "Cómo se lee" y "Calendario", y subió "Finanzas" al lugar que
// dejó Patrones.
//
// El criterio no cambió, cambió a qué lado cae cada una: acá arriba va lo que
// vas a ABRIR para agregar algo, y en la caja lo que vas a MIRAR cuando algo te
// mande. Patrones y Cómo se lee son las dos cosas que la app te devuelve —no se
// visitan por su cuenta, se leen cuando hay algo que leer— y el Calendario se
// consulta, no se carga.
//
// Finanzas sube porque va a dejar de ser "subir un ticket" para ser un
// seguimiento, que es de lo que sí se entra a agregar todos los días. (El
// seguimiento en sí todavía no está: ver `.claude/pedidos-de-matias.md`.)
const ITEMS: ItemDef[] = [
  // ⚠️ CUERPO BAJÓ DE LA BARRA EL 04/08 (Notas le tomó el lugar), y va PRIMERO de
  // la lista: es de lo que más se carga por día —sueño, ánimo, energía— y ahora
  // está a dos toques en vez de uno. Ponerlo abajo le sumaría un tercero.
  { href: '/cuerpo', etiqueta: 'Cuerpo', icono: IconCuerpo },
  // ⚠️ NOTAS SE FUE DE ACÁ EL 04/08: subió a la barra de abajo y tenerla en los
  // dos lados es exactamente lo que la nota de arriba prohíbe — la misma
  // pantalla en dos lugares distintos. Lo pescó Matías al toque: *"sacar Notas
  // del menú de hamburguesa, porque queda en dos lados"*.
  // ⚠️ OBJETIVOS BAJÓ DE LA BARRA EL 05/08 (Relaciones le tomó el lugar, pedido
  // de Matías). Va acá, primero de los que quedan, por el mismo criterio con el
  // que bajó Cuerpo el 04/08: lo que sale de la barra no se manda al fondo.
  //
  // ⚠️ Y RELACIONES SE FUE DE ESTA LISTA en el mismo movimiento: subió a la
  // barra, y tenerla en los dos lados es exactamente lo que pasó con Notas el
  // 04/08 — él lo pescó al toque: *"queda en dos lados"*. La regla ya está
  // escrita: **lo que es pestaña no se repite en el menú.**
  // ⚠️ ACÁ ESTABA "OBJETIVOS" Y SE FUE (11/08). Matías: *"sacá Objetivos del
  // menú hamburguesa, porque total ya lo tenemos en Seguimiento"*.
  //
  // ⚠️ ES LA MISMA REGLA QUE ÉL PUSO EL 26/07 —*lo que ya es pestaña no se
  // repite en el menú*— y le tocó a Objetivos recién ahora porque **la pestaña
  // no existía cuando el ítem se puso**: Objetivos entró a Seguimiento el 06/08
  // (*"arriba ese menú de tres, sacá cerradas y cambialo por objetivos"*), y el
  // ítem del menú quedó de antes. Nadie lo revisó porque nada falla: **una
  // puerta de más no rompe, solo hace la app más grande de lo que es.**
  //
  // ⚠️ La PANTALLA sigue existiendo en `/objetivos`, y varias cosas la linkean
  // (el "Sí, anotarlo" del bot, el "Arrancar otro" del cierre, `#reflexión`).
  // Lo que se saca es el ítem del menú, no la ruta.
  // ⚠️ ACÁ IBAN FINANZAS Y ALIMENTACIÓN, los dos módulos `premium: true`.
  // No están en esta copia pública del código; viven en el repo privado.
];

// ⚠️⚠️ ACÁ VIVÍA `HERRAMIENTAS`, EL ARRAY DE LA CAJA QUE SE DESPLEGABA, Y MURIÓ
// EL 11/08 cuando Matías la aplanó (*"dejaría de mostrar Herramientas y
// mostraría directamente Calendario"*).
//
// Vale la historia porque explica por qué se vació: la caja nació el 27/07 con
// un criterio bueno —*a Calma, a Foco y a Polaridad nadie va por su cuenta: se
// usan cuando algo las pide, y quien sabe cuándo hacen falta es el chat*—. Y ese
// criterio **se cumplió tan bien que se comió la caja**: el 05/08 esas cinco
// pantallas pasaron a ser hashtags, Patrones y Ánimo se borraron por repetir lo
// que ya tenía lugar, y quedó envolviendo a Calendario y a Descubrir.
//
// ⚠️ **Un grupo con un solo hijo no es un grupo: es un toque de más.**

/**
 * ── HERRAMIENTAS CHAT (05/08, idea de Matías) ────────────────────────────────
 *
 * ⚠️ ESTAS NO ABREN PANTALLA: escriben en el chat. Cada una lleva a
 * `/chat?h=<id>`, que deja `#polaridad` escrito en el campo de abajo; el bot
 * recibe la instrucción larga y te explica qué hace antes de arrancar. El
 * prompt de cada una vive en `lib/herramientas-chat.ts`.
 *
 * ⚠️ Y LAS PANTALLAS DEJARON DE SER EL CAMINO. Sus palabras: *"por ahora, hacé
 * que tengan esta función. No hace falta que tengan pantallas, porque fijate
 * bien que se resuelve así"*. Las rutas `/polaridad`, `/calma`, `/foco`,
 * `/probando` y `/como-se-lee` **siguen existiendo y andando**: lo que cambió es
 * que el menú ya no lleva ahí. Es a propósito y es reversible — borrarlas es una
 * decisión aparte, y esta idea se está probando.
 *
 * El nombre es literal suyo: *"pondría herramientas chat el nombre; sé que es un
 * poco largo, pero en inglés sería como chat tools"*. Se le ofreció "Herramientas"
 * a secas y eligió el largo.
 *
 * ⚠️ ALIMENTACIÓN NO ESTÁ ACÁ, aunque la maqueta la mostraba: *"alimentación es
 * una de las que aparece en el menú de hamburguesa normal, igual que finanzas"*.
 * Descubrir y Objetivos tampoco: *"eso no lo tengo muy claro… no lo agregués"*.
 */
/**
 * ⚠️⚠️ SALE DE `HERRAMIENTAS_CHAT`, NO DE UNA LISTA PROPIA (11/08).
 *
 * Acá había una copia a mano de las cinco herramientas, y **se despegó exacto
 * como estaba previsto**: el 11/08 se agregaron `#plan` y `#reflexión` al módulo
 * y esta caja siguió mostrando cinco. Lo pescó Matías: *"¿por qué plan y
 * reflexión no están dentro de la cajita de herramientas del chat?"*.
 *
 * ⚠️ **Y EL COMENTARIO QUE LO ANTICIPABA YA ESTABA ESCRITO**, en
 * `IconoHerramienta.tsx`: *"copiarlo habría dejado dos mapas que se despegan en
 * cuanto se agregue una herramienta sexta"*. Ese día se unificaron el chip del
 * mensaje y la pastilla del composer — **y esta tercera copia quedó afuera de la
 * unificación, en otro archivo, donde nadie la buscó.**
 *
 * Lección para la próxima: cuando se descubre una copia, hay que buscar las
 * DEMÁS. Unificar dos de tres deja el mismo bug con menos testigos.
 */
const HERRAMIENTAS_DEL_CHAT = HERRAMIENTAS_CHAT;

// Una CAJA, que es como la llamó Matías ("guardarlas en una cajita"). La llave
// inglesa que había antes no le gustó y además decía "arreglar", no "guardadas".

/**
 * LA CAJA DE HERRAMIENTAS CON LAS ESTRELLITAS DEL BOT.
 *
 * ⚠️ EL PRIMER INTENTO SALIÓ MAL Y ÉL LO VIO AL TOQUE (05/08: *"está como medio
 * roto, chiquito, desfasado… las rayas esas de diálogo"*). Era un globo de chat
 * con dos rayitas adentro, y el error fue de proporción, no de idea: el globo
 * dibujado a 20.5 de ancho dejaba las rayas en un cuarto del lienzo, así que a
 * 21px se leían como suciedad. **Meterle detalle interno a un ícono de 21px es
 * la forma más rápida de romperlo.**
 *
 * Su propuesta, que es la que quedó: *"como la caja de herramienta y con
 * estrellitas arriba como las del bot"*. Y es mejor por algo que él no dijo:
 * **las dos estrellas son la firma del asistente** —las mismas de `AvatarIA`—
 * así que el ícono dice "esto es del bot" con el mismo recurso con el que la app
 * ya lo viene diciendo, en vez de inventar un símbolo nuevo.
 *
 * La caja es la MISMA que `IconHerramientas`, sin la manija de arriba: ahí es
 * donde van las estrellas. Las dos cajas se leen como parientes, que es lo que
 * son.
 */
const IconHerramientasChat = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    {/* ⚠️ SEGUNDA CORRECCIÓN (06/08): *"tiene una sola [estrella], la otra creo
        que está como abajo… tendría que estar más a la derecha para que se vea
        la segunda. Hay una que queda tapada. Que se vean un poquito más grandes
        también, y la caja puede ser un poquito más chica"*.
        Y tenía razón, medido: la chica estaba en (15.6, 6.6) y la caja llegaba
        hasta x=18.2 / y=9.6, así que **le pasaba por encima a la esquina de la
        caja** y se leía como parte del borde. Ahora la caja se achicó (13.6 de
        ancho) y las dos estrellas se fueron a la derecha, separadas en
        diagonal: la grande arriba del todo y la chica abajo a su izquierda,
        pero por fuera de la caja. Las dos crecieron ~40%. */}
    <rect x="1.8" y="11.4" width="12.8" height="8.6" rx="2" />
    <path d="M1.8 15.3h12.8M6.4 14.2v2.2h3.6v-2.2" />
    <path d="M5.8 11.4v-1.1a1.6 1.6 0 0 1 1.6-1.6h1.6a1.6 1.6 0 0 1 1.6 1.6v1.1" />
    {/* ⚠️ TERCERA VUELTA (06/08): *"la estrellita de abajo sigue apareciendo
        metida atrás; tiene que estar a la derecha, no a la izquierda"*.
        Y era literal: yo la había puesto abajo A LA IZQUIERDA de la grande
        (x=15.1 contra x=19), o sea justo encima del borde superior de la caja,
        y por eso se leía "metida atrás". Ahora la chica está abajo y **a la
        derecha** de la grande, las dos en la columna que la caja dejó libre al
        achicarse. Ninguna toca la caja. */}
    <path d="M17.3 1.4l1.06 2.54 2.54 1.06-2.54 1.06-1.06 2.54-1.06-2.54-2.54-1.06 2.54-1.06z" fill="currentColor" stroke="none" />
    <path d="M21.3 7.6l.62 1.48 1.48.62-1.48.62-.62 1.48-.62-1.48-1.48-.62 1.48-.62z" fill="currentColor" stroke="none" />
  </svg>
);

// La ruedita de Ajustes (pedido de Matías): la misma que usa la tarjeta de Hoy.
const IconAjustes = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]">
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.55V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9.1a1.7 1.7 0 0 0 1.55 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.37z" />
  </svg>
);

/** Cuántos chats se ven en el menú. El resto vive en el Historial. */
const CHATS_EN_MENU = 2;

/** "Hoy", "Ayer" o la fecha, al costado de cada chat. `etiquetaFecha` devuelve
 *  la hora cuando es de hoy, así que ese caso se traduce acá. */
function etiquetaDia(iso: string): string {
  const e = etiquetaFecha(iso);
  return /^\d{2}:\d{2}$/.test(e) ? 'Hoy' : e;
}

const IconChat = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.2A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);

// Ajustes (antes "Más"): configurar la app y lo tuyo, no usarla.
const AJUSTES: ItemDef[] = [
  { href: '/rueda', etiqueta: 'Rueda de la vida', icono: IconRueda },
  { href: '/perfil', etiqueta: 'Perfil', icono: IconPersona },
];

const PROXIMOS: { etiqueta: string; icono: React.ReactNode }[] = [];

// Pantallas de tarea: se entra a hacer una cosa y se sale. No llevan menú.
const RUTAS_TAREA = [
  // ⚠️ CON LA BARRA AL FINAL: así matchea `/notas/12` y `/notas/nueva` pero NO
  // `/notas`, que es la lista y sí lleva menú. Escribir una nota es entrar a
  // hacer una cosa y salir; la esquina la ocupa la cruz, no la hamburguesa.
  '/notas/',
  '/actividades/transcribir',
  '/actividades/imprimir',
  '/bitacora/nueva',
  '/rueda/checkin',
  '/rueda/editar',
  '/perfil/cerebro',
  '/perfil/personalidad',
];

export function Sidebar() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // Cerrar arrastrando hacia la izquierda: no hace falta ir a buscar la cruz.
  // Solo cuenta si el gesto es claramente horizontal (más de 12px de X y más X
  // que Y), para no comerse un scroll vertical del menú.
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  // `visible` maneja la animación: se monta primero fuera de pantalla y en el
  // frame siguiente entra deslizando. Al cerrar, se desliza y recién después se
  // desmonta, para que la salida también se vea.
  const [visible, setVisible] = useState(false);
  // Las herramientas arrancan guardadas; el estado no se persiste a propósito:
  // si quedaran abiertas volveríamos a la lista larga de siempre.
  const [herramientasChat, setHerramientasChat] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  // Los últimos chats, para volver a lo que venías hablando sin pasar por el
  // Historial. Se piden al abrir el menú, no en cada navegación.
  const [chats, setChats] = useState<{ id: number; titulo: string; ultimaActividad: string }[]>([]);
  // Cuántos hay en total: es el número de "Ver los otros N".
  const [totalChats, setTotalChats] = useState(0);

  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  // El desplazamiento del contenido cuelga de un atributo en el <html>: así el
  // CSS mueve `main` y la barra de abajo sin que este componente los conozca.
  // Se limpia al desmontar, si no queda la app corrida para siempre.
  useEffect(() => {
    const raiz = document.documentElement;
    if (visible) raiz.dataset.menu = 'abierto';
    else delete raiz.dataset.menu;
    return () => {
      delete raiz.dataset.menu;
    };
  }, [visible]);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    fetch('/api/chats/recientes')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d?.chats) return;
        setChats(d.chats);
        setTotalChats(d.total ?? d.chats.length);
      })
      .catch(() => {
        // Sin chats el menú se ve igual, solo sin esa sección: no vale un error.
      });
    return () => {
      vivo = false;
    };
  }, [abierto]);

  /**
   * NAVEGAR CIERRA EL MENÚ DE GOLPE, SIN LA DANZA DE LOS 340ms.
   *
   * ⚠️ ES OTRO CIERRE, NO EL MISMO CON MENOS TIEMPO. `cerrar()` está pensado
   * para quedarte donde estás: el panel espera a que el contenido lo tape, y por
   * eso el retardo. Cuando te vas a otra pantalla ese contenido deja de existir
   * — animarlo es animar un fantasma, y encima choca contra el `flotar` de la
   * pantalla que llega. Eso es lo que se veía en la captura de Matías (02/08):
   * Notas ya dibujada, corrida a la derecha, con el Home asomando al costado.
   *
   * El `data-menu-salto` apaga la transición del contenido por un frame, para
   * que vuelva a su lugar sin viaje. Se saca enseguida: si quedara puesto, el
   * próximo cierre en el lugar perdería su animación.
   */
  function cerrarAlNavegar() {
    const raiz = document.documentElement;
    // ⚠️ LOS DOS ATRIBUTOS SE TOCAN ACÁ, SINCRÓNICOS, y no se deja que lo haga el
    // efecto de `visible`. Los `useEffect` corren DESPUÉS del paint, o sea
    // después de los `requestAnimationFrame` de abajo: si el desplazamiento se
    // quitara ahí, el `menu-salto` ya no estaría puesto y el contenido volvería
    // deslizándose igual. El orden importa más que el lugar.
    raiz.dataset.menuSalto = '1';
    delete raiz.dataset.menu;
    setVisible(false);
    setAbierto(false);
    // Dos frames: uno para que el navegador aplique el salto, otro para
    // devolverle la transición al próximo cierre en el lugar.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => delete raiz.dataset.menuSalto);
    });
  }

  // Red por si algo navega sin pasar por un link del panel (el botón del
  // sistema, un `router.push` de otro lado): con la ruta nueva, el menú no tiene
  // por qué seguir abierto.
  useEffect(() => {
    setVisible(false);
    setAbierto(false);
  }, [ruta]);

  function cerrar() {
    setVisible(false);
    // ⚠️ 340ms y no 260: el contenido tarda 300ms en volver a su lugar
    // (`.desplaza-menu`). Si el panel se desmontara antes, durante ese resto se
    // veía el fondo de la app en el hueco y el cierre quedaba con un parpadeo
    // raro — lo marcó Matías. **El panel se va DESPUÉS de que el contenido lo
    // tapó**, no al mismo tiempo.
    setTimeout(() => setAbierto(false), 340);
  }

  // En una vista enfocada no se muestra el trigger. Son dos casos:
  //  - un chat abierto, que tiene su propio back;
  //  - las pantallas de TAREA (transcribir, editar la rueda, personalidad…),
  //    donde lo que corresponde no es navegar a otro lado sino salir. Ahí la
  //    esquina la ocupa la cruz de BotonCerrar, en el mismo lugar donde estaría
  //    la hamburguesa: nunca las dos juntas.
  const esTarea = RUTAS_TAREA.some((r) => ruta.startsWith(r));
  if (/^\/chat\/\d+/.test(ruta) || esTarea) return null;

  return (
    <>
      {/* El trigger es UNO SOLO: abre, y con el menú abierto se convierte en cruz
          y cierra. Antes había que ir a buscar otra X adentro del panel. Va por
          encima del panel (z-60) justamente para seguir estando ahí. */}
      <button
        type="button"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        // ── ⚠️⚠️ EN EL HOME BAJA, PARA DEJARLE LA ESQUINA A LA RACHA (18/08) ──
        // Matías: *"bajaría el botón de hamburguesa a la altura donde termina el
        // texto de abajo de Mati, y arriba pondría la racha"*.
        //
        // ⚠️ SOLO EN EL HOME, y eso es a propósito: en Notas o Seguimiento el
        // título arranca arriba de todo y no hay ninguna racha que ubicar, así
        // que bajarlo ahí sería moverlo sin motivo y encima lo dejaría encima de
        // las pestañas.
        //
        // ⚠️ EL `right` ES EL MISMO QUE EL DE LA RACHA (ver `AsistenteEntrada`):
        // un solo carril escrito en dos lugares. Si cambia uno, cambia el otro.
        className={`glass-ios fixed right-[max(14px,calc(50%-210px))] z-[60] flex size-[46px] items-center justify-center rounded-full transition-colors duration-[220ms] ${
          // ── ⚠️⚠️ UNA SOLA ALTURA, Y ES LA DE SIEMPRE (18/08) ─────────────
          // Matías puso dos reglas el mismo día:
          //   1. *"tiene que estar siempre a la misma altura en todos los menús"*
          //   2. *"nunca debe superponer nada"*
          //
          // 👉 SE PROBÓ BAJARLO A 66-112px PARA DEJARLE LA ESQUINA A LA RACHA, Y
          // LAS DOS REGLAS CHOCAN AHÍ: medido en `/actividades`, a esa altura el
          // botón **pisa la pestaña "Objetivos" 23x15px**. Y no es solo esa
          // pantalla: todos los títulos y barritas de la app están maquetados
          // alrededor de este botón donde siempre estuvo.
          //
          // Bajarlo de verdad significa correr hacia abajo el encabezado de
          // TODAS las pantallas ~90px, o sea dejar esa franja vacía arriba en
          // cada una. Es una decisión de producto, no un ajuste — así que el
          // botón se queda donde estaba y **la racha se acomoda a su izquierda**
          // (ver `AsistenteEntrada`), que respeta las dos reglas sin mover nada
          // más.
          'top-[calc(max(12px,env(safe-area-inset-top))_+_36px)]'
        } ${visible ? 'text-white' : 'text-tinta'}`}
        // ⚠️ EL ROJO VA INLINE Y NO COMO `bg-alerta`. `.glass-ios` está escrita
        // FUERA de todo @layer en globals.css, y en la cascada una regla sin
        // capa le gana a cualquier utilidad de Tailwind (que vive en
        // @layer utilities), tenga la especificidad que tenga. Con la clase, el
        // botón seguía translúcido: no se veía ningún cambio.
        // Regla para la próxima: para pisarle algo a .glass-ios o .glass-tinte,
        // estilo inline. Para las tarjetas comunes, la clase alcanza.
        style={
          visible
            ? {
                background: 'var(--color-alerta)',
                borderColor: 'rgba(255,255,255,.38)',
                boxShadow: '0 8px 22px rgba(229,72,77,.42)',
              }
            : undefined
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[20px] transition-transform duration-[280ms]" style={{ transform: visible ? 'rotate(90deg)' : 'none' }}>
          {visible ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>

      {abierto && (
        <>
          {/* Un paño transparente sobre el contenido corrido: cualquier toque
              afuera cierra. No lleva oscurecido fuerte — el contenido no está
              tapado, está al costado. */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrar}
            // z-50: por encima del contenido (30) Y del composer (40). Si
            // quedara debajo del composer se podría escribir con el menú
            // abierto, que es justo lo que un paño de cierre tiene que evitar.
            // ⚠️ ARRANCA DONDE TERMINA EL PANEL, no en el borde izquierdo. Con
            // `inset-0` tapaba TAMBIÉN el menú y se veía todo gris, incluido lo
            // que acabás de abrir (lo marcó Matías). Lo que se atenúa es el
            // contenido que quedó a un costado, nada más.
            style={{ left: 'var(--menu-ancho)' }}
            className={`fixed inset-y-0 right-0 z-50 bg-[rgba(28,28,43,.14)] transition-opacity duration-[250ms] ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <aside
            onTouchStart={(e) => {
              const t = e.touches[0];
              arrastre.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchMove={(e) => {
              const ini = arrastre.current;
              if (!ini) return;
              const t = e.touches[0];
              const dx = t.clientX - ini.x;
              const dy = t.clientY - ini.y;
              if (dx < -48 && Math.abs(dx) > Math.abs(dy) + 12) {
                arrastre.current = null;
                cerrar();
              }
            }}
            onTouchEnd={() => {
              arrastre.current = null;
            }}
            // EL PANEL NO SE MUEVE: está quieto en el borde izquierdo y lo que
            // se corre es la app. Por eso no tiene animación de entrada — la
            // animación es del contenido, que lo va destapando.
            // z-20 lo deja DEBAJO del contenido (z-30) mientras se corre.
            className="fixed bottom-0 left-0 top-0 z-20 flex flex-col overflow-hidden bg-white pt-[calc(env(safe-area-inset-top)+18px)]"
            style={{ width: 'var(--menu-ancho)' }}
          >
            <div className="px-5 pb-4">
              {/* La marca en la serif y en grande: es el nombre de la app, no una
                  etiqueta más. En mono a 13px se perdía entre los renglones. */}
              <span className="font-serif text-[29px] font-bold tracking-[-1.1px] text-tinta">Tegmento</span>
            </div>

            <div className="px-4">
              {/* `?nuevo=1`: sin esto, "Nuevo chat" te llevaba al Home y el
                  primer mensaje CONTINUABA el chat reciente (ver POST
                  /api/chat). El botón tiene que cumplir lo que dice. */}
              <Link
                href="/chat?nuevo=1"
                onClick={cerrarAlNavegar}
                className="grad-iris flex items-center justify-center gap-2 rounded-[14px] py-3 font-mono text-[13px] font-bold tracking-[0.3px] text-white shadow-[0_6px_16px_rgba(108,120,238,.35)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo chat
              </Link>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto px-2.5">
              {/* Buscar CON FONDO GRIS, como un campo y no como un renglón más
                  (30/07, Matías: *"le agregaría el rectángulo del botón, para
                  que se lea como algo distinto"*). El aire debajo solo no
                  alcanzaba: sin la caja seguía pareciendo el primero de la
                  lista. Es lo único de acá que es una ACCIÓN, no un destino. */}
              <Link
                href={BUSCAR.href}
                onClick={cerrarAlNavegar}
                className={`mb-4 flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-medium ${
                  ruta.startsWith(BUSCAR.href) ? 'bg-iris-soft text-iris-deep' : 'bg-lavanda-2/60 text-niebla'
                }`}
              >
                <span className={ruta.startsWith(BUSCAR.href) ? 'text-iris' : 'text-niebla'}>{BUSCAR.icono}</span>
                {BUSCAR.etiqueta}
              </Link>

              {ITEMS.map((it) => {
                const activo = ruta.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={cerrarAlNavegar}
                    className={`flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-medium ${
                      activo ? 'bg-iris-soft text-iris-deep' : 'text-tinta'
                    }`}
                  >
                    <span className={activo ? 'text-iris' : 'text-iris/70'}>{it.icono}</span>
                    {it.etiqueta}
                    {it.premium ? (
                      /* Ámbar y no lila: el lila es la identidad de la app y lo
                         usa "nuevo". Si las dos insignias fueran del mismo color
                         se leerían como la misma cosa, y una dice "recién
                         llegado" y la otra "esto se paga". */
                      <span className="ml-auto flex-none rounded-[6px] bg-oro-tint px-[7px] py-0.5 font-mono text-[9.5px] font-bold text-oro">
                        premium
                      </span>
                    ) : (
                      it.nuevo && (
                        <span className="ml-auto flex-none rounded-[6px] bg-iris-soft px-[7px] py-0.5 font-mono text-[9.5px] font-bold text-iris">
                          nuevo
                        </span>
                      )
                    )}
                  </Link>
                );
              })}

              {/* ── ⚠️⚠️ ACÁ HABÍA UNA FILA "HERRAMIENTAS" QUE SE DESPLEGABA (11/08)
                  Matías: *"sacaría el apartado Descubrir de herramientas, y como
                  herramientas quedaría solo Calendario. Dejaría de mostrar
                  Herramientas y mostraría directamente Calendario"*.

                  ⚠️ **UN GRUPO CON UN SOLO HIJO NO ES UN GRUPO**: es un toque de
                  más para llegar a lo mismo. La caja tenía sentido cuando
                  guardaba cinco pantallas que nadie visita por su cuenta; se fue
                  vaciando sola —Cómo se lee, Probando, Calma, Foco y Polaridad
                  pasaron a ser hashtags el 05/08; Patrones y Ánimo se borraron—
                  y quedó envolviendo a Calendario y a Descubrir.

                  ⚠️ DESCUBRIR NO SE BORRA, SE SACA DEL MENÚ. La pantalla sigue
                  existiendo en `/descubrir`: lo que se saca es la puerta, que es
                  distinto de borrar la función. Si vuelve a hacer falta, es una
                  línea. */}
              <Link
                href="/calendario"
                onClick={cerrarAlNavegar}
                className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[15px] font-medium ${
                  ruta.startsWith('/calendario') ? 'bg-iris-soft text-iris-deep' : 'text-tinta'
                }`}
              >
                <span className={ruta.startsWith('/calendario') ? 'text-iris' : 'text-iris/70'}>{IconCalendario}</span>
                Calendario
              </Link>

              {/* ── HERRAMIENTAS CHAT (05/08) ─────────────────────────────────
                  Va al final, como pidió. ⚠️ Es OTRA caja y no más ítems de la
                  de arriba, aunque se parezcan: las de arriba te llevan a una
                  pantalla y estas te dejan escribiendo en el chat. Mezcladas,
                  tocarías dos cosas iguales esperando lo mismo y pasaría algo
                  distinto — que es lo que hace que un menú deje de entenderse. */}
              <button
                type="button"
                onClick={() => setHerramientasChat((v) => !v)}
                aria-expanded={herramientasChat}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[15px] font-medium text-tinta"
              >
                <span className="text-iris/70">{IconHerramientasChat}</span>
                Herramientas chat
                <span
                  className={`ml-auto text-niebla-2 transition-transform duration-200 ${herramientasChat ? 'rotate-90' : ''}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
              {herramientasChat && (
                <div className="ml-[18px] pl-2">
                  {HERRAMIENTAS_DEL_CHAT.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        cerrarAlNavegar();
                        // El composer vive en el layout, así que ya está montado
                        // en cualquier pantalla: no hace falta navegar a /chat
                        // para escribirle. El rAF le da un cuadro al menú para
                        // cerrarse antes de que suba el teclado.
                        requestAnimationFrame(() =>
                          window.dispatchEvent(new CustomEvent('escribir-en-composer', { detail: `#${it.id} ` })),
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[14px] font-medium text-tinta-soft"
                    >
                      {/* ⚠️ EL DIBUJO SALE DE `IconoHerramienta`, el mismo que
                          usan el chip del mensaje y la pastilla del composer.
                          Antes acá se pasaba un `icono` propio de la lista
                          copiada, o sea un cuarto lugar donde el ícono de una
                          herramienta podía quedar distinto. */}
                      <span className="text-iris/55">
                        <IconoHerramienta h={it} className="size-[19px]" />
                      </span>
                      {it.etiqueta}
                      <span className="ml-auto font-mono text-[11px] text-niebla-2">#{it.id}</span>
                    </button>
                  ))}
                  <p className="px-3 pb-1 pt-1 text-[11.5px] leading-snug text-niebla-2 text-pretty">
                    Se abren en el chat. Podés escribir al lado del hashtag.
                  </p>
                </div>
              )}

              {/* HISTORIAL, JUSTO ARRIBA DE "SEGUÍ CON" (30/07, Matías:
                  *"Historial pensaba que queda arriba de Seguí con, entonces
                  tiene relación"*). Y tiene razón: los dos son la misma cosa
                  —tus charlas— a distinta escala. Pegados se leen como un
                  bloque; separados, "Seguí con" quedaba huérfano y el link de
                  abajo ("Ver los otros N") era la única puerta al Historial. */}
              <Link
                href="/historial"
                onClick={cerrarAlNavegar}
                className={`mt-4 flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-medium ${
                  ruta.startsWith('/historial') ? 'bg-iris-soft text-iris-deep' : 'text-tinta'
                }`}
              >
                <span className={ruta.startsWith('/historial') ? 'text-iris' : 'text-iris/70'}>
                  <IconHistorial className="size-[21px]" />
                </span>
                Historial
              </Link>

              {/* Los últimos chats, como en Claude: volver a lo que venías
                  hablando sin pasar por el Historial.
                  DOS, y el resto detrás del link (28/07, pedido de Matías).
                  Con veinte, el menú era una lista de chats con los lugares de
                  la app perdidos arriba de todo. Dos alcanzan para "seguí con
                  lo último"; para buscar de verdad está el Historial. */}
              {/* INDENTADO BAJO HISTORIAL (30/07, Matías: *"con un espaciado
                  en el lateral, bien directo abajo de Historial, entonces se
                  entiende que es parte de lo mismo"*). Mismo recurso que usan
                  Herramientas y Ajustes al desplegarse: la sangría dice
                  "esto cuelga de lo de arriba" sin necesidad de un rótulo. */}
              {chats.length > 0 && (
                <div className="ml-[18px] pl-2">
                  {/* El día va al costado de cada uno y no como rótulo que
                      agrupa: con dos filas, dos encabezados de día son más
                      rótulo que contenido. */}
                  {chats.slice(0, CHATS_EN_MENU).map((c) => (
                    <Link
                      key={c.id}
                      href={`/chat/${c.id}`}
                      onClick={cerrarAlNavegar}
                      className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[14px] text-tinta-soft"
                    >
                      <span className="flex-none text-niebla-2">{IconChat}</span>
                      <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
                      <span className="flex-none font-mono text-[10px] text-niebla-3">{etiquetaDia(c.ultimaActividad)}</span>
                    </Link>
                  ))}
                  {totalChats > CHATS_EN_MENU && (
                    <Link
                      href="/historial"
                      onClick={cerrarAlNavegar}
                      className="flex items-center gap-1 px-3 py-2 font-mono text-[11px] font-semibold text-iris"
                    >
                      {`Ver los otros ${totalChats - CHATS_EN_MENU}`}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </Link>
                  )}
                </div>
              )}

              {PROXIMOS.length > 0 && (
                <p className="mb-1 mt-5 px-3 font-mono text-[11px] font-semibold tracking-[0.3px] text-niebla">Pronto</p>
              )}
              {PROXIMOS.map((it) => (
                <div key={it.etiqueta} className="flex items-center gap-3 rounded-[12px] px-3 py-3 text-[15px] font-medium text-niebla opacity-70">
                  <span className="text-niebla">{it.icono}</span>
                  {it.etiqueta}
                  <span className="ml-auto rounded-lg bg-lavanda px-2 py-0.5 font-mono text-[11px] font-semibold text-niebla">pronto</span>
                </div>
              ))}

            </nav>

            {/* AJUSTES, FUERA DEL SCROLL Y PEGADO ABAJO (30/07, Matías: *"me
                gusta que esté tan abajo, pero en la app no está tan abajo"*).
                Estaba adentro del <nav>, así que quedaba donde terminara la
                lista: con pocos chats aparecía a media pantalla. Acá afuera
                queda anclado al pie del panel, siempre en el mismo lugar.
                Configurar la app no es usarla — por eso vive separado del
                resto por un borde. */}
            <div className="border-t border-iris-borde px-2.5 pt-1.5">
              {/* Ajustes detrás de una ruedita (27/07, pedido de Matías): configurar
                  la app se busca cuando se busca, no se mira todos los días. */}
              {ajustes && (
                <div className="ml-[18px] pl-2">
                  {AJUSTES.map((it) => {
                    const activo = ruta.startsWith(it.href);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        onClick={cerrarAlNavegar}
                        className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-medium ${
                          activo ? 'bg-iris-soft text-iris-deep' : 'text-tinta-soft'
                        }`}
                      >
                        <span className={activo ? 'text-iris' : 'text-iris/55'}>{it.icono}</span>
                        {it.etiqueta}
                      </Link>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => setAjustes((v) => !v)}
                aria-expanded={ajustes}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[15px] font-medium text-tinta"
              >
                <span className="text-iris/70">{IconAjustes}</span>
                Ajustes
                {/* La flecha apunta ARRIBA al abrirse, porque la lista crece
                    hacia arriba: es lo último del panel y no tiene lugar abajo. */}
                <span className={`ml-auto text-niebla-2 transition-transform duration-200 ${ajustes ? '-rotate-90' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
            </div>

            {/* ⚠️ EL CÓDIGO DE ATRÁS ES EL QUE SIRVE, no el "v0.1". Es el commit
                con el que está corriendo la app: si algo se rompe, ese código es
                el punto exacto al que volver. El "v0.1" queda porque nombra la
                etapa, pero solo se mueve a mano y por eso no dice nada solo. */}
            <p className="px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-1 font-mono text-[11px] text-niebla-3">
              Tegmento · v0.1 · {process.env.NEXT_PUBLIC_COMMIT}
              {process.env.NEXT_PUBLIC_COMMIT_FECHA ? ` · ${process.env.NEXT_PUBLIC_COMMIT_FECHA}` : ''}
            </p>
          </aside>
        </>
      )}
    </>
  );
}

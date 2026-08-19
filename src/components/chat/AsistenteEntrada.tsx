'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HojaRegistro, type TipoHoja } from '@/components/captura/HojaRegistro';
import { TarjetaQueFrena, type LoQueFalta } from '@/components/cuerpo/TarjetaQueFrena';
import { AvisoRitualHome } from '@/components/chat/AvisoRitualHome';
import type { EstadoRitual, LoCargado } from '@/lib/ritual';
import { MesDeUso } from '@/components/chat/MesDeUso';
import { Racha } from '@/components/chat/Racha';
import { ChipsDeHoy } from '@/components/chat/ChipsDeHoy';
import type { ChipDeHoy } from '@/lib/chips-hoy';
import { EVENTO_HOJA, type TarjetaBot } from '@/components/chat/TarjetasBot';
import { publicarBaraja } from '@/lib/canal-bot';

import { GLIFO_LUNA, GLIFO_MANZANA, GLIFO_PULSO, GLIFO_SEGUIMIENTO } from '@/components/ui/glifos';
import { AvatarIA } from '@/components/ui/AvatarIA';


// ⚠️ LOS ANILLOS DE "HOY" YA NO VIVEN ACÁ (27/07). Se fueron a Cuerpo, que es
// donde vive el tracker: el Home quedó para el diario y la charla. El tipo y el
// componente están en `components/cuerpo/AnillosHoy.tsx`.


// Destacado grande "che, mirá esto": una feature por vez, descartable.
// Si trae `hoja`, abre el registro en una hoja sin salir del chat.
export type Spotlight = {
  id: string;
  titulo: string;
  sub: string;
  cta: string;
  href: string;
  hoja?: TipoHoja;
  icono: 'cuerpo' | 'sueno' | 'checkin' | 'relaciones' | 'actividad';
  /**
   * SE MARCA DE UN TOQUE, ACÁ MISMO.
   *
   * Pedido de Matías (30/07): *"cuando me recuerda algo que tengo que hacer, que
   * no me ponga a contestar, sino que me dé la opción de tocar y que se marque
   * solo"*.
   *
   * ⚠️ ES EL TERCER INTENTO DE LO MISMO, y conviene leer los dos anteriores para
   * no volver atrás. Primero la tarjeta abría la hoja de registro en blanco, que
   * pedía TIPEAR qué hiciste (absurdo: la tarjeta ya sabe cuál es, lo dice en el
   * título). Después se cambió por mandarte a Seguimiento, donde la actividad ya
   * está y se marca de un toque — mejor, pero te saca del Home y te hace buscarla
   * en una lista. Con el id, el toque pasa a ser acá.
   */
  lineaId?: number;
};

// Chips de entrada rápida: los de registro abren hoja; los de charla mandan mensaje.
export type QuickChip = {
  texto: string;
  icono: 'animo' | 'sueno' | 'gasto' | 'idea' | 'comida' | 'hecho' | 'energia';
  hoja?: TipoHoja;
  prompt?: string;
  hecho?: boolean; // ya registrado hoy: se muestra con tilde
  /** Lleva a una pantalla en vez de registrar algo. Lo usa el chip de
   *  Seguimiento, que es una puerta y no un registro. */
  href?: string;
  tint: string;
  color: string;
};


// ⚠️ ACÁ VIVÍA `ICONO_SPOTLIGHT`, EL MAPA DE ÍCONOS DEL DESTACADO, Y MURIÓ EL
// 31/07 CUANDO EL DESTACADO SE MUDÓ A LA BARAJA DEL BOT (`TarjetasBot`).
// Mientras "Hoy toca X" fue una tarjeta propia de este archivo, el ícono lo
// elegía este `Record`; desde que es una tarjeta más del bot, lo pone la baraja
// y acá no quedó nadie que lo leyera.
//
// Sobrevivió una semana porque nada lo delata: un objeto sin usar no es un
// error de `tsc` como sí lo sería un import roto, así que se siguió *editando*
// —el 06/08 le pasamos `actividad` a `GLIFO_TILDE_CAJA`— código que ya no
// dibujaba nada. Lo mismo que el chip "ticket" del 03/08 unas líneas más abajo:
// **cuando algo se muda hay que seguir a quién lo usaba, no solo qué compila.**
//
// El tipo `Spotlight` NO se va: `chat/page.tsx` sigue armando los candidatos
// con él (`ritual`, `deHoy`, `faltantes`, `features`).

const ICONO_CHIP: Record<QuickChip['icono'], React.ReactNode> = {
  animo: (
    <>
      <circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <path d="M8.5 14.5a4 4 0 0 0 7 0" />
    </>
  ),
  sueno: GLIFO_LUNA,
  // El mismo billete que Finanzas usa en el menú lateral: un concepto, un dibujo.
  // Reemplazó al del ticket, que se fue con el pipeline el 03/08.
  gasto: <path d="M4 5h16v14l-2.5-1.5L15 19l-3-1.5L9 19l-2.5-1.5L4 19z M8 9h8M8 12.5h5" />,
  idea: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.3-1 2.1H9.5c0-.8-.4-1.6-1-2.1A6 6 0 0 1 12 3z" />,
  comida: GLIFO_MANZANA,
  // ⚠️ LAS MISMAS TRES BARRITAS DE LA PESTAÑA (31/07, Matías: *"el de Seguimiento
  // tiene el ícono viejo"*). Cuando la barra de abajo cambió el tilde-en-caja por
  // las barras, este chip quedó con el dibujo viejo: dos íconos distintos para el
  // mismo destino, que es exactamente la regla que él puso el 26/07.
  // ⚠️ Y DESDE EL 06/08 ES EL MISMO TRAZO, NO UNA COPIA IGUALITA. Estaba
  // redibujado a mano acá: el arreglo del 31/07 sincronizó los dos dibujos pero
  // dejó dos fuentes, o sea que el problema podía volver solo. Ahora sale de
  // `glifos.tsx` y ya no hay dos lugares que se puedan despegar.
  hecho: GLIFO_SEGUIMIENTO,
  energia: GLIFO_PULSO,
};

export function AsistenteEntrada({
  fecha,
  greeting,
  chips = [],
  actividades = [],
  usoPorDia = {},
  hechoHoy = [],
  tarjetas = [],
  tareasPendientes = [],
  forzarNuevo = false,
  frena = null,
  racha = 0,
  chipsHoy = { visibles: [], resto: 0 },
  ritual = null,
  cargadoHoy = null,
}: {
  fecha: string;
  greeting: string;
  chips?: QuickChip[];
  actividades?: { id: number; titulo: string }[];
  /** Cuántas cosas registraste cada día del mes (YYYY-MM-DD → cantidad).
   *  Cuenta mensajes, marcas, ánimo y cuerpo: todo eso es usar la app.
   *  ⚠️ De acá sale también la racha (05/08) — misma fuente, para que "un día de
   *  uso" no tenga dos definiciones que se desincronicen. */
  /**
   * Lo que escribiste hace un tiempo, para devolvértelo. Ver `lib/relectura`.
   * La primera es la de hoy; el resto son a las que llegás con "Otro recuerdo".
   * Vacío cuando no hay nada relegible —al principio va a ser lo normal— o
   * cuando cerraste la tarjeta hoy.
   */
  usoPorDia?: Record<string, number>;
  /** Qué anotaste hoy, ya en palabras ("ánimo", "2 comidas"). Para la listita de
   *  la tarjeta del mes. Se arma en `chat/page` con datos que ya tenía. */
  hechoHoy?: string[];
  /**
   * CUÁNTOS DÍAS SEGUIDOS LLEVÁS, ya contados.
   *
   * ⚠️ LLEGA COMO NÚMERO Y NO COMO LA LISTA DE DÍAS (07/08). Antes venía el
   * array y `MesDeUso` hacía la cuenta adentro, porque la llama vivía ahí. Ahora
   * la llama está arriba, al lado del saludo, y el mes al pie: si cada uno
   * siguiera calculando lo suyo, serían dos cuentas de la misma cosa en dos
   * componentes. La cuenta se hace una vez, en el server.
   *
   * ⚠️ Y NO SON LOS DÍAS DE USO. La racha cuenta solo lo que viniste a CONTAR
   * —escribir o registrar el ánimo—; los cuadraditos del mes cuentan todo. Ver
   * la nota larga en `chat/page`: medido con sus datos, contar todo daba 25 y
   * esto daba 16, y el honesto es el segundo.
   */
  racha?: number;
  /**
   * LAS ACTIVIDADES DEL DÍA, para marcarlas de un toque. La regla que decide
   * cuáles entran vive en `lib/chips-hoy` y tiene tests.
   */
  chipsHoy?: { visibles: ChipDeHoy[]; resto: number };
  /** El ritual: si está prendido y a qué hora. `null` = no mostrar avisos. */
  ritual?: EstadoRitual | null;
  /** Qué cargó hoy, para saber si el aviso tiene algo que pedir. */
  cargadoHoy?: LoCargado | null;
  /** La baraja del bot: todo lo que tiene para decirte, una tarjeta a la vez.
   *  Ver `TarjetasBot`. */
  tarjetas?: TarjetaBot[];
  /** Títulos de las tareas de una sola vez que siguen abiertas. */
  tareasPendientes?: string[];
  /** Viene de `?nuevo=1` (botón "Nuevo chat"): abre uno limpio en vez de seguir
   *  el último. Llega como prop desde el server y NO por `useSearchParams`:
   *  ese hook obliga a envolver el componente en <Suspense> o rompe el build. */
  forzarNuevo?: boolean;
  /** Lo que falta registrar hoy, para la tarjeta que frena (1.8). null = nada
   *  que decir, y entonces no aparece. */
  frena?: LoQueFalta | null;
}) {
  const router = useRouter();
  const [pensando, setPensando] = useState(false);
  const [hoja, setHoja] = useState<TipoHoja | null>(null);
  // Lecturas de la IA tras guardar un registro: burbujas que se suman al hilo.
  const [lecturas, setLecturas] = useState<string[]>([]);

  // ⚠️ La pregunta contextual pasó por dos lugares antes de encontrar el suyo:
  // fue burbuja en el Home, después placeholder del composer (mal: un
  // placeholder no se contesta), y ahora es `MensajeProactivo` — la app te la
  // dice de a una y rotando, en vez de ofrecerte cinco para elegir.

  /**
   * ── ⚠️⚠️ EL BOT SE MUDÓ A LA BARRA DE ESCRIBIR (12/08, propuesta C) ────────
   *
   * Acá se dibujaba `<TarjetasBot>`: una tarjeta de vidrio, arriba de todo, con
   * la pregunta y sus botones adentro. Ahora la pregunta se acopla arriba del
   * campo de texto y forma una sola pieza con él — *contestarle al bot y anotar
   * pasan a ser el mismo gesto*.
   *
   * ⚠️ EL HOME SIGUE SIENDO EL DUEÑO DE LOS DATOS. Lo único que cambió es dónde
   * se dibujan: las tarjetas las arma el server acá al lado (`chat/page.tsx`) y
   * bajan como prop, igual que siempre. Esto solo se las pasa a la barra, que
   * vive en el layout y no las puede recibir por prop.
   *
   * ⚠️ SE PUBLICA `[]` AL DESMONTARSE, y no es limpieza de rutina: sin eso la
   * pregunta del Home te seguiría a Notas, a Relaciones y a Seguimiento, que es
   * justo lo que la baraja nunca hizo.
   *
   * ⚠️ Y SE CALLA MIENTRAS HAY UNA LECTURA. Es la regla que ya tenía el render
   * viejo (`lecturas.length === 0 && …`): si acabás de registrar algo y la app
   * te está devolviendo una lectura, el bot no interrumpe con otra cosa.
   */
  /**
   * ⚠️⚠️ YA NO SE BORRA AL SALIR DEL HOME (13/08) — y esto DA VUELTA la decisión
   * que estaba escrita arriba.
   *
   * Decía: *"se publica [] al desmontarse, y no es limpieza de rutina: sin eso
   * la pregunta del Home te seguiría a Notas, a Relaciones y a Seguimiento"*.
   * Era correcto **cuando la baraja era una tarjeta del Home**. Dejó de serlo el
   * 12/08, cuando el bot se mudó a la barra: la barra vive en el LAYOUT y está
   * en todas las pantallas, así que el bot ahora es global y la pregunta lo es
   * con él.
   *
   * Matías: *"solo se ve en el home bien, después en las otras pantallas no…
   * debería ser algo independiente a todo, se debería ver en todas las pantallas
   * igual"*.
   *
   * 👉 Cuarto caso en dos días del mismo patrón: **una pieza se muda y una regla
   * suya se queda apuntando al lugar viejo.** Antes fueron los botones, el botón
   * "Contestar" y el estado vacío. Esta regla seguía protegiendo un límite —el
   * borde del Home— que la mudanza ya había borrado.
   *
   * ⚠️ LO QUE QUEDA CORTO Y HAY QUE SABERLO: las tarjetas las sigue calculando
   * `chat/page.tsx`, así que **si abrís la app directo en Notas y nunca pasás por
   * el Home, el bot arranca sin nada**. El arreglo de fondo es que las arme el
   * layout, que es donde vive la barra. No se hizo acá porque son ~40 consultas
   * enredadas con el resto de la página, y moverlas a ciegas es cómo se rompen
   * cosas que hoy andan.
   */
  useEffect(() => {
    publicarBaraja(lecturas.length === 0 ? tarjetas : []);
  }, [tarjetas, lecturas.length]);

  /**
   * ⚠️⚠️ LA LECTURA SE LIMPIA CUANDO LLEGAN DATOS NUEVOS (13/08). Sin esto el bot
   * se callaba PARA SIEMPRE, y fue exactamente lo que reportó Matías: *"¿por qué
   * no me aparecen más cosas que habla el bot? Antes aparecía algo, preguntaba, y
   * ahora no hay nada"*.
   *
   * El agujero: `setLecturas([lectura])` se llama al guardar desde la hoja
   * (`onGuardado`) y **no había una sola línea en todo el archivo que lo
   * vaciara**. `router.refresh()`, que corre justo después, trae datos nuevos del
   * server pero no toca el estado de React.
   *
   * ⚠️ Y lo que lo hacía invisible como bug: `lecturas` NO SE DIBUJA EN NINGÚN
   * LADO. Sus tres usos son ocultamientos —la baraja del bot, `MesDeUso` y
   * `Relectura`—. O sea que registrabas una comida y **tres cosas desaparecían de
   * la pantalla para siempre, para no interrumpir una lectura que nadie ve**.
   * Un estado que solo apaga cosas y nunca muestra nada es la clase de bug que no
   * se encuentra mirando la pantalla: no aparece nada raro, falta algo.
   *
   * La regla de fondo se respeta igual —no interrumpir mientras la app te
   * devuelve algo—, pero ahora dura lo que tiene que durar: hasta que el refresh
   * trae la pantalla nueva. `tarjetas` cambia de referencia en cada render del
   * server, así que es la señal exacta de "ya llegó lo nuevo".
   */
  useEffect(() => {
    setLecturas((previas) => (previas.length === 0 ? previas : []));
  }, [tarjetas]);

  /**
   * La hoja de registro la abre el bot desde la barra. Vive acá porque es la
   * misma que usan los chips de "Anotar rápido": **una sola hoja para las dos
   * puertas**, no dos copias que se desincronizan.
   */
  useEffect(() => {
    const abrir = (e: Event) => setHoja(String((e as CustomEvent).detail ?? '') as TipoHoja);
    window.addEventListener(EVENTO_HOJA, abrir);
    return () => window.removeEventListener(EVENTO_HOJA, abrir);
  }, []);

  // Avisa a la barra de escritura que hay una respuesta en camino: la barra se
  // ilumina y dice "pensando…", siempre a la vista (antes el aviso quedaba
  // abajo de todo y se perdía al scrollear).
  function avisarBarra(v: boolean) {
    window.dispatchEvent(new CustomEvent('composer-pensando', { detail: v }));
  }

  async function crear(contenido: string) {
    if (pensando) return;
    setPensando(true);
    avisarBarra(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido, ...(forzarNuevo ? { continuar: false } : {}) }),
      });
      const data = await res.json();
      if (res.ok && data.chatId) {
        router.push(`/chat/${data.chatId}?hablar=1`);
      } else {
        setPensando(false);
        avisarBarra(false);
      }
    } catch {
      setPensando(false);
      avisarBarra(false);
    }
  }

  // ⚠️ ACÁ VIVÍA `fotoTicket`, que mandaba la foto a `/api/ticket`. Esa ruta se
  // borró el 03/08 con el pipeline entero, así que el chip quedó pegándole a un
  // 404 y NADIE LO NOTÓ: el middleware contestaba 401 antes de enrutar y parecía
  // un problema de sesión.
  //
  // **Lección: al borrar una función hay que seguir a quién la LLAMABA, no solo
  // qué la importaba.** `tsc` encontró los imports rotos en un segundo y no vio
  // este `fetch` porque una URL es un string. Lo que queda es el chip de Gasto,
  // que abre una hoja y no una cámara.

  // Pregunta contextual calma: una línea tappable con la chispa chica, sin
  // cartel ni "Tocá para responder". La presencia se siente sin gritar.
  function Burbuja({ texto, onTap }: { texto: string; vivo?: boolean; onTap?: () => void }) {
    const contenido = (
      <>
        {/* La cabeza, los ojos y las estrellas, todo en un lienzo (ver AvatarIA).
            Antes era un span redondo con el glifo adentro, y así las estrellas
            no podían salirse de la cabeza. */}
        <AvatarIA px={44} />
        <span className="min-w-0 flex-1 text-[15px] font-medium leading-[1.35] text-tinta text-pretty">{texto}</span>
        {onTap && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#c4c4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 flex-none">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </>
    );
    const clases = 'flex w-full items-center gap-2.5 border-b border-iris-borde py-3.5 pl-0.5 pr-1 text-left';
    return (
      <div className="mb-4">
        {onTap ? (
          <button type="button" onClick={onTap} className={clases}>
            {contenido}
          </button>
        ) : (
          <div className={clases}>{contenido}</div>
        )}
      </div>
    );
  }

  return (
    // ── ⚠️⚠️ ESTE PADDING ES EL MISMO NÚMERO QUE EL `top` DE LA HAMBURGUESA ──
    // Matías: *"el fueguito quedó más arriba que el menú de hamburguesa; yo
    // quería que queden alineados"*. La racha flota adentro de este bloque, así
    // que su altura la decide el padding de arriba de acá — y la hamburguesa es
    // `fixed` con `top: max(12px, safe-area) + 22px`.
    //
    // ── ⚠️⚠️ Y EL SAFE-AREA NO SE PUEDE REPETIR: EL PADRE YA LO GASTÓ ────────
    //
    // La primera versión copiaba literal la expresión de la hamburguesa
    // —`max(12px, safe-area) + 22px`— y en el navegador quedaba perfecta. En el
    // teléfono de Matías apareció **un hueco de 59px** entre el botón y el
    // fueguito: *"no sé por qué queda un espacio grande, tendría que estar
    // alineado"*.
    //
    // 👉 EL MOTIVO: la hamburguesa es `fixed`, o sea que su `top` se mide desde
    // el borde de la pantalla. Esto vive adentro de `(app)/layout`, que ya
    // aplica `pt-[env(safe-area-inset-top)]`. **El safe-area se sumaba dos
    // veces.** Con notch de 59px: el botón caía en 81 y el texto en 140.
    //
    // ⚠️ Y NO SE VEÍA EN EL NAVEGADOR NI CON EL PRESET DE MOBILE, porque ahí
    // `env(safe-area-inset-top)` vale 0 y las dos cuentas dan lo mismo. **Un bug
    // que solo existe donde hay muesca**: es el tipo de cosa que hay que mirar
    // en el teléfono, no en la ventana.
    //
    // La cuenta de acá descuenta lo que el padre ya puso:
    //   sin notch → max(12-0, 0) + 22 = 34  (igual que el botón)
    //   con notch → max(12-59, 0) + 22 = 22, y el padre ya puso 59 → 81 ✔
    //
    // ⚠️⚠️ LOS `_` SON ESPACIOS, Y SIN ELLOS ESTO NO FUNCIONA. En `calc()` el `-`
    // es un operador y **necesita espacio a los dos lados**: `12px-env(...)` se
    // parsea como un token roto, no como una resta, y el navegador descarta la
    // declaración entera — el padding se iba a cero y el fueguito volvía a
    // quedar desalineado. Tailwind convierte `_` en espacio; es la forma de
    // escribir un calc con restas en una clase arbitraria.
    <div className="pt-[calc(max(12px_-_env(safe-area-inset-top),0px)_+_22px)]">
      {/* Lo único de la app que se pone adelante sin que lo pidas. Una vez por
          día, y solo si falta algo de verdad. Ver la nota larga del componente. */}
      <TarjetaQueFrena falta={frena} />
      <div className="stagger px-[22px] pb-2">
        {/* ── EL SALUDO, CON LA RACHA AL LADO (07/08) ────────────────────────
            ⚠️ `pr-[52px]`: el botón de hamburguesa es un círculo FIJO de 46px
            arriba a la derecha (`Sidebar`, `z-[60]`). Sin este aire, el saludo
            —y sobre todo la llama, que va al final de la frase— se meten abajo
            del botón. Es también la razón por la que la racha va a la IZQUIERDA
            y no en la esquina, como se había dibujado primero. */}
        {/* ── ⚠️⚠️ LA RACHA VA EN EL FLUJO, NO FLOTANDO (18/08) ────────────────
            Matías: *"la racha no debería flotar ahí, la posición está bien pero
            debería estar en la página; entonces el 'Buenas tardes, Mati' va
            hacia abajo por el espacio. Si no, queda flotando y tapando el
            nombre"*.

            👉 **Y ES LA MISMA LECCIÓN QUE YA ESTÁ ESCRITA DOS VECES EN ESTE
            REPO.** La nota del 06/08 en `MesDeUso` cuenta que la racha flotando
            con un `pr-[62px]` puesto a mano se rompió dos veces (*"el texto
            aparece abajo del fueguito, está roto"*), y la conclusión de aquel
            día fue: **un padding que imita a un layout funciona hasta que
            aparece una línea más, y siempre aparece.** Yo la puse `fixed` esta
            misma tarde y volví a caer en lo mismo: el saludo no sabía que la
            racha estaba ahí, así que se le metía debajo.

            En flujo, el espacio lo reserva ella sola y el saludo baja porque
            tiene que bajar. Nadie mide nada.

            ⚠️ EL `pr-[56px]` SÍ ES UN NÚMERO A MANO, pero de otra cosa: esquiva
            a la HAMBURGUESA, que sigue siendo `fixed` (46px + 10 de aire). Ese
            botón está fuera del flujo por buenos motivos —vive en todas las
            pantallas y no depende de esta—, así que acá no hay nada que
            reservar más que su ancho.

            ⚠️ `empty:hidden`: `Racha` devuelve `null` con menos de dos días
            (ver su regla), y sin esto quedaría un renglón vacío con su margen
            empujando el saludo sin motivo. Se resuelve con el selector en vez de
            repetir acá el umbral, que es el tipo de número duplicado que después
            se desincroniza. */}
        <div className="mb-4">
          {/* ── ⚠️⚠️ LA RACHA FLOTA A LA DERECHA, Y EL TEXTO LA ESQUIVA (18/08) ──
              Tercera ubicación en una tarde, y cada corrección de Matías acotó
              la anterior:

               1. `fixed` en la esquina → *"no debería flotar ahí, debería estar
                  en la página; si no queda tapando el nombre"*.
               2. En flujo, pero en su propio renglón arriba → *"el fueguito
                  quedó más arriba que el menú de hamburguesa, y el texto queda
                  por debajo; queda medio raro todo"*.
               3. Esta: *"que quede alineado, y que del lado izquierdo el texto
                  caiga hacia abajo, que todo empiece a la misma altura; el
                  segundo renglón, cuando no puede seguir porque está el
                  fueguito, baja"*.

              👉 **ESO ES UN `float`, Y ES LA ÚNICA FORMA DE LOGRARLO.** Un
              renglón propio la pone ARRIBA del texto; un `fixed` no reserva
              lugar y el texto se le mete debajo. Flotando, la fecha y el primer
              renglón del saludo arrancan a su misma altura y se acortan; el
              segundo renglón, que ya pasó el alto del fueguito, usa el ancho
              completo. Es exactamente lo que describió.

              ⚠️ VA ANTES DEL TEXTO EN EL DOM, no después: un flotante solo
              desvía el contenido que viene DESPUÉS de él.

              ⚠️ `mr-[56px]`: esquiva a la hamburguesa, que sigue siendo `fixed`
              (46px + 10 de aire). Y por eso el `pr-[52px]` que este bloque
              llevaba se fue: era para lo mismo, y ahora lo reserva el flotante.
              Un solo lugar donde se esquiva ese botón.

              ⚠️ `empty:hidden` porque `Racha` devuelve `null` con menos de dos
              días. Sin esto quedaría un flotante vacío desviando el texto por
              nada. */}
          {/* ⚠️⚠️ EL FLOTANTE MIDE 46px, QUE ES EL ALTO DE LA HAMBURGUESA, Y LA
              RACHA VA CENTRADA ADENTRO (18/08). Medido en la app: los dos
              arrancaban en 34 —o sea alineados por arriba— pero la racha mide 42
              y el botón 46, así que sus centros caían en 55 y 57. Dos píxeles
              alcanzan para que se lea *"descentrado"*, que fue lo que Matías vio.

              👉 ALINEAR POR ARRIBA NO ES ALINEAR: dos piezas de distinto alto
              una al lado de la otra se comparan por el CENTRO. Dándole al hueco
              el alto del botón, quedan centradas por construcción y el día que
              la racha cambie de tamaño no hay que recalcular nada. */}
          <div className="float-right mr-[56px] empty:hidden">
            <Racha dias={racha} />
          </div>

          <p className="font-mono text-[12px] tracking-[0.2px] text-niebla">{fecha}</p>
          {/* ⚠️ SIN `text-balance` DESDE QUE HAY UN FLOTANTE AL LADO: balance
              reparte los renglones para que queden parejos, y con un flotante
              comiéndose el primero pelea con el envolver — deja el saludo
              cortado antes de tiempo. Acá el corte lo tiene que decidir el
              fueguito, no el balanceador. */}
          <h1 className="mt-1 font-serif text-[32px] font-semibold leading-[1.1] tracking-[-0.5px] text-tinta">
            {greeting}
          </h1>
          {/* ⚠️ LA LLAMA YA NO VA ACÁ (10/08). Estuvo dos días pegada al final
              del saludo; Matías la mandó a la esquina del bloque de seguimiento,
              que es de donde había salido. La forma "línea" de `Racha` queda
              construida por si alguna vez vuelve a hacer falta al lado de un
              texto — es la única posición donde la columna no entra. */}
        </div>

        {/* ── EL SEGUIMIENTO, ARRIBA DE TODO Y ABAJO DEL TÍTULO (10/08) ───────
            Pedido textual de Matías, con la racha en su esquina superior.

            ⚠️ ESTO MUEVE LO QUE EL 07/08 SE HABÍA BAJADO AL PIE, y conviene
            decirlo con todas las letras en vez de que parezca un descuido. Aquel
            argumento era sobre el ORDEN —*todo lo que había arriba pedía y nada
            devolvía*— y **sigue valiendo para el bot y la relectura**, que se
            quedan arriba y son lo que devuelve. Lo que él corrige es otra cosa:
            la racha y el mes le sirven **de un vistazo al abrir**, y para eso el
            pie es justo donde no se miran.

            El orden queda: título → seguimiento → bot → relectura → hoy de un
            toque → anotar rápido → ritual. */}
        {lecturas.length === 0 && <MesDeUso porDia={usoPorDia} hechoHoy={hechoHoy} />}

        {/* ── ⚠️⚠️ EL ORDEN DEL HOME CAMBIÓ (07/08) ──────────────────────────
            Queda así:
              1. el bot          2. la relectura     3. hoy, de un toque
              4. anotar rápido   5. el ritual        6. el mes, al pie

            **El diagnóstico salió de los datos, no del gusto**: 47 días de uso,
            43 marcó y 17 escribió, y la app le devolvió 16 análisis. El Home
            anterior era coherente con eso — *todo lo que había arriba pedía o
            informaba, y nada devolvía*.

            ⚠️ ESTO REVIERTE LA DECISIÓN DEL 30/07 de bajar el bot debajo de
            "Anotar rápido", y hay que decirlo con todas las letras. Aquel
            argumento —*el orden sigue al uso*— sigue siendo bueno y es suyo. Lo
            que cambió es que **arriba ahora hay algo que devuelve** (la
            relectura, del 07/08): el bot abre la conversación y la relectura le
            contesta con algo suyo, y meter la fila de chips entre las dos
            partiría al medio lo único de la pantalla que no pide nada.
            Y el uso queda igual de cerca: "hoy, de un toque" está tercero, a un
            scroll corto, y es MÁS rápido que antes para lo que él más hace
            —marcar— porque antes eso ni siquiera estaba en el Home.

            Si al verlo prefiere el orden viejo, es su llamada: el que abre la
            app treinta veces por semana es él. */}

        {/* ⚠️⚠️ EL BOT YA NO SE DIBUJA ACÁ: SE MUDÓ A LA BARRA DE ESCRIBIR
            (12/08). Ver la nota del `useEffect` que lo publica, más arriba.

            ⚠️ Y ESO CAMBIA EL ORDEN DEL HOME, que estaba peleado y escrito con
            todas las letras acá abajo. El orden del 07/08 era: **el bot abre**,
            y la relectura le contesta. Con el bot abajo, en la barra, el que
            abre ahora es la relectura — que es lo único de la pantalla que no
            pide nada, así que el argumento de aquel día (*arriba tiene que
            haber algo que devuelva*) se sigue cumpliendo, y hasta mejor.

            Lo que se pierde es que el bot sea lo PRIMERO que ves. A cambio está
            siempre a la vista, en todas las pantallas y sin scrollear, que es
            más de lo que tenía. **Si al usarlo prefiere el bot arriba, es su
            llamada** y volver es mover una línea. */}

        {/* ── ⚠️⚠️ LA RELECTURA SE FUE DEL HOME, A LA BARAJA DEL BOT (18/08) ──
            Matías: *"me gustaría que el Home deje de mostrar 'hace tres semanas
            escribiste' y que aparezca como en el chat, ahí en el mismo, con el
            bot y todo, que se pueda actualizar, y sacar esa tarjetita"*.

            Ahora se arma en `chat/page.tsx` como tarjeta de tono `recordar` y
            viaja con el resto de la baraja. Lo que gana no es solo el espacio:
            **"que se pueda actualizar" ya estaba resuelto en la baraja** —
            deslizar es cómo se pasa de una a la otra, así que varias relecturas
            viejas se deslizan en vez de aparecer de a una por día.

            ⚠️⚠️ Y `Relectura.tsx` SE BORRÓ ENTERO, no quedó "por si vuelve".
            Este Home era su único lugar, así que dejarlo habría sido un archivo
            de 130 líneas que nada renderiza — la misma trampa de `FilaBot` y de
            `irA`. Su única lógica propia era abrir una charla con la frase
            adelante, y eso vive ahora en la acción `retomar` de `TarjetasBot`.
            👉 Lo que NO se borró es `lib/relectura` ni `lib/relectura-oculta`:
            ahí está la regla de qué frase se elige, con sus tests, y la sigue
            usando `chat/page.tsx` para armar las tarjetas. */}

        {/* ── ⚠️⚠️ UNA SOLA FILA: "HOY, DE UN TOQUE" + "ANOTAR RÁPIDO" (18/08) ──
            Matías: *"sacaría lo de hoy de un toque, directamente que eso sea
            como en anotar rápido… las combinaría a estas dos partes, así da
            mucho más espacio"*.

            👉 **ESTO ES LO QUE ÉL MISMO BAJÓ EL 31/07**, y por qué esta vez sí
            entra está escrito entero en el docstring de `ChipsDeHoy`. En una
            línea: los dos motivos de aquel día eran *la fila crece sin fin* y
            *mezcla dos niveles*, y hoy el primero lo mata el tope con "+N"
            (07/08) y el segundo lo resuelve la forma del chip (11/08) —
            **rectangular se marca acá, pastilla abre una hoja**. La forma dejó
            de ser un refuerzo y pasó a ser lo único que los separa.

            ⚠️ EL ORDEN NO ES CAPRICHOSO: primero los de hoy, después los de
            registro. Marcar es lo que más hace —43 de 47 días— y es más barato:
            un toque contra abrir una hoja.

            ⚠️ ENVUELVE, NO SCROLLEA, y eso borra el `-my-2 py-2` que llevaba
            "Anotar rápido": ese margen negativo existía sólo porque
            `overflow-x: auto` arrastra el recorte vertical y le comía la sombra
            a los chips. Sin scroll horizontal no hay nada que recortar.
            👉 Y la fila puede envolver sin crecer para siempre porque los dos
            grupos tienen tope: las de hoy por `lib/chips-hoy`, las de registro
            porque son tres fijas desde que salieron Alimentación y Gasto. */}
        {(chipsHoy.visibles.length > 0 || chips.length > 0) && (
          <div className="mb-5">
            {/* ⚠️ SE LLAMA "ANOTAR" Y NO "ANOTAR RÁPIDO" NI "HOY": los dos
                rótulos viejos nombraban cada uno la mitad de esta fila, y
                cualquiera de los dos dejaría afuera a la otra mitad. La regla de
                la etiqueta no cambia (mono chica, en negro, rótulo de grupo y no
                título de pantalla — el título es el saludo). */}
            <p className="mb-2.5 font-mono text-[10.5px] font-semibold tracking-[0.4px] text-tinta">
              Anotar
            </p>
            {/* ── ⚠️⚠️ UN RENGLÓN QUE SE DESLIZA, NO TRES QUE ENVUELVEN (18/08) ──
                Medido en la app: envolviendo, los tres renglones dejaban
                **25px, 79px y 113px** de sobra a la derecha — el último tiraba
                un tercio del ancho. Eso es lo que Matías vio como *"un espacio
                enorme al costado"*, y no tenía arreglo posible envolviendo:
                ocho pastillas de anchos distintos SIEMPRE dejan un borde
                derecho dentado.

                👉 Las tres salidas que no van, y por qué:
                  · **Estirarlos** para llenar el renglón es lo que él bajó el
                    11/08 — tapa el hueco agrandando los chips.
                  · **Ordenarlos por ancho** los empaqueta mejor y rompe el
                    orden que sí significa algo (primero los tuyos, que es lo
                    que más hacés).
                  · **Recortar las etiquetas** esconde de qué es cada uno.

                Deslizando no hay resto: la fila mide un renglón siempre, pase
                lo que pase, y baja de **108px a 31px**.

                ⚠️ VUELVE EL `-my-2 py-2`, que se había ido con el envolver:
                `overflow-x: auto` obliga a `overflow-y` a valer `auto` también,
                así que la fila recorta arriba y abajo y le come la sombra a los
                chips — Matías lo pescó mirando la app el 31/07 (*"se ve la
                sombra cortada"*). El padding le da lugar y el margen negativo
                lo devuelve. El `-mx-[22px] px-[22px]` es para que el primero y
                el último lleguen al borde de la pantalla. */}
            <div className="sin-scrollbar -mx-[22px] -my-2 flex gap-2 overflow-x-auto px-[22px] py-2">
              <ChipsDeHoy visibles={chipsHoy.visibles} resto={chipsHoy.resto} />
              {chips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={pensando}
                  onClick={() => {
                    if (c.href) return router.push(c.href);
                    if (c.hoja) return setHoja(c.hoja);
                    crear(c.prompt ?? c.texto);
                  }}
                  // ── ⚠️⚠️ A LA ESCALA DE LOS DE HOY (18/08, al ver la app) ──
                  // En la captura la fila mixta se veía rota, y el motivo no era
                  // el orden ni la forma: **eran dos tamaños.** Estos venían de
                  // `py-2` con un ícono de 28px y los de hoy de `py-[5px]` con
                  // uno de 13 — casi el doble de alto uno que el otro. Separados
                  // en dos filas eso no se notaba nunca; en la misma fila, cada
                  // renglón quedaba con dos alturas y los huecos se veían como un
                  // error de maquetado.
                  //
                  // 👉 **BAJAN ESTOS Y NO SUBEN LOS OTROS**, porque el tamaño
                  // chico es una decisión suya con motivo: el 11/08 pidió que los
                  // de hoy fueran *"del mismo tamaño pequeño que antes"* y la
                  // nota de `ChipsDeHoy` explica que agrandarlos para llenar el
                  // renglón era justo lo contrario de lo que pedía.
                  //
                  // ⚠️ LA FORMA NO SE TOCA: siguen siendo `rounded-full` contra
                  // los `rounded-[12px]` de los otros. Esa distinción es lo único
                  // que separa "abre una hoja" de "se marca acá" ahora que
                  // comparten renglón — es lo que había que cuidar al achicar.
                  className="chip-vidrio flex flex-none items-center gap-1.5 rounded-full border py-[5px] pl-[6px] pr-3 disabled:opacity-60"
                  style={{
                    // El degradé va inline porque el color es el de cada chip; la
                    // sombra y los rims los pone `chip-vidrio` (ver globals.css).
                    //
                    // ⚠️ EL TINTE TERMINA MÁS ABAJO DEL CHIP (118% y 155%), NO EN
                    // EL BORDE. La primera versión lo cerraba en 100% y el color
                    // llegaba entero: los chips SIN registrar quedaban con la
                    // mitad de abajo pintada y se leían como si ya los hubieras
                    // cargado (31/07, Matías: *"las chips se ven mal"*). Poniendo
                    // el final del degradé fuera del alto visible, adentro se ve
                    // solo el arranque — hay curva pero no mancha.
                    //
                    // El HECHO arranca a pintar antes y termina antes: es lo que
                    // mantiene la diferencia entre registrado y no registrado,
                    // que es lo único que el chip tiene que decir de un vistazo.
                    background: c.hecho
                      ? `linear-gradient(180deg, #fff 8%, ${c.tint} 118%)`
                      : `linear-gradient(180deg, #fff 62%, ${c.tint} 155%)`,
                    borderColor: c.hecho ? `${c.color}44` : `${c.color}22`,
                  }}
                >
                  {/* ícono siempre visible; cuando está hecho, en su chip lleno */}
                  <span
                    className="flex size-[19px] flex-none items-center justify-center rounded-full"
                    style={{ background: c.hecho ? '#fff' : c.tint }}
                  >
                    {/* ⚠️ EL COLOR VA EN `color` Y EL TRAZO EN `currentColor`, no
                        `stroke={c.color}` a secas (31/07, Matías: *"le hiciste un
                        borde de color a la parte que está pintada y se ve raro,
                        tiene que ser el mismo color"*). */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]" style={{ color: c.color }}>
                      {ICONO_CHIP[c.icono]}
                    </svg>
                  </span>
                  <span className="whitespace-nowrap text-[12px] font-semibold" style={{ color: c.hecho ? c.color : '#1c1c2b' }}>
                    {c.texto}
                  </span>
                  {/* un solo tilde, discreto, cuando ya está registrado hoy */}
                  {c.hecho && (
                    <svg viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[11px] flex-none">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── EL AVISO DEL RITUAL (05/08) ──────────────────────────────────────
            ⚠️ BAJÓ DEBAJO DE LOS CHIPS (07/08). Antes iba arriba de "Anotar
            rápido", con el argumento de que **primero lo que la app te trae y
            después lo que hay para hacer** (el orden que ordenó Finanzas el
            02/08). Ese lugar ahora lo ocupan el bot y la relectura, que traen
            algo de verdad: el aviso del ritual es un recordatorio, o sea que
            también pide. Queda con lo que pide.

            ⚠️ LA RACHA NO ESTÁ ACÁ, Y ESO ES UN ARREGLO VIEJO QUE SIGUE VALIENDO:
            se había construido una tarjeta aparte para mostrarla sin ver que
            `MesDeUso` **ya la tenía**, y quedaban dos diciendo lo mismo — él lo
            pescó al toque (*"no hace falta tener dos tarjetas ahí"*). Desde el
            07/08 la llama vive arriba, al lado del saludo, y sigue habiendo
            **una sola**. */}
        {ritual && cargadoHoy && (
          <AvisoRitualHome estado={ritual} cargado={cargadoHoy} pidioElFreno={frena?.hoja === 'sueno' || frena?.hoja === 'animo' ? frena.hoja : null} />
        )}


        {/* ⚠️ EL ARRANQUE DE OBJETIVOS Y "ALGO QUE NOTÉ" YA NO VIVEN ACÁ
            (31/07). Los dos pasaron a ser tarjetas de la baraja del bot, arriba:
            eran dos bloques más que hablaban por su cuenta en la misma pantalla,
            que es justo lo que la baraja vino a juntar. El componente
            `ArranqueObjetivos` sigue existiendo para /objetivos. */}

        {/* La burbuja quedó SOLO para la lectura de la IA después de registrar
            algo: eso es una respuesta y merece cuerpo. La pregunta de enganche
            se fue al placeholder del composer. No se apila: cada registro
            reemplaza al anterior. */}
        {lecturas.length > 0 && (
          <div className="mt-1">
            <Burbuja
              texto={lecturas[lecturas.length - 1]}
              vivo
              onTap={() => window.dispatchEvent(new CustomEvent('enfocar-composer'))}
            />
          </div>
        )}

        {/* ⚠️ EL DESTACADO TAMBIÉN SE FUE A LA BARAJA (31/07). "Hoy toca X" es
            ahora la primera tarjeta del bot, con su "Ya lo hice". Tenerlo en dos
            lugares era el mismo aviso dos veces en la misma pantalla. */}

        {/* El calendario del mes SE FUE A SEGUIMIENTO (27/07). El Home queda
            para el diario y la charla; el mes se mira cuando vas a mirarlo, y
            ahora Seguimiento es una pestaña de la barra de abajo. */}

        {/* ⚠️ ACÁ HABÍA UNA GRILLA DE PREGUNTAS ("O empezá una charla" → "Contame").
            SE FUE ENTERA (27/07, Matías): elegir entre cinco preguntas es un
            menú, no una conversación, y encima ofrecía siempre lo mismo.
            Ese material ahora es el mensaje que la app te dice al abrir, de a
            uno y rotando: `MensajeProactivo`, arriba de todo. */}

        {/* el estado "pensando" ahora vive en la barra de escritura (se ilumina
            con composer-glow), no acá abajo donde se perdía al scrollear */}
      </div>

      {/* hoja de registro: se completa acá mismo, sin salir del chat */}
      {hoja && (
        <HojaRegistro
          tipo={hoja}
          onClose={() => setHoja(null)}
          onGuardado={(lectura) => {
            setLecturas([lectura]);
            // Refresca el home para que el chip se marque como hecho (verde).
            // Sin esto, si guardaste por foto (API route, no server action), el
            // dato quedaba pero el chip seguía gris: parecía que no se registró.
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

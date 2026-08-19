'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarNota, borrarNota, marcarNotaPrivada, ponerEmojiNota } from '@/lib/actions/notas';
import {
  adelante,
  atras,
  historialInicial,
  marcar,
  puedeAdelante,
  puedeAtras,
  textoActual,
  type Historial,
} from '@/lib/historial-texto';
import { ICONOS_NOTA, IconoNota } from '@/components/notas/IconoNota';
import { unirNota } from '@/lib/notas';
import { ChatEnNota, type MensajeEnNota } from '@/components/notas/ChatEnNota';

type ChatDeNotaConMensajes = {
  id: number;
  titulo: string;
  ultimaActividad: string;
  mensajes: MensajeEnNota[];
};

/**
 * El editor de una nota.
 *
 * ── UN SOLO TEXTO, Y EL PRIMER RENGLÓN ES EL TÍTULO ───────────────────────────
 * Pedido de Matías, textual: *"dentro del mismo texto, la primera línea sea
 * título hasta que toques Enter, como en las notas de Apple"*.
 *
 * ⚠️ EL PRIMER INTENTO FUERON DOS CAMPOS (un textarea de título y otro de
 * cuerpo) con las teclas cableadas para cruzar de uno al otro. Se sentía
 * parecido pero NO era lo pedido, y se notaba: dos placeholders, "Título" y
 * "Escribí…", delatando que eran dos cajas. Lo cazó Matías mirando la captura.
 * Un `<textarea>` no sirve para esto: pinta todo su contenido con la misma
 * tipografía, así que el título grande es imposible.
 *
 * Entonces: un `contenteditable`, con CADA RENGLÓN EN SU `<div>`, y el título es
 * `div:first-child` por CSS. Tocar Enter cierra el div del título y abre otro:
 * el salto de tamaño sale del navegador, sin código que lo maneje.
 *
 * Las tres precauciones que esto necesita, porque `contenteditable` es
 * traicionero y esta pantalla es la única de la app que promete ser un cuaderno:
 *
 *  1. **`plaintext-only`.** Sin esto, pegar desde otra app trae HTML —
 *     negritas, colores, tablas— y la nota deja de ser texto. Con esto el
 *     navegador aplana el pegado él mismo. El `onPaste` de más abajo es la red
 *     para los navegadores que todavía no lo soportan.
 *  2. **NO ES CONTROLADO.** El HTML se siembra UNA vez al montar y después
 *     React no lo vuelve a tocar. Reescribir el HTML en cada tecla le mueve el
 *     cursor al final del texto: escribís en el medio de una frase y la próxima
 *     letra aparece al final.
 *  3. **Se lee con `innerText`**, que devuelve los saltos de línea reales sin
 *     importar si el navegador usó `<div>` o `<br>`. Leer los hijos uno por uno
 *     sería atarse a cómo los arma cada navegador.
 *
 * ── NO HAY NADA DE IA ACÁ ─────────────────────────────────────────────────────
 * Ni título automático, ni sugerencias, ni un botón para "mirar" lo escrito. El
 * pie lo dice con todas las letras porque, si no se dice, la ausencia de IA es
 * invisible — y lo que se busca es que se SIENTA distinto al chat.
 */
/**
 * EL EMOJI DE LA NOTA (04/08, pedido de Matías: *"las notas están como medias
 * vacías"*).
 *
 * ⚠️ NO ES UN TECLADO DE EMOJIS, SON DIEZ. Un picker completo obliga a buscar
 * entre miles para una decisión que dura medio segundo, y en el teléfono abre el
 * teclado del sistema encima de la nota. Diez cubren casi todo lo que una nota
 * es —trabajo, plata, idea, salud, viaje— y se eligen sin leer.
 *
 * ⚠️ Y "Sin emoji" es la PRIMERA opción, no un borrar escondido: la mayoría de
 * las notas no tiene ni necesita uno, y sacarlo tiene que costar lo mismo que
 * ponerlo.
 */
// ⚠️ ERAN DIEZ EMOJIS Y AHORA SON DIEZ ÍCONOS (06/08). El porqué —y la
// compatibilidad con las notas que ya tienen un emoji— está en `IconoNota.tsx`.

function ElegirEmoji({ id, inicial }: { id: number; inicial: string | null }) {
  const [actual, setActual] = useState<string | null>(inicial);
  const [abierto, setAbierto] = useState(false);
  const [, empezarEmoji] = useTransition();

  function elegir(e: string | null) {
    setActual(e);
    setAbierto(false);
    empezarEmoji(async () => {
      await ponerEmojiNota(id, e);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={actual ? 'Cambiar el ícono de la nota' : 'Ponerle un ícono a la nota'}
        className="flex size-8 items-center justify-center rounded-lg border border-iris-borde bg-white text-[16px] leading-none text-iris-deep"
      >
        {actual ? (
          <IconoNota valor={actual} className="size-[16px]" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[15px] text-niebla-2">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 10h.01M15 10h.01M8.5 14.5a4 4 0 0 0 7 0" />
          </svg>
        )}
      </button>

      {abierto && (
        <div className="absolute bottom-9 left-0 z-20 flex w-[236px] flex-wrap gap-1 rounded-[18px] border border-iris-borde bg-white p-2 shadow-[0_8px_28px_rgba(50,50,90,.16)]">
          <button
            type="button"
            onClick={() => elegir(null)}
            className="flex h-8 flex-none items-center rounded-lg px-2 font-mono text-[11px] font-semibold text-niebla"
          >
            Sin ícono
          </button>
          {ICONOS_NOTA.map((i) => (
            <button
              key={i.clave}
              type="button"
              onClick={() => elegir(i.clave)}
              aria-label={i.nombre}
              className={`grid size-8 flex-none place-items-center rounded-lg ${
                i.clave === actual ? 'bg-iris-soft text-iris-deep' : 'text-niebla'
              }`}
            >
              <IconoNota valor={i.clave} className="size-[17px]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ⚠️ ACÁ VIVÍA `Etiquetas`, el bloque para escribirlas a mano (04/08 → 06/08).
 *
 * Matías lo cortó el 06/08: *"la etiqueta no es necesaria para esto, solo si lo
 * pone la IA para identificar, pero no que el usuario lo haga, por lo menos por
 * ahora"*. Y es coherente con lo que ya sabemos de su uso: **de tres notas en la
 * vida de la app, ninguna tenía etiqueta puesta a mano.** Una función que nadie
 * usó y que ocupaba el renglón de arriba del editor.
 *
 * ⚠️ NO SE BORRÓ NADA MÁS: `alternarEtiqueta`, la tabla `nota_etiquetas` y
 * `leerEtiquetas` siguen enteras, y las etiquetas que ya existen se muestran de
 * solo lectura arriba. Lo que se sacó es la puerta, no el dato — el día que el
 * Analista las ponga solo, ya están todas las cañerías.
 */

export function EditorNota({
  nota,
  chats = [],
}: {
  nota: {
    id: number | null;
    titulo: string;
    cuerpo: string;
    privada?: boolean;
    emoji?: string | null;
    etiquetas?: string[];
  };
  /** Las que ya usaste en otras notas. Son sugerencias, no un catálogo cerrado. */
  /* (`etiquetasSugeridas` se fue con el bloque de escribirlas, el 06/08. La
     página sigue leyéndolas: si vuelven, no hay que volver a consultarlas.) */
  /** Las charlas que viven en esta nota. Vacío en la nota nueva. */
  chats?: ChatDeNotaConMensajes[];
}) {
  const router = useRouter();
  const inicial = unirNota(nota.titulo, nota.cuerpo);
  const [estado, setEstado] = useState<'limpio' | 'sucio' | 'guardando' | 'guardado'>('limpio');
  const [vacio, setVacio] = useState(!inicial);
  const [borrando, empezarBorrado] = useTransition();
  // Lo dispara el tacho de arriba; la confirmación la sigue dibujando `BotonBorrar`.
  const [pidiendoBorrar, setPidiendoBorrar] = useState(false);

  const caja = useRef<HTMLDivElement>(null);
  // El id vive en un ref y no en el estado: lo escribe el primer guardado (la
  // nota nace ahí) y no tiene que provocar un re-render. Con `useState`, el
  // guardado siguiente podía leer todavía el `null` de la closure anterior y
  // crear una segunda nota.
  const idRef = useRef<number | null>(nota.id);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Lo último que se guardó, para no mandar el mismo texto dos veces.
  const guardado = useRef(inicial);
  // El texto de AHORA, para que el guardado de salida lo lea sin declararlo como
  // dependencia de su efecto.
  const textoRef = useRef(inicial);

  // ── DESHACER Y REHACER (12/08) ──────────────────────────────────────────────
  // Matías: *"mientras estás trabajando algo, ponele que borraste sin querer
  // algo, querés volver para atrás, tiene que estar esa opción… una vez que se
  // guardó, se guardó. Te aparecen en gris las flechitas"*.
  //
  // ⚠️ "GUARDADO" ACÁ NO ES EL AUTOGUARDADO. La nota se persiste 900ms después
  // de cada tecla, así que tomado literal el deshacer duraría un segundo. Lo que
  // él describe es la SESIÓN DE EDICIÓN: mientras la nota está abierta se puede
  // volver; cuando saliste, se acabó. Por eso la historia vive en refs y muere
  // con el componente — no hay tabla, no hay columna, no hay nada que migrar.
  //
  // ⚠️ UN PUNTO POR AUTOGUARDADO, no por tecla. Reusa el ritmo que ya existe
  // (900ms de pausa) y hace que cada paso atrás sea "una frase".
  //
  // Las reglas del historial viven en `lib/historial-texto` y tienen tests. Acá
  // queda solo lo que es de esta pantalla: el DOM, el cursor y el guardado.
  const historia = useRef<Historial>(historialInicial(inicial));
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);

  // Siembra: un `<div>` por renglón. Es lo que hace que el navegador siga
  // creando divs hermanos en cada Enter — si el contenido arrancara como texto
  // pelado, el primer Enter podía dejar el título fuera de todo elemento y el
  // `:first-child` no lo agarraba.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    el.replaceChildren(...renglones(inicial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alEscribir() {
    const el = caja.current;
    if (!el) return;
    const texto = el.innerText.replace(/\n$/, '');
    textoRef.current = texto;
    setVacio(!texto.trim());
    if (texto === guardado.current) return;
    setEstado('sucio');
    if (timer.current) clearTimeout(timer.current);
    // AUTOGUARDADO, sin botón de guardar: en un cuaderno no se guarda, se
    // escribe. 900ms después de la última tecla — con menos, cada palabra era un
    // viaje al servidor; con más, salir rápido se comía el final de la frase.
    timer.current = setTimeout(() => {
      marcarPunto(texto);
      void persistir(texto);
    }, 900);
  }

  async function persistir(texto: string) {
    setEstado('guardando');
    const id = await guardarNota({ id: idRef.current, texto });
    idRef.current = id;
    guardado.current = texto;
    setEstado('guardado');
  }

  function sincronizarFlechas() {
    setPuedeDeshacer(puedeAtras(historia.current));
    setPuedeRehacer(puedeAdelante(historia.current));
  }

  /** Deja un punto al que se puede volver. Lo llama el autoguardado. */
  function marcarPunto(texto: string) {
    historia.current = marcar(historia.current, texto);
    sincronizarFlechas();
  }

  /**
   * Pone un texto del historial en la caja.
   *
   * ⚠️⚠️ EL CURSOR VA AL FINAL, A PROPÓSITO. `replaceChildren` destruye los nodos
   * donde vivía la selección, así que el cursor hay que reponerlo o el navegador
   * lo manda al principio y escribir después de un undo se vuelve un infierno
   * (el texto nuevo aparece arriba de todo). Restaurar el offset exacto pediría
   * mapear posiciones entre dos árboles de nodos distintos; al final es
   * predecible y es donde estabas escribiendo casi siempre.
   *
   * ⚠️ Y CANCELA EL DEBOUNCE PENDIENTE antes de persistir: si no, el timer viejo
   * llegaba 900ms después con el texto de ANTES de deshacer y lo volvía a
   * guardar, deshaciendo el deshacer.
   */
  function aplicar(texto: string) {
    const el = caja.current;
    if (!el) return;
    if (timer.current) clearTimeout(timer.current);
    el.replaceChildren(...renglones(texto));
    textoRef.current = texto;
    setVacio(!texto.trim());
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const rango = document.createRange();
      rango.selectNodeContents(el);
      rango.collapse(false);
      sel.removeAllRanges();
      sel.addRange(rango);
    }
    if (texto !== guardado.current) void persistir(texto);
  }

  function deshacer() {
    if (!puedeAtras(historia.current)) return;
    historia.current = atras(historia.current);
    aplicar(textoActual(historia.current));
    sincronizarFlechas();
  }

  function rehacer() {
    if (!puedeAdelante(historia.current)) return;
    historia.current = adelante(historia.current);
    aplicar(textoActual(historia.current));
    sincronizarFlechas();
  }

  // ⚠️ GUARDAR AL IRSE, SIN ESPERAR LOS 900ms. Sin esto, escribir una frase y
  // cerrar la app al toque (o pasar a otra pantalla) perdía lo último tecleado:
  // el timer se cancelaba con el desmontaje. `visibilitychange` es el evento que
  // sí llega en el iPhone cuando se manda la app al fondo; `beforeunload` no.
  //
  // ⚠️ ESTE EFECTO CORRE UNA SOLA VEZ (`[]`) Y LEE EL TEXTO DE UN REF. Con el
  // texto como dependencia, React limpia el efecto anterior en CADA TECLA y esa
  // limpieza guarda: el debounce de arriba quedaría anulado.
  useEffect(() => {
    function alSalir() {
      if (textoRef.current !== guardado.current) void persistir(textoRef.current);
    }
    document.addEventListener('visibilitychange', alSalir);
    return () => {
      document.removeEventListener('visibilitychange', alSalir);
      if (timer.current) clearTimeout(timer.current);
      alSalir();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* ── LOS TRES DESTINOS, JUNTOS Y A LA VISTA (06/08) ────────────────────
          Matías: *"cuando es una nota nueva me aparece una X nomás; no sabés si
          la estás guardando, si salís para atrás, si se borra… queda medio en
          duda"*.

          ⚠️ LA NOTA SIEMPRE SE GUARDÓ SOLA (hay un debounce y un guardado al
          salir, desde el 30/07). El problema nunca fue el guardado: era que
          **una cruz solitaria en una pantalla donde estás escribiendo se lee
          como "descartar"**. La duda no era técnica, era de lectura.

          Tres íconos y se acabó la duda: el tilde verde confirma lo que ya
          pasó, el tacho borra, la cruz sale. ⚠️ El tilde NO es "guardar": dice
          "guardada" y al tocarlo cierra. Poner un botón de guardar acá sería
          mentir al revés — haría creer que sin tocarlo se pierde.
          El tacho va SIN círculo y en rojo, como pidió. */}
      {/* ── LOS TRES DESTINOS, EN UNA SOLA LÍNEA (06/08, corregido) ──────────
          ⚠️ PRIMER INTENTO MAL: el tilde y el tacho quedaron acá adentro y la
          cruz siguió arriba, en `TituloFijo`. Matías: *"te aparece bien o
          eliminar, pero desalineado, la cruz como desalineada… que sea una
          línea en horizontal"*. Y era literal — **eran dos filas distintas de
          dos componentes distintos**, imposible que se alinearan.
          Ahora los tres viven acá, en la misma fila, y las páginas de nota ya no
          le pasan `cerrarHref` al título: **una sola cruz, en un solo lugar.**

          El orden es el del riesgo: borrar a la izquierda y separado, después
          las dos salidas seguras. Y "Guardada" a la izquierda de todo, porque
          la duda que él marcó era esa: *"no sabés si la estás guardando"*. */}
      <div className="mb-3 flex items-center gap-1.5">
        {/* ── EL ÍCONO DE LA NOTA, A LA IZQUIERDA (06/08, corregido) ─────────
            Primero lo puse a la derecha, con los otros tres, y él lo cortó:
            *"lo pondría al lado izquierdo, para que se distinga, y además del
            lado derecho queda como cortado, se ve afuera"*.

            ⚠️ LAS DOS RAZONES SON BUENAS Y LA SEGUNDA ES UN BUG: **su
            desplegable se abre con `left-0` y mide 236px**, así que pegado al
            borde derecho se salía de la pantalla. Contra el borde izquierdo,
            entra siempre.

            Y la primera es de fondo: **este no es un botón de acción como los
            otros tres.** El tacho, el tilde y la cruz deciden qué pasa con la
            nota; este dice qué ES la nota. Separado del grupo, se distingue
            solo, sin ningún rótulo. */}
        {idRef.current !== null && <ElegirEmoji id={idRef.current} inicial={nota.emoji ?? null} />}

        {/* ⚠️ ACÁ DECÍA "Guardada", y después estuvo un rato el botón de sumar
            etiquetas. Las dos cosas se fueron el 06/08:

            · "Guardada" sobraba porque contestaba *"¿se está guardando?"*, **la
              misma pregunta que ya contesta el tilde verde de al lado**.
            · Las etiquetas a mano las cortó él: *"la etiqueta no es necesaria
              para esto, solo si lo pone la IA para identificar, pero no que el
              usuario lo haga, por lo menos por ahora"*.

            ⚠️ EL DATO NO SE TOCA. `alternarEtiqueta` y la tabla siguen intactas:
            lo que se sacó es la PUERTA del usuario, no la función. Las que ponga
            el Analista se siguen viendo abajo, de solo lectura, y el día que
            quiera escribirlas él, el botón vuelve en una línea. */}
        <div className="mr-auto min-w-0 flex-1">
          {(nota.etiquetas ?? []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {(nota.etiquetas ?? []).map((e) => (
                <span
                  key={e}
                  className="rounded-full bg-iris-soft px-2 py-[2px] font-mono text-[10.5px] font-semibold text-iris-deep"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── LAS DOS FLECHAS (12/08) ────────────────────────────────────────
            ⚠️ VAN ANTES DEL TACHO Y NO DONDE ESTABA LA CRUZ, aunque el hueco lo
            dejó ella. Lo que se dijo fue "en la fila de arriba"; el lugar exacto
            es esto, y lo declaro por si no es lo que querías —moverlas es
            cambiar de lugar estas doce líneas.

            El motivo: el grupo de la derecha decide QUÉ PASA CON LA NOTA (se
            borra, se cierra), y estas dos no deciden nada de eso — son
            herramientas de escribir. Puestas después del tilde quedaban del otro
            lado de la salida, leyéndose como un destino más. Acá abren el grupo
            y el `gap` las separa sin necesidad de una línea divisoria.

            En gris y sin tocar cuando no hay a dónde ir, como pidió. El
            `disabled` real importa más que el gris: en una pantalla donde estás
            escribiendo, una flecha que se puede apretar y no hace nada se siente
            rota. */}
        <button
          type="button"
          disabled={!puedeDeshacer}
          onClick={deshacer}
          aria-label="Deshacer el último cambio"
          className="grid size-9 flex-none place-items-center rounded-full text-niebla transition-opacity disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
          </svg>
        </button>

        <button
          type="button"
          disabled={!puedeRehacer}
          onClick={rehacer}
          aria-label="Rehacer el cambio deshecho"
          className="grid size-9 flex-none place-items-center rounded-full text-niebla transition-opacity disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9a5 5 0 0 0 0 10h3" />
          </svg>
        </button>

        {idRef.current !== null && (
          <button
            type="button"
            disabled={borrando}
            onClick={() => setPidiendoBorrar(true)}
            aria-label="Borrar la nota"
            className="grid size-9 flex-none place-items-center rounded-full text-[#c0392b] disabled:opacity-50"
          >
            {/* Un tacho simple: tapa, cuerpo y dos rayitas. Sin círculo, como
                pidió, y sin la curva del fondo que lo hacía ver sucio a 18px. */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
              <path d="M4 6.5h16" />
              <path d="M9.5 6.5V4.5h5v2" />
              <path d="M6.5 6.5v13a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-13" />
              <path d="M10.5 10.5v6.5M13.5 10.5v6.5" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            void persistir(textoRef.current);
            router.push('/notas');
          }}
          aria-label="Listo, volver a las notas"
          className="grid size-9 flex-none place-items-center rounded-full bg-verde text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* ── ⚠️ LA CRUZ SE FUE, Y EL TILDE SE LLENA (12/08) ───────────────────
            Matías: *"la cruz ya no tiene sentido; tiene sentido solamente el
            tilde para volver atrás, y ya"*. Y sobre el tilde: *"el verde está
            muy claro, el del fondo; hay que mejorarlo"*.

            ⚠️ LAS DOS HACÍAN LO MISMO. La nota se autoguarda (ver el comentario
            de `persistir`), así que "salir sin guardar" no existe: la cruz y el
            tilde llevaban los dos a /notas con el texto ya escrito. Dos botones
            para una acción **inventan una diferencia que la app no tiene**, y el
            que se iba tenía que ser la cruz: un aspa dice "descartar" y acá no
            se descarta nada.

            ⚠️ Y por eso el fondo pasa de `verde-tint` a `verde` sólido con el
            tilde en blanco. No es solo contraste: quedando como ÚNICA salida,
            este botón dejó de ser una opción entre dos y pasó a ser LA acción de
            la pantalla. El tinte servía cuando competía con la cruz blanca;
            solo, se perdía contra el fondo. Blanco sobre #3d9b80 da 3.4:1, que
            pasa el mínimo de 3:1 que pide WCAG para un ícono.

            ⚠️ Lo que NO cambia: el tilde sigue sin ser "guardar" —dice
            "guardada" y al tocarlo cierra—. Sacar la cruz no toca esa lógica. */}
      </div>

      {/* (Las etiquetas viven en la fila de arriba desde el 06/08, donde estaba
          el "Guardada" que se sacó.) */}
      {/* ⚠️ LA HOJA DONDE ESCRIBÍS, EN PAPEL (11/08). Es el uso más literal del
          material que hay en la app: el vidrio se mira, el papel se escribe. */}
      <div className="papel relative tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
        {/* El placeholder va detrás y no como atributo: `contenteditable` no
            tiene `placeholder`, y con un `:empty` en CSS no alcanza porque la
            caja nunca está vacía de verdad (tiene el div del primer renglón). */}
        {vacio && (
          <p aria-hidden className="pointer-events-none absolute left-4 top-4 text-[20px] font-bold leading-[1.25] tracking-[-0.3px] text-niebla-2">
            Título
          </p>
        )}

        <div
          ref={caja}
          // `plaintext-only` es lo que evita que pegar desde otra app traiga
          // HTML. React no tipa este valor, de ahí el `as unknown as true`.
          contentEditable={'plaintext-only' as unknown as true}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="La nota"
          onInput={alEscribir}
          onPaste={(e) => {
            // Red para los navegadores sin `plaintext-only`. Si lo soportan,
            // esto igual no molesta: inserta el mismo texto plano.
            e.preventDefault();
            const t = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, t);
          }}
          /* EL PRIMER RENGLÓN, GRANDE Y EN NEGRO. El negro es #000 y no
             `text-tinta` (#1c1c2b): es el único texto de la app en negro puro, y
             ese contraste es lo que lo hace leerse como título sin ningún rótulo
             que lo diga.

             ⚠️⚠️ ERA `[&>div:first-child]` Y SE ROMPÍA AL ESCRIBIR (06/08,
             Matías: *"empiezo a escribir, la parte de arriba queda en negro
             título, y después escribo todo y queda también como título"*).

             La causa: ese selector le pega al PRIMER DIV HIJO, y **cómo parte
             el texto en divs lo decide el navegador, no nosotros**. Al tipear
             Enter, el WebKit del teléfono mete un `<br>` adentro del mismo div
             en vez de abrir uno hermano — así que todo lo que escribía seguía
             viviendo en el primer div y todo se veía como título. Al guardar se
             arreglaba porque ahí el texto se vuelve a sembrar con un div por
             renglón (ver `renglones`), y ahí sí el selector acertaba.

             Ahora es `::first-line`, que es del navegador y **no depende de
             ninguna estructura**: agarra la primera línea RENDERIZADA, se
             reparta como se reparta el HTML. Es imposible que se desincronice
             porque no hay nada que sincronizar.

             ⚠️ LO QUE SE PIERDE: `::first-line` solo admite propiedades de
             tipografía y color, así que el `margin-bottom` de 9px que separaba
             el título del cuerpo no se puede poner. Se reemplaza con un
             `line-height` más alto en la primera línea, que deja un aire
             parecido sin salirse de lo permitido.
             ⚠️ Y si el título ocupa dos renglones, solo se agranda el primero:
             es el límite de `::first-line`. A cambio, nunca más se pinta de
             más — que era el problema real. */
          className="min-h-[190px] whitespace-pre-wrap break-words text-[14.5px] leading-[1.62] text-tinta-soft outline-none [&::first-line]:text-[20px] [&::first-line]:font-bold [&::first-line]:leading-[2] [&::first-line]:tracking-[-0.3px] [&::first-line]:text-black"
        />

        {/* EL PIE, FIJO. Es la pantalla entera en una línea. */}
        <div className="mt-3.5 flex items-center gap-[7px] border-t border-iris-borde pt-3 font-mono text-[10.5px] text-niebla">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-[13px] flex-none">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.6A9 9 0 0 1 20.9 13M3.5 9.5a9 9 0 0 0 9.6 10.9" />
          </svg>
          <span className="flex-1">Acá no lee nadie. Escribí tranquilo.</span>
          {/* El estado del guardado, chiquito y sin celebrar nada. Un "¡Guardado!"
              con tilde verde sería exactamente el tipo de festejo que esta
              pantalla no quiere. */}
          <span className="flex-none text-niebla-2">
            {estado === 'guardando' ? 'guardando…' : estado === 'guardado' ? 'guardado' : ''}
          </span>
        </div>
      </div>

      {/* ── LO QUE LA NOTA TIENE ADENTRO ──────────────────────────────────────
          Va DEBAJO del texto y no intercalado entre renglones. Es la diferencia
          entre lo que se pudo hacer y lo que se dibujó: para meter una charla en
          medio del texto, el cuerpo tendría que dejar de ser texto plano y pasar
          a ser una lista de bloques — otro editor entero, y se pierde lo único
          que esta pantalla promete (que escribir sea escribir).
          Con el texto arriba y las charlas abajo se lee igual de bien y no hay
          que tocar el editor. Si algún día hace falta intercalarlas, es una
          decisión nueva y hay que decirlo. */}
      {/* Solo con la nota ya guardada: sin id no hay a qué colgarle la etiqueta.
          Es la misma condición que ya tienen el emoji y el pie entero. */}
      {/* (Las etiquetas se fueron ARRIBA el 06/08: ver la nota en su bloque.) */}

      {chats.length > 0 && (
        <div className="mt-3">
          {chats.map((c) => (
            <ChatEnNota key={c.id} chat={c} notaId={idRef.current ?? 0} />
          ))}
        </div>
      )}

      {idRef.current !== null && (
        <BotonBorrar
          borrando={borrando}
          pidiendo={pidiendoBorrar}
          onPidiendo={setPidiendoBorrar}
          id={idRef.current}
          privada={nota.privada ?? false}
          emoji={nota.emoji ?? null}
          onBorrar={() =>
            empezarBorrado(async () => {
              await borrarNota(idRef.current as number);
              router.push('/notas');
            })
          }
        />
      )}
    </div>
  );
}

/**
 * Un `<div>` por renglón, para sembrar la caja.
 *
 * Se arma con nodos y no con `innerHTML` a propósito: el texto de una nota puede
 * tener `<` o `&` y con `innerHTML` eso se interpretaría como marcado. Acá el
 * texto entra como `textContent`, que no interpreta nada.
 *
 * Un renglón vacío lleva un `<br>` adentro: un div vacío no ocupa alto y el
 * renglón en blanco desaparecería de la vista.
 */
function renglones(texto: string): HTMLDivElement[] {
  return (texto ? texto.split('\n') : ['']).map((linea) => {
    const div = document.createElement('div');
    if (linea) div.textContent = linea;
    else div.appendChild(document.createElement('br'));
    return div;
  });
}

/**
 * Poner o sacar la llave.
 *
 * ⚠️ NO APARECE HASTA QUE LA NOTA EXISTE (`id` en null = todavía no se guardó).
 * Marcar como privada algo que aún no tiene fila no se puede guardar en ningún
 * lado, y un interruptor que no hace nada en una pantalla que promete privacidad
 * es peor que no tenerlo.
 */
function BotonPrivada({ id, privada }: { id: number | null; privada: boolean }) {
  const [puesta, setPuesta] = useState(privada);
  const [guardando, empezar] = useTransition();
  if (id == null) return null;

  return (
    <button
      type="button"
      disabled={guardando}
      onClick={() =>
        empezar(async () => {
          const nueva = !puesta;
          setPuesta(nueva);
          await marcarNotaPrivada(id, nueva);
        })
      }
      /* ⚠️ APAGADA IBA EN `text-niebla-2` (#c4c4d4), que en la paleta está
         marcado como "decorativo, no texto" — y esto ES texto, y encima el
         interruptor de la única promesa de esta pantalla. Matías: *"hacerla
         privada lo haría un poquito más oscuro para que se vea más claro"*.
         Pasa a `text-niebla` (#6d6d87, 4.54:1 sobre papel), que es el gris que
         la app usa para texto secundario de verdad. */
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11.5px] font-semibold disabled:opacity-60 ${
        puesta ? 'text-iris-deep' : 'text-niebla'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d={puesta ? 'M8 10.5V7.8a4 4 0 0 1 8 0v2.7' : 'M8 10.5V7.8a4 4 0 0 1 7.5-1.9'} />
      </svg>
      {puesta ? 'Privada' : 'Hacerla privada'}
    </button>
  );
}

/**
 * Borrar la nota, con la confirmación EN EL LUGAR (el botón se convierte en
 * "¿Seguro?") y no con un `confirm()` del navegador: dentro de la app nativa
 * esos diálogos se ven como una alerta de web, no de la app. Mismo patrón que
 * Polaridad y que las carpetas del Historial.
 */
function BotonBorrar({
  borrando,
  pidiendo,
  onPidiendo,
  onBorrar,
  id,
  privada,
  emoji,
}: {
  borrando: boolean;
  /** ⚠️ LA CONFIRMACIÓN LA MANDA EL PADRE desde el 06/08: el tacho se mudó
   *  arriba, con el tilde y la cruz, pero el "¿seguro?" se quedó acá porque es
   *  donde hay lugar para una pregunta. Dos estados para lo mismo (uno acá y
   *  otro arriba) se habrían desincronizado al primer toque. */
  pidiendo: boolean;
  onPidiendo: (v: boolean) => void;
  onBorrar: () => void;
  id: number | null;
  privada: boolean;
  emoji: string | null;
}) {
  const confirmando = pidiendo;
  const setConfirmando = onPidiendo;

  if (!confirmando) {
    return (
      <div className="mt-3 flex items-center justify-between">
        {/* ⚠️ EL CANDADO VA A LA IZQUIERDA Y "BORRAR" A LA DERECHA, separados.
            Son las dos acciones destructivas-ish de la pantalla y pegadas se
            toca la que no era. Poner la llave no pide PIN —ya estás mirando la
            nota— pero sacarla sí, y eso lo resuelve la lista, que es donde se
            entra. */}
        <div className="flex items-center gap-2">
          <BotonPrivada id={id} privada={privada} />
          {/* (El ícono se fue arriba, a la fila de las acciones, el 06/08.) */}
        </div>
        {/* ⚠️ ACÁ DECÍA "Borrar la nota" ESCRITO (06/08, Matías: *"borrar nota
            también tenía que ser un ícono; un tachito, al lado de la cruz y del
            bien"*). El tacho se fue arriba con los otros dos; dejarlo también
            acá habría dado **dos puertas para borrar en la misma pantalla**, y
            la de abajo es la que se toca sin querer al ir a la privada. */}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-lg px-2 py-1 font-mono text-[11.5px] font-semibold text-niebla"
      >
        No
      </button>
      <button
        type="button"
        disabled={borrando}
        onClick={onBorrar}
        className="rounded-lg bg-alerta px-2.5 py-1 font-mono text-[11.5px] font-bold text-white disabled:opacity-60"
      >
        {borrando ? 'Borrando…' : 'Sí, borrar'}
      </button>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { IconMic, IconFlechaArriba } from '@/components/ui/iconos';
import { IconoHerramienta } from '@/components/chat/IconoHerramienta';
import { MenuFlotante, FilaMenu } from '@/components/ui/MenuFlotante';
import { grabarAudio, reducirImagen, type Grabacion } from '@/lib/media';
import { desbloquearAudio } from '@/lib/vozCliente';
import {
  componerHerramienta,
  partirHerramienta,
  HERRAMIENTAS_CHAT,
  type HerramientaChat,
} from '@/lib/herramientas-chat';

export type Envio =
  | { tipo: 'texto'; contenido: string }
  | { tipo: 'foto'; contenido: string; foto: Blob }
  | { tipo: 'audio'; contenido: string; adjuntoPath: string };

export function BarraChat({
  onEnviar,
  ocupado = false,
  placeholder = 'Escribí o tocá el mic…',
  franja,
  puntitos,
}: {
  onEnviar: (e: Envio) => Promise<void> | void;
  ocupado?: boolean;
  placeholder?: string;
  /**
   * LO QUE EL BOT DICE, ACOPLADO ARRIBA DEL CAMPO (12/08, propuesta C).
   *
   * ⚠️ ES UN HUECO Y NO UNA PROP DE DATOS, a propósito. La barra vive en tres
   * lugares —`BarraGlobal`, `ChatUI` y `PillInput`— y la pregunta del bot solo
   * tiene sentido en el primero. Si esto recibiera `tarjetas`, este componente
   * pasaría a saber qué es una tarjeta del bot y las otras dos pantallas se
   * cargarían el concepto sin usarlo nunca.
   *
   * Va a sangre, sin el padding de la caja: la franja y el renglón de escribir
   * tienen que leerse como **una sola pieza con dos zonas**, y un margen blanco
   * entre las dos las devuelve a ser dos cosas apiladas.
   */
  franja?: React.ReactNode;
  /**
   * Los botones de la tarjeta del bot, en su propio renglón entre la franja y el
   * campo (18/08). Ver `AccionesBot`: llega `null` cuando la tarjeta no tiene
   * ninguno, que es la mayoría de las veces.
   *
   * ⚠️ VA ACÁ Y NO ADENTRO DE `franja` a propósito: la franja es la única zona
   * que acepta el deslizamiento, y un botón adentro de una pista que se desliza
   * se toca sin querer al arrastrar.
   */
  /**
   * Los puntitos de la baraja.
   *
   * ⚠️ ES UN SLOT CON NOMBRE PROPIO, no el `debajo` genérico que estuvo acá hasta
   * el 12/08 a la mañana. Aquel aceptaba cualquier cosa y por eso terminó
   * alojando una fila de botones que no tenía por qué estar ahí. Este solo puede
   * recibir lo que dice su nombre.
   *
   * ⚠️ DESDE EL 17/08 SE POSICIONA SOLO, contra la caja `fixed` de
   * `BarraGlobal`, y por eso **no ocupa alto acá**: se dibuja abajo de todo, en
   * la franja del indicador de home. Esta barra no sabe nada de eso —sigue
   * recibiendo un nodo y poniéndolo al final— pero conviene saberlo antes de
   * envolverlo en algo con `position: relative`, que lo re-anclaría acá.
   */
  puntitos?: React.ReactNode;
}) {
  /**
   * ⚠️ `texto` ES LO QUE ESCRIBÍS AL LADO DEL HASHTAG, NO EL MENSAJE ENTERO
   * (06/08). La herramienta elegida vive aparte, en `herr`, porque pasó a ser un
   * DIBUJO —una pastilla con su ícono— y un `<textarea>` no puede tener un
   * elemento adentro. Se separan acá y se vuelven a juntar al enviar.
   *
   * ⚠️⚠️ LO QUE SE MANDA SIGUE SIENDO `#foco loquesea`, letra por letra. La
   * pastilla es pintura sobre el mismo texto de siempre: el mensaje que se
   * guarda, el que viaja al modelo y el que vas a leer dentro de un año no
   * cambiaron. Si esto mandara otra cosa, el chip del historial (`ChatUI`)
   * dejaría de tener qué pintar y los mensajes viejos y nuevos serían dos
   * formatos distintos en la misma conversación.
   */
  const [texto, setTexto] = useState('');
  const [herr, setHerr] = useState<HerramientaChat | null>(null);
  const [grabando, setGrabando] = useState<Grabacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Otro componente (p. ej. una sugerencia del home) avisa que está pensando:
  // la barra misma se ilumina, en vez de un aviso perdido abajo de todo.
  const [pensandoAfuera, setPensandoAfuera] = useState(false);
  // El menú del `+`: la foto y las herramientas, que hasta hoy estaban en dos
  // lugares distintos (un botón de cámara acá, los hashtags en el lateral).
  const [menuMas, setMenuMas] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const mas = useRef<HTMLButtonElement>(null);

  const bloqueado = ocupado || procesando;
  const pensando = bloqueado || pensandoAfuera;
  // Con la pastilla puesta ya hay algo que mandar aunque no escribas nada: la
  // herramienta se estrena explicándose, y `#foco` sola es un mensaje válido.
  const hayTexto = herr != null || texto.trim().length > 0;

  /**
   * ⚠️ Partir y componer viven en `lib/herramientas-chat` y NO acá: son inversas
   * exactas y de eso depende que lo que se guarde siga siendo `#foco loquesea`.
   * Acá adentro no se podrían testear, y es lo único de esta pantalla que puede
   * romper datos viejos. Ver el invariante en `tests/herramientas-chat.test.ts`.
   */
  const componer = () => componerHerramienta(herr, texto);

  // Cuando tocás el mensaje-guía del home, este composer se enfoca y sube el
  // teclado. El dispatch es sincrónico, así que el focus cae dentro del gesto
  // (requisito de iOS para abrir el teclado).
  useEffect(() => {
    const enfocar = () => area.current?.focus();
    const pensar = (e: Event) => setPensandoAfuera(Boolean((e as CustomEvent).detail));
    /**
     * ⚠️ ASÍ ENTRAN LAS HERRAMIENTAS DEL CHAT (05/08), y el evento existe para
     * evitar `useSearchParams`: este composer vive en el LAYOUT, así que leer
     * un `?h=` desde acá obligaría a envolver la app entera en `<Suspense>` o
     * rompe el build. Ya está anotado en `NuevoObjetivo`; el menú dispara este
     * evento y listo, sin pasar por la URL.
     *
     * ⚠️ NO ENVÍA: deja el texto escrito y el cursor al final. Mandarlo solo
     * sería el bot hablando por un toque que todavía no dijo nada — y encima
     * mata lo mejor de la idea, que es poder escribir al lado del hashtag.
     */
    const escribir = (e: Event) => {
      const t = String((e as CustomEvent).detail ?? '');
      if (!t) return;
      // ⚠️ El menú sigue mandando `#foco ` en texto plano y no una herramienta:
      // este componente es el que sabe dibujarla. Así el evento no cambia y el
      // día que alguien escriba el hashtag a mano pasa exactamente por acá.
      const { herramienta, resto } = partirHerramienta(t);
      setHerr(herramienta);
      setTexto(resto);
      requestAnimationFrame(() => {
        const a = area.current;
        if (!a) return;
        a.focus();
        a.setSelectionRange(a.value.length, a.value.length);
      });
    };
    window.addEventListener('enfocar-composer', enfocar);
    window.addEventListener('composer-pensando', pensar);
    window.addEventListener('escribir-en-composer', escribir);
    return () => {
      window.removeEventListener('enfocar-composer', enfocar);
      window.removeEventListener('composer-pensando', pensar);
      window.removeEventListener('escribir-en-composer', escribir);
    };
  }, []);

  async function enviarTexto(e: React.FormEvent) {
    e.preventDefault();
    const contenido = componer();
    if (!contenido || bloqueado || grabando) return;
    desbloquearAudio();
    setTexto('');
    setHerr(null);
    if (area.current) area.current.style.height = 'auto';
    await onEnviar({ tipo: 'texto', contenido });
  }

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || bloqueado) return;
    desbloquearAudio();
    setProcesando(true);
    try {
      const foto = await reducirImagen(file);
      const contenido = componer();
      setTexto('');
      setHerr(null);
      await onEnviar({ tipo: 'foto', contenido, foto });
    } finally {
      setProcesando(false);
    }
  }

  async function toggleMic() {
    desbloquearAudio();
    setError(null);
    if (!grabando) {
      if (bloqueado) return;
      try {
        setGrabando(await grabarAudio());
      } catch {
        // getUserMedia falló: casi siempre es permiso de micrófono denegado para este origen.
        setError('El navegador no dio permiso de micrófono. Habilitalo para este sitio (Safari: AA en la barra → Ajustes del sitio web → Micrófono).');
      }
      return;
    }
    const grabacion = grabando;
    setGrabando(null);
    setProcesando(true);
    try {
      const audio = await grabacion.detener();
      const form = new FormData();
      const tipo = audio.type;
      const ext = tipo.includes('webm') ? 'webm' : tipo.includes('ogg') ? 'ogg' : tipo.includes('wav') ? 'wav' : 'm4a';
      form.append('audio', audio, `audio.${ext}`);
      const res = await fetch('/api/transcribir', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.texto) {
        await onEnviar({ tipo: 'audio', contenido: data.texto, adjuntoPath: data.adjuntoPath });
      } else {
        setError(data?.error ?? 'No se pudo transcribir el audio. Probá de nuevo en un momento.');
      }
    } catch {
      setError('No se pudo enviar el audio. Revisá la conexión y probá de nuevo.');
    } finally {
      setProcesando(false);
    }
  }


  return (
    <form onSubmit={enviarTexto}>
      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-[18px] border border-[rgba(192,73,47,.25)] bg-[#fdf1ee] p-[9px_12px] shadow-[0_6px_18px_rgba(50,50,90,.1)]">
          <p className="flex-1 text-[12px] leading-snug text-[#a63d26] text-pretty">{error}</p>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setError(null)} className="flex-none text-brick">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
      {/* ── LA PIEZA ENTERA: LA FRANJA DEL BOT Y EL RENGLÓN DE ESCRIBIR ──────
          ⚠️ EL `overflow-hidden` ES LO QUE HACE QUE SEAN UNA SOLA COSA: sin él
          la franja pisa las esquinas redondeadas y se ve un rectángulo metido
          adentro de una pastilla.

          ⚠️⚠️ Y ES SEGURO PONERLO ACÁ, cosa que hace un mes no lo habría sido:
          recorta, y lo que recorta son los hijos con sombra. Adentro ya no queda
          ninguno —los botones del bot se fueron abajo con la propuesta C— y los
          de la barra (mic, enviar) tienen su sombra hacia adentro del recorte,
          no hacia afuera. Si alguna vez vuelve a entrar algo con sombra acá
          adentro, este `overflow-hidden` es lo primero que hay que mirar: es
          exactamente el bug N.23, que ya volvió dos veces.

          ⚠️ EL PADDING SE MUDÓ ADENTRO. Antes vivía en esta caja; con la franja
          a sangre, un padding acá le dejaría un marco blanco alrededor y la
          partiría en dos otra vez. */}
      <div
        className={`glass-composer overflow-hidden rounded-[26px] border ${grabando ? 'border-[rgba(192,73,47,.5)]' : 'border-iris-borde'} ${pensando && !grabando ? 'composer-glow' : ''}`}
      >
        {/* ⚠️ `franja` QUEDÓ SIN USARSE ACÁ EL 18/08: el bot se despegó del
            composer y lo dibuja `BarraGlobal` arriba del nav. La prop sigue
            existiendo porque el composer de adentro de una conversación puede
            querer meter algo a sangre arriba del renglón. Si en un mes nadie la
            usa, se va. */}
        {!grabando && franja}
        <div className={herr ? 'px-[10px] pb-[6px] pt-[11px]' : 'p-[6px]'}>
        {/* ── LA HERRAMIENTA ELEGIDA, ADENTRO DEL COMPOSER (06/08) ───────────
            Matías: *"cuando elijo el #foco tendría que aparecer el ícono ahí
            donde se escribe el texto, como un rectángulo de color, y abajo como
            una descripción"*.

            ⚠️ EL VIDRIO Y LOS BOTONES NO SE TOCARON, y esa es la corrección
            suya sobre la maqueta: *"me gusta la propuesta, pero que el
            rectángulo siga siendo de vidrio y la foto y el audio sigan siendo
            botones de vidrio"*. Lo único que cambia es lo que pasa ADENTRO
            cuando hay herramienta; sin herramienta el composer es idéntico al de
            siempre, hasta el padding.

            ⚠️ LA PASTILLA VA ARRIBA Y NO EN LÍNEA, y no es una preferencia: un
            `<textarea>` no puede tener un elemento dibujado adentro. Se separan
            el hashtag y el texto (ver `texto` / `herr` arriba) y se vuelven a
            juntar al enviar. Que la descripción quede abajo salió de ahí, y es
            justo como él lo pidió.

            ⚠️ LA DESCRIPCIÓN APARECE ANTES DE MANDAR, que es el punto entero:
            hasta hoy el hashtag era texto pelado y lo que hacía la herramienta
            recién se sabía después de mandarla. */}
        {herr && !grabando && (
          <div className="mb-2">
            <div className="inline-flex items-center gap-1.5 rounded-[9px] bg-iris-soft px-2.5 py-[5px] font-mono text-[12.5px] font-bold text-iris-deep">
              <IconoHerramienta h={herr} className="size-[15px]" />#{herr.id}
              <button
                type="button"
                onClick={() => {
                  setHerr(null);
                  area.current?.focus();
                }}
                aria-label={`Sacar ${herr.etiqueta}`}
                className="-mr-0.5 ml-0.5 opacity-45"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="size-[13px]">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="mt-[7px] px-0.5 text-[12.5px] leading-[1.45] text-tinta-soft text-pretty">{herr.descripcion}</p>
          </div>
        )}

        <div
          className={`flex items-end gap-2 ${herr && !grabando ? 'border-t border-[rgba(108,120,238,.14)] pt-[7px]' : ''}`}
        >
        {/* ⚠️ ACÁ VIVÍA EL BOTÓN DE CÁMARA, A LA IZQUIERDA, Y SE FUE (12/08).
            Pedido textual de Matías: *sacar la cámara* y poner *un `+` lila sin
            círculo al lado del audio*. La foto no se perdió: es la primera fila
            del menú del `+`, unos renglones más abajo.

            El cambio no es de lugar, es de jerarquía. La cámara era el único
            adjunto con botón propio y permanente, y competía de igual a igual
            con el mic estando muchísimo menos usada. */}
        <input ref={archivo} type="file" accept="image/*" hidden onChange={elegirFoto} />

        {/* ── ⚠️⚠️ LAS RESPUESTAS DEL BOT, EN EL RENGLÓN DE ESCRIBIR (18/08) ──
            Es el pedido de Matías, dicho dos veces: el 13/08 (*"que las
            respuestas vivan abajo, en el renglón de escribir"*) y otra vez hoy
            al ver que no estaban (*"los botones no aparecen en el chat
            todavía"*). En el medio yo las había puesto en un renglón propio
            arriba del campo, y no era eso.

            ⚠️ SE VAN APENAS ESCRIBÍS UNA LETRA (`texto.length === 0`). Es lo que
            hace que ocupar el lugar del placeholder no sea un problema: mientras
            no escribiste, las pastillas SON la invitación; en cuanto empezás,
            desaparecen y el campo es todo tuyo. Nunca conviven peleando por el
            mismo ancho.

            ⚠️ Y TAMPOCO VAN CON HERRAMIENTA PUESTA: ahí el placeholder es la
            pista del `#hashtag` elegido, que es una instrucción, no un cartel. */}
        <textarea
          ref={area}
          value={texto}
          rows={1}
          onChange={(e) => {
            // ⚠️ Escribir `#foco ` a mano da la misma pastilla que tocarlo en el
            // menú. Sin esto habría dos caminos para lo mismo con dos resultados
            // distintos, que es como se rompe la confianza en un atajo.
            if (!herr) {
              const { herramienta, resto } = partirHerramienta(e.target.value);
              if (herramienta) {
                setHerr(herramienta);
                setTexto(resto);
                e.target.style.height = 'auto';
                return;
              }
            }
            setTexto(e.target.value);
            // crece con el contenido, hasta 4 líneas
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
            // Borrar hacia atrás con el campo vacío saca la pastilla, que es lo
            // que hace cualquier chip: el backspace es su botón natural.
            if (e.key === 'Backspace' && texto.length === 0 && herr) {
              e.preventDefault();
              setHerr(null);
            }
          }}
          placeholder={
            grabando
              ? '● grabando, tocá para enviar'
              : procesando
                ? 'procesando…'
                : ocupado || pensandoAfuera
                  ? 'pensando…'
                  : // Con herramienta puesta el placeholder es la pregunta que
                    // ella necesita contestada para arrancar sola.
                    (herr?.pista ?? placeholder)
          }
          disabled={bloqueado || grabando != null}
          className={`min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1 text-[16px] leading-snug text-tinta outline-none ${grabando ? 'placeholder:text-brick' : 'placeholder:text-niebla'}`}
        />
        {/* ── EL `+`, PELADO Y LILA (12/08) ────────────────────────────────
            ⚠️ SIN CÍRCULO, y es literal: *"un más lila, sin el círculo"*. Los
            otros dos botones de la barra sí son círculos de vidrio, y esa
            diferencia ahora significa algo — **el mic y enviar HACEN algo; el
            `+` ABRE algo**. Darle la misma pastilla lo pondría a competir con el
            mic, que es justo lo que se acaba de arreglar sacando la cámara.

            ⚠️ EL ÁREA TOCABLE SIGUE SIENDO DE 44px aunque el dibujo sea un
            glifo suelto: *un botón que parece tocable y no responde es un bug*
            (regla suya del 26/07), y su recíproca —uno que responde en un área
            más chica de lo que parece— falla igual. Lo que se sacó es el fondo,
            no el blanco al que apuntás. Es la misma corrección que N.15, el
            lápiz de Objetivos: se agranda el glifo, no la caja. */}
        {!grabando && (
          <button
            ref={mas}
            type="button"
            onClick={() => !bloqueado && setMenuMas((v) => !v)}
            aria-label="Adjuntar o usar una herramienta"
            aria-expanded={menuMas}
            className={`grid size-11 shrink-0 place-items-center rounded-full text-iris ${bloqueado ? 'opacity-50' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-[22px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}

        {hayTexto && !grabando ? (
          <button
            type="submit"
            disabled={bloqueado}
            aria-label="Enviar"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_6px_14px_rgba(108,120,238,.4)] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
          >
            <IconFlechaArriba className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={grabando ? 'Enviar audio' : 'Grabar audio'}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${grabando ? 'animate-pulse bg-brick text-white' : 'glass-boton text-iris'} ${bloqueado && !grabando ? 'opacity-50' : ''}`}
          >
            <IconMic className="size-5" />
          </button>
        )}
        </div>
        </div>
      </div>

      {/* ── LO QUE EL BOT OFRECE, FUERA DE LA CAJA ───────────────────────────
          ⚠️ ACÁ ES DONDE LA PROPUESTA C PAGA. Estos botones tienen sombra, y
          mientras vivieron adentro de una pista con `overflow` la sombra les
          quedaba recortada al ras — que se lee como un borde recto, o sea "una
          caja". Se intentó arreglar dos veces (11/08 con `py-2`, 12/08 con
          `py-4`) antes de que quedara claro que el arreglo bueno era sacarlos.
          Afuera no hay nada que recorte y no hay número que calcular. */}
      {/* ⚠️ LOS PUNTITOS VAN ACÁ, AL FINAL Y FUERA DE LA CAJA DE VIDRIO.

          El 12/08 este lugar tenía un prop `debajo` genérico con la fila de
          botones del bot adentro. Existía para tenerlos FUERA de la caja —el
          `overflow` de la pista les recortaba la sombra al ras, N.23, y se
          intentó arreglar dos veces con padding antes de entender que el arreglo
          era sacarlos—. Los botones ya no están; los puntitos sí.

          ⚠️ Desde el 17/08 se posicionan solos y no empujan nada: ver el
          docstring del prop y la cuenta de los píxeles en `BarraGlobal`.

          ⚠️ No se dibujan grabando: mientras grabás un audio la barra es otra
          cosa y la baraja no se puede seguir. */}
      {!grabando && puntitos}

      {/* El menú del `+`: la foto y las herramientas del chat, juntas por
          primera vez. Hasta hoy la foto era un botón acá y los hashtags vivían
          en el menú lateral, o sea que **las dos formas de sumarle algo a un
          mensaje estaban en dos lugares que no se parecen en nada**. */}
      <MenuFlotante abierto={menuMas} anclaRef={mas} onCerrar={() => setMenuMas(false)} ancho={232}>
        <FilaMenu
          primera
          icono={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[15px] text-iris">
              <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
              <circle cx="12" cy="12.5" r="3.4" />
            </svg>
          }
          onClick={() => {
            setMenuMas(false);
            archivo.current?.click();
          }}
        >
          Mandar una foto
        </FilaMenu>

        {/* ⚠️ LAS MISMAS HERRAMIENTAS QUE EL MENÚ LATERAL, Y DEL MISMO LUGAR
            (`HERRAMIENTAS_CHAT`). No es una copia de la lista: si mañana se
            agrega una, aparece en los dos lados sola. Y entran igual que allá
            —escribiendo `#loquesea ` en el campo, sin enviar— así que el camino
            del hashtag sigue siendo uno solo. */}
        {HERRAMIENTAS_CHAT.map((h) => (
          <FilaMenu
            key={h.id}
            icono={<IconoHerramienta h={h} className="size-[15px] text-iris" />}
            onClick={() => {
              setMenuMas(false);
              setHerr(h);
              requestAnimationFrame(() => area.current?.focus());
            }}
          >
            {h.etiqueta}
          </FilaMenu>
        ))}
      </MenuFlotante>
    </form>
  );
}

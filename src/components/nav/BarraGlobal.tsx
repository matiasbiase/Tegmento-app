'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GLIFO_BUSTO, GLIFO_CALMA, GLIFO_SEGUIMIENTO } from '@/components/ui/glifos';
import { usePathname, useRouter } from 'next/navigation';
import { BarraChat, type Envio } from '@/components/chat/BarraChat';
import { FranjaBot, PuntitosBot, usarBaraja, type TarjetaBot } from '@/components/chat/TarjetasBot';
import { escucharBaraja, ultimaBaraja } from '@/lib/canal-bot';
import { explicarHecho } from '@/lib/actions/hechos';
import { BurbujaPensando } from '@/components/chat/Pensando';
import { IconCasa } from '@/components/ui/iconos';
import { useAltoTeclado } from '@/lib/usar-teclado';

// El chat vive siempre abajo: desde cualquier pantalla podés escribir y se abre
// una conversación. Encima, una mini nav con los cuatro lugares del día a día.
// El resto vive en el menú lateral, y las herramientas ni siquiera ahí: las
// ofrece el chat cuando hacen falta.

// La barra son los CUATRO LUGARES, no las cuatro features (27/07).
//   Home      → el diario y la charla
//   Patrones  → lo que la app te devuelve
//   Cuerpo    → ánimo, sueño, comida, energía
//   Seguimiento → lo que hacés, día a día
//
// ⚠️ POLARIDAD SALIÓ DE ACÁ y no es un descarte: es que **no es un lugar, es una
// herramienta**. A Calma, a Foco y a Polaridad no vas por tu cuenta: te las trae
// el chat cuando hacen falta. Tenerlas fijas en la barra ocupaba el espacio de
// algo que sí se visita todos los días.
// ⚠️ EL ORDEN SIGUE AL USO, NO A LA IMPORTANCIA QUE LE DAMOS (29/07). Seguimiento
// estaba último y pasó a segundo: de 37 días de uso, Matías marcó una actividad
// en 36 y escribió en 11. Era la pestaña más tocada, en la punta más lejos del
// pulgar.
// ⚠️ SEGUIMIENTO SE FUE AL FINAL Y NOTAS TOMÓ SU LUGAR (05/08, Matías: *"el
// ícono de seguimiento al final… el de notas ponerlo donde está el de
// seguimiento y el seguimiento donde está el de nota. Por ahora"*).
// Es la vuelta atrás del orden del 29/07, que subió Seguimiento a segundo con
// el dato de que era la pestaña más tocada. El dato no cambió; cambió para qué
// entra. El *"por ahora"* es suyo: esto se prueba, no se decidió.
const TABS = [
  { href: '/chat', etiqueta: 'Home', Icono: IconCasa },
  { href: '/notas', etiqueta: 'Notas', Icono: IconNotasBarra },
  // ⚠️ RELACIONES VUELVE A LA BARRA Y OBJETIVOS BAJA AL MENÚ (05/08, decisión de
  // Matías: *"relaciones ponerlo en el navbar en lugar de objetivos; objetivos
  // mandarlos al menú de hamburguesa"*).
  //
  // Es la vuelta atrás del cambio del 30/07, que había hecho lo contrario con un
  // argumento bueno —"la barra son los lugares del día a día"—. Lo que cambió no
  // es el argumento: es qué es el día a día para él. Sus palabras del 05/08:
  // *"me interesa el apartado de Relaciones, me interesa Seguimiento, me
  // interesan las Notas"*. Los tres están en la barra; Objetivos, no.
  //
  // ⚠️⚠️ Y EL ORDEN IMPORTÓ: esta pantalla estaba VACÍA hasta hoy, y subirla así
  // habría sido promoverla para mostrar un hueco — el mismo error que poner
  // Acciones encima de una Finanzas sin datos. Primero se arregló que tuviera
  // contenido (pasó de 0 a 17 cruces), después subió. Ver `cosas-chicas/page`.
  { href: '/cosas-chicas', etiqueta: 'Relaciones', Icono: IconRelacionesBarra },
  // ⚠️ NOTAS OCUPA EL LUGAR DE CUERPO (04/08, decisión de Matías: *"sacar el
  // Cuerpo del navbar, ponerlo en el menú de hamburguesa, y en su lugar poner
  // Notas"*). Cuerpo sigue a un toque, en el menú lateral.
  //
  // ⚠️ Y TIENE UNA CONSECUENCIA QUE CONVIENE MIRAR EN UNOS DÍAS: el 27/07 los
  // anillos de "Hoy" se mudaron del Home A CUERPO justamente porque Cuerpo era
  // tab. Con Cuerpo a dos toques, el check-in diario queda más lejos, y la
  // tarjeta que frena (1.8) pasa a ser el camino principal para cargarlo en vez
  // de un extra. Si el registro diario baja, esta es la causa a mirar primero.
  { href: '/actividades', etiqueta: 'Seguimiento', Icono: IconSeguimiento },
];

/**
 * Los tres nodos de Relaciones.
 *
 * ⚠️ ES EL MISMO DIBUJO QUE EN EL MENÚ LATERAL (`Sidebar`), a propósito y por la
 * regla de la casa: *todos los íconos de lo mismo, el mismo ícono*. Dos dibujos
 * para un destino es lo que hace creer que hay dos pantallas. Cambia solo el
 * grosor del trazo, porque acá se dibuja a 17px y allá a 21px.
 */
function IconRelacionesBarra({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="7" r="2.4" />
      <circle cx="18" cy="10" r="2.4" />
      <circle cx="9" cy="18" r="2.4" />
      <path d="M8.1 8.4l7.8 1M7.3 9.2l1.4 6.5M16.4 12l-5.8 4.6" />
    </svg>
  );
}

/**
 * SEGUIMIENTO: las tres barritas. El trazo vive en `ui/glifos.tsx` desde el
 * 06/08 — estaba escrito acá y copiado en los chips del chat, y la barrita de
 * la pantalla de Seguimiento iba a ser la tercera copia. Ahí está también el
 * porqué de cada medida, y el porqué del 1.5 de trazo.
 *
 * ⚠️ Reemplazó al tilde-en-caja (30/07) por dos razones que Matías marcó juntas:
 * era el más grande de la barra (19×18 contra los 16 de Casa) y rompía la fila,
 * y sobre todo **un tilde dice "terminado", y Seguimiento no es eso**. Las
 * barras dibujan lo que la pantalla muestra —días que se van llenando—, o sea
 * que el ícono es una miniatura de su propio contenido.
 */
/**
 * ── ⚠️⚠️ UN RECTÁNGULO (18/08) ──────────────────────────────────────────────
 *
 * Matías: *"se reemplaza el ícono del navbar por un rectangulito"*. Reemplaza a
 * las tres barritas de `GLIFO_SEGUIMIENTO`.
 *
 * ⚠️ Y ESTA VEZ SÍ SE PUEDE CAMBIAR SOLO ACÁ, al revés que con la montaña de
 * hace un rato. Aquella chocaba porque la montaña YA ERA Objetivos y las dos
 * quedaban a la vista en la misma pantalla. Un rectángulo no es de nadie.
 *
 * 👉 Y LA REGLA DE "MISMO LUGAR, MISMO DIBUJO" TAMPOCO SE ROMPE, porque el mismo
 * día dejaron de ser el mismo lugar: la pestaña de adentro pasó a llamarse
 * **"Siguiendo"** y esta entrada sigue siendo **"Seguimiento"**. Una es la
 * pantalla y la otra es una sección adentro; ya no tienen por qué compartir
 * dibujo. Si algún día la pestaña vuelve a llamarse igual que la pantalla, hay
 * que volver a unificarlos.
 *
 * ⚠️ ES UN RECTÁNGULO ACOSTADO Y NO UN CUADRADO, y con las esquinas redondeadas
 * de la casa (`--r-control`, 12px sobre 24 de viewBox ≈ 3): un cuadrado al lado
 * de una casa y una hoja se lee como "sin ícono todavía". Acostado tiene forma
 * propia, y es la misma silueta que los chips rectangulares de "Anotar" — los
 * que se marcan de un toque, que es lo que hacés en esta pantalla.
 */
function IconSeguimiento({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3.2" y="6.8" width="17.6" height="10.4" rx="3" />
    </svg>
  );
}

function IconNotasBarra({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 3.5h11l3.5 3.5v13.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M15.5 3.5V7.5h4M7.5 12h9M7.5 16h6" />
    </svg>
  );
}

function IconCuerpo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {GLIFO_BUSTO}
    </svg>
  );
}

export function BarraGlobal() {
  const ruta = usePathname();
  const router = useRouter();
  const [pensando, setPensando] = useState(false);
  // Cuánto tapa el teclado: sin esto queda un hueco enorme entre el composer y
  // el teclado en el iPhone (iOS no achica el viewport de layout).
  const teclado = useAltoTeclado();
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * LO QUE EL BOT TIENE PARA DECIR, ACOPLADO A LA BARRA (12/08, propuesta C).
   *
   * ⚠️ LLEGA POR `canal-bot` Y NO POR PROP porque el Home y esta barra son
   * HERMANOS: las tarjetas las arma el server en `chat/page.tsx` y bajan a
   * `AsistenteEntrada`, que vive adentro de `{children}`; esto lo monta el
   * layout al lado. Ver la nota larga del canal, incluida la razón por la que
   * guarda el último valor en vez de ser un evento pelado.
   *
   * ⚠️⚠️ ACÁ DECÍA QUE NO HACÍA FALTA PREGUNTAR LA RUTA, Y ERA FALSO (18/08).
   * El argumento era: la pregunta aparece donde alguien la publica —el Home— y
   * se va sola al salir, porque el Home publica `[]` al desmontarse.
   *
   * 👉 **Lo que se pasaba por alto es que `[]` NO ES "no dibujes nada".** Con la
   * baraja vacía la franja entra en su estado callado y dibuja *"Por hoy no
   * tengo nada más"*, que es información valiosa en el Home y ruido en todas las
   * demás pantallas. Visto corriendo el 18/08: en Notas, en Seguimiento y en
   * Datos aparecía el bot diciendo que no tiene nada, abajo de todo.
   *
   * Matías: *"todas estas recomendaciones pueden aparecer solo en el home"*.
   * Así que la ruta SÍ hace falta, y no es una segunda fuente de la verdad: el
   * canal dice **qué** mostrar y la ruta dice **dónde**. Son dos preguntas.
   *
   * ⚠️ ARRANCA CON `ultimaBaraja()` Y NO CON `[]` (12/08). Esta barra se
   * desmonta al entrar a una conversación y se remonta al volver al Home —con
   * `[]` arrancaba vacía un instante hasta que el efecto de abajo llegaba a
   * suscribirse, y la pregunta del bot parpadeaba (desaparecía y volvía) cada
   * vez que volvías. Leer el último valor publicado de entrada salta ese hueco.
   */
  const [tarjetas, setTarjetas] = useState<TarjetaBot[]>(ultimaBaraja);
  useEffect(() => escucharBaraja(setTarjetas), []);
  const baraja = usarBaraja(tarjetas);
  // El Home es `/chat` pelado. `/chat/12` es una conversación y ni llega acá.
  const esHome = ruta === '/chat';

  // Dentro de un chat abierto (composer propio) y en el editor de rueda no va.
  //
  // ⚠️ Y TAMPOCO EN EL EDITOR DE UNA NOTA (30/07). No es por espacio: el
  // composer es la entrada AL CHAT, o sea a la IA. Dejarlo flotando sobre la
  // única pantalla de la app que promete "acá no lee nadie" contradice la
  // pantalla entera, y encima tapaba el pie que lo dice. Con la barra al final
  // matchea `/notas/12` y `/notas/nueva` pero no `/notas`, que es la lista.
  if (/^\/chat\/\d+/.test(ruta) || ruta.startsWith('/rueda/editar') || ruta.startsWith('/notas/')) return null;

  async function enviar(e: Envio) {
    if (pensando) return;
    setPensando(true);

    /**
     * ⚠️⚠️ SI EL BOT ESTABA PREGUNTANDO ALGO, ESTO ES LA RESPUESTA (13/08).
     *
     * Llena `hechos.porque`, que era la única columna del cerebro que nadie
     * escribía — y la que decide si un episodio puede llegar a ser un patrón.
     *
     * 👉 No hizo falta inventar dónde capturarla: **la propuesta C ya había
     * puesto el campo de texto justo abajo de la pregunta**, para que
     * *"contestarle al bot y anotar sean el mismo gesto"*. Esto es ese gesto
     * usado para lo que fue diseñado.
     *
     * ⚠️ Y NO INTERCEPTA EL MENSAJE: lo que escribís sigue yendo al chat igual y
     * el bot te contesta. Si la app se comiera tu respuesta para guardarla, sería
     * peor que no preguntar.
     */
    const preguntando = baraja.actual?.hechoId;
    if (preguntando && e.contenido.trim()) {
      void explicarHecho(preguntando, e.contenido);
    }

    setEnviado(e.contenido.trim() || (e.tipo === 'foto' ? 'Foto' : 'Audio'));
    setError(null);
    try {
      let res: Response;
      if (e.tipo === 'foto') {
        const form = new FormData();
        form.append('contenido', e.contenido);
        form.append('foto', e.foto, 'foto.jpg');
        res = await fetch('/api/chat', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido: e.contenido,
            ...(e.tipo === 'audio' ? { adjuntoTipo: 'audio', adjuntoPath: e.adjuntoPath } : {}),
          }),
        });
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.chatId) {
        router.push(`/chat/${data.chatId}?hablar=1`);
      } else {
        // Antes esto se tragaba el error y la barra volvía sola a la normalidad,
        // sin que se supiera si se había mandado o no.
        setError(data?.error ?? 'No se pudo mandar. Probá de nuevo.');
      }
    } catch {
      setError('No se pudo mandar, revisá la conexión.');
    } finally {
      setPensando(false);
    }
  }

  return (
    <>
      {/* Tapa el pie: sin esto el texto de la página se lee a medias detrás del
          vidrio y asoma por debajo del composer, en la franja del safe-area. */}
      <div
        aria-hidden
        className="desplaza-menu fondo-app pie-difuminado pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[190px]"
        style={{ transform: teclado ? `translateY(-${teclado}px)` : undefined }}
      />
    <div
      /**
       * ── ⚠️⚠️ LA BARRA BAJÓ, Y EL NÚMERO TIENE CUENTA (17/08) ───────────────
       *
       * Matías: *"estaría bueno que todo el menú vaya un poco más abajo… total
       * no es tocable"*, y preguntó si eso era una limitación del navegador.
       * **No lo es**: los 34px de abajo son de iOS, no del navegador — es la
       * franja del indicador de home—, y la app ya pide la pantalla entera
       * (`viewportFit: 'cover'` en `app/layout`). Ahí se PUEDE dibujar.
       *
       * Lo que no se puede es poner ahí cosas para tocar: iOS se queda con el
       * gesto de los últimos ~20px y el toque se pierde. Por eso lo único que
       * baja son los puntitos, justamente ahora que dejaron de ser botones.
       *
       * La cuenta, de abajo hacia arriba, en un iPhone con indicador:
       *   0–13px   el indicador de home. No se toca nada de esto.
       *   14–22px  los puntitos (8px), en `PuntitosBot`, sin ocupar layout.
       *   26px     acá empieza el composer  ← `env(...) - 8px` = 34 - 8
       * Antes el composer empezaba a 34px y los puntitos le sumaban 14px de
       * alto por encima: **48px contra 26px, o sea 22px ganados.**
       *
       * ⚠️ Sin indicador (Android, escritorio, iPhone viejo) `env()` vale 0 y
       * queda el piso de 20px. Es más que los 12px de antes a propósito: ahí
       * abajo no hay banda reservada, así que los puntitos necesitan que se la
       * demos nosotros.
       */
      className="desplaza-menu fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-[14px] pb-[max(20px,calc(env(safe-area-inset-bottom)-8px))]"
      style={
        teclado
          ? {
              transform: `translateY(-${teclado}px)`,
              // Con el teclado abierto no hay indicador de home que esquivar:
              // el safe-area de abajo sobra y sumaba al hueco.
              paddingBottom: 8,
              transition: 'transform .18s ease-out',
            }
          : { transition: 'transform .18s ease-out' }
      }
    >
      {/* mientras el modelo trabaja: se ve qué mandaste y que sigue vivo */}
      {pensando && <BurbujaPensando enviado={enviado ?? undefined} />}

      {error && !pensando && (
        <div className="glass-ios mb-2 flex items-start gap-2 rounded-[18px] px-4 py-3">
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-brick text-pretty">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Cerrar el aviso"
            className="flex-none font-mono text-[12px] font-semibold text-niebla"
          >
            OK
          </button>
        </div>
      )}

      {/* ── ⚠️⚠️ EL BOT SE DESPEGÓ DEL CAMPO DE TEXTO (18/08) ──────────────────
          Matías: *"sacarlo de ahí del texto y ponerlo pegado arriba del nav, y
          cuando queda vacío queda solo el bot, pero sin recuadro ni nada"*.

          👉 **Y ESTO REVIERTE LA PROPUESTA C DEL 12/08**, que fue la que acopló
          la tarjeta al campo. Aquel argumento —*contestarle al bot y anotar
          pasan a ser el mismo gesto*— era bueno, y hay que decir qué lo hizo
          caer: acoplado, el bot y el composer **competían por el mismo renglón**.
          De ahí salieron los tres problemas de hoy: los botones peleando con el
          placeholder, las pastillas blancas invisibles sobre el composer blanco,
          y la franja tinteada leyéndose como parte del campo. Suelto, cada uno
          es lo que es y el gesto sigue estando a dos centímetros.

          ⚠️ VA ARRIBA DEL NAV Y NO ABAJO: entre el bot y el campo queda el nav,
          que es justo lo que los separa visualmente. Pegado al campo volveríamos
          a lo mismo con un margen en el medio.

          ⚠️ SE DIBUJA SIEMPRE QUE HAYA HOME, aunque no tenga tarjetas: sin nada
          que decir queda el avatar solo, sin caja (ver `FranjaBot`). */}
      {esHome && <FranjaBot baraja={baraja} />}

      {/* mini nav */}
      <div className={`mb-2 flex justify-center ${pensando ? 'opacity-40' : ''}`}>
        <nav className="glass-ios flex items-center gap-1 rounded-full p-1">
          {TABS.map((t) => {
            const activo = t.href === '/chat' ? ruta.startsWith('/chat') : ruta.startsWith(t.href);
            // Ya no hay fallback: desde el 04/08 todas las tabs traen su ícono.
            const Ic = t.Icono;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.etiqueta}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-[12px] font-semibold tracking-[0.2px] transition-colors ${
                  activo ? 'bg-iris-soft text-iris-deep' : 'text-niebla'
                }`}
              >
                <Ic className="size-[17px]" />
                {activo && t.etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* composer siempre presente.
          ⚠️ EL PLACEHOLDER DICE QUÉ PODÉS HACER, NO PREGUNTA. Se probó con la
          pregunta contextual del Home ("¿Cómo viene lo de jugar al fútbol?") y
          fue peor: quedaba fija, nadie contesta un placeholder, y era lo único
          que se leía ahí — se comía la invitación. Las preguntas contextuales
          siguen, pero abajo, donde se pueden tocar. */}
      <BarraChat
        onEnviar={enviar}
        ocupado={pensando}
        placeholder="Escribí algo o contame el día…"
        /* ⚠️ CON EL TECLADO ABIERTO NO VAN. Viven pegados al piso de la
           pantalla, y con el teclado la barra sube y el padding de abajo se
           achica a 8px: ahí los puntitos quedarían justo debajo del composer,
           encima del teclado y sin la franja del indicador que los aloja.
           Y no se pierde nada: con el teclado arriba estás escribiendo, no
           mirando la baraja. */
        puntitos={teclado || !esHome ? null : <PuntitosBot baraja={baraja} />}
      />
    </div>
    </>
  );
}

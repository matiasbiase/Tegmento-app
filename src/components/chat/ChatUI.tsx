'use client';

import { Fragment, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { BarraChat, type Envio } from '@/components/chat/BarraChat';
import { PuntosPensando, TextoEspera, Escribiendo } from '@/components/chat/Pensando';
import { IconAltavoz } from '@/components/ui/iconos';
import { IconoHerramienta } from '@/components/chat/IconoHerramienta';
import { crearActividad, marcarHecho } from '@/lib/actions/actividades';
import { crearEvento } from '@/lib/actions/eventos';
import { guardarGastoManual } from '@/lib/actions/gastos';
import { MARCA_GASTO, extraerMarcaGasto, type MarcaGasto } from '@/lib/gastos-marca';
import { MARCA_IDEA, leerMarcaIdea } from '@/lib/idea-marca';
import { guardarIdea } from '@/lib/actions/notas';
import { registrarInicioPeriodo, registrarFinPeriodo } from '@/lib/actions/ciclo';
import { MARCA_HECHO } from '@/lib/hecho';
import { MARCA_COMIDA, extraerMarcaComida, normalizarComida } from '@/lib/comida-marca';
import { registrarComida } from '@/lib/actions/cuerpo';
import { MARCA_AGENDA, extraerMarcaAgenda, etiquetaDiaAgenda, type MarcaAgenda } from '@/lib/agenda';
import { MARCA_FOCO, extraerMarcaFoco, type MarcaFoco } from '@/lib/foco-marca';
import { MARCA_PLAN, extraerMarcaPlan, type MarcaPlan } from '@/lib/plan-marca';
import { crearDesdePlan } from '@/lib/actions/plan-desde-chat';
import { FocoOverlay } from '@/components/tools/FocoOverlay';
import { desbloquearAudio, reproducirVoz } from '@/lib/vozCliente';
import { TarjetaContraste, type ResultadoContraste } from '@/components/contraste/TarjetaContraste';
import { SesionPlegada } from '@/components/chat/SesionPlegada';
import { partirSesiones } from '@/lib/sesiones';
import { sugeridosDe } from '@/lib/sugeridos';
import { MenuMensaje } from '@/components/chat/MenuMensaje';
import { Cristal } from '@/components/chat/Cristal';
import { CristalPropuesto } from '@/components/chat/CristalPropuesto';
import { HojaTemas } from '@/components/chat/HojaTemas';
import { agruparPorTema } from '@/lib/cristales';
import { proponerAgrupacion } from '@/lib/actions/mensajes';
import type { PropuestaGrupo } from '@/lib/agrupador';
import { herramientaDe } from '@/lib/herramientas-chat';
import { AvatarIA } from '@/components/ui/AvatarIA';
// ⚠️ El mapa de íconos se mudó a `IconoHerramienta` el 06/08: el composer
// también lo necesita, y dos mapas se despegan en cuanto se agregue la sexta
// herramienta. Un concepto, un dibujo.

type Mensaje = {
  /** Falta en los recién enviados: hasta que no vuelven del server no tienen
   *  fila propia, y sin fila no se pueden destacar ni borrar. */
  id?: number;
  destacado?: boolean;
  rol: string;
  contenido: string;
  adjuntoTipo?: string | null;
  adjuntoPath?: string | null;
  /** ISO del server. Falta en los recién enviados: son de hoy. */
  creado?: string | null;
  /** A qué tema quedó agrupado ("cristalizar"), si a alguno. */
  temaId?: number | null;
};

const BURBUJA_BOT = 'linear-gradient(135deg,var(--color-iris-tint-2) 0%,#f4ecfe 52%,#e9f2fe 100%)';
const GRAD_IRIS = 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))';

// El asistente sugiere acciones de la app como [texto](/ruta): acá se vuelven
// chips tocables. Solo rutas internas (empiezan con /), nunca URLs externas.
const LINK_INTERNO = /\[([^\]]+)\]\((\/[a-zA-Z0-9/_-]*)\)/g;

// La IA propone sumar una actividad con la marca [+actividad: título]: se vuelve
// un botón de confirmación (no se muestra como texto ni se lee en voz).
const MARCA_ACTIVIDAD = /\[\+actividad:\s*([^\]\n]+)\]/i;
/**
 * La misma marca en global, para sacar TODAS y no solo la primera.
 *
 * ⚠️ EL BUG QUE ARREGLA (29/07, Matías: *"había dos actividades para agregar y
 * solo agregó una"*): con `.match()` sobre una regex sin `g`, JS devuelve
 * únicamente la primera coincidencia. Así que si el asistente proponía dos
 * actividades en el mismo mensaje, la segunda se borraba de la pantalla
 * —`limpiarLinks` y `ContenidoMensaje` también sacaban solo una, con lo cual la
 * otra quedaba visible como texto crudo— y nunca aparecía su botón.
 *
 * Va aparte y no se reemplaza la de arriba porque una regex con `g` guarda
 * estado (`lastIndex`) entre llamadas: usar la misma para `.test()` y para
 * `.matchAll()` hace que `.test()` devuelva true y false alternadamente. Ese es
 * un bug clásico y silencioso; dos constantes cuestan menos que recordarlo.
 */
const MARCAS_ACTIVIDAD = /\[\+actividad:\s*([^\]\n]+)\]/gi;

/** Los títulos de todas las actividades propuestas en un mensaje, sin repetidos
 *  (el modelo a veces insiste con la misma dos veces). */
function actividadesPropuestas(texto: string): string[] {
  return [...new Set([...texto.matchAll(MARCAS_ACTIVIDAD)].map((m) => m[1].trim()).filter(Boolean))];
}
// La IA propone ver la otra cara de algo cargado con [+contraste: tema].
const MARCA_CONTRASTE = /\[\+contraste:\s*([^\]\n]+)\]/i;
// La IA ofrece mirar cómo le puede haber llegado a la otra persona con
// [+comolove: de qué]. Es un botón: mirar lo de uno con los ojos del otro se
// ofrece, no se sirve de prepo.
const MARCA_COMOLOVE = /\[\+comolove:\s*([^\]\n]+)\]/i;
// La IA propone registrar el período con [+periodo: inicio|fin].
const MARCA_PERIODO = /\[\+periodo:\s*(inicio|fin)\]/i;
// La IA propone marcar algo puntual como hecho con [+hecho: qué pasó] (MARCA_HECHO en lib/hecho).

function limpiarLinks(texto: string): string {
  return texto
    .replace(LINK_INTERNO, '$1')
    .replace(MARCAS_ACTIVIDAD, '')
    .replace(MARCA_CONTRASTE, '')
    .replace(MARCA_COMOLOVE, '')
    .replace(MARCA_HECHO, '')
    .replace(MARCA_AGENDA, '')
    .replace(MARCA_PERIODO, '')
    .replace(MARCA_GASTO, '')
    .replace(MARCA_COMIDA, '')
    .replace(MARCA_FOCO, '')
    .replace(MARCA_PLAN, '')
    .replace(MARCA_IDEA, '')
    .trim();
}

function ContenidoMensaje({ texto }: { texto: string }) {
  texto = texto
    .replace(MARCAS_ACTIVIDAD, '')
    .replace(MARCA_CONTRASTE, '')
    .replace(MARCA_COMOLOVE, '')
    .replace(MARCA_HECHO, '')
    .replace(MARCA_AGENDA, '')
    .replace(MARCA_PERIODO, '')
    .replace(MARCA_GASTO, '')
    .replace(MARCA_COMIDA, '')
    .replace(MARCA_FOCO, '')
    .replace(MARCA_PLAN, '')
    .replace(MARCA_IDEA, '')
    .trim();
  // ⚠️ LOS LINKS QUEDAN COMO TEXTO, NO COMO BOTÓN (29/07, pedido de Matías).
  // Antes cada `[texto](/ruta)` se volvía un chip acá adentro, y los botones
  // partían la frase al medio: la respuesta se leía a los saltos. Lo tocable se
  // fue a la fila de arriba del composer (ver lib/sugeridos), así que acá solo
  // se saca el markdown y la oración se lee entera, como la escribió.
  const limpio = texto.replace(LINK_INTERNO, '$1');

  /**
   * ⚠️ EL `#polaridad` DEL PRINCIPIO SE PINTA COMO CHIP (05/08, Matías: *"como
   * se escribe este prompt, estaría bueno que se ponga en color, o sea, que no
   * se vea el prompt, pero se vea el hashtag polaridad"*).
   *
   * ⚠️ ES SOLO PINTURA: el mensaje guardado ES `#polaridad`, tal cual se ve. Lo
   * que no se ve —la instrucción larga— nunca estuvo acá; se agrega recién en el
   * viaje al modelo (`api/chat/route.ts`). Por eso el chip se puede dibujar sin
   * mentir: no esconde texto, resalta el que hay.
   */
  const h = herramientaDe(limpio);
  if (h) {
    const resto = limpio.trim().slice(`#${h.id}`.length).trim();
    return (
      <p className="whitespace-pre-wrap">
        {/* ⚠️ CON EL ÍCONO ADENTRO (05/08). Matías, comparando la app con la
            maqueta: *"tampoco aparece el ícono; en la maqueta que mostraste
            aparece el ícono al lado del hashtag calma"*. Y es el mismo dibujo
            que el del menú, que es lo que hace que se entienda de dónde salió
            ese hashtag sin explicarlo. */}
        <span className="mr-1.5 inline-flex items-center gap-1 rounded-[8px] bg-iris-soft px-[7px] py-[2px] align-[1px] font-mono text-[12.5px] font-bold text-iris-deep">
          <IconoHerramienta h={h} className="size-[13px]" />#{h.id}
        </span>
        {resto}
      </p>
    );
  }

  return <p className="whitespace-pre-wrap">{limpio}</p>;
}

/**
 * "Sumar X a mis actividades", ahora con a qué objetivo cuelga.
 *
 * Pedido de Matías (30/07): *"cuando vas generando seguimientos, o le hablás al
 * chat y te dice '¿querés agregar esto a seguimiento?', ahí también que te dé
 * una opción para marcarlo como alguno de los objetivos, como un dropdown, y
 * elegís uno de los objetivos abiertos que tengas"*.
 *
 * ── LAS TRES DECISIONES DEL DESPLEGABLE ──────────────────────────────────────
 *
 * 1. ⚠️ **SE PUEDE SALTEAR, Y ARRANCA VACÍO.** Es un renglón opcional debajo del
 *    botón, no un paso previo. Obligar a elegir convertiría un botón de un toque
 *    en un formulario, justo en el momento en que estás contando algo y no
 *    ordenando la app. Sin elegir, sigue valiendo el cruce por nombre de siempre.
 *
 * 2. **Solo objetivos ABIERTOS.** Colgar una actividad nueva de algo que ya
 *    cerraste no significa nada, y encima ensuciaría el arco de un objetivo
 *    terminado — que es la materia prima con la que se estima el próximo.
 *
 * 3. ⚠️ **NO APARECE SI NO HAY OBJETIVOS.** Un desplegable vacío es peor que
 *    ninguno: te hace buscar algo que no existe y sugiere que te falta hacer una
 *    tarea previa. El botón queda como estaba.
 */
function PropuestaActividad({
  titulo,
  objetivos = [],
}: {
  titulo: string;
  objetivos?: { id: number; titulo: string }[];
}) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo'>('idle');
  const [objetivoId, setObjetivoId] = useState<string>('');
  const [eligiendo, setEligiendo] = useState(false);
  const elegido = objetivos.find((o) => String(o.id) === objetivoId);

  async function sumar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      await crearActividad(titulo, undefined, false, objetivoId ? Number(objetivoId) : null);
      setEstado('listo');
    } catch {
      setEstado('idle');
    }
  }

  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {/* Se dice a qué quedó colgada: si no, elegiste algo y la app no te da
            ninguna señal de que te escuchó. */}
        {elegido ? `Sumada, y cuenta para “${elegido.titulo}”` : 'Sumada a tus actividades'}
      </p>
    );
  }

  return (
    <div className="mt-2">
      {/* ── EL BOTÓN, CON EL `+` EN CÍRCULO (06/08) ──────────────────────────
          Matías: *"fijate si se puede mejorar cómo se ve ese más en el
          rectángulo blanco, que se vea como un botoncito de vidrio, con esa
          misma estética"*, y *"con el más en círculo va a correr todo un poco
          más a la derecha y va a hacer que las dos líneas estén más completas"*.

          ⚠️ Y ESO ÚLTIMO ES EXACTO, aunque suene raro: el `+` suelto ocupaba el
          ancho de un carácter, así que la primera línea empezaba casi pegada al
          borde y la segunda quedaba con una palabra sola colgando. **El círculo
          come ancho de la PRIMERA línea nada más** —las de abajo arrancan
          alineadas al texto— así que el bloque se reparte mejor.

          ⚠️ `text-balance` es lo que termina de arreglarlo: reparte los
          renglones para que no quede uno con una palabra. Es la misma propiedad
          que saqué hoy del resumen semanal, y acá SÍ va — la diferencia es el
          largo: en un párrafo de seis renglones deja un margen fantasma, en un
          rótulo de dos hace justo lo que promete. */}
      <button
        type="button"
        onClick={sumar}
        disabled={estado === 'guardando'}
        className="pastilla-vidrio flex w-full items-center gap-2.5 rounded-[18px] border border-iris-borde p-[10px_13px] text-left disabled:opacity-60"
      >
        {/* ⚠️ EL CÍRCULO ERA `bg-iris-soft` Y NO SE VEÍA (06/08, Matías: *"al
            círculo le falta contraste; el más se ve, pero el círculo no"*).
            Y es medible: `--color-iris-soft` es #eaebfc sobre una pastilla de
            vidrio casi blanca — dos o tres puntos de luminancia de diferencia.
            **El `+` tenía contraste propio (`text-iris-deep`) y el disco de
            atrás no**, así que se leía un más flotando, no un botón.
            Ahora va el degradé lila con el `+` en blanco: es el mismo relleno
            que ya usan el botón de "Anotar" y las barras de progreso, o sea la
            forma que tiene la app de decir "esta es LA acción". La pastilla
            sigue siendo de vidrio; lo que cambió es el acento de adentro. */}
        <span
          className="grid size-7 flex-none place-items-center rounded-full text-white"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[15px]">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-[1.35] text-iris-deep text-balance">
          {estado === 'guardando' ? 'Sumando…' : `Sumar “${titulo}” a mis actividades`}
        </span>
      </button>

      {/* ── A QUÉ OBJETIVO CUELGA (06/08) ────────────────────────────────────
          ⚠️ ERA UN `<select>` NATIVO con la pregunta al lado, y él lo cortó:
          *"esa forma de agregarlo no me convence, le pondría un más directamente
          y cuando apretás te aparecen todos los objetivos"*.
          Tenía razón por algo concreto: **un desplegable del sistema se abre
          como una rueda gris del iPhone**, con su tipografía y su fondo, en el
          medio de una tarjeta de vidrio. Era lo único de la pantalla que no era
          de esta app — el mismo problema que los emojis de las notas.
          Y encima **arrancaba en "Ninguno" mostrando "Ningu…" recortado**, que
          se lee como un error.
          Ahora es un `+` que despliega los objetivos como chips. Incluye
          "Objetivo nuevo", que es lo que él pidió y de paso es la única forma de
          colgar algo de un objetivo que todavía no existe. */}
      {estado !== 'guardando' && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {elegido ? (
            <button
              type="button"
              onClick={() => setObjetivoId('')}
              className="flex items-center gap-1 rounded-full bg-iris-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-iris-deep"
            >
              {ICO_META}
              {elegido.titulo}
              <span className="text-[10px] opacity-60">✕</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEligiendo((v) => !v)}
              aria-expanded={eligiendo}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-niebla-2 px-2.5 py-1 font-mono text-[11px] font-semibold text-niebla"
            >
              {ICO_META}
              ¿Cuenta para un objetivo?
            </button>
          )}

          {eligiendo &&
            !elegido &&
            objetivos.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setObjetivoId(String(o.id));
                  setEligiendo(false);
                }}
                className="rounded-full border border-iris-borde bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-iris-deep"
              >
                {o.titulo}
              </button>
            ))}

          {eligiendo && !elegido && (
            <Link
              href="/objetivos?nuevo=1"
              className="rounded-full border border-dashed border-iris-borde px-2.5 py-1 font-mono text-[11px] font-semibold text-iris"
            >
              + objetivo nuevo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** La banderita de meta, la misma que usa la tarjeta de objetivo. */
const ICO_META = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[12px] flex-none">
    <path d="M6 21V4" />
    <path d="M6 4.5h11l-2.2 3.6L17 12H6z" />
  </svg>
);

/**
 * "Anotarlo en tus comidas": el botón de `[+comida:]`.
 *
 * ⚠️ COMO TODAS LAS MARCAS, LA APP NO GUARDA HASTA QUE LO TOCÁS. El prompt se lo
 * prohíbe al modelo con todas las letras, pero eso no alcanzó nunca — con un 12b
 * una prohibición enterrada en un prompt largo se ignora. Lo que lo garantiza es
 * que acá no hay ninguna llamada automática.
 */
function PropuestaComida({ que }: { que: string }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo'>('idle');
  async function guardar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      await registrarComida(normalizarComida(que));
      setEstado('listo');
    } catch {
      setEstado('idle');
    }
  }
  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Anotado en tus comidas
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={guardar}
      disabled={estado === 'guardando'}
      className="mt-2 flex items-center gap-1.5 rounded-full border border-verde/30 bg-verde-tint px-3 py-1.5 font-mono text-[12px] font-bold text-verde disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
        <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" />
        <path d="M17 3c-1.5 1.5-2 3.5-2 5.5s.5 3 2 3.5v9" />
      </svg>
      {estado === 'guardando' ? 'Anotando…' : 'Anotarlo en tus comidas'}
    </button>
  );
}

function PropuestaHecho({ titulo }: { titulo: string }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo'>('idle');
  async function marcar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      await marcarHecho(titulo, 'chat');
      setEstado('listo');
    } catch {
      setEstado('idle');
    }
  }
  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Sumado a tus actividades como hecho
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={marcar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M5 13l4 4L19 7" />
      </svg>
      {estado === 'guardando' ? 'Marcando…' : `Marcar “${titulo}” como hecho`}
    </button>
  );
}

function PropuestaAgenda({ marca }: { marca: MarcaAgenda }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo'>('idle');
  async function agendar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      await crearEvento(marca.titulo, marca.fecha, marca.hora);
      setEstado('listo');
    } catch {
      setEstado('idle');
    }
  }
  const cuando = `${etiquetaDiaAgenda(marca.fecha, new Date()).toLowerCase()}${marca.hora ? ` a las ${marca.hora}` : ''}`;
  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Anotado en tu calendario
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={agendar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
      {estado === 'guardando' ? 'Agendando…' : `Agendar “${marca.titulo}” ${cuando}`}
    </button>
  );
}

/**
 * El botón que abre una sesión de foco desde el chat (pedido 1.9, del 24/07).
 *
 * ⚠️ NO SE PARECE A LAS OTRAS PROPUESTAS Y NO HAY QUE "EMPAREJARLO": las demás
 * guardan algo y terminan en un "listo" verde. Esta no guarda nada — abre un
 * reloj. No hay nada que confirmar, así que al cerrar el foco el botón vuelve a
 * estar disponible en vez de quedar tildado. Un "listo" acá prometería un
 * registro que no existe.
 *
 * ⚠️⚠️ EL OVERLAY VA POR PORTAL, Y NO ES OPCIONAL. `FocoOverlay` es
 * `position: fixed`, y la burbuja del mensaje que lo contiene lleva `.flotar`
 * (ver el `className` del bubble más abajo), que deja un `transform` puesto para
 * siempre por culpa de `animation-fill-mode: both`. Un hijo `fixed` de un
 * elemento con transform NO se mide contra la pantalla: se mide contra esa caja.
 * Sin el portal, el foco a pantalla completa saldría del tamaño de un globito de
 * chat. Es el mismo bug que mordió cinco veces entre el 31/07 y el 02/08.
 */
function PropuestaFoco({ marca }: { marca: MarcaFoco }) {
  const [abierto, setAbierto] = useState(false);
  // El portal necesita `document`, que en el render del server no existe.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2M9 2h6" />
        </svg>
        {`Empezar ${marca.minutos} min de foco`}
      </button>

      {abierto &&
        montado &&
        createPortal(
          <FocoOverlay
            titulo={marca.que}
            subtitulo="Sostené la atención en una sola cosa."
            duracionMin={marca.minutos}
            onSalir={() => setAbierto(false)}
          />,
          document.body,
        )}
    </>
  );
}

/**
 * `#plan` dejó un objetivo listo para anotar.
 *
 * ⚠️ SIGUE EL PATRÓN DE `PropuestaGasto` Y NO EL DE `PropuestaFoco`, y la
 * diferencia importa: **foco no guarda nada** (abre un reloj, y si lo cerrás no
 * pasó nada que anotar), así que su botón dice "Empezar" y no deja rastro. Esto
 * SÍ guarda, así que dice "Anotar" y termina en un "listo" verde que confirma
 * dónde quedó. Es la distinción que ya estaba escrita en `foco-marca.ts`.
 *
 * ⚠️⚠️ EL "LISTO" NOMBRA DÓNDE FUE A PARAR y ofrece ir, pero **no arrastra**.
 * Después de anotar un plan no hay nada más que hacer — esa es la tesis: *"este
 * es el plan, lo sigo y lo analizo cuando sea necesario"*. Un botón que te
 * empuje a "ver el progreso" reinstalaría la pregunta que el plan vino a sacar.
 */
function PropuestaPlan({ marca }: { marca: MarcaPlan }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo' | 'error'>('idle');

  async function guardar() {
    if (estado === 'guardando' || estado === 'listo') return;
    setEstado('guardando');
    try {
      const id = await crearDesdePlan(marca);
      setEstado(id ? 'listo' : 'error');
    } catch {
      setEstado('error');
    }
  }

  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        <Link href="/objetivos" className="underline decoration-verde/40 underline-offset-2">
          Anotado en Objetivos
        </Link>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={guardar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M12 3v18M5 8l7-5 7 5" />
      </svg>
      {estado === 'guardando' ? 'Anotando…' : `Anotar "${marca.que}"`}
    </button>
  );
}

// Gasto contado en palabras ("gasté 40 en el súper"): botón para anotarlo en
// Finanzas sin foto. Antes solo se podía con un ticket fotografiado.
function PropuestaGasto({ marca }: { marca: MarcaGasto }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo' | 'error'>('idle');
  async function guardar() {
    if (estado === 'guardando' || estado === 'listo') return;
    setEstado('guardando');
    try {
      // ⚠️ LA CATEGORÍA VIAJA PERO NO SE MUESTRA EN EL BOTÓN (03/08). El botón
      // sigue diciendo solo el monto y en qué. Agregarle "…como comida" te
      // obligaría a validar una clasificación que no pediste, y convierte un
      // toque en una decisión. Si el modelo se equivoca, el chip es editable en
      // Finanzas, que es donde se ve.
      const r = await guardarGastoManual({
        total: marca.total,
        comercio: marca.descripcion,
        moneda: marca.moneda,
        categoria: marca.categoria,
      });
      setEstado(r.ok ? 'listo' : 'error');
    } catch {
      setEstado('error');
    }
  }
  const monto = `${marca.moneda ? `${marca.moneda} ` : ''}${marca.total}`;
  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Anotado en Finanzas
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={guardar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M4 5h16v14l-2.5-1.5L15 19l-3-1.5L9 19l-2.5-1.5L4 19z" />
        <path d="M8 9h8M8 12.5h5" />
      </svg>
      {estado === 'guardando' ? 'Anotando…' : `Anotar ${monto}${marca.descripcion ? ` en ${marca.descripcion}` : ''}`}
    </button>
  );
}

/**
 * "Guardarla en Notas": el botón de `[+idea:]` (§2.2, 04/08).
 *
 * ⚠️ EL BOTÓN DICE A DÓNDE VA, y eso es la mitad del diseño. No dice "Guardar la
 * idea" —que dejaría al usuario preguntándose dónde quedó— sino **Guardarla en
 * Notas**: una idea acá es una nota con la etiqueta "Idea", y no hay ningún
 * lugar nuevo que aprender. Ver `lib/idea-marca.ts`, que explica por qué esto no
 * es una cajita.
 */
function PropuestaIdea({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo' | 'error'>('idle');

  async function guardar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      const r = await guardarIdea(texto);
      setEstado(r.ok ? 'listo' : 'error');
    } catch {
      setEstado('error');
    }
  }

  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold text-verde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Guardada en Notas
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={guardar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
        <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M18.4 5.6l-2.1 2.1" />
        <path d="M9.5 20h5M10 17h4a4.5 4.5 0 1 0-4 0Z" />
      </svg>
      {estado === 'guardando' ? 'Guardando…' : `Guardar "${texto.length > 28 ? texto.slice(0, 28) + '…' : texto}" en Notas`}
    </button>
  );
}

function PropuestaPeriodo({ tipo }: { tipo: 'inicio' | 'fin' }) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'listo'>('idle');
  async function registrar() {
    if (estado !== 'idle') return;
    setEstado('guardando');
    try {
      await (tipo === 'inicio' ? registrarInicioPeriodo() : registrarFinPeriodo());
      setEstado('listo');
    } catch {
      setEstado('idle');
    }
  }
  if (estado === 'listo') {
    return (
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[12px] font-semibold" style={{ color: 'var(--color-rosa)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {tipo === 'inicio' ? 'Anotado en tu ciclo' : 'Fin del período anotado'}
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={registrar}
      disabled={estado === 'guardando'}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60"
      style={{ borderColor: 'rgba(209,86,122,.4)', color: 'var(--color-rosa)' }}
    >
      {estado === 'guardando' ? 'Anotando…' : tipo === 'inicio' ? 'Registrar que me vino' : 'Registrar que terminó'}
    </button>
  );
}

// Dos usos del mismo motor, con encuadres opuestos a propósito:
//  - 'otracara': para una OPINIÓN sobre algo discutible. Trae el mejor argumento
//    del lado contrario.
//  - 'interpretacion': para algo que pasó con OTRA PERSONA. No contradice nada:
//    muestra cómo puede haberle llegado al otro. Matías lo pidió así: "mostrar
//    qué entiende el otro de tu mensaje es la clave, ese es el diferencial".
//    Y encima 'otracara' acá no servía: le hablaba de "la amistad" como concepto
//    en vez de su situación, y llevarle la contra cuando venía dolido no ayuda.
function PropuestaContraste({ tema, modo = 'otracara' }: { tema: string; modo?: 'otracara' | 'interpretacion' }) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'error'>('idle');
  const [res, setRes] = useState<ResultadoContraste | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function verOtraCara() {
    if (estado === 'cargando' || estado === 'listo') return;
    setEstado('cargando');
    setErr(null);
    try {
      const r = await fetch('/api/contraste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo, tema }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data) {
        setRes(data as ResultadoContraste);
        setEstado('listo');
      } else {
        setErr(data?.error ?? 'No se pudo, probá de nuevo.');
        setEstado('error');
      }
    } catch {
      setErr('No se pudo, revisá la conexión.');
      setEstado('error');
    }
  }

  if (estado === 'listo' && res) {
    return (
      <div className="mt-2.5">
        <TarjetaContraste r={res} />
      </div>
    );
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={verOtraCara}
        disabled={estado === 'cargando'}
        className="inline-flex items-center gap-1.5 rounded-full border border-iris-borde bg-white px-3 py-1.5 text-[13px] font-semibold text-iris-deep disabled:opacity-60"
      >
        {modo === 'interpretacion' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
            <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" />
            <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 19a4 4 0 0 1 5-3.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
            <path d="M8 3L4 7l4 4M4 7h13a4 4 0 0 1 0 8h-1M16 21l4-4-4-4M20 17H7a4 4 0 0 1 0-8h1" />
          </svg>
        )}
        {modo === 'interpretacion'
          ? estado === 'cargando'
            ? 'Poniéndome en su lugar…'
            : 'Ver cómo lo puede haber leído'
          : estado === 'cargando'
            ? 'Buscando la otra cara…'
            : 'Ver la otra cara'}
      </button>
      {estado === 'error' && err && <p className="mt-1.5 text-[12px] text-brick">{err}</p>}
    </div>
  );
}

function BotonVoz({ texto, onCambio }: { texto: string; onCambio: (sonando: boolean) => void }) {
  const [estado, setEstado] = useState<'listo' | 'sonando'>('listo');
  async function hablar() {
    if (estado !== 'listo') return;
    desbloquearAudio();
    setEstado('sonando');
    onCambio(true);
    try {
      await reproducirVoz(texto);
    } catch {
      // sin voz disponible
    } finally {
      setEstado('listo');
      onCambio(false);
    }
  }
  return (
    // ⚠️ MISMA CAJA QUE LOS TRES PUNTITOS (`size-7`, centrada). Tenía `mt-2
    // block` y un ícono de 16px suelto, así que en la fila del pie quedaba 8px
    // más abajo y más chico que la estrella y los puntitos: tres alturas
    // distintas en una fila de tres cosas (01/08, Matías: *"están desalineados
    // los íconos"*). El área tocable también sube a 28px, que antes eran 16.
    <button onClick={hablar} aria-label="Escuchar respuesta" className="grid size-7 flex-none place-items-center">
      <IconAltavoz className={`size-4 ${estado === 'sonando' ? 'animate-pulse text-iris' : 'text-niebla-2'}`} />
    </button>
  );
}

export function ChatUI({
  chatId,
  iniciales,
  vozAuto = false,
  hablarInicial = false,
  temas = [],
  objetivosAbiertos = [],
}: {
  chatId: number;
  iniciales: Mensaje[];
  vozAuto?: boolean;
  hablarInicial?: boolean;
  /** Temas ya existentes en la app, para elegir uno al agrupar mensajes. */
  temas?: { id: number; nombre: string }[];
  /** Los objetivos activos, para el desplegable de `PropuestaActividad`. Solo
   *  abiertos: colgar algo nuevo de uno cerrado no significa nada. */
  objetivosAbiertos?: { id: number; titulo: string }[];
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(iniciales);
  const [pensando, setPensando] = useState(false);
  // (Acá vivía `hoja`, el estado de la hoja de registro rápido. Se abría desde
  // los tres chips fijos del composer, y al sacarlos (29/07) quedó sin puerta.
  // No se reemplazó por otra: registrar ánimo o sueño se hace desde el Home o
  // desde el menú, y meterlo también en el chat era la tercera copia del mismo
  // acceso. `HojaRegistro` sigue viva y en uso en el Home.)
  const [hablando, setHablando] = useState<number | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  // ── AGRUPAR MENSAJES POR TEMA ("cristalizar", 29/07) ─────────────────────
  const [temasLocal, setTemasLocal] = useState(temas);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [hojaTemas, setHojaTemas] = useState(false);
  const [propuestas, setPropuestas] = useState<PropuestaGrupo[] | null>(null);
  const [buscandoPropuestas, setBuscandoPropuestas] = useState(false);

  function entrarSeleccion(primerId: number) {
    setModoSeleccion(true);
    setSeleccionados(new Set([primerId]));
  }
  function alternarSeleccion(id: number) {
    setSeleccionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function salirSeleccion() {
    setModoSeleccion(false);
    setSeleccionados(new Set());
  }
  function alAgrupar(tema: { id: number; nombre: string }) {
    const ids = seleccionados;
    setMensajes((m) => m.map((x) => (x.id != null && ids.has(x.id) ? { ...x, temaId: tema.id } : x)));
    setTemasLocal((ts) => (ts.some((t) => t.id === tema.id) ? ts : [...ts, tema]));
    setHojaTemas(false);
    salirSeleccion();
  }
  function alDesagrupar(ids: number[]) {
    const set = new Set(ids);
    setMensajes((m) => m.map((x) => (x.id != null && set.has(x.id) ? { ...x, temaId: null } : x)));
  }

  async function buscarPropuestas() {
    if (buscandoPropuestas) return;
    setBuscandoPropuestas(true);
    try {
      setPropuestas(await proponerAgrupacion(chatId));
    } finally {
      setBuscandoPropuestas(false);
    }
  }
  function alResolverPropuesta(grupo: PropuestaGrupo, aceptada: boolean, tema?: { id: number; nombre: string }) {
    if (aceptada && tema) {
      const ids = new Set(grupo.mensajeIds);
      setMensajes((m) => m.map((x) => (x.id != null && ids.has(x.id) ? { ...x, temaId: tema.id } : x)));
      setTemasLocal((ts) => (ts.some((t) => t.id === tema.id) ? ts : [...ts, tema]));
    }
    setPropuestas((ps) => ps?.filter((p) => p !== grupo) ?? null);
  }

  function reproducirCon(texto: string, indice: number) {
    setHablando(indice);
    reproducirVoz(limpiarLinks(texto))
      .catch(() => {})
      .finally(() => setHablando((h) => (h === indice ? null : h)));
  }

  // Lo que ofrece el asistente en su ÚLTIMO mensaje: va a los chips de arriba
  // del composer. Si el último es tuyo o no ofrece nada, la fila cae en los tres
  // de registro.
  const ultimoBot = [...mensajes].reverse().find((m) => m.rol === 'assistant');
  /**
   * ⚠️ LA CARA VA SOLO EN EL ÚLTIMO MENSAJE DEL BOT (06/08, Matías: *"que
   * aparezca en el último mensaje, no en todos, solo en el último; pero que se
   * sienta que es uno solo, el bot"*).
   *
   * Ayer se había puesto en TODOS, con el argumento de que cada respuesta suya
   * trae tarjetas y botones propios y no se leen como una tanda. En pantalla
   * ganó él: **una cara repetida cada tres renglones deja de ser una identidad y
   * pasa a ser una viñeta**. Una sola, al pie de la conversación, es el bot
   * mirándote desde donde te está hablando ahora.
   *
   * ⚠️ Y LOS DEMÁS MENSAJES LLEVAN UN HUECO DEL MISMO ANCHO, no cero. Sin eso,
   * las burbujas sin cara arrancarían pegadas al borde y la única con cara
   * quedaría corrida: la columna se vería quebrada justo en el último renglón,
   * que es el que más se mira.
   */
  const indiceUltimoBot = mensajes.reduce((ult, m, k) => (m.rol === 'assistant' ? k : ult), -1);
  const sugeridos = pensando ? [] : sugeridosDe(ultimoBot?.contenido);

  // Lo de días anteriores se pliega; lo del último día queda a la vista.
  const { plegadas, abierta } = partirSesiones(mensajes);
  const abiertos = abierta?.mensajes ?? [];
  const desdeAbierta = mensajes.length - abiertos.length;

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, pensando]);

  useEffect(() => {
    if (!hablarInicial || !vozAuto) return;
    const ultimo = iniciales[iniciales.length - 1];
    if (ultimo?.rol === 'assistant') reproducirCon(ultimo.contenido, iniciales.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviar(e: Envio) {
    if (pensando) return;
    // El desbloqueo del audio necesita un gesto del usuario (iOS no deja sonar
    // nada sin uno). Antes lo hacía el botón de voz al prenderlo; ahora que no
    // está, el gesto es MANDAR EL MENSAJE, que además es el momento justo:
    // pasa siempre y pasa antes de que llegue la respuesta que hay que leer.
    if (vozAuto) desbloquearAudio();
    const propio: Mensaje = {
      rol: 'user',
      contenido: e.contenido,
      adjuntoTipo: e.tipo === 'texto' ? null : e.tipo === 'foto' ? 'imagen' : 'audio',
      adjuntoPath: e.tipo === 'audio' ? e.adjuntoPath : null,
    };
    setMensajes((m) => [...m, propio]);
    setPensando(true);
    try {
      let res: Response;
      if (e.tipo === 'foto') {
        const form = new FormData();
        form.append('contenido', e.contenido);
        form.append('foto', e.foto, 'foto.jpg');
        res = await fetch(`/api/chat/${chatId}`, { method: 'POST', body: form });
      } else {
        res = await fetch(`/api/chat/${chatId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido: e.contenido,
            ...(e.tipo === 'audio' ? { adjuntoTipo: 'audio', adjuntoPath: e.adjuntoPath } : {}),
          }),
        });
      }
      const data = await res.json();
      let indiceNuevo = -1;
      setMensajes((m) => {
        indiceNuevo = m.length;
        // Se le pega el id al mensaje tuyo (que se agregó optimista, sin id) y
        // se agrega el del bot con el suyo: sin id no hay tres puntitos, así
        // que hasta que la ruta los devolvió, todo lo que escribías en la
        // sesión quedaba sin menú hasta recargar (29/07).
        const conId = m.map((x, j) => (j === m.length - 1 && x.rol === 'user' && x.id == null ? { ...x, id: data.idUser ?? undefined } : x));
        return [...conId, { rol: 'assistant', contenido: res.ok ? data.respuesta : `⚠ ${data.error}`, id: data.idBot ?? undefined }];
      });
      if (vozAuto && res.ok && data.respuesta) {
        reproducirCon(data.respuesta, indiceNuevo);
      }
    } catch {
      setMensajes((m) => [...m, { rol: 'assistant', contenido: '⚠ Error de conexión con el asistente.' }]);
    } finally {
      setPensando(false);
    }
  }

  // Mensajes sueltos (sin tema) de la sesión abierta: son los candidatos para
  // "¿Agrupar por tema?" y los que entran a la selección manual.
  const sinAgrupar = abiertos.filter((m) => m.id != null && m.temaId == null);

  function renderMensaje(m: Mensaje, i: number) {
    const propio = m.rol === 'user';
    // Solo lo sin agrupar y con fila propia se puede seleccionar: un mensaje
    // recién enviado (sin id todavía) no tiene dónde guardar el tema.
    const seleccionable = modoSeleccion && m.id != null;
    const marcado = seleccionable && seleccionados.has(m.id!);
    const burbuja = (
      <div
        onClick={seleccionable ? () => alternarSeleccion(m.id!) : undefined}
        className={`relative flotar rounded-[22px] p-[12px_15px] text-[15px] leading-[1.42] ${
          propio
            ? 'max-w-[82%] self-end text-white'
            : `min-w-0 border border-iris-borde text-tinta ${hablando === i ? 'shadow-[0_0_0_2px_rgba(108,120,238,.4)]' : ''}`
        } ${seleccionable ? 'cursor-pointer' : ''}`}
        style={{ background: propio ? GRAD_IRIS : BURBUJA_BOT }}
      >
        {/* ⚠️ EL TILDE VA AFUERA DE LA BURBUJA, CENTRADO A LA ALTURA (01/08).
            Matías, mirando la app: *"aparece arriba tapado de las letras,
            entonces no se entiende; no está fuera del rectángulo, tipo en el
            medio, centrado, pero en el medio afuera"*.
            Estaba `top-1.5` y pegado adentro de la esquina, o sea encima de la
            primera línea de texto: en la captura se leía "Comi una hamburguesa"
            con el círculo comiéndose la C.
            Ahora `-left-7`/`-right-7` lo saca del rectángulo y `top-1/2` con el
            translate lo centra vertical. La burbuja mide como mucho 82% del
            ancho, así que los 28px de afuera siempre entran.
            Y el color deja de depender del fondo de la burbuja: afuera está el
            lavanda de la pantalla en los dos casos, así que un solo par de
            estilos alcanza y las dos columnas se ven iguales. */}
        {seleccionable && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 ${propio ? '-left-7' : '-right-7'} grid size-5 flex-none place-items-center rounded-full border-2 ${
              marcado ? 'border-iris bg-iris' : 'border-niebla-2 bg-white'
            }`}
          >
            {marcado && (
              <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        )}
        {m.adjuntoTipo === 'imagen' && m.adjuntoPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/adjuntos/${m.adjuntoPath}`}
            alt="Foto adjunta"
            className="mb-2 max-h-60 w-full rounded-[12px] object-cover"
          />
        )}
        {m.adjuntoTipo === 'audio' && m.adjuntoPath && (
          <audio controls src={`/api/adjuntos/${m.adjuntoPath}`} className="mb-2 h-9 w-full" />
        )}
        {m.adjuntoTipo === 'audio' && <p className="mb-1 font-mono text-[12px] opacity-70">transcripción:</p>}
        <ContenidoMensaje texto={m.contenido} />
        {/* UN BOTÓN POR ACTIVIDAD PROPUESTA, no uno solo (29/07). */}
        {m.rol === 'assistant' &&
          actividadesPropuestas(m.contenido).map((t) => (
              <PropuestaActividad key={t} titulo={t} objetivos={objetivosAbiertos} />
            ))}
        {m.rol === 'assistant' && MARCA_CONTRASTE.test(m.contenido) && (
          <PropuestaContraste tema={(m.contenido.match(MARCA_CONTRASTE)?.[1] ?? '').trim()} />
        )}
        {m.rol === 'assistant' && MARCA_COMOLOVE.test(m.contenido) && (
          <PropuestaContraste modo="interpretacion" tema={(m.contenido.match(MARCA_COMOLOVE)?.[1] ?? '').trim()} />
        )}
        {m.rol === 'assistant' && MARCA_HECHO.test(m.contenido) && (
          <PropuestaHecho titulo={(m.contenido.match(MARCA_HECHO)?.[1] ?? '').trim()} />
        )}
        {m.rol === 'assistant' && extraerMarcaComida(m.contenido) && (
          <PropuestaComida que={extraerMarcaComida(m.contenido)!} />
        )}
        {m.rol === 'assistant' && extraerMarcaAgenda(m.contenido) && (
          <PropuestaAgenda marca={extraerMarcaAgenda(m.contenido)!} />
        )}
        {m.rol === 'assistant' && MARCA_PERIODO.test(m.contenido) && (
          <PropuestaPeriodo tipo={(m.contenido.match(MARCA_PERIODO)?.[1]?.toLowerCase() as 'inicio' | 'fin') ?? 'inicio'} />
        )}
        {m.rol === 'assistant' && extraerMarcaGasto(m.contenido) && (
          <PropuestaGasto marca={extraerMarcaGasto(m.contenido)!} />
        )}
        {m.rol === 'assistant' && leerMarcaIdea(m.contenido) && (
          <PropuestaIdea texto={leerMarcaIdea(m.contenido)!.texto} />
        )}
        {m.rol === 'assistant' && extraerMarcaFoco(m.contenido) && (
          <PropuestaFoco marca={extraerMarcaFoco(m.contenido)!} />
        )}
        {m.rol === 'assistant' && extraerMarcaPlan(m.contenido) && (
          <PropuestaPlan marca={extraerMarcaPlan(m.contenido)!} />
        )}

        {/* ── LA NUBECITA (pedido 1.1, del 30/07 · opción C, elegida el 04/08) ──
            *"Que las sugerencias del chat se vean como un globo y no como texto
            plano."* Se maquetaron tres formas y Matías eligió esta: el globo
            cuelga de la burbuja del bot, como una coletilla suya.

            ⚠️ VA DESPUÉS DEL MENSAJE COMPLETO, NUNCA ADENTRO, y esa es la
            diferencia con lo que se sacó el 29/07. Aquel problema era que los
            botones partían la frase al medio y la respuesta se leía a los
            saltos; acá el texto se lee entero y recién después aparece la
            oferta.

            ⚠️ SOLO EN EL ÚLTIMO MENSAJE DEL BOT. En todos, el chat quedaría
            sembrado de ofertas viejas que ya no vienen al caso — y la regla del
            prompt es que ofrecer una herramienta es la EXCEPCIÓN. Sin nada que
            ofrecer no hay globo: el hueco no es un problema a llenar. */}
        {m === ultimoBot && sugeridos.length > 0 && !modoSeleccion && (
          <div className="mt-1.5 self-start rounded-[18px] rounded-tl-[6px] border border-iris-borde bg-iris-soft p-[9px_11px]">
            <div className="flex flex-wrap gap-[7px]">
              {sugeridos.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[12px] font-semibold shadow-[0_2px_10px_rgba(50,50,90,.08)]"
                  // color-mix y no `${s.color}22`: los colores son `var(--…)` y
                  // pegarle la opacidad a una variable da CSS inválido → borde
                  // negro. Mismo bug que en las pastillas de Cuerpo (29/07).
                  style={{
                    background: s.tint,
                    color: s.color,
                    border: `1px solid color-mix(in oklab, ${s.color} 22%, transparent)`,
                  }}
                >
                  {s.texto}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[11px]">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* El pie del mensaje: escucharlo y los tres puntitos. Se esconde
            entero durante la selección: no hay lugar ni sentido para tocar
            "destacar" mientras estás eligiendo mensajes para agrupar. */}
        {!modoSeleccion && (
          <div className="-mr-1 mt-0.5 flex items-center justify-end gap-0.5">
            {m.rol === 'assistant' && !m.contenido.startsWith('⚠') && (
              <BotonVoz texto={limpiarLinks(m.contenido)} onCambio={(s) => setHablando(s ? i : null)} />
            )}
            {/* La estrella no es un botón (se toca desde el menú), pero ocupa la
                misma caja que los dos que sí lo son: es lo que hace que los tres
                queden centrados en la misma línea en vez de escalonados. */}
            {m.destacado && (
              <span className="grid size-7 flex-none place-items-center" aria-label="Destacado">
                <svg viewBox="0 0 24 24" className="size-[13px] text-oro-2" fill="currentColor">
                  <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1-5.3-3-5.3 3 1.1-6.1L3.4 9.9l6-.8z" />
                </svg>
              </span>
            )}
            {m.id != null && (
              <MenuMensaje
                mensajeId={m.id}
                destacado={!!m.destacado}
                onCambio={(c) =>
                  setMensajes((lista) =>
                    c.borrado
                      ? lista.filter((x) => x.id !== m.id)
                      : lista.map((x) => (x.id === m.id ? { ...x, destacado: c.destacado } : x)),
                  )
                }
                onAgrupar={() => entrarSeleccion(m.id!)}
              />
            )}
          </div>
        )}
      </div>
    );

    if (propio) return <Fragment key={i}>{burbuja}</Fragment>;

    /**
     * ── LA CARA DEL BOT, AL LADO DE CADA COSA QUE DICE (05/08) ───────────────
     *
     * Matías: *"que en todos lados aparezca el bot al lado del mensaje del chat,
     * no solo para los hashtags… para darle identidad a que es el mismo bot el
     * que está hablando"*.
     *
     * ⚠️ EL AVATAR YA EXISTÍA y solo vivía en las tarjetas del Home
     * (`TarjetasBot`) y en el mensaje proactivo. O sea que el bot tenía cara en
     * la pantalla donde te habla UNA vez por día, y no la tenía en la pantalla
     * donde hablás con él todo el tiempo.
     *
     * ⚠️ `items-end`: la cara se apoya abajo de la burbuja, no arriba. Con
     * `items-start` quedaba flotando al lado de la primera línea y en las
     * respuestas largas terminaba sola arriba de un párrafo de diez renglones.
     *
     * ⚠️ Y VA EN CADA MENSAJE, aunque haya tres seguidos del bot. Se pensó
     * mostrarla solo en el primero de una tanda (lo que hacen los mensajeros),
     * y no aplica: acá cada respuesta suya puede traer tarjetas y botones
     * propios, así que no se leen como una tanda sino como cosas separadas.
     */
    const conCara = i === indiceUltimoBot;
    return (
      <div key={i} className="flex max-w-[92%] items-end gap-2 self-start">
        {conCara ? <AvatarIA px={38} className="-mb-1" /> : <span className="w-[38px] flex-none" aria-hidden="true" />}
        {burbuja}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-[22px] pb-[118px] pt-1">
      {/* Las charlas de días anteriores van plegadas arriba, como papelitos
          (29/07, idea de Matías). Es lo que hace habitable un chat reciclado:
          sin esto, volver a una conversación de la semana pasada te deja
          scrolleando hasta el fondo para encontrar lo de hoy. */}
      {plegadas.map((s) => (
        <SesionPlegada key={s.dia} sesion={s} />
      ))}

      {/* ── PROPUESTAS DE LA IA para agrupar mensajes sueltos ("cristalizar").
          Nunca agrupa sola: esto es solo la vista previa, punteada. Va arriba
          de la conversación de hoy, como el botón que la dispara. */}
      {!modoSeleccion && (
        <>
          {propuestas === null ? (
            sinAgrupar.length >= 2 && (
              <button
                type="button"
                onClick={buscarPropuestas}
                disabled={buscandoPropuestas}
                className="mb-1 self-start font-mono text-[11.5px] font-semibold text-iris-deep underline decoration-iris-borde underline-offset-2 disabled:opacity-60"
              >
                {buscandoPropuestas ? 'Mirando qué va junto…' : '¿Agrupar mensajes por tema?'}
              </button>
            )
          ) : propuestas.length === 0 ? (
            <p className="mb-1 font-mono text-[11.5px] text-niebla">No vi nada claro para juntar por ahora.</p>
          ) : (
            propuestas.map((p) => (
              <CristalPropuesto
                key={p.mensajeIds.join('-')}
                propuesta={p}
                mensajes={p.mensajeIds
                  .map((id) => mensajes.find((m) => m.id === id))
                  .filter((m): m is Mensaje & { id: number } => m?.id != null)
                  .map((m) => ({ id: m.id, rol: m.rol, contenido: m.contenido }))}
                onResuelto={(aceptada, tema) => alResolverPropuesta(p, aceptada, tema)}
              />
            ))
          )}
        </>
      )}

      {/* ⚠️ El índice `i` de cada mensaje sigue siendo el de la lista completa
          (`desdeAbierta + j`), no el de la sesión abierta: `mensajes[i - 1]`
          busca la foto del ticket en el mensaje anterior, y `setHablando(i)`
          marca cuál está sonando. Con índices relativos a la sesión, las dos
          apuntarían al mensaje equivocado. Los consecutivos con el mismo tema
          se agrupan en un `Cristal` en vez de burbujas sueltas (ver
          `lib/cristales.ts`). */}
      {agruparPorTema(abiertos.map((m, j) => ({ m, i: desdeAbierta + j, temaId: m.temaId }))).map((c) => {
        if (c.tipo === 'cristal') {
          const nombre = temasLocal.find((t) => t.id === c.temaId)?.nombre ?? 'Tema';
          return (
            <Cristal
              key={`cristal-${c.items[0].m.id ?? c.items[0].i}`}
              temaId={c.temaId}
              temaNombre={nombre}
              mensajes={c.items.map((x) => ({ id: x.m.id, rol: x.m.rol, contenido: x.m.contenido }))}
              onDesagrupado={alDesagrupar}
            />
          );
        }
        return renderMensaje(c.item.m, c.item.i);
      })}
      {pensando && (
        <div
          className="flotar flex items-center self-start rounded-[22px] border border-iris-borde px-4 py-3"
          style={{ background: BURBUJA_BOT }}
        >
          <Escribiendo />
        </div>
      )}
      <div ref={fin} />

      {/* Mismo tapón que en la barra global: sin esto los mensajes se leen a
          medias detrás de los chips y del composer. */}
      <div
        aria-hidden
        className="fondo-app pie-difuminado pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[190px]"
      />

      {/* la navbar se oculta dentro del chat, el composer baja al borde (safe area) */}
      <div className="fixed inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-40">
        {modoSeleccion ? (
          // ── LA BARRA DE SELECCIÓN, en el mismo lugar del composer ────────
          // Ocupa exactamente el espacio del teclado de escribir: son estados
          // que se excluyen (no vas a tipear mientras elegís qué agrupar).
          // ⚠️ `w-[calc(100%-28px)]` para que NO toque los bordes (01/08,
          // Matías: *"¿por qué no está con un espacio para que no esté pegado a
          // los bordes?"*). Tenía `max-w-md` a secas: en un teléfono angosto ese
          // máximo nunca se alcanza, así que la barra ocupaba el ancho completo
          // y sus esquinas redondeadas morían contra el vidrio de la pantalla.
          // Con el ancho calculado, `mx-auto` deja 14px de cada lado — los
          // mismos que el `px-[22px]` del resto de la app menos su propio borde.
          <div className="mx-auto flex w-[calc(100%-28px)] max-w-md items-center gap-2 rounded-[18px] border border-iris-borde bg-white px-[14px] py-2.5 shadow-[0_8px_28px_rgba(50,50,90,.16)]">
            <button type="button" onClick={salirSeleccion} className="px-1 font-mono text-[12px] font-semibold text-niebla">
              Cancelar
            </button>
            <span className="flex-1 text-center font-mono text-[11.5px] text-niebla">
              {seleccionados.size === 0
                ? 'Elegí los que van juntos'
                : `${seleccionados.size} ${seleccionados.size === 1 ? 'mensaje' : 'mensajes'}`}
            </span>
            <button
              type="button"
              onClick={() => setHojaTemas(true)}
              disabled={seleccionados.size === 0}
              className="h-8 rounded-[12px] bg-iris px-3.5 font-mono text-[12px] font-bold text-white disabled:opacity-40"
            >
              Agrupar
            </button>
          </div>
        ) : (
          <>
        {/* ⚠️ ACÁ VIVÍA LA FILA DE SUGERENCIAS, y se mudó a la NUBECITA que
            cuelga del último mensaje del bot (pedido 1.1, opción C elegida por
            Matías el 04/08). Ver el bloque en `renderMensaje`.

            ⚠️ LO QUE SE APRENDIÓ ACÁ SIGUE VALIENDO Y NO HAY QUE PERDERLO. Esta
            fila tuvo dos versiones malas antes: tres chips FIJOS (Ánimo · Sueño
            · Seguimiento) que repetían la barra de abajo y el menú, y después
            esos mismos como respaldo cuando el bot no ofrecía nada. Matías
            (29/07): *"sacá esto de ánimo, sueño y todo eso, que está
            completamente descontextualizado"*. Un chip que aparece siempre no
            dice nada y ocupa el lugar del que sí diría algo.

            **Sin nada que ofrecer, no hay globo.** El espacio vacío arriba del
            teclado no es un problema a llenar — y ahora tampoco lo es el de
            abajo del mensaje. */}

        {/* ⚠️ ACÁ NO VA EL BOTÓN DE VOZ (28/07, pedido de Matías). Había un
            altavoz de 42px al lado del composer para prender y apagar la
            lectura automática, y **le comía medio centímetro de ancho a la
            barra de escribir**, que es lo que más se usa en toda la app.
            Además era un duplicado: el mismo ajuste ya vive en Perfil, con su
            switch. Y para escuchar UNA respuesta puntual está el altavocito
            debajo de cada mensaje del asistente (`BotonVoz`), que es como él lo
            quiere: suena lo que tocás, no todo. */}
        <div className="mx-auto max-w-md px-[14px]">
          <BarraChat onEnviar={enviar} ocupado={pensando} placeholder="Escribí o preguntá…" />
        </div>
          </>
        )}
      </div>

      {hojaTemas && (
        <HojaTemas
          mensajeIds={[...seleccionados]}
          temas={temasLocal}
          onCerrar={() => setHojaTemas(false)}
          onListo={alAgrupar}
        />
      )}
    </div>
  );
}

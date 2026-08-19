'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearActividad, reactivarActividad, tocarActividad } from '@/lib/actions/actividades';
import Link from 'next/link';
import { RenglonActividad } from '@/components/actividades/RenglonActividad';
import { ListaTareas } from '@/components/actividades/ListaTareas';
import { BarraPestanas, type Apartado } from '@/components/ui/Apartados';
import { GLIFO_SEGUIMIENTO, GLIFO_TILDE_CAJA } from '@/components/ui/glifos';
import { IconObjetivos } from '@/components/ui/iconos';

/**
 * LOS TRES DIBUJITOS DE LA BARRITA (06/08, pedido de Matías: *"a esos les
 * pondría el iconito… de tareas el del tilde, y de seguimiento el mismo que
 * tienen en el navbar"*).
 *
 * ⚠️ SON LOS MISMOS DE SIEMPRE, TRAÍDOS, NO DIBUJADOS DE NUEVO. Los tres ya
 * existían en la app: el tilde-en-caja es el de Actividades en el menú lateral,
 * las tres barritas son las de Seguimiento en la barra de abajo (él lo pidió
 * así, textual) y la montaña es la de Objetivos. Que la pestaña "Seguimiento"
 * lleve el mismo dibujo que el botón "Seguimiento" de la barra de abajo es lo
 * que hace obvio que son el mismo lugar — la regla del 26/07.
 *
 * ⚠️ Y EL TILDE PARA TAREAS TIENE SENTIDO JUSTO ACÁ, aunque el 30/07 se lo haya
 * sacado a Seguimiento en la barra de abajo por decir "terminado": una tarea SÍ
 * es eso, se hace una vez y se cierra. El mismo dibujo que mentía para
 * seguimiento acierta para tareas, y ahora las dos cosas están una al lado de la
 * otra diciendo cada una lo suyo.
 *
 * ⚠️ 14px y no 17: acá el ícono acompaña a una palabra de 12px, no manda solo
 * como en la barra de abajo. Los grosores de trazo son los de cada ícono en su
 * casa (1.5 las barritas, 1.9 los otros dos): ver `GLIFO_SEGUIMIENTO`.
 */
const svgPestana = (trazo: React.ReactNode, grosor: number) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={grosor}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[14px]"
  >
    {trazo}
  </svg>
);
const ICONO_TAREAS = svgPestana(GLIFO_TILDE_CAJA, 1.9);
const ICONO_SEGUIMIENTO = svgPestana(GLIFO_SEGUIMIENTO, 1.5);
const ICONO_OBJETIVOS = <IconObjetivos className="size-[14px]" />;

export type Actividad = {
  id: number;
  titulo: string;
  objetivo: string | null;
  desde: string; // etiqueta relativa
  diaria: boolean; // si se sigue día a día con la grilla
  meta: number | null; // veces por semana que se propuso, si se puso una
  marcadas: string[]; // los días ya pintados (YYYY-MM-DD)
  /** Las mismas marcas pero con la hora, para las notas al marcar. */
  conHora?: { fecha: string; creado: string }[];
};

export type Hecha = {
  id: number;
  titulo: string;
  cuando: string; // etiqueta relativa de cuándo pasó
  /** Cerrada con "Listo": se puede volver a poner en curso. */
  reactivable?: boolean;
  /**
   * ⚠️ SI ERA UN SEGUIMIENTO O UNA TAREA, y sin esto las cerradas del pie se
   * mezclaban (06/08, Matías: *"si estoy en objetivo, las cerradas de objetivo;
   * si estoy en seguimiento, cerradas de seguimiento… no que se vean las de
   * todas, porque si no no sabés cuál es cuál"*).
   * La pantalla separa seguimientos de tareas en TODAS partes menos ahí abajo,
   * donde caían las dos cosas juntas en una lista sin etiqueta.
   */
  diaria: boolean;
};

// ⚠️ SEGUIMIENTO Y TAREAS SON COSAS DISTINTAS Y NO VAN MEZCLADAS (28/07, pedido
// de Matías). Antes la segunda pestaña era "Todas" y metía las dos juntas, así
// que lo que sostenés en el tiempo aparecía al lado de lo que hacés una vez y
// se termina. Son dos preguntas diferentes: "¿cómo vengo con esto?" y "¿qué me
// falta hacer?". La app ya las distinguía por dentro (el campo `diaria`), solo
// que no lo mostraba.
//   · seguimiento → se pinta día a día, tiene racha y meta;
//   · tareas      → se hace una vez y se cierra.
// ⚠️ "CERRADAS" DEJÓ DE SER PESTAÑA EL 06/08 y su lugar lo tomó "Objetivos".
// Matías: *"no es algo que la gente vaya a ver tan seguido, así que está bueno
// sacarlo de ahí arriba y cambiarlo por objetivos, cosa que se vea que en
// seguimiento está todo"*. Lo cerrado se mudó al pie, visible en las tres.
type Pestana = 'dia' | 'tareas' | 'objetivos';

export function ActividadesUI({
  actividades,
  hechas = [],
  cerradasHoy = [],
  mes,
  objetivos,
}: {
  actividades: Actividad[];
  hechas?: Hecha[];
  /** Tareas que tildaste hoy: siguen en la lista, tachadas, hasta que cambie el día. */
  cerradasHoy?: Actividad[];
  /** El calendario del mes, que arma la página. Vive dentro de la pestaña Seguimiento. */
  mes?: React.ReactNode;
  /** Objetivos entero, ya renderizado por el server. Ver `ObjetivosSeccion`. */
  objetivos?: React.ReactNode;
}) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  const [titulo, setTitulo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [yendo, setYendo] = useState(false);
  const diarias = actividades.filter((a) => a.diaria);
  // Lo que se hace una vez y se termina: todo lo activo que no se pinta día a día.
  const tareas = actividades.filter((a) => !a.diaria);
  // Arranca en "Día a día" si hay algo que pintar: es la vista de todos los días.
  const [pestana, setPestana] = useState<Pestana>(diarias.length > 0 ? 'dia' : 'tareas');
  // La pestaña donde estás decide qué crea el botón del pie. Ya no hay caso
  // "pantalla vacía": las pestañas se dibujan siempre, así que siempre hay
  // contexto que leer.
  const esDia = pestana === 'dia';
  // Las cerradas del pie, filtradas por la pestaña donde estás: un seguimiento
  // cerrado no tiene nada que hacer en la lista de tareas ni al revés.
  const cerradasDeLaPestana = hechas.filter((h) => h.diaria === esDia);

  /**
   * ⚠️ ESTO CREA UN SEGUIMIENTO, NO "UNA ACTIVIDAD" (03/08). El tercer
   * argumento `diaria = true` es todo el cambio, y es el que arregla el fondo:
   * antes esta misma función creaba algo **sin tipo** —nacía tarea siempre— y
   * había que abrirlo y tocar "Seguir día a día" para convertirlo. El tipo se
   * decidía después de crear la cosa, y de ahí salía el desorden.
   * Las tareas ahora nacen arriba, en `ListaTareas`. Cada puerta dice qué crea.
   */
  async function agregar() {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    try {
      // ⚠️ SIEMPRE UN SEGUIMIENTO (`diaria = true`), y ahora sin condición: el
      // botón que llama a esto **solo se dibuja en Seguimiento** desde el 06/08.
      // Entre el 05 y el 06 esto miraba la pestaña porque el mismo botón vivía
      // también en Tareas y ahí tenía que crear una tarea; sacado ese botón, la
      // rama de tareas nunca más se podía alcanzar. Un `esDia` acá adentro sería
      // preguntar algo que ya no puede dar false — o sea, la clase de mentira
      // que hace perder media hora dentro de un año.
      await crearActividad(titulo, undefined, true);
      setTitulo('');
      setAbriendo(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  // Abrir una charla sobre la actividad: la sube (tocar) y entra al chat seedeado.
  async function charlar(a: Actividad) {
    if (yendo) return;
    setYendo(true);
    try {
      await tocarActividad(a.id);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: `Quiero contarte cómo viene lo de ${a.titulo}.`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.chatId) router.push(`/chat/${data.chatId}?hablar=1`);
      else setYendo(false);
    } catch {
      setYendo(false);
    }
  }

  const PESTANAS: Apartado<Pestana>[] = [
    // "Seguimiento" y no "Día a día" (29/07, Matías). La pestaña se llamaba
    // por CÓMO se registra; el nombre que usa él —y el de la pestaña de la
    // barra de abajo— es por QUÉ es: lo que venís siguiendo.
    // ⚠️ SEGUIMIENTO VA EN EL MEDIO (06/08, Matías: *"tareas, seguimiento,
    // objetivos"*). Es el que abre por defecto y el que le da el nombre a la
    // pantalla: **el que manda va al centro, no en una punta.** Y de paso el
    // orden cuenta algo — de lo más chico y de una vez (tareas) a lo más grande
    // y largo (objetivos), con el día a día en el medio.
    { clave: 'tareas', label: 'Tareas', n: tareas.length, icono: ICONO_TAREAS },
    // ── ⚠️ LA PESTAÑA SE LLAMA "SIGUIENDO", LA PANTALLA SIGUE SIENDO
    // "SEGUIMIENTO" (18/08, pedido de Matías). Y la distinción es buena: la
    // pantalla es el LUGAR y la pestaña es lo que está pasando adentro. Con las
    // dos llamándose igual, "Seguimiento › Seguimiento" no decía nada — parecía
    // que la pestaña era la pantalla otra vez.
    // 👉 Y en gerundio a propósito: "Siguiendo" son las cosas que están en
    // curso ahora, que es exactamente lo que lista.
    { clave: 'dia', label: 'Siguiendo', n: diarias.length, icono: ICONO_SEGUIMIENTO },
    // Sin numerito: los objetivos son pocos y grandes, y un "2" al lado los
    // pondría a competir con las otras dos por cantidad, que es justo lo que un
    // objetivo no es.
    { clave: 'objetivos', label: 'Objetivos', icono: ICONO_OBJETIVOS },
  ];

  return (
    <div>
      {/* ⚠️ LA TARJETA DE "TODAVÍA NO TENÉS ACTIVIDADES" SE FUE (05/08), y no es
          un descuido: **con la barrita mandando en toda la pantalla, esconderla
          en el caso vacío dejaba sin puerta a las tareas.** La lista para
          escribir vive ahora adentro de la pestaña Tareas; si la pestaña no se
          dibuja porque no hay nada, no hay dónde escribir la primera. Cada
          pestaña dice lo suyo cuando está vacía, que es más útil que un cartel
          general: la pantalla arranca en Tareas cuando no seguís nada. */}
      {/* ── LA BARRITA MANDA EN TODA LA PANTALLA (05/08) ─────────────────
              ⚠️ ANTES NO ERA UN FILTRO, ERA UN ÍNDICE A LA MITAD. Estaba en el
              medio: arriba se veían siempre el calendario del mes y la lista de
              tareas, y la barrita solo cambiaba lo de abajo. O sea que en
              "Tareas" seguías viendo el mes de los seguimientos, y en
              "Cerradas" seguías viendo todo lo abierto. Matías: *"arriba de
              todo podés poner este menú… y en tareas, arriba de todo, solo se
              ven tareas… y en cerradas solo se ve cerradas y no se ven ni
              tareas ni seguimiento"*.
              Ahora es lo primero de la pantalla y decide TODO lo que sigue: una
              pestaña, un contenido. */}
      <BarraPestanas apartados={PESTANAS} elegida={pestana} onElegir={setPestana} />

      {pestana === 'objetivos' ? (
        objetivos
      ) : pestana === 'tareas' ? (
        /* ⚠️ EN TAREAS SOLO VA LA LISTA SUELTA, y eso saca una duplicación
               que estaba desde el 03/08: las mismas tareas se veían dos veces
               en la misma pantalla —arriba como renglones para tildar, abajo
               como tarjetas grandes— y no había forma de saber cuál era cuál.
               Matías: *"solo se ven tareas y se ve este apartado de tareas con
               las tareas así desplegadas como hasta ahora"*. */
        <ListaTareas tareas={tareas} cerradasHoy={cerradasHoy} />
      ) : diarias.length === 0 ? (
        <p className="tarjeta bg-white text-[13px] leading-relaxed text-niebla text-pretty sombra-card">
          {/* ⚠️ Este texto mandaba a convertir una tarea en seguimiento
                  ("abrí una de Tareas y tocá Seguir día a día"): era el único
                  camino cuando todo nacía tarea. Desde el 03/08 hay un botón
                  que las crea derecho, acá abajo. */}
          Todavía no seguís nada día a día. Tocá “Agregar seguimiento” acá abajo para empezar a pintar los días.
        </p>
      ) : (
        <>
          {/* EL MES, ADENTRO DE SU PESTAÑA (05/08). Lo pinta la página y
                  entra por acá: es de los seguimientos, así que en Tareas y en
                  Cerradas no tiene nada que hacer. */}
          {mes}
          <div className="flex flex-col gap-2">
            {diarias.map((a) => (
              <RenglonActividad key={a.id} a={a} onCharlar={charlar} yendo={yendo} />
            ))}
          </div>
        </>
      )}

      {/* ── AGREGAR, AL PIE — SOLO EN SEGUIMIENTO (03/08 · 06/08) ───────────
          ⚠️ EN TAREAS YA NO VA, Y NO ES QUE SOBRABA DE LINDO: ERA LA MISMA
          FUNCIÓN DOS VECES EN LA MISMA PANTALLA (06/08, Matías: *"podés sacar
          el agregar tarea, porque total escribís ahí, entonces dos veces la
          misma función al pedo, ocupa espacio"*). `ListaTareas` termina en una
          línea vacía donde escribís y listo —sin abrir nada—, y este botón
          hacía exactamente eso mismo con dos toques más y otro input.
          ⚠️ Es la MISMA regla que ya había sacado la duplicación de las tareas
          el 05/08 (se veían como renglones arriba y como tarjetas abajo): una
          cosa, un lugar. Acá la duplicada era la PUERTA, no la lista.

          En Seguimiento se queda porque ahí no hay línea vacía: la grilla de
          días no tiene dónde escribir, así que este botón es la única puerta.
          En Objetivos tampoco va: trae la suya propia (`ObjetivoDesdeRueda`).
          Se dejó abajo y no como botón flotante, decisión suya del 03/08:
          *"por ahora no es necesario… siempre aparece abajo una para escribir
          tarea, entonces ya entro yo"*. (Ver la idea del chip en
          `pedidos-de-matias.md` § 0.7c.) */}
      {esDia &&
        (abriendo ? (
          <div className="mt-4 flex items-center gap-2">
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') agregar();
                if (e.key === 'Escape') {
                  setAbriendo(false);
                  setTitulo('');
                }
              }}
              placeholder="Alemán, boulder, meditar…"
              aria-label="Qué querés seguir día a día"
              className="min-w-0 flex-1 rounded-[18px] border border-iris-borde bg-white px-4 py-3 text-[16px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
            />
            <button
              type="button"
              onClick={agregar}
              disabled={!titulo.trim() || guardando}
              className="h-[46px] flex-none rounded-[14px] px-4 font-mono text-[13px] font-bold text-white disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))',
              }}
            >
              {guardando ? '…' : 'Seguir'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbriendo(false);
                setTitulo('');
              }}
              className="flex-none px-1 font-mono text-[11px] font-semibold text-niebla-2"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAbriendo(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 tarjeta border border-dashed border-niebla-2 bg-white/60 font-mono text-[12px] font-bold text-iris-deep"
          >
            <span className="grid size-5 place-items-center rounded-full bg-iris-soft text-[14px] font-semibold leading-none text-iris">
              +
            </span>
            Agregar seguimiento
          </button>
        ))}

      {/* ── CERRADAS, AL PIE Y EN LAS TRES PESTAÑAS (06/08) ──────────────────
          Matías: *"las cosas cerradas las pondría en un apartado abajo de todo,
          que aparezca en todas, qué se cerró de cada una… no es algo que la
          gente vaya a ver tan seguido"*.

          ⚠️ ERA UNA PESTAÑA DE TRES, o sea un tercio del mando de la pantalla
          para lo que menos se mira. Y peor: **para verlo había que salir de lo
          que estabas haciendo**. Al pie no interrumpe nada y sigue estando.

          Va plegado y con el número al lado: cerrado dice cuántas hay sin
          ocupar lugar, y abierto es una lista corta. */}
      {/* ⚠️ SOLO LAS DE ESTA PESTAÑA (06/08). Antes caían acá las cerradas de
          todo —seguimientos y tareas juntos, sin una etiqueta que dijera cuál
          era cuál— y encima se veían también parado en Objetivos, que tiene sus
          propios cerrados. Matías: *"si estoy en seguimiento, cerradas de
          seguimiento; si estoy en tareas, cerradas de tareas"*.
          En Objetivos no se dibuja nada acá: los cerrados de objetivos viven
          plegados al pie de su propia sección, con la misma forma. */}
      {pestana !== 'objetivos' && cerradasDeLaPestana.length > 0 && (
        <details className="mt-6 mb-2 rounded-[18px] border border-iris-borde bg-white/70">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-[12px_14px] font-mono text-[12px] font-semibold text-niebla">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-[13px] flex-none text-verde">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {esDia ? 'Seguimientos cerrados' : 'Tareas cerradas'}
            <span className="ml-auto font-mono text-[11px] text-niebla-2">{cerradasDeLaPestana.length}</span>
          </summary>
          <div className="border-t border-[#f1f0f7]">
            {cerradasDeLaPestana.map((h, i) => (
              <div
                key={h.id}
                className={`flex items-center gap-3 p-[10px_14px] ${i < cerradasDeLaPestana.length - 1 ? 'border-b border-[#f1f0f7]' : ''}`}
              >
                <p className="min-w-0 flex-1 text-[14px] text-tinta-soft">{h.titulo}</p>
                {h.reactivable ? (
                  <button
                    type="button"
                    onClick={() =>
                      arrancar(async () => {
                        await reactivarActividad(h.id);
                        router.refresh();
                      })
                    }
                    className="h-8 flex-none rounded-full px-2.5 font-mono text-[11px] font-semibold text-iris"
                  >
                    Retomar
                  </button>
                ) : (
                  h.cuando && <span className="flex-none font-mono text-[11px] text-niebla-2">{h.cuando}</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── ⚠️⚠️ LA TARJETA DE LA HOJA SE FUE; QUEDA UN ÍCONO (18/08) ─────────
          Matías: *"removería, por ahora, lo de la hoja del mes y pondría solo un
          ícono para imprimir la hoja en seguimiento"*.

          Era una tarjeta con título, dos renglones de explicación y dos botones,
          al fondo de una pantalla que ya venía larga — para algo que se usa una
          vez por mes. El 05/08 se la había bajado en vez de sacarla; hoy se saca.

          ⚠️⚠️ Y SE PIERDE LA PUERTA A "PASAR LA HOJA" (`/actividades/transcribir`),
          que era el otro botón de esa tarjeta y no tiene ninguna otra entrada en
          la app. **La ruta queda viva y sin puerta.** No la borro porque él dijo
          *"por ahora"*, pero queda anotado: o vuelve una entrada, o en un mes se
          borran la ruta y su endpoint. Es exactamente lo que pasó con el chip de
          "ticket" el 03/08 — código huérfano que nadie notó hasta que rompió.

          ⚠️ EL ÍCONO NO LLEVA ETIQUETA porque no compite con nada: está solo al
          pie, después de la lista. Con `aria-label`, que es lo que lo hace
          usable sin ver el dibujo. */}
      {esDia && actividades.length > 0 && diarias.length > 0 && (
        <div className="mt-7 flex justify-end">
          <Link
            href="/actividades/imprimir"
            aria-label="Imprimir la hoja del mes"
            title="Imprimir la hoja del mes"
            className="grid size-10 place-items-center rounded-full border border-iris-borde bg-white/70 text-iris-deep"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
              <path d="M6.5 9V3.5h11V9" />
              <path d="M6.5 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1.5" />
              <path d="M6.5 14.5h11v6h-11z" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

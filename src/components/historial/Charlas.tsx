'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { guardarNota, alternarChatEnNota, notasDeChat } from '@/lib/actions/notas';
import { borrarCarpetaAction, crearYMover, moverChatACarpeta, renombrarCarpetaAction } from '@/lib/actions/carpetas';
import { renombrarChat } from '@/lib/actions/chats';
import { TituloEditable } from '@/components/ui/TituloEditable';
import { HojaElegirOCrear } from '@/components/ui/HojaElegirOCrear';

// EL HISTORIAL COMO UNA APP DE NOTAS (27/07, pedido de Matías).
//
// Antes las charlas se agrupaban por las 8 áreas de la rueda. Dos problemas:
// era un orden que el usuario **no eligió** —y que ni siquiera sabe que
// existe—, y con pocas charlas por área la pantalla eran ocho cajones casi
// vacíos. Las áreas siguen clasificándose solas por detrás, porque **el
// Analista las usa**; simplemente dejaron de mandar en esta pantalla.
//
// Ahora: lista densa por día, con **título y dos líneas de preview**, como
// Notas de Apple. Y las carpetas las hace el usuario.

export type ChatItem = {
  id: number;
  titulo: string;
  dia: string; // "Hoy", "Ayer", "12 de julio"
  hora: string;
  snippet: string | null;
  carpeta: string | null; // nombre de la carpeta, si está en alguna
};

export type CarpetaVista = { id: string; nombre: string; cuantos: number };

const IconCarpeta = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
    <path d="M3 7.5a2 2 0 0 1 2-2h3.6l2 2.4H19a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

// La flecha que sale de la caja: mandar esto a otro lado. Es el mismo dibujo
// que usa iOS para compartir, así que no hay que aprenderlo.
const IconMandar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
    <path d="M12 15.5V3.5M8.5 7l3.5-3.5L15.5 7" />
    <path d="M5.5 12.5v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" />
  </svg>
);

export function Charlas({
  chats,
  carpetas,
  notas = [],
}: {
  chats: ChatItem[];
  carpetas: CarpetaVista[];
  /** Las notas a las que se puede mandar una charla. Ya vienen filtradas: las
   *  privadas no aparecen mientras están tapadas (ver `notasQueRecibenChats`). */
  notas?: NotaElegible[];
}) {
  const [moviendo, setMoviendo] = useState<ChatItem | null>(null);
  const [mandando, setMandando] = useState<ChatItem | null>(null);

  if (chats.length === 0) {
    return (
      <div className="tarjeta border border-iris-borde bg-white">
        <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
          Todavía no hay charlas. Escribí algo abajo y acá te queda todo, por día.
        </p>
      </div>
    );
  }

  return (
    <>
      {chats.map((c, i) => {
        const nuevoDia = i === 0 || c.dia !== chats[i - 1].dia;
        return (
          <div key={c.id}>
            {nuevoDia && (
              <p className="mb-1.5 mt-4 font-mono text-[10.5px] font-semibold tracking-[0.4px] text-niebla-2">
                {c.dia}
              </p>
            )}
            <div className="mb-1.5 flex items-start gap-1 rounded-[18px] border border-iris-borde bg-white p-[11px_11px_11px_13px]">
              <div className="min-w-0 flex-1">
                {/* EL LÁPIZ EN EL TÍTULO DE LA CHARLA (29/07). Los nombres los
                    pone el modelo con lo primero que escribiste, y acá es donde
                    los estás leyendo para encontrar algo: si uno quedó mal, se
                    arregla en el renglón y no entrando a la charla.
                    ⚠️ Queda FUERA del Link a propósito — ver TituloEditable. */}
                <TituloEditable
                  valor={c.titulo}
                  href={`/chat/${c.id}`}
                  onGuardar={(t) => renombrarChat(c.id, t)}
                  etiqueta="Cambiarle el nombre a la charla"
                  className="text-[14px] font-semibold leading-tight tracking-[-0.1px] text-tinta"
                />
                <Link href={`/chat/${c.id}`} className="block">
                  {c.snippet && (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.4] text-niebla text-pretty">{c.snippet}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {c.carpeta && (
                      <span className="rounded-full bg-iris-soft px-2 py-[2px] font-mono text-[9.5px] font-semibold text-iris-deep">
                        {c.carpeta}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-niebla-2">{c.hora}</span>
                  </div>
                </Link>
              </div>
              {/* LA FLECHITA: MANDAR ESTA CHARLA A UNA NOTA (31/07, pedido de
                  Matías: *"en el mismo chat, una flechita compartir a una
                  nota"*).
                  ⚠️ VA ACÁ Y NO ADENTRO DE LA NOTA. Se manda desde donde la
                  charla vive, en el momento en que la estás mirando y te das
                  cuenta de que va ahí. Un botón dentro de la nota te obligaría a
                  acordarte del título de una charla que no tenés delante — o
                  sea, a buscar algo que la app ya sabía dónde estaba. */}
              <button
                type="button"
                onClick={() => setMandando(c)}
                aria-label={`Mandar "${c.titulo}" a una nota`}
                className="grid size-9 flex-none place-items-center rounded-full text-niebla-2"
              >
                {IconMandar}
              </button>
              {/* El botón de carpeta es SUYO, no del link: si estuviera adentro,
                  tocarlo abriría el chat. */}
              <button
                type="button"
                onClick={() => setMoviendo(c)}
                aria-label={`Guardar "${c.titulo}" en una carpeta`}
                className="grid size-9 flex-none place-items-center rounded-full text-niebla-2"
              >
                {IconCarpeta}
              </button>
            </div>
          </div>
        );
      })}

      {moviendo && <HojaCarpetas chat={moviendo} carpetas={carpetas} onCerrar={() => setMoviendo(null)} />}
      {mandando && <HojaNotas chat={mandando} notas={notas} onCerrar={() => setMandando(null)} />}
    </>
  );
}

export type NotaElegible = { id: string; nombre: string; cuantas: number };

/**
 * A qué nota mandarla. Misma hoja que las carpetas: elegir una que ya existe o
 * hacer una nueva ahí mismo.
 *
 * ⚠️ CREAR UNA NOTA DESDE ACÁ LA CREA CON EL NOMBRE COMO TÍTULO Y NADA MÁS.
 * Es a propósito: la nota nace vacía y con la charla adentro, que es justo el
 * caso ("esto merece su propia nota"). Ponerle además un texto de relleno sería
 * escribir por el usuario en la única pantalla de la app que promete lo
 * contrario.
 */
function HojaNotas({
  chat,
  notas,
  onCerrar,
}: {
  chat: ChatItem;
  notas: NotaElegible[];
  onCerrar: () => void;
}) {
  const router = useRouter();

  // En qué notas ya está. Se pide al montar la hoja, que es cuando se abre.
  const [enNotas, setEnNotas] = useState<Set<number>>(new Set());
  useEffect(() => {
    let vivo = true;
    notasDeChat(chat.id)
      .then((ids: number[]) => vivo && setEnNotas(new Set(ids)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [chat.id]);

  // ⚠️ NO CIERRA LA HOJA (04/08): con varias notas posibles, cerrarla después
  // del primer tilde hace imposible marcar el segundo. Optimista, como el resto
  // de los tildes de la app.
  async function alternar(notaId: number) {
    const antes = new Set(enNotas);
    setEnNotas((prev) => {
      const c = new Set(prev);
      if (c.has(notaId)) c.delete(notaId);
      else c.add(notaId);
      return c;
    });
    try {
      await alternarChatEnNota(chat.id, notaId);
      router.refresh();
    } catch {
      setEnNotas(antes);
    }
  }

  return (
    <HojaElegirOCrear
      titulo="En qué notas va"
      subtitulo={chat.titulo}
      items={notas}
      placeholderNuevo="Nombre de la nota nueva"
      textoNuevo="Crear la nota y mandarla ahí"
      renderFinal={(n) =>
        enNotas.has(Number(n.id)) ? (
          // El tilde reemplaza al número cuando la charla está adentro: ahí el
          // dato que importa es "está o no", no cuántas charlas tiene la nota.
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="size-[14px] flex-none text-iris">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="flex-none font-mono text-[11px] text-niebla-2">
            {n.cuantas > 0 ? n.cuantas : ''}
          </span>
        )
      }
      onElegir={(n) => alternar(Number(n.id))}
      onCrear={async (nombre) => {
        const id = await guardarNota({ id: null, texto: nombre });
        // `guardarNota` devuelve null si el texto quedó vacío (vaciarla es
        // borrarla). Sin nota no hay a dónde mandarla, y la hoja se cierra sin
        // hacer nada en vez de tirar un error por un nombre en blanco.
        if (id) await alternar(id);
        else onCerrar();
      }}
      onCerrar={onCerrar}
    />
  );
}

// La hoja para elegir carpeta: mismo trabajo que `HojaTemas` en el chat
// (elegir una etiqueta ya creada o hacer una al toque), así que la parte
// compartida vive en `HojaElegirOCrear` (30/07, ver el comentario ahí).
function HojaCarpetas({
  chat,
  carpetas,
  onCerrar,
}: {
  chat: ChatItem;
  carpetas: CarpetaVista[];
  onCerrar: () => void;
}) {
  return (
    <HojaElegirOCrear
      titulo="Guardar en…"
      subtitulo={chat.titulo}
      items={carpetas}
      renderFila={() => <span className="text-iris">{IconCarpeta}</span>}
      renderFinal={(c) => <span className="font-mono text-[11px] text-niebla-2">{c.cuantos}</span>}
      quitar={chat.carpeta ? { etiqueta: `Sacarlo de ${chat.carpeta}`, accion: () => moverChatACarpeta(chat.id, null) } : undefined}
      placeholderNuevo="Nombre de la carpeta"
      textoNuevo="Nueva carpeta"
      maxLength={40}
      onCerrar={onCerrar}
      onElegir={(carpeta) => moverChatACarpeta(chat.id, carpeta.id)}
      onCrear={(nombre) => crearYMover(nombre, chat.id)}
    />
  );
}

// La pestaña de carpetas: solo las que hizo el usuario. Cada una se abre para
// ver lo que tiene adentro, sin salir de la pantalla.
export function Carpetas({ carpetas, chats }: { carpetas: CarpetaVista[]; chats: ChatItem[] }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  // Borrar PIDE CONFIRMACIÓN sin diálogo del sistema, mismo patrón que borrar
  // un mensaje en el chat (`MenuMensaje`): el botón se convierte en "¿Seguro?"
  // y recién el segundo toque borra.
  //
  // ⚠️ Hasta el 30/07 esto no existía en NINGUNA pantalla: `borrarCarpetaAction`
  // estaba escrita y probablemente funcionaba, pero ningún botón la llamaba —
  // la única forma de "borrar" una carpeta vacía era dejarla ahí para siempre.
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [borrando, empezarBorrado] = useTransition();

  // Cierra/abre y AL TOQUE suelta cualquier "¿Seguro?" que hubiera quedado a
  // medias en otra carpeta: sin esto, volver a abrir esa carpeta después
  // dejaba el botón listo para borrar con un solo toque, sin haber confirmado.
  function alternarAbierta(id: string) {
    setAbierta((a) => (a === id ? null : id));
    setBorrandoId(null);
  }

  function borrarCarpeta(id: string) {
    if (borrandoId !== id) {
      setBorrandoId(id);
      return;
    }
    empezarBorrado(async () => {
      await borrarCarpetaAction(id);
      setBorrandoId(null);
      if (abierta === id) setAbierta(null);
    });
  }

  if (carpetas.length === 0) {
    return (
      <div className="tarjeta border border-dashed border-niebla-2 bg-white">
        <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
          Todavía no tenés carpetas. En cualquier charla tocá el ícono de carpeta y creá la primera — sirven para
          juntar lo que va con lo mismo, como “Mudanza” o “Terapia”.
        </p>
      </div>
    );
  }

  return (
    <>
      {carpetas.map((c) => {
        const adentro = chats.filter((x) => x.carpeta === c.nombre);
        const on = abierta === c.id;
        return (
          <div key={c.id} className="mb-2">
            {/* EL NOMBRE DE LA CARPETA, EDITABLE (29/07). La carpeta se crea
                escribiendo el nombre de apuro desde una charla ("Mudanza"), y
                hasta hoy ese nombre era para siempre: `renombrarCarpetaAction`
                existía hace días y no la llamaba nadie. La única salida era
                borrar la carpeta y volver a moverle los chats de a uno. */}
            <div
              className="flex w-full items-center gap-2.5 rounded-[18px] border border-iris-borde bg-white px-[13px] py-3 text-left"
            >
              <span className="flex-none text-iris">{IconCarpeta}</span>
              <div className="min-w-0 flex-1">
                <TituloEditable
                  valor={c.nombre}
                  onTap={() => alternarAbierta(c.id)}
                  onGuardar={(n) => renombrarCarpetaAction(c.id, n)}
                  etiqueta="Cambiarle el nombre a la carpeta"
                  maxLength={40}
                  className="text-[14px] font-semibold text-tinta"
                />
              </div>
              <span className="flex-none font-mono text-[11px] text-niebla-2">{c.cuantos}</span>
              <button
                type="button"
                onClick={() => alternarAbierta(c.id)}
                aria-expanded={on}
                aria-label={`${on ? 'Cerrar' : 'Abrir'} ${c.nombre}`}
                className={`flex-none text-niebla-2 transition-transform duration-200 ${on ? 'rotate-90' : ''}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {on && (
              <div className="ml-[18px] mt-1 border-l border-iris-borde pl-2">
                {adentro.length === 0 ? (
                  <p className="px-2 py-2 text-[12.5px] text-niebla">Vacía por ahora.</p>
                ) : (
                  adentro.map((x) => (
                    <Link
                      key={x.id}
                      href={`/chat/${x.id}`}
                      className="flex items-center gap-2 rounded-[12px] px-2.5 py-2.5 text-[13.5px] text-tinta"
                    >
                      <span className="min-w-0 flex-1 truncate">{x.titulo}</span>
                      <span className="flex-none font-mono text-[10px] text-niebla-2">{x.dia}</span>
                    </Link>
                  ))
                )}
                <button
                  type="button"
                  disabled={borrando}
                  onClick={() => borrarCarpeta(c.id)}
                  className="mt-1.5 px-2.5 py-2 font-mono text-[11.5px] font-semibold text-alerta disabled:opacity-60"
                >
                  {borrandoId === c.id ? '¿Seguro? Tocá de nuevo' : 'Borrar carpeta'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

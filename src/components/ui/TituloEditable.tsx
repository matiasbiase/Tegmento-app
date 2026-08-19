'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { IconLapiz } from '@/components/ui/iconos';

// UN TÍTULO CON SU LÁPIZ AL LADO.
//
// ── Por qué es un componente y no cinco copias (29/07) ───────────────────────
// El patrón nació en Actividades (*"para editar el nombre debería aparecer un
// lapicito al lado, no estar escrito porque es medio engorroso"*) y de ahí había
// que llevarlo al resto de los títulos. Copiarlo cinco veces es garantizar que
// dentro de un mes haya cinco lápices con cinco tamaños distintos.
//
// Reglas que se respetan siempre y por eso viven acá:
//  - **El lápiz está pegado al título.** Editar algo es una acción sobre esa
//    cosa; escondida en un menú deja de encontrarse.
//  - **Enter guarda, Escape cancela.** En el teléfono el Enter del teclado es la
//    salida natural, y no debería haber que apuntarle a un botón chico.
//  - ⚠️ **No se guarda al perder el foco.** Tocar cualquier otra cosa de la
//    pantalla escribiría lo que estaba a medio escribir; en un título que
//    identifica algo, eso es peor que perder el cambio.
//  - **Vacío no guarda**: un título en blanco deja la fila sin nombre y sin
//    forma de recuperarlo.
//  - **El nombre nuevo se muestra al toque**, sin esperar al servidor. Si se
//    mostrara el viejo hasta que vuelva el `revalidatePath`, el medio segundo de
//    título anterior se lee como que no se guardó.
//
// ⚠️ El título puede ser a la vez el link que abre la cosa (`href`) o el botón
// que la despliega (`onTap`). Va acá y no afuera porque el lápiz TIENE que ser
// hermano y no hijo de ese link: un `<button>` adentro de un `<a>` es HTML
// inválido y, en la práctica, tocar el lápiz abre la charla.
//
// No lo usa `RenglonActividad`: ahí el lápiz abre un formulario con dos campos
// (título y objetivo), que es otra cosa que editar un nombre en el lugar.

export function TituloEditable({
  valor,
  onGuardar,
  href,
  onTap,
  className = 'text-[15px] font-semibold text-tinta',
  etiqueta = 'Cambiarle el nombre',
  maxLength = 90,
  senalEditar = 0,
  conLapiz = true,
}: {
  valor: string;
  onGuardar: (nuevo: string) => void | Promise<void>;
  /** Si el título además abre algo, su destino. */
  href?: string;
  /** Si el título además despliega algo en la misma pantalla. */
  onTap?: () => void;
  className?: string;
  etiqueta?: string;
  maxLength?: number;
  /**
   * Un contador que, al cambiar, enciende la edición desde AFUERA (01/08).
   *
   * Lo usa el menú de tres puntitos del chat, donde Matías pidió que viva el
   * lápiz. Es un número y no un booleano a propósito: con un booleano habría que
   * apagarlo después de usarlo, y el que lo prende (el menú) ya se cerró. Un
   * contador que sube dice "pedímelo otra vez" sin que nadie tenga que limpiar
   * nada.
   *
   * ⚠️ Y ES UNA SEGUNDA PUERTA A LA MISMA EDICIÓN, no otra forma de renombrar.
   * El renglón sigue siendo el único lugar donde se escribe el título.
   */
  senalEditar?: number;
  /**
   * ⚠️ EN `false` CUANDO EL LÁPIZ YA ESTÁ EN OTRO LADO (01/08, Matías: *"tiene el
   * lapicito dentro y fuera de los tres puntitos, no es necesario que lo tenga
   * dos veces, con que haya alguno está"*).
   *
   * Lo usa la cabecera del chat, donde "Cambiarle el nombre" vive en el menú.
   * En el Historial sigue en `true`: ahí no hay menú y el lápiz es la única
   * puerta. Nunca las dos a la vez.
   */
  conLapiz?: boolean;
}) {
  const [editando, setEditando] = useState(false);

  // Mismo patrón de "ajustar estado cuando cambia una prop" que el optimista de
  // abajo, sin efectos: si la señal subió, se entra a editar.
  const [ultimaSenal, setUltimaSenal] = useState(senalEditar);
  if (ultimaSenal !== senalEditar) {
    setUltimaSenal(senalEditar);
    if (senalEditar > 0) setEditando(true);
  }

  const [texto, setTexto] = useState(valor);
  const [optimista, setOptimista] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  // Cuando el server devuelve el valor nuevo, se suelta el optimista. (Patrón de
  // React para ajustar estado cuando cambia una prop, sin efectos.)
  const [visto, setVisto] = useState(valor);
  if (visto !== valor) {
    setVisto(valor);
    setOptimista(null);
  }

  const mostrado = optimista ?? valor;

  function guardar() {
    const t = texto.trim();
    if (!t || t === mostrado) return setEditando(false);
    setEditando(false);
    setOptimista(t);
    empezar(async () => {
      await onGuardar(t);
    });
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={texto}
          maxLength={maxLength}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar();
            if (e.key === 'Escape') {
              setTexto(mostrado);
              setEditando(false);
            }
          }}
          className="min-w-0 flex-1 rounded-[12px] border border-iris bg-white px-2.5 py-1.5 text-[16px] font-semibold text-tinta outline-none"
        />
        <button
          type="button"
          onClick={guardar}
          disabled={!texto.trim() || guardando}
          aria-label="Guardar el nombre"
          className="grid size-8 flex-none place-items-center rounded-full bg-iris text-white disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-[13px]">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    );
  }

  const texto_ = <span className={`block min-w-0 truncate ${className}`}>{mostrado}</span>;

  return (
    <div className="flex items-center gap-1">
      {href ? (
        <Link href={href} className="min-w-0 flex-1">
          {texto_}
        </Link>
      ) : onTap ? (
        <button type="button" onClick={onTap} className="min-w-0 flex-1 text-left">
          {texto_}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{texto_}</div>
      )}
      {conLapiz && (
      <button
        type="button"
        onClick={() => {
          setTexto(mostrado);
          setEditando(true);
        }}
        aria-label={`${etiqueta}: ${mostrado}`}
        // `text-niebla`, no `niebla-2`: el UI kit documenta ese gris más claro
        // como "iconos inactivos" (30/07) — un lápiz que se toca no lo es.
        className="flex size-6 flex-none items-center justify-center rounded-full text-niebla"
      >
        <IconLapiz className="size-[13px]" />
      </button>
      )}
    </div>
  );
}

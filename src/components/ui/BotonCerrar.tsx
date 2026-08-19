'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

// La forma de salir, una sola para toda la app.
//
// Estaba repartida en cinco: un texto "volver", un chevrón a la izquierda, una
// cruz, un router.back() sin ícono, y aria-labels que decían cosas distintas.
// Según en qué pantalla estuvieras, salir se hacía distinto y a veces no se veía
// cómo. Ahora es siempre la misma cruz, siempre arriba a la derecha.
//
// Va en rojo apagado (el ladrillo de la paleta, no un rojo de alarma): tiene que
// leerse como "salir de acá" de un vistazo, sin gritar. Junto al botón de volver
// cuando hay una jerarquía real que subir: son dos cosas distintas, volver te
// lleva un paso atrás y la cruz cierra lo que estás haciendo.

type Props = {
  /** Qué hacer al cerrar. Usá `href` en su lugar si es navegar a una pantalla. */
  onClick?: () => void;
  href?: string;
  /**
   * 'bloque' se ancla al contenedor relativo; 'pantalla' queda fijo arriba a la
   * derecha; 'junto-al-menu' queda fijo **al lado de la hamburguesa**.
   *
   * ⚠️ 'junto-al-menu' existe porque LA ESQUINA YA ESTÁ OCUPADA. La hamburguesa
   * es `fixed` arriba a la derecha, así que una cruz que quiera ir "a la
   * esquinita" no puede: lo más cerca es pegada a su izquierda. Con 'suelto'
   * quedaba en el flujo del título, a 42px del borde, y se leía como flotando en
   * el medio (31/07, Matías: *"está en una posición media rara, tendría que estar
   * en una esquinita"*). Fija y al lado del menú, las dos se leen como un par.
   */
  posicion?: 'bloque' | 'pantalla' | 'suelto' | 'junto-al-menu';
  etiqueta?: string;
};

// ⚠️ EL FONDO SUBIÓ DE #fdf1ee A #f9e2dc (31/07, Matías: *"la cruz aparece en un
// color medio que se confunde con el fondo"*). El rosa viejo era casi blanco y
// las pantallas de la app son lavanda MUY claro: el botón desaparecía y había que
// buscarlo. El borde hace la otra mitad del trabajo — sobre una tarjeta blanca el
// fondo solo no alcanza para despegarlo.
const CLASES =
  'grid size-9 place-items-center rounded-full border border-[#eec6bb] bg-[#f9e2dc] text-brick transition-colors active:bg-[#f2cec4]';

const IconoCruz = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[17px]">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function BotonCerrar({ onClick, href, posicion = 'bloque', etiqueta = 'Cerrar' }: Props) {
  const ubicacion =
    posicion === 'pantalla'
      ? // Los mismos +22px que la hamburguesa del Sidebar: la cruz ocupa su
      // lugar en las pantallas de tarea, así que si una baja, la otra también.
      // Si no, el botón salta de altura al cambiar de pantalla.
      'fixed right-[max(14px,calc(50%-210px))] top-[calc(max(12px,env(safe-area-inset-top))+22px)] z-40'
      : posicion === 'junto-al-menu'
        ? // Mismo `top` que la hamburguesa (Sidebar) para que se alineen, y a 54px
          // a su izquierda: 46 del botón de menú + 8 de aire.
          'fixed right-[calc(max(14px,50%-210px)+54px)] top-[calc(max(12px,env(safe-area-inset-top))+22px)] z-40'
        : posicion === 'bloque'
          ? 'absolute right-0 top-0 z-10'
          : '';

  const boton = href ? (
    <Link href={href} aria-label={etiqueta} className={`${CLASES} ${ubicacion}`}>
      {IconoCruz}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={etiqueta} className={`${CLASES} ${ubicacion}`}>
      {IconoCruz}
    </button>
  );

  /**
   * ⚠️ LAS POSICIONES FIJAS VAN POR PORTAL A `document.body` (01/08).
   *
   * Matías lo pescó en una captura de la pantalla de Nota: la cruz aparecía
   * flotando adentro de la tarjeta blanca, a media pantalla del título.
   *
   * La causa no está acá sino en `.flotar`, el contenedor de casi todas las
   * pantallas: tiene `animation: flotar .3s both`, y el `both` deja aplicado el
   * `transform: translateY(0)` del último frame **para siempre**. Un elemento con
   * un transform distinto de `none` se convierte en el marco de referencia de sus
   * hijos `position: fixed`, así que la cruz dejaba de medirse contra la pantalla
   * y pasaba a medirse contra el contenedor — que ya empieza corrido hacia abajo.
   * Con `top: safe-area + 22px` sobre un origen que ya estaba a ~80px, terminaba
   * al lado de la tarjeta en vez de arriba.
   *
   * `TituloFijo` ya había tropezado con esto y lo resolvió igual; su comentario
   * lo dice con todas las letras. La cruz se quedó afuera de ese arreglo.
   *
   * El montado en dos pasos NO es opcional: en el server no hay `document`, así
   * que el primer dibujo del navegador tiene que ser idéntico al HTML que vino
   * (nada), y recién después aparece. Es la misma regla que costó las tarjetas
   * del bot esta semana.
   */
  const fijo = posicion === 'pantalla' || posicion === 'junto-al-menu';
  if (fijo) return <PorPortal>{boton}</PorPortal>;
  return boton;
}

function PorPortal({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return createPortal(children, document.body);
}

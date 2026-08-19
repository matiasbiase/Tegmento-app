'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BotonCerrar } from '@/components/ui/BotonCerrar';

// Título grande de sección que, al scrollear, deja una barra compacta fija
// arriba (más chica, con blur) — estilo título grande de iOS.
// La barra va por portal a document.body: el contenedor .flotar tiene un
// transform (animación) que rompería un position:fixed anidado.
// `cerrarHref` convierte esto en una pantalla de tarea: aparece la cruz al lado
// del título. Seis pantallas (transcribir, bitácora nueva, rueda checkin y
// editar, cerebro, personalidad) no tenían NINGUNA forma visible de salir: en la
// PWA del iPhone tampoco hay botón de atrás del navegador, así que se salía por
// el menú o no se salía.
export function TituloFijo({
  titulo,
  cerrarHref,
  acciones,
}: {
  titulo: string;
  cerrarHref?: string;
  /**
   * Botones propios de la pantalla, a la IZQUIERDA de la cruz (06/08).
   *
   * ⚠️ EXISTE POR UN PROBLEMA DE USABILIDAD QUE MARCÓ MATÍAS EN NOTAS: *"cuando
   * es una nota nueva me aparece una X nomás; no sabés si la estás guardando, si
   * salís para atrás, si se borra… queda medio en duda"*. La nota se guardaba
   * sola desde siempre, **y no había forma de saberlo**: una cruz solitaria en
   * una pantalla que escribe se lee como "descartar".
   * El arreglo no es guardar distinto: es que los tres destinos posibles —queda,
   * se va, se borra— estén los tres a la vista y juntos.
   */
  acciones?: React.ReactNode;
}) {
  const [fijo, setFijo] = useState(false);
  const [montado, setMontado] = useState(false);
  const centinela = useRef<HTMLDivElement>(null);

  useEffect(() => setMontado(true), []);

  // Dos mecanismos, a propósito: el observer detecta el cruce sin depender de
  // eventos de scroll, y el listener cubre el caso de que el componente se
  // remonte con la página ya scrolleada (en Patrones el analista hace
  // router.refresh()), donde el título quedaba invisible.
  useEffect(() => {
    const calcular = () => {
      const el = centinela.current;
      if (el) setFijo(el.getBoundingClientRect().top <= 6);
    };
    calcular();

    const el = centinela.current;
    const obs = el
      ? new IntersectionObserver(([e]) => setFijo(!e.isIntersecting), { rootMargin: '-6px 0px 0px 0px', threshold: 0 })
      : null;
    if (el && obs) obs.observe(el);

    window.addEventListener('scroll', calcular, { passive: true });
    window.addEventListener('resize', calcular);
    return () => {
      obs?.disconnect();
      window.removeEventListener('scroll', calcular);
      window.removeEventListener('resize', calcular);
    };
  }, []);

  return (
    <>
      {montado &&
        createPortal(
          <div
            style={{
              // ── ⚠️⚠️ CENTRADO CON `margin: auto`, NO CON `translateX(-50%)` ──
              // (13/08). Matías: *"la fecha, jueves trece de agosto, se ve como
              // borrosa… en Seguimiento bajás y una parte del título arriba se
              // ve borroso"*.
              //
              // Estaba centrado con `left: 50%` + `translateX(-50%)`. En un
              // iPhone 15 Pro el viewport mide **393px, que es impar**, así que
              // ese -50% da **-196,5px: medio píxel**. Sobre un elemento normal
              // no se nota; sobre este sí, porque el `backdrop-filter` de abajo
              // lo obliga a rasterizarse en GPU — y una capa rasterizada a mitad
              // de píxel sale **borrosa entera, texto incluido**.
              //
              // 👉 La regla, que vale para toda la app: **si algo lleva
              // `backdrop-filter`, no lo centres con un porcentaje.** El blur no
              // perdona los medios píxeles que el layout normal disimula.
              // `left/right: 0` + `margin: auto` centra sin transform, así que
              // siempre cae en un píxel entero.
              //
              // ⚠️ El `translateY` se queda: son 6px enteros y es la animación de
              // entrada.
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '28rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              zIndex: 30,
              pointerEvents: 'none',
              // Mismo origen y alto que el botón de hamburguesa (46px), así los
              // dos quedan centrados en la misma línea.
              paddingLeft: '22px',
              paddingRight: '68px',
              paddingTop: 'max(12px, env(safe-area-inset-top))',
              paddingBottom: '10px',
              opacity: fijo ? 1 : 0,
              transform: fijo ? 'translateY(0)' : 'translateY(-6px)',
              // Entra con fade; se va al instante. Si también se fuera con fade,
              // durante esos 200ms el título compacto queda encima del título
              // grande y se leen los dos superpuestos (se nota sobre todo al
              // volver arriba de golpe, ej. después de un router.refresh()).
              transition: fijo ? 'opacity .2s ease, transform .2s ease' : 'none',
              background: fijo ? 'rgba(243,243,251,.92)' : 'transparent',
              backdropFilter: fijo ? 'blur(20px) saturate(180%)' : 'none',
              WebkitBackdropFilter: fijo ? 'blur(20px) saturate(180%)' : 'none',
              boxShadow: fijo ? '0 2px 12px rgba(50,50,90,.08)' : 'none',
            }}
          >
            <div className="flex h-[46px] items-center">
              <h2 className="truncate font-serif text-[19px] font-semibold leading-none tracking-[-0.3px] text-tinta">{titulo}</h2>
            </div>
          </div>,
          document.body,
        )}

      {/* Título grande en flujo normal, con la salida al lado si es una tarea.
          ⚠️ ALINEADO CON LA HAMBURGUESA (30/07, Matías: *"están medio
          chiquitos, estaría bueno que los alinees y los hagas un poco más
          grandes"*). El botón de menú es `fixed` a 22px del techo del
          contenido y mide 46px; el título vivía en el flujo con solo el `pt-2`
          de la página (8px), así que quedaba unos 18px MÁS ARRIBA que el
          botón y los dos se leían como dos cosas sueltas en vez de una fila.
          `mt-[14px]` completa esos 22px y `min-h-[46px] items-center` le da la
          misma caja, así los centros coinciden.
          El `pr-[42px]` es para que un título largo no se meta debajo del
          botón: la página reserva 22px a la derecha y la hamburguesa ocupa
          hasta 60px desde el borde. */}
      <div className="mt-[14px] flex min-h-[46px] items-center justify-between gap-3 pr-[42px]">
        <h1 className="font-serif text-[34px] font-semibold leading-none tracking-[-0.4px] text-tinta">{titulo}</h1>
        {/* Fija al lado de la hamburguesa y no en el flujo del título: en el
            flujo quedaba a 42px del borde, flotando en el medio. Ver la nota de
            'junto-al-menu' en BotonCerrar. */}
        {/* ⚠️ VA A LA ESQUINA, NO AL LADO DE LA HAMBURGUESA (01/08, Matías: *"no
            está en el borde, está como en tres cuartos de la posición"*).
            `junto-al-menu` la corría 54px a la izquierda para hacerle lugar al
            botón de menú — pero en las pantallas que llevan cruz la hamburguesa
            NO SE DIBUJA (`RUTAS_TAREA` en Sidebar: *"la esquina la ocupa la cruz,
            no la hamburguesa"*). O sea que le estaba dejando lugar a algo que no
            estaba, y quedaba flotando con la esquina vacía al lado. */}
        {acciones}
        {cerrarHref && <BotonCerrar href={cerrarHref} posicion="pantalla" etiqueta={`Salir de ${titulo}`} />}
      </div>
      <div ref={centinela} aria-hidden className="h-px w-full" />
    </>
  );
}

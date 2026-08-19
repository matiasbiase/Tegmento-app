'use client';

import { useState } from 'react';

/**
 * LA BARRITA DE APARTADOS, UNA SOLA PARA TODA LA APP (05/08).
 *
 * Nació en Seguimiento y ahora la usan también Patrones y Relaciones, porque es
 * el mismo gesto: **una pantalla con tres montones distintos y uno solo a la
 * vez.** Matías, mirando Relaciones: *"como lo mismo en seguimiento, que tenés
 * esas tres formas de elegir, donde podés ver lo que están cocinando, lo que
 * están más al día y los actuales"*.
 *
 * ⚠️ SE EXTRAJO EN VEZ DE COPIARSE. La barra ya existía escrita a mano adentro
 * de `ActividadesUI`; el camino fácil era pegarla en las otras dos pantallas y
 * quedar con tres copias que se despegan solas en el primer retoque. Es la
 * regla de la casa: antes de construir algo, buscalo en `src/`.
 *
 * Dos piezas:
 *   · `BarraPestanas` — solo la barra, para cuando la pantalla necesita saber
 *     qué pestaña está elegida (Seguimiento la usa para el botón del pie).
 *   · `Apartados`     — barra + contenido, para las pantallas que solo muestran.
 */

export type Apartado<K extends string = string> = {
  clave: K;
  label: string;
  /** El numerito al lado del nombre. 0 no se dibuja: un cero no informa, ocupa. */
  n?: number;
  /**
   * El dibujito a la izquierda del nombre (06/08, pedido de Matías para la
   * barrita de Seguimiento). Opcional: Patrones y Relaciones usan esta misma
   * barra sin íconos y siguen igual.
   *
   * ⚠️ LLEGA COMO NODO YA ARMADO —un `<svg>` entero— y no como una clave de un
   * catálogo. Es a propósito: los íconos de la app no comparten grosor de trazo
   * (las tres barritas de Seguimiento van en 1.5 y el resto en 1.9, porque con
   * el trazo grueso el relleno se come el hueco de las vacías) ni ancho. Un
   * catálogo acá adentro obligaría a un solo grosor para todos y rompería
   * justamente el ícono que originó el pedido.
   */
  icono?: React.ReactNode;
};

export function BarraPestanas<K extends string>({
  apartados,
  elegida,
  onElegir,
  className = 'mb-5',
}: {
  apartados: Apartado<K>[];
  elegida: K;
  onElegir: (clave: K) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 rounded-full bg-[#e9e9f4] p-1 ${className}`}>
      {apartados.map((a) => {
        const sel = a.clave === elegida;
        return (
          <button
            key={a.clave}
            type="button"
            onClick={() => onElegir(a.clave)}
            /* ⚠️ `flex-auto` Y NO `flex-1`, O SEA: EL ANCHO SE REPARTE SEGÚN LO
               QUE DICE CADA PESTAÑA, no en tres partes iguales (06/08). Con
               `flex-1` las tres miden lo mismo pase lo que pase, así que la más
               larga se recorta mientras las cortas SOBRAN lugar: al sumarle los
               íconos, en un iPhone se leía **"Seguimien…"** —el nombre de la
               pantalla, cortado— con aire de sobra en "Tareas" al lado.
               `flex-auto` le da a cada una lo que necesita y reparte el resto en
               partes iguales. En Notas y en Cosas chicas no se nota, porque ahí
               las tres etiquetas miden casi lo mismo. */
            className="flex min-w-0 flex-auto items-center justify-center gap-[5px] rounded-full py-2 font-mono text-[12px] font-semibold tracking-[0.2px] transition-colors"
            style={{
              background: sel ? '#fff' : 'transparent',
              color: sel ? 'var(--color-iris)' : 'var(--color-niebla)',
              boxShadow: sel ? '0 2px 8px rgba(50,50,90,.08)' : 'none',
            }}
            aria-pressed={sel}
          >
            {/* ⚠️ EL ÍCONO SE DIBUJA SIEMPRE, no solo en la pestaña elegida.
                Apareciendo y desapareciendo, el texto se correría de lugar cada
                vez que tocás una pestaña —tres anchos distintos según dónde
                estés parado— y la barra se movería sola abajo del dedo. Lo que
                cambia con la selección es el color, que ya lo dice todo.
                `aria-hidden`: el nombre está escrito al lado, así que para un
                lector de pantalla el dibujo solo repetiría la palabra. */}
            {a.icono && (
              <span className="flex-none" aria-hidden="true">
                {a.icono}
              </span>
            )}
            {/* `truncate` con `min-w-0`: en un teléfono angosto lo que se recorta
                es el nombre, no el ícono ni el número. */}
            <span className="min-w-0 truncate">{a.label}</span>
            {a.n != null && a.n > 0 && <span className="flex-none opacity-60">{a.n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Barra + contenido. El contenido llega ya dibujado desde el server (las
 * pantallas de Patrones y Relaciones son server components): así el filtro es
 * cliente y los datos siguen sin viajar de más.
 */
export function Apartados<K extends string>({
  apartados,
  inicial,
}: {
  apartados: (Apartado<K> & { contenido: React.ReactNode })[];
  /** Con cuál abre. Si no se dice, con el primero que tenga algo adentro. */
  inicial?: K;
}) {
  const primeroConAlgo = apartados.find((a) => (a.n ?? 0) > 0)?.clave ?? apartados[0].clave;
  const [elegida, setElegida] = useState<K>(inicial ?? primeroConAlgo);
  const actual = apartados.find((a) => a.clave === elegida) ?? apartados[0];

  return (
    <>
      <BarraPestanas apartados={apartados} elegida={elegida} onElegir={setElegida} />
      {/* ⚠️⚠️ EL `<div>` NO ES DECORACIÓN: SIN ÉL, COSAS CHICAS TIRA EL WARNING
          DEL `key` EN CONSOLA (06/08). Es el mismo bug que costó dos días en
          Seguimiento, con otra cara.

          Antes acá iba `{actual.contenido}` suelto, o sea **segundo hijo de un
          fragment** — y un fragment con dos hijos es un array. `contenido` lo
          arma un componente de SERVIDOR (`cosas-chicas/page.tsx`) y se lo pasa a
          este, que es cliente: cruza serializado y del otro lado llega como un
          nodo *lazy*. Frente a un lazy adentro de una lista, React lo resuelve y
          le pide `key` a lo que hay adentro — que se creó en la página, sin key.

          ⚠️ SE ARREGLA ACÁ Y NO EN LAS SIETE LLAMADAS. Poner `key` en cada
          `contenido` funcionaría, pero son siete lugares hoy y uno nuevo cada
          vez que alguien use esta barra — y dos de ellos son `<>` cortos, que ni
          siquiera pueden llevar key. **La lista la crea este componente, así que
          el arreglo es suyo.** Envuelto, `contenido` es hijo ÚNICO de un div: no
          hay lista, no hay key que pedir, y ningún llamador tiene que acordarse
          de nada.

          Sin clases, para no cortar el colapso de márgenes: el contenido sigue
          midiendo exactamente igual que suelto. */}
      <div>{actual.contenido}</div>
    </>
  );
}

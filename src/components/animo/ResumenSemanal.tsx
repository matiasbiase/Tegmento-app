'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generarResumen } from '@/lib/actions/resumen';

// Card "Tu semana" en Patrones: una lectura corta de los últimos 7 días.
// Se genera sola la primera vez que abrís en una semana nueva; mientras tanto
// muestra el resumen anterior (o el fallback sin IA, que nunca falta).
export function ResumenSemanal({ texto, esDeEstaSemana }: { texto: string; esDeEstaSemana: boolean }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);

  async function generar() {
    if (trabajando) return;
    setTrabajando(true);
    try {
      await generarResumen();
      router.refresh();
    } finally {
      setTrabajando(false);
    }
  }

  // Semana nueva: enriquecer con IA en segundo plano, una sola vez.
  useEffect(() => {
    if (!esDeEstaSemana) generar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="papel tarjeta bg-white shadow-[0_4px_20px_rgba(50,50,90,.06)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Tu semana</p>
        {/* ⚠️ ERA EL CARÁCTER "↻" A 12px (06/08, Matías: *"está bueno que
            aparezca el simbolito como de recargar, tendría que ser un poco más
            grande"*). Un glifo tipográfico se dibuja al tamaño de la letra y con
            el grosor de la fuente: no hay forma de agrandarlo sin agrandar el
            texto. Como SVG se controla, y girando mientras trabaja dice que
            está haciendo algo sin necesidad de la palabra "leyendo…". */}
        <button
          type="button"
          onClick={generar}
          disabled={trabajando}
          aria-label={trabajando ? 'Leyendo tu semana' : 'Actualizar el resumen'}
          className="-m-1.5 grid size-8 flex-none place-items-center rounded-full text-iris disabled:opacity-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-[17px] ${trabajando ? 'gira-lento' : ''}`}
          >
            {/* ⚠️ SEGUNDO INTENTO (06/08, Matías: *"está rota"*). El primero
                dibujaba el arco hasta las 11 y la punta como una escuadra
                (`M20 4.5v6h-6`), que **no es una flecha: son dos rayas en
                ángulo recto** y a 17px se leía como un cuadradito colgado del
                círculo. Ahora el arco deja un hueco arriba a la derecha y la
                punta son dos trazos en V metidos en ese hueco, que es como se
                dibuja un "recargar" en todos lados. */}
            <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
            <path d="M20.5 3.5v5h-5" />
          </svg>
        </button>
      </div>
      {/* ⚠️ SIN `text-pretty`, y ES LA CAUSA DE LO QUE ÉL VIO (*"el texto deja
          mucho espacio en el costado"*). `text-wrap: pretty` equilibra los
          renglones para que el último no quede corto, y el precio es que
          **acorta TODOS los demás**: en un párrafo largo se nota como un margen
          derecho que no está en el CSS. En títulos de dos líneas vale la pena;
          en un resumen de seis renglones, no. */}
      {/* ── ⚠️ EN SERIF ITÁLICA, COMO LA RELECTURA (11/08) ────────────────────
          Matías: *"podríamos hacerlo con el estilo ese que usás en el Home, que
          está escrito como a mano o en cursiva, para que se vea más interesante"*.

          ⚠️ Y NO ES DECORACIÓN: es la misma gramática que ya usa la relectura.
          **La serif itálica marca una VOZ, no un dato.** Este resumen no es una
          medición —es la app contándote tu semana en palabras—, así que
          escribirlo con la misma sans que un contador lo hacía pasar por dato.

          El papel va en la tarjeta (`.papel`): el material dice que esto es para
          leer, no para tocar. */}
        <p className="whitespace-pre-wrap font-serif text-[15.5px] italic leading-[1.5] text-tinta">{texto}</p>
    </div>
  );
}

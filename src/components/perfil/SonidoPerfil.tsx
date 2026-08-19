'use client';

import { useEffect, useState } from 'react';
import { cargarPreferenciaSonido, silenciarSonidos, sonarExito } from '@/lib/sonido';
import { TituloSeccion } from '@/components/ui/TituloSeccion';

// UN interruptor y nada más.
//
// Antes había tres botones para probar cada sonido de a uno. Dos problemas, los
// dos que marcó Matías: no se veía cuál estaba elegido —parecía un selector y no
// lo era, así que tocabas los tres— y además elegir el sonido no es una decisión
// que valga la pena ofrecer. Lo único que uno quiere decidir es si suena o no.
//
// Los sonidos ya están fijos: el de "registré algo" en todo lo que se anota, y
// el grande solo al terminar algo que venías siguiendo o al cumplir una racha.


export function SonidoPerfil() {
  const [apagado, setApagado] = useState(false);

  useEffect(() => {
    setApagado(cargarPreferenciaSonido());
  }, []);

  function alternar() {
    const nuevo = !apagado;
    setApagado(nuevo);
    silenciarSonidos(nuevo);
    if (!nuevo) sonarExito(); // al prenderlos, que se escuche que volvieron
  }

  return (
    <div className="mt-8">
      <TituloSeccion>Sonidos</TituloSeccion>
      <div className="tarjeta bg-white sombra-card">
        <button
          type="button"
          onClick={alternar}
          className="flex w-full items-center justify-between gap-3 text-left"
          role="switch"
          aria-checked={!apagado}
        >
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-tinta">
              {apagado ? 'Sin sonido' : 'Con sonido'}
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-niebla text-pretty">
              Uno corto cuando anotás algo, y uno más grande cuando terminás algo que venías siguiendo.
            </span>
          </span>
          <span
            className="relative h-[28px] w-[48px] flex-none rounded-full transition-colors"
            style={{ background: apagado ? '#e0e0ee' : 'var(--color-verde)' }}
          >
            <span
              className="absolute top-[3px] size-[22px] rounded-full bg-white shadow-sm transition-[left]"
              style={{ left: apagado ? 3 : 23 }}
            />
          </span>
        </button>

        {/* En el iPhone el interruptor de silencio del costado apaga esto igual:
            es la categoría de audio del sistema, no algo que la app decida. */}
        <p className="mt-3 border-t border-[#f1f0f7] pt-3 text-[12px] leading-relaxed text-niebla-2 text-pretty">
          Si no se escucha nada con esto prendido, revisá el interruptor de silencio del costado del iPhone.
        </p>
      </div>
    </div>
  );
}

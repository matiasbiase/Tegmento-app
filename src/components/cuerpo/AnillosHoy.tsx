'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnillosDia, type AnilloDia } from '@/components/ui/AnillosDia';
import { HojaRegistro, type TipoHoja } from '@/components/captura/HojaRegistro';
import { PastillasCuerpo, type Pastilla } from '@/components/cuerpo/PastillasCuerpo';

// Los tres anillos de "Hoy", ahora en Cuerpo (27/07, decisión de Matías).
//
// Vivían en el Home, y se mudaron por una razón de fondo: **el Home es el diario
// y la charla; el tracker vive en Cuerpo y en Seguimiento.** Ánimo, sueño y
// seguimiento son exactamente eso — el tracker— así que su casa es esta.
//
// Esta cáscara existe porque la página de Cuerpo es un server component y los
// anillos necesitan estado: abrir la hoja de registro y refrescar al guardar.
//
// Y además ES ACÁ DONDE SE ARMA EL PIE de la tarjeta (los botones de carga): la
// página no puede pasarle una función a un componente cliente, así que le pasa
// los datos y el cierre se hace de este lado.

export type AnilloConHoja = AnilloDia & { hoja: TipoHoja };

export function AnillosHoy({
  anillos,
  brillos = false,
  soloVer = false,
  pastillas,
}: {
  anillos: AnilloConHoja[];
  brillos?: boolean;
  /** En Cuerpo va en `soloVer`: las filas de al lado del aro son leyenda, no
   *  botones. Lo que se toca son las pastillas de abajo. */
  soloVer?: boolean;
  /** Con esto la tarjeta lleva los botones de carga adentro, debajo del aro. */
  pastillas?: Pastilla[];
}) {
  const router = useRouter();
  const [hoja, setHoja] = useState<TipoHoja | null>(null);

  return (
    <>
      <AnillosDia
        anillos={anillos}
        onElegir={(i) => setHoja(anillos[i].hoja)}
        brillos={brillos}
        soloVer={soloVer}
        pie={
          pastillas
            ? (visibles) => <PastillasCuerpo pastillas={pastillas} enAnillo={visibles} />
            : undefined
        }
      />
      {hoja && (
        <HojaRegistro
          tipo={hoja}
          onClose={() => setHoja(null)}
          // Sin el refresh, el anillo se queda como estaba y parece que no se
          // guardó (mismo bug que había en el Home con la foto).
          onGuardado={() => router.refresh()}
        />
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';

// El indicador de que el asistente está trabajando. Vive acá para que se vea
// igual adentro de un chat y desde la barra global.
//
// Gemma corre local: una respuesta puede tardar 30 segundos largos. Un indicador
// quieto todo ese rato parece colgado, así que el texto va cambiando para que se
// note que sigue vivo y para explicar por qué tarda.

import { textoEspera } from '@/lib/espera';

export function PuntosPensando() {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-iris"
          style={{ animation: `latido 1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </span>
  );
}

/** El texto de espera, que va escalando con los segundos que pasan. */
export function TextoEspera() {
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[12px] leading-snug text-niebla text-pretty">{textoEspera(seg)}</span>;
}

/** A partir de acá el "Escribiendo…" deja lugar a la explicación de por qué
 *  tarda. Antes de esto, la espera es normal y no hay nada que justificar. */
const SEGUNDOS_PARA_EXPLICAR = 14;

/**
 * "ESCRIBIENDO…", COMO UNA PERSONA (29/07, pedido de Matías: *"en vez de que
 * diga pensando, simplemente que aparezca como que está escribiendo alguien
 * más"*).
 *
 * ⚠️ NO SE BORRÓ EL TEXTO QUE ESCALA, se pospuso. Existe por una razón que
 * sigue viva: Gemma corre en su Mac y una respuesta puede irse a 30 segundos.
 * Un indicador quieto todo ese rato parece colgado, y ahí el usuario cierra la
 * app creyendo que se rompió. Así que los primeros catorce segundos se ven como
 * un chat normal, y recién si se pasa aparece la explicación.
 */
export function Escribiendo() {
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const tarda = seg >= SEGUNDOS_PARA_EXPLICAR;
  return (
    <span className="flex items-center gap-2">
      <PuntosPensando />
      <span className="text-[12.5px] leading-snug text-niebla text-pretty">
        {tarda ? textoEspera(seg) : 'Escribiendo…'}
      </span>
    </span>
  );
}

/**
 * La burbuja de "estoy pensando" para la barra global: se ve lo que mandaste
 * (así sabés que llegó) y abajo los puntitos con el texto de espera.
 */
export function BurbujaPensando({ enviado }: { enviado?: string }) {
  return (
    <div className="glass-ios mb-2 rounded-[18px] px-4 py-3">
      {enviado && (
        <p className="mb-1.5 line-clamp-2 text-[13px] leading-snug text-tinta-soft text-pretty">“{enviado}”</p>
      )}
      <div className="flex items-center gap-2.5">
        <PuntosPensando />
        <TextoEspera />
      </div>
    </div>
  );
}

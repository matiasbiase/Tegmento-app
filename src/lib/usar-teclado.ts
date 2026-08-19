'use client';

import { useEffect, useState } from 'react';

// Cuánto tapa el teclado, en px. Sirve para subir la barra de escribir y que no
// quede un hueco enorme entre el composer y el teclado.
//
// ── Por qué hace falta ────────────────────────────────────────────────────────
// En iOS, cuando se abre el teclado, Safari NO achica el viewport de layout:
// solo achica el VISUAL. Un elemento `position: fixed; bottom: 0` se sigue
// anclando al fondo del layout, o sea a un fondo que ahora está tapado por el
// teclado. De ahí el espacio muerto que se ve en el celular.
// `window.visualViewport` es la única forma de enterarse: da el alto real que
// queda visible y cuánto se corrió.
//
// El umbral de 80px es a propósito: en Safari con barras la diferencia entre
// layout y visual cambia sola al scrollear (la barra de direcciones que se
// esconde), y sin umbral la barra temblaría todo el tiempo. Un teclado nunca
// mide menos de 80px.

const MINIMO_TECLADO = 80;

export function useAltoTeclado(): number {
  const [alto, setAlto] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // sin soporte: se queda como estaba, no rompe nada

    function medir() {
      if (!vv) return;
      // Lo que queda tapado abajo del viewport visual.
      const tapado = window.innerHeight - vv.height - vv.offsetTop;
      setAlto(tapado > MINIMO_TECLADO ? Math.round(tapado) : 0);
    }

    medir();
    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
    };
  }, []);

  return alto;
}

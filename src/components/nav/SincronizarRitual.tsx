'use client';

import { useEffect, useRef } from 'react';
import { esNativo, programarRitual } from '@/lib/nativo';
import { leerEstadoRitual, loCargadoHoy } from '@/lib/actions/ritual';
import { avisosDelRitual, idsACancelar } from '@/lib/ritual';

/**
 * REPROGRAMA LOS AVISOS DEL RITUAL AL ABRIR LA APP.
 *
 * ⚠️ EXISTE POR UN DETALLE QUE DECIDE SI EL RITUAL SIRVE O MOLESTA. Una
 * notificación local se programa **por adelantado**: iOS la dispara sola, sin
 * preguntarle nada a la app. O sea que sin esto, el aviso de "¿cómo dormiste?"
 * sonaría igual a las 8:30 aunque hayas marcado el sueño a las 7 — y un
 * recordatorio para algo que ya hiciste enseña a ignorar los recordatorios.
 *
 * Cada vez que abrís la app se vuelve a mirar qué cargaste hoy y se reprograma:
 * lo que corresponde se pone, lo que no, se cancela.
 *
 * ⚠️ NO DIBUJA NADA Y NO MUESTRA ERRORES. Es de fondo: si el permiso está
 * revocado o el plugin no está en el build, no pasa nada visible. La pantalla
 * donde esto SÍ tiene que hablar es Perfil, que es donde lo prendés — un cartel
 * de error al abrir el chat sería la app quejándose de sí misma, que es
 * exactamente lo que la regla del destacado ya prohíbe.
 *
 * ⚠️ Y CORRE UNA SOLA VEZ POR MONTAJE (el `hecho`): sin eso, cada navegación
 * entre pantallas del layout dispararía otra reprogramación.
 */
export function SincronizarRitual() {
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current || !esNativo()) return;
    hecho.current = true;

    void (async () => {
      try {
        const estado = await leerEstadoRitual();
        // Apagado: no se toca nada. Cancelar acá borraría avisos que quizás puso
        // otra cosa, y el apagado ya cancela cuando él lo apaga en Perfil.
        if (!estado.activo) return;
        const avisos = avisosDelRitual(estado, await loCargadoHoy());
        await programarRitual(avisos, idsACancelar(avisos));
      } catch {
        // De fondo: si falla, el ritual queda como estaba programado ayer.
      }
    })();
  }, []);

  return null;
}

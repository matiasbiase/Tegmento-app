'use client';

import { notasAWav, type Nota } from '@/lib/wav';

// Sonidos de la app. Sin archivos: el WAV se sintetiza en runtime (ver lib/wav).
//
// Antes esto usaba Web Audio y los sonidos se perdían cada dos por tres en el
// iPhone. Dos motivos, los dos de iOS:
//   - un AudioContext sale por la categoría "ambient", que el interruptor de
//     silencio del costado del teléfono apaga. El sonido se generaba bien y no
//     salía por el parlante.
//   - si el contexto no se arma dentro de un gesto real queda suspendido, y
//     bastaba una recarga de la PWA para que dejara de sonar sin aviso.
//
// La voz de la app nunca falló porque usa un <audio> con data URI, que va por la
// categoría de media y suena con el teléfono en silencio. Ahora los sonidos usan
// exactamente ese camino.
//
// Idea original de Matías: un "tin-tin" tipo Duolingo cuando lográs algo. Cálido
// y corto, en tono con la calma de la app: celebra sin gritar.

let apagado = false;

/** Silenciar o reactivar los sonidos (preferencia del usuario). */
export function silenciarSonidos(valor: boolean) {
  apagado = valor;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('tegmento_sonidos', valor ? 'off' : 'on');
    } catch {
      // modo privado o storage lleno: la preferencia dura lo que la sesión
    }
  }
}

export function sonidosApagados(): boolean {
  return apagado;
}

/** Lee la preferencia guardada. Se llama al montar la app. */
export function cargarPreferenciaSonido(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    apagado = window.localStorage.getItem('tegmento_sonidos') === 'off';
  } catch {
    apagado = false;
  }
  return apagado;
}

// Las tres tandas de notas. C5 de base.
//
// Los volúmenes son los de la versión que a Matías le gustaba (0.18), no los que
// puse al pasar a WAV (0.5): eso era casi el triple, saturaba el parlante y por
// eso sonaba metálico, fuerte y roto.
//
// ⚠️⚠️ UNA OCTAVA ABAJO (12/08), y esto corrige un diagnóstico viejo. Matías:
// *"tenían que ser más graves, o más como campanitas; son muy metálicos,
// artificiales… para el oído no son cálidos"*.
//
// La vez pasada se culpó al VOLUMEN y se bajó de 0.5 a 0.18. No alcanzó, así que
// esa no era (toda) la causa. La que quedaba es la ALTURA: la base era C6, o sea
// 1046 Hz, dos octavas arriba del do central. A esa altura el oído lee
// "electrónico" por más envolvente de marimba que tenga la onda — el timbre no
// puede rescatar una nota que está fuera del registro donde las cosas suenan
// cálidas. "Más grave" era literal.
//
// ⚠️ Se mueve UNA SOLA VARIABLE. Los volúmenes, las duraciones, los intervalos y
// la onda quedan exactamente iguales: si esto todavía no gusta, sabemos que la
// altura no era el problema. Cambiar timbre y altura juntos dejaría sin saber
// cuál de los dos sirvió, que es como se perdieron las dos vueltas anteriores.
//
// ⚠️ Los graves se perciben más bajos a igual amplitud (curvas de igual sonoridad).
// Si queda flojo, el arreglo es subir `vol`, NO volver a subir la octava.
const TIN: Nota[] = [{ freq: 523.25, inicio: 0, dur: 0.28, vol: 0.18 }];
const EXITO: Nota[] = [
  { freq: 523.25, inicio: 0, dur: 0.22, vol: 0.17 }, // C5
  { freq: 698.46, inicio: 0.1, dur: 0.34, vol: 0.17 }, // F5, una cuarta arriba: suena a "¡bien!"
];
const HITO: Nota[] = [523.25, 659.26, 783.99, 1046.5].map((freq, i) => ({
  freq,
  inicio: i * 0.1,
  dur: 0.4,
  vol: 0.16,
})); // C5 E5 G5 C6: acorde mayor

// Los WAV se arman una sola vez y quedan cacheados: sintetizar en cada toque
// agregaría unos milisegundos justo cuando el sonido tiene que salir ya.
const cache = new Map<string, string>();

function fuente(clave: string, notas: Nota[]): string {
  let uri = cache.get(clave);
  if (!uri) {
    uri = notasAWav(notas);
    cache.set(clave, uri);
  }
  return uri;
}

// Un elemento por sonido: si se reusara uno solo, dos sonidos seguidos se
// cortarían entre sí (pasa al pintar varios días rápido).
const elementos = new Map<string, HTMLAudioElement>();

function reproducir(clave: string, notas: Nota[]) {
  if (apagado || typeof window === 'undefined') return;
  try {
    let el = elementos.get(clave);
    if (!el) {
      el = new Audio(fuente(clave, notas));
      el.preload = 'auto';
      elementos.set(clave, el);
    }
    el.currentTime = 0;
    void el.play().catch(() => {});
  } catch {
    // sin audio disponible: la app sigue igual, el sonido es un extra
  }
}

/** Un toque cálido y corto, para un registro chico (marcar un día, guardar algo). */
/**
 * @deprecated El "tin" quedó fuera: a Matías no le gustaba y ahora todo lo que
 * es "registré algo" usa `sonarExito`. Se deja para no romper importaciones
 * viejas, pero no se usa en ninguna pantalla.
 */
export function sonarTin() {
  reproducir('tin', TIN);
}

/** El "ding-ding" de logro, tipo Duolingo: dos notas que suben, alegres. */
export function sonarExito() {
  reproducir('exito', EXITO);
}

/** Celebración grande, para un hito (racha de 7, 30…): arpegio alegre y cálido. */
export function sonarHito() {
  reproducir('hito', HITO);
}

// iOS pide que el primer play salga de un gesto real. Se prepara todo en el
// primer toque de la sesión, así el sonido que llega después de un await (el tin
// al terminar de guardar) ya tiene el elemento bendecido y suena.
if (typeof window !== 'undefined') {
  const preparar = () => {
    cargarPreferenciaSonido();
    for (const [clave, notas] of [
      ['tin', TIN],
      ['exito', EXITO],
      ['hito', HITO],
    ] as const) {
      try {
        const el = new Audio(fuente(clave, notas as Nota[]));
        el.preload = 'auto';
        el.muted = true;
        void el.play().then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
          elementos.set(clave, el);
        }).catch(() => {});
      } catch {
        // si falla, reproducir() lo crea en el momento
      }
    }
    window.removeEventListener('pointerdown', preparar);
    window.removeEventListener('touchstart', preparar);
  };
  window.addEventListener('pointerdown', preparar, { passive: true });
  window.addEventListener('touchstart', preparar, { passive: true });
}

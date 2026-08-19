'use client';

import { useState, useTransition } from 'react';
import {
  descartarObservacion,
  dudarObservacion,
  observacionAActividad,
  seguirObservacion,
} from '@/lib/actions/observaciones';

/**
 * ── LA ESCALA DE RELEVANCIA (06/08) ──────────────────────────────────────────
 *
 * Reemplaza a "me pasa / no me pasa / no sé". Matías: *"más que me pasa o no me
 * pasa… las que son poco relevantes no importa si me pasa o no. Es más
 * importante saber si es relevante o no"*.
 *
 * ⚠️ Y TIENE RAZÓN EN LA CRÍTICA DE FONDO: con la pregunta vieja contestabas si
 * algo era CIERTO, **y esa respuesta no cambiaba nada de lo que la app hacía
 * después**. Se guardaba y listo. Cuánto te importa sí puede cambiar qué sigue
 * mirando.
 *
 * ⚠️ LAS DOS PUNTAS SIGUEN VALIENDO COMO VEREDICTO, y por eso no se pierde nada:
 * "Nada" se guarda como descartada (que no vuelva) y "Mucho" como anotada (la da
 * por buena). El medio queda en duda. Así el Analista sigue recibiendo la señal
 * de si acertó, que es lo que lo hace mejorar.
 *
 * Los colores van de gris a ámbar fuerte, la misma escala del selector de horas
 * de sueño que él eligió: **pegados y del mismo ancho se leen como una escala**,
 * y ahí el color puede significar intensidad en vez de "seleccionado".
 */
/**
 * ⚠️ CUATRO NIVELES, NO CINCO, Y EN EL COLOR DE LA TARJETA (06/08, corrección de
 * Matías: *"si la tarjeta es gris no es lo mejor; lo pondría un tonito más rosa
 * bien claro que vaya aumentando… y dejaría cuatro botones, no cinco"*).
 *
 * ⚠️ EL PRIMER INTENTO USABA UNA ESCALA FIJA DE ÁMBAR, y eso rompía algo que
 * esta tarjeta viene haciendo bien desde el 30/07: **cada relación se pinta con
 * el color de su dominio** —pantalla, sueño, ánimo— y todo adentro es de esa
 * familia. Una escala ámbar en una tarjeta rosa metía un color que no era de
 * nadie, y encima **sobresalía más que la relación misma**.
 * Ahora el nivel es el MISMO color de la tarjeta, de un tinte casi blanco al
 * color pleno: la escala se lee como intensidad y no como cinco cosas distintas.
 *
 * ⚠️ Y SE FUE "ALGO", el del medio. Con cinco, el centro es el cómodo: se toca
 * sin decidir. Con cuatro no hay centro — hay dos que dicen que sí y dos que
 * dicen que no, y hay que elegir de qué lado.
 */
/**
 * ── ⚠️⚠️ VUELVEN LOS TRES VEREDICTOS (11/08) ────────────────────────────────
 *
 * Matías: *"me equivoqué con esto de nada, poco, bastante o mucho"*.
 *
 * ⚠️ **ESTÁ CORRIGIENDO SU PROPIA DECISIÓN DEL 06/08**, y su crítica de entonces
 * seguía siendo cierta: *"las que son poco relevantes no importa si me pasa o
 * no"*. Lo que falló fue la solución — **meter INTERÉS y VERDAD en una sola
 * escala**, con lo cual al tocar "Poco" no se sabía cuál de las dos estabas
 * contestando.
 *
 * Ahora van separadas y cada una a su altura:
 *   · **arriba** (tacho y más) → si te interesa;
 *   · **abajo** (estos tres) → si es cierto.
 *
 * ⚠️ LAS TRES ACCIONES YA EXISTÍAN Y NUNCA SE BORRARON: `dudarObservacion`,
 * `descartarObservacion` y `seguirObservacion` siguieron ahí los cinco días que
 * duró la escala. Volver costó reconectarlas.
 *
 * ── EL ORDEN Y EL COLOR ─────────────────────────────────────────────────────
 *
 * ⚠️ DE MENOS A MÁS, DE IZQUIERDA A DERECHA (pedido suyo: *"en el mundo
 * occidental se lee de izquierda a derecha, el 'no sé' tendría que estar primero
 * y el 'me pasa' al final"*). El color acompaña esa dirección, que es lo que
 * hace que se lea como una fila y no como tres botones sueltos.
 *
 * ⚠️ Y ES EL COLOR DE LA TARJETA, no una escala fija de ámbar. Esa fue la
 * corrección del 06/08 y sigue valiendo: cada relación se pinta con el color de
 * su dominio, y un ámbar en una tarjeta rosa mete un color que no es de nadie.
 */
const VEREDICTOS: { valor: Veredicto; label: string; mezcla: number }[] = [
  { valor: 'duda', label: 'No sé', mezcla: 8 },
  { valor: 'no', label: 'No me pasa', mezcla: 30 },
  { valor: 'si', label: 'Me pasa', mezcla: 82 },
];

type Veredicto = 'duda' | 'no' | 'si';

import type { RelacionLiviana } from '@/lib/relaciones-livianas';

/**
 * Una relación liviana: dos etiquetas, una flecha, la frase y una barrita.
 *
 * Es la MISMA observación que muestra `TarjetaPatron`, contada de otra forma. La
 * diferencia no es cosmética: esta se lee de un vistazo (el par de chips dice de
 * qué se trata sin leer la frase) y no exige una respuesta para tener sentido.
 *
 * ── LAS TRES DECISIONES QUE LA DEFINEN ────────────────────────────────────────
 *
 * 1. **Vidrio tintado en TODA la tarjeta, no una rayita al costado.** La primera
 *    versión tenía un `::before` de 3px a la izquierda y Matías la cortó: pidió
 *    el mismo recurso que usan las tarjetas de Cuerpo. Es el mismo `color-mix`
 *    que `PastillasCuerpo` — y ojo, `color-mix` y NO `${color}44`: los colores
 *    vienen como `var(--color-…)` y pegarle dígitos de opacidad a una variable
 *    da CSS inválido, que el navegador descarta pintando el borde NEGRO.
 *
 * 2. **Barrita, no porcentaje.** Un número exacto suena a medición cuando esto es
 *    una corazonada con pocos datos. Ver `fuerzaDe`.
 *
 * 3. **Lo flojo no pide confirmación.** Sin evidencia suficiente no hay botones:
 *    solo avisa que se está mirando. Preguntar "¿te pasa?" sobre una corazonada
 *    es pedir que la valide, y si dice que sí se vuelve verdad sin haberlo ganado.
 */
export function TarjetaLiviana({ r, evidencia }: { r: RelacionLiviana; evidencia: string }) {
  const [respuesta, setRespuesta] = useState<Veredicto | null>(null);
  const [tirada, setTirada] = useState(false);
  const [guardando, empezar] = useTransition();

  const color = r.lados[0].color;

  function responder(v: Veredicto) {
    setRespuesta(v); // optimista: el toque tiene que sentirse al toque
    empezar(async () => {
      if (v === 'si') await seguirObservacion(r.patron, evidencia);
      else if (v === 'no') await descartarObservacion(r.patron, evidencia);
      else await dudarObservacion(r.patron, evidencia);
    });
  }

  /**
   * ── EL TACHO: "ESTO NO ME INTERESA" ───────────────────────────────────────
   *
   * ⚠️⚠️ HOY GUARDA "descartada", Y ESO NO ES EXACTAMENTE LO QUE DICE EL BOTÓN.
   * Tirar algo por aburrido **no es lo mismo** que decir que es falso, y el
   * Analista solo aprende de lo segundo: con esto, una relación cierta que a él
   * no le importa le llega como "erraste".
   *
   * Se hace igual porque la alternativa —que vuelva mañana— es peor, y separarlo
   * bien pide un estado nuevo en la base (`sin_interes`), que es una decisión de
   * schema que no se toma al pasar. **Queda anotado como lo único de este
   * rediseño que no cierra del todo.**
   */
  function tirar() {
    setTirada(true);
    empezar(async () => {
      await descartarObservacion(r.patron, evidencia);
    });
  }

  /**
   * El "+": convertir esto en algo que probás unos días.
   *
   * ⚠️ NO ES UN BOTÓN NUEVO CON UNA IDEA NUEVA: `observacionAActividad` ya
   * existe y es lo que hacía el viejo "+ probar". Es la única acción de esta
   * tarjeta que **no cierra la conversación** — las otras tres dan un veredicto
   * y esta abre algo.
   */
  function aportar() {
    empezar(async () => {
      await observacionAActividad(r.frase, true);
    });
  }

  if (tirada) return null;

  return (
    <div
      className="mb-2 overflow-hidden tarjeta border"
      style={{
        background: `color-mix(in oklab, ${color} 9%, #fff)`,
        borderColor: `color-mix(in oklab, ${color} 26%, transparent)`,
        boxShadow: `0 4px 18px color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      {/* ── ⚠️ EL TACHO Y EL MÁS, ARRIBA A LA DERECHA (11/08) ────────────────
          Idea suya: *"puede haber un botón de crucecita arriba y un botón de
          más, que el más sea como aportar algo a eso, y después me pasa, no me
          pasa"*. Y después: *"mejor que una cruz, un tacho de basura"* — que es
          más claro, porque una cruz también se lee como "cerrar".

          ⚠️ ARRIBA VA LO QUE DECIDE SI ESTO TE INTERESA; abajo, si es cierto.
          Son dos preguntas distintas y por eso están a distinta altura: meterlas
          en una sola fila las volvería a mezclar, que es exactamente lo que
          falló con la escala del 06/08.

          ⚠️ El rectangulito estándar (radio 9, `iris-soft`) y no una forma
          nueva: es el mismo que ya usan el ícono de la foto y el del reloj. */}
      <div className="mb-2 flex items-start gap-2">
        <div className="flex flex-none gap-[5px] order-2">
          <button
            type="button"
            disabled={guardando}
            onClick={tirar}
            aria-label="No me interesa"
            className="grid size-7 flex-none place-items-center rounded-[9px] bg-iris-soft text-iris-deep disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[14px]">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={aportar}
            aria-label="Probar esto unos días"
            className="grid size-7 flex-none place-items-center rounded-[9px] bg-iris-soft text-iris-deep disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" className="size-[15px]">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

      {/* El par de etiquetas con la flecha: se entiende de qué habla sin leer la
          frase, que es todo el punto de esta vista. */}
      <div className="order-1 flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Chip color={color} dominio={r.lados[0].clave} etiqueta={r.lados[0].etiqueta} />
        {/* ⚠️ ERA EL CARÁCTER "→" Y SE VEÍA ROTO (06/08, Matías: *"la flecha
            está mal, está rota; se está como desfasada la línea"*).
            Dos causas juntas, las dos del hecho de ser TEXTO:
            · en un `flex items-center` se centra la CAJA DE LÍNEA del glifo, no
              el dibujo — el trazo de la flecha cae más arriba que el centro de
              los chips, y eso es el desfase que él vio;
            · `color-mix(… transparent)` la dejaba semitransparente, así que
              encima se veía descolorida contra el fondo tintado.
            Es la misma lección que el `↻` de "Tu semana" hace dos horas: **si un
            símbolo tiene que alinearse con algo, es un SVG, no una letra.** */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[13px] flex-none"
          style={{ color: `color-mix(in oklab, ${color} 65%, #fff)` }}
          aria-hidden="true"
        >
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
        <Chip color={color} dominio={r.lados[1].clave} etiqueta={r.lados[1].etiqueta} />
        </div>
      </div>

      {/* ⚠️ SIN `text-pretty` (06/08). Matías lo describió sin nombrarlo: *"las
          tarjetitas, algunas no llegan tanto al borde… creo que en algunas
          entran más palabras, no sé qué pasa"*. Es exactamente lo que hace
          `text-wrap: pretty`: equilibra los renglones para que el último no
          quede corto, y para lograrlo **acorta los de arriba** — por eso una
          tarjeta llega al borde y la de al lado no, sin ninguna diferencia en el
          CSS. En una frase de dos o tres renglones el equilibrio no se nota y el
          margen fantasma sí. */}
      <p className="mb-2.5 text-[14px] leading-[1.42] text-tinta">{r.frase}</p>

      <div className="h-[5px] overflow-hidden rounded-[3px] bg-white/75">
        <div className="h-full rounded-[3px]" style={{ width: `${r.fuerza.ancho}%`, background: color }} />
      </div>
      <p className="mt-[7px] font-mono text-[10.5px] text-tinta-soft opacity-80">{r.fuerza.texto}</p>

      {respuesta ? (
        <p className="mt-2.5 font-mono text-[10.5px] font-semibold text-tinta-soft">
          {respuesta === 'no' ? 'Listo, no vuelve.' : respuesta === 'duda' ? 'Te la traigo más adelante.' : 'Anotado.'}
        </p>
      ) : (
        // ⚠️ SIN PREGUNTA ARRIBA DE LOS BOTONES (11/08). Estaba "¿Cuán relevante
        // es para vos?", que hacía falta cuando los botones eran una escala
        // abstracta. Con "No sé / No me pasa / Me pasa" **la pregunta ya está en
        // los botones**, y repetirla es el tipo de texto que él sacó: *"no hay
        // que describir todo"*.
        r.fuerza.pideConfirmacion && (
          <div className="mt-2.5 flex gap-[3px]" role="group" aria-label="¿Te pasa?">
            {VEREDICTOS.map((v) => (
              <button
                key={v.valor}
                type="button"
                disabled={guardando}
                onClick={() => responder(v.valor)}
                className="min-w-0 flex-1 rounded-[8px] py-[7px] font-mono text-[10.5px] font-bold transition-colors disabled:opacity-60"
                style={{
                  background: `color-mix(in oklab, ${color} ${v.mezcla}%, #fff)`,
                  // Arriba del 50% de color el fondo se pone oscuro y el texto
                  // tiene que dar la vuelta, o no se lee.
                  color: v.mezcla > 50 ? '#fff' : `color-mix(in oklab, ${color} 80%, #000)`,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

/** Cada etiqueta con SU ícono: se entiende sin leer. */
function Chip({ color, dominio, etiqueta }: { color: string; dominio: string; etiqueta: string }) {
  return (
    <span className="flex items-center gap-[5px] rounded-[8px] border border-iris-borde bg-white px-[9px] py-1 font-mono text-[10.5px] font-bold text-tinta-soft">
      <span style={{ color }}>{GLIFOS[dominio] ?? GLIFOS.otro}</span>
      {etiqueta}
    </span>
  );
}

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
    {d}
  </svg>
);

// Un glifo por dominio. Los que ya existen en la app se repiten a propósito (la
// luna de Cuerpo, el rayo de energía): que la etiqueta use el MISMO dibujo que la
// sección de donde sale el dato es lo que hace que se entienda sin leyenda.
const GLIFOS: Record<string, React.ReactNode> = {
  pantalla: svg(
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>,
  ),
  siesta: svg(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />),
  sueno: svg(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />),
  animo: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15c1 1 2 1.4 3.5 1.4s2.5-.4 3.5-1.4M9 9.5h.01M15 9.5h.01" />
    </>,
  ),
  energia: svg(<path d="M13 2.5L4.5 13.5H11l-.5 8L19 10.5h-6.5z" />),
  libido: svg(<path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3z" />),
  comida: svg(
    <>
      <path d="M4 5h16v14l-2.5-1.5L15 19l-3-1.5L9 19l-2.5-1.5L4 19z" />
      <path d="M8 9h8M8 12.5h5" />
    </>,
  ),
  gasto: svg(
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M2.5 10.5h19" />
    </>,
  ),
  actividad: svg(<path d="M9 11l3 3L21 5M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />),
  trabajo: svg(
    <>
      <rect x="2.5" y="7" width="19" height="13" rx="2.5" />
      <path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7" />
    </>,
  ),
  social: svg(
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 20c1.1-3.2 3.2-4.8 6-4.8s4.9 1.6 6 4.8" />
      <path d="M16 12.4c2.5-.4 4.5 1 5.5 3.6" />
    </>,
  ),
  otro: svg(<circle cx="12" cy="12" r="7.5" />),
};

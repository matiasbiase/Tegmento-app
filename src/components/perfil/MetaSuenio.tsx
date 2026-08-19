'use client';

import { useState, useTransition } from 'react';
import { guardarMetaSuenio } from '@/lib/actions/perfil';

// Cuánto querés dormir. Antes el anillo de "Hoy" se llenaba contra 8h fijas:
// te medía contra un número que no elegiste vos, y si dormís bien con 7 no
// cerraba nunca. Pedido de Matías.

const OPCIONES = [360, 390, 420, 450, 480, 510, 540, 570]; // 6h → 9h30, de a media hora

/**
 * ⚠️ EL RANGO RECOMENDADO ES EL ESTÁNDAR ADULTO (7 a 9 horas), NO UN CÁLCULO
 * SOBRE SUS DATOS. Está dicho acá porque es fácil confundirlo: la app no sabe
 * todavía cuánto le sirve a él dormir. Cuando haya suficientes noches cargadas
 * con su calidad al lado, esto se puede reemplazar por su propio número — y ahí
 * el sombreado pasa a significar otra cosa, mucho más fuerte.
 */
const RECOMENDADO = { desde: 420, hasta: 540 };

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

export function MetaSuenio({ inicial }: { inicial: number }) {
  const [meta, setMeta] = useState(inicial);
  const [guardando, empezar] = useTransition();

  function elegir(v: number) {
    setMeta(v);
    empezar(async () => {
      await guardarMetaSuenio(v);
    });
  }

  return (
    // Sin título de sección propio (27/07, Matías): "cuánto querés dormir" es
    // algo que está ADENTRO de sueño, no una sección al mismo nivel que
    // Descanso. Con TituloSeccion (serif 19) competía con el título de arriba y
    // parecía otra pantalla. Ahora es un rótulo chico dentro de su tarjeta, con
    // la explicación en gris para que no peleen entre sí.
    <div>
      <div className="tarjeta bg-white sombra-card">
        <h3 className="font-serif text-[15px] font-semibold tracking-[-0.1px] text-tinta">Cuánto querés dormir</h3>
        {/* ⚠️ ESTE TEXTO DECÍA *"poné lo que a vos te deja bien, no lo que dice
            internet"*, y con el sombreado nuevo la pantalla se contradecía sola:
            marcaba un rango recomendado mientras el renglón de abajo decía que no
            le hicieras caso a las recomendaciones. Ahora dice las dos cosas sin
            pelearse — el sombreado orienta, la última palabra sigue siendo suya. */}
        <p className="mb-3 mt-1 text-[12.5px] leading-relaxed text-niebla text-pretty">
          Es contra esto que se llena el anillo de Sueño. Lo sombreado es lo que le sirve a la mayoría, pero el que sabe
          cómo dormís sos vos: elegí el tuyo aunque quede afuera.
        </p>

        {/* ── LA TIRA DE HORAS (05/08) ──────────────────────────────────────
            ⚠️ ANTES ERAN PASTILLAS SUELTAS y él las cortó: *"no me gusta esa
            forma de tocar un botoncito ocho, seis, sino que vos tenés que elegir
            cuánto querés dormir, y recomendarlo como en colorcitos más fuertes
            las horas que son las mejores"*.
            Pegadas y del mismo ancho se leen como **una escala** —de menos a
            más sueño— y ahí el sombreado puede decir algo: el bloque oscuro del
            medio es el rango bueno. Sueltas eran seis opciones sin orden
            aparente, y un color más fuerte en una de ellas habría parecido
            "seleccionada" en vez de "recomendada". */}
        <div className="flex gap-[3px]" role="group" aria-label="Cuánto querés dormir">
          {OPCIONES.map((v) => {
            const on = v === meta;
            const bueno = v >= RECOMENDADO.desde && v <= RECOMENDADO.hasta;
            return (
              <button
                key={v}
                type="button"
                onClick={() => elegir(v)}
                disabled={guardando}
                aria-pressed={on}
                aria-label={`${fmt(v)}${bueno ? ', recomendado' : ''}`}
                className={`h-12 min-w-0 flex-1 rounded-[9px] font-mono text-[12px] font-semibold transition-colors disabled:opacity-60 ${
                  on
                    ? 'text-white'
                    : bueno
                      ? 'text-[#0f6e56]'
                      : 'text-niebla'
                }`}
                style={{
                  // Elegida: el iris de siempre, que es "esto es tuyo".
                  // Recomendada: verde tinte, el color con el que el sueño ya se
                  // pinta en el resto de la app.
                  // Fuera del rango: apenas un gris, que no es un "no".
                  background: on
                    ? 'var(--color-iris)'
                    : bueno
                      ? 'color-mix(in oklab, var(--color-verde) 22%, #fff)'
                      : 'var(--color-gris-tint)',
                }}
              >
                {fmt(v)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

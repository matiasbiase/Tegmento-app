'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraficoSenales } from '@/components/cuerpo/GraficoSenales';
import { registrarSenalCuerpo } from '@/lib/actions/cuerpo';
import type { PuntoSenal } from '@/lib/cuerpo';
import { GLIFO_PULSO } from '@/components/ui/glifos';

/**
 * ⚠️ LOS MISMOS DIBUJOS QUE TENÍAN CUANDO ERAN DOS PASTILLAS (06/08, Matías:
 * *"los dos tenían íconos separados, ya no están; que aparezcan los íconos en
 * libido y energía"*). Al unirlas en un botón se perdieron los dos, y con dos
 * rosas casi iguales el ícono era lo ÚNICO que quedaba para distinguirlas.
 * El pulso sale de `glifos.tsx`; la carita de satisfacción es la misma de la
 * pastilla vieja (29/07: antes era una gota y se leía como agua o lágrima).
 */
const GLIFO_LIBIDO = (
  <>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M7.6 10.6c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9M13.2 10.6c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9" strokeWidth="1.5" />
    <path d="M8.4 14.2a4.6 4.6 0 0 0 7.2 0" strokeWidth="1.6" />
  </>
);

// Cuerpo ahora MUESTRA cómo venís (el gráfico) en vez de ser el formulario. Se
// carga desde la Casa, pero si estás acá y todavía no lo hiciste hoy, dejamos un
// acceso directo a la misma hoja, así no tenés que volver al inicio.
export function SenalesPanel({
  energia,
  libido,
  nivelEnergia,
  nivelLibido,
}: {
  energia: PuntoSenal[];
  libido: PuntoSenal[];
  /** El 1-5 de hoy, para dejar la barra pintada como la dejaste. */
  nivelEnergia?: number | null;
  nivelLibido?: number | null;
}) {

  return (
    <div className="flex flex-col gap-3">
      <GraficoSenales energia={energia} libido={libido} />

      {/* ── LAS DOS BARRAS, ADENTRO DEL PANEL (06/08) ─────────────────────────
          Matías: *"haría un titulito que diga energía con su ícono, y abajo la
          barrita esta para llenar de cuánta energía tenés, y abajo líbido
          también con su ícono y también la barrita"*.

          ⚠️ ANTES ERAN DOS BOTONES QUE ABRÍAN UNA HOJA. La barra ya existía —es
          la misma de `HojaRegistro`— pero vivía detrás de dos toques: abrir la
          hoja, tocar el nivel, esperar que se cierre. Acá se toca el nivel y
          listo. **Una barra de cinco cuadraditos ocupa lo mismo que el botón que
          la escondía**, así que el botón solo agregaba un paso.

          La hoja sigue existiendo y se usa desde el Home: esto no la reemplaza,
          la saltea cuando ya estás parado en Cuerpo. */}
      <BarraSenal
        tipo="energia"
        nombre="Energía"
        ayuda="¿Con cuánta pila andás?"
        color="var(--color-anillo-cuerpo)"
        glifo={GLIFO_PULSO}
        inicial={nivelEnergia ?? null}
      />
      <BarraSenal
        tipo="libido"
        nombre="Libido"
        ayuda="¿Cómo viene el deseo?"
        color="var(--color-rosa)"
        glifo={GLIFO_LIBIDO}
        inicial={nivelLibido ?? null}
      />
    </div>
  );
}

/**
 * Un título con su ícono y la barra de 1 a 5 abajo.
 *
 * ⚠️ GUARDA AL TOCAR, SIN BOTÓN DE CONFIRMAR. Es un dato de una sola cifra que
 * se puede corregir tocando otro cuadradito: pedir un "guardar" arriba de eso
 * sería un formulario para elegir un número. El `router.refresh()` actualiza el
 * aro de arriba, que es la confirmación de verdad — se ve moverse.
 */
function BarraSenal({
  tipo,
  nombre,
  ayuda,
  color,
  glifo,
  inicial,
}: {
  tipo: 'energia' | 'libido';
  nombre: string;
  ayuda: string;
  color: string;
  glifo: React.ReactNode;
  inicial: number | null;
}) {
  const router = useRouter();
  const [valor, setValor] = useState<number | null>(inicial);
  const [guardando, empezar] = useTransition();

  function elegir(n: number) {
    setValor(n); // optimista: el cuadradito pinta al toque
    empezar(async () => {
      await registrarSenalCuerpo(tipo, n);
      router.refresh();
    });
  }

  return (
    <div>
      {/* ⚠️ LA PREGUNTA VA DEBAJO DEL TÍTULO, NO AL COSTADO (06/08, Matías:
          *"energía, y abajo 'con cuánta pila andás', de uno al cinco"*). Al
          costado y en 10px se leía como una etiqueta de metadato; abajo y en su
          renglón es lo que es: **la pregunta que estás contestando al tocar la
          barra**. Sin ella, cinco cuadraditos no dicen de qué van del 1 al 5. */}
      <div className="mb-0.5 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[17px] flex-none"
          style={{ color }}
          aria-hidden="true"
        >
          {glifo}
        </svg>
        <span className="text-[14.5px] font-semibold text-tinta">{nombre}</span>
      </div>
      <p className="mb-2 text-[12.5px] leading-snug text-niebla">{ayuda}</p>
      <div className="flex gap-1.5" role="group" aria-label={nombre}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = valor != null && n <= valor;
          return (
            <button
              key={n}
              type="button"
              onClick={() => elegir(n)}
              disabled={guardando}
              aria-label={`${nombre} ${n} de 5`}
              aria-pressed={on}
              className="h-8 flex-1 rounded-[8px] border transition-colors disabled:opacity-70"
              style={{
                background: on ? color : 'var(--color-papel-2)',
                borderColor: on ? color : 'rgba(108,120,238,.14)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

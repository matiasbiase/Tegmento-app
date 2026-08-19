'use client';

import Link from 'next/link';
import { etiquetaFecha } from '@/lib/fechas';
import { ymd } from '@/lib/marcas';

/**
 * ⚠️ ESTA PANTALLA DICE LO QUE SABE Y NOMBRA LO QUE NO. Matías pidió seguir
 * proteína y cruzar lo que entra con lo que gastás en las actividades. Hoy la
 * comida se guarda como texto, así que **no hay ningún gramo que sumar**. En vez
 * de inventar un número —la regla que más veces se repitió en este proyecto— la
 * pantalla lo dice en una línea y muestra lo que sí es cierto.
 */

type Comida = { id: number; que: string; creado: string };
type Energia = { valor: number; creado: string };

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function AlimentacionUI({
  comidas,
  energia,
  hayPlan = false,
}: {
  comidas: Comida[];
  energia: Energia[];
  /** Si hay un plan cargado, `PlanAlimentacion` ya dibujó la cabecera y la semana. */
  hayPlan?: boolean;
}) {
  const hoy = new Date();
  // Los últimos siete días, del más viejo al de hoy.
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - i));
    const f = ymd(d);
    return { fecha: f, letra: DIAS[d.getDay()], cuantas: comidas.filter((c) => c.creado.slice(0, 10) === f).length };
  });

  const diasConRegistro = semana.filter((d) => d.cuantas > 0).length;
  const maximo = Math.max(1, ...semana.map((d) => d.cuantas));

  return (
    <div>
      {/* ⚠️ CON PLAN CARGADO, ESTAS DOS TARJETAS NO VAN (04/08). No es por
          espacio: la maqueta avisó que Alimentación con plan tiene dos listas
          diciendo cosas parecidas. "4 de los últimos 7 días con algo anotado" y
          "cómo venís con el plan" son dos formas de la misma pregunta, y la
          segunda es más precisa — cuenta contra algo. Sin plan siguen siendo lo
          único que hay, así que se muestran. */}
      {!hayPlan && (
        <div
          className="mb-4 overflow-hidden rounded-[20px] border border-iris-borde p-[16px_16px_18px] text-white"
          style={{ background: 'linear-gradient(150deg,#2f7f68,#3d9b80 55%,#5bb598)' }}
        >
          <p className="font-mono text-[10.5px] font-bold tracking-[0.2px] opacity-85">Alimentación</p>
          <h2 className="mt-1 font-serif text-[24px] font-bold leading-[1.1] tracking-[-0.02em]">
            {diasConRegistro} de los últimos 7 días
          </h2>
          <p className="mt-1.5 text-[12.5px] opacity-90">
            {diasConRegistro === 0 ? 'Todavía no anotaste nada esta semana.' : 'Días en los que anotaste algo.'}
          </p>
        </div>
      )}

      {!hayPlan && (
      <div className="mb-3 tarjeta border border-iris-borde bg-white">
        <p className="mb-2.5 text-[13px] font-bold text-tinta">La semana</p>
        <div className="flex h-[62px] items-end gap-[5px]">
          {semana.map((d) => (
            <div
              key={d.fecha}
              className="flex-1 rounded-[4px]"
              style={{
                height: `${Math.max(8, (d.cuantas / maximo) * 100)}%`,
                background: d.cuantas > 0 ? `oklch(0.58 0.10 165 / ${0.35 + (d.cuantas / maximo) * 0.55})` : 'var(--color-verde-tint)',
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-[5px]">
          {semana.map((d) => (
            <span key={d.fecha} className="flex-1 text-center font-mono text-[9.5px] text-niebla-2">
              {d.letra}
            </span>
          ))}
        </div>
      </div>
      )}

      {/* ⚠️ LO QUE FALTA, DICHO. Prometer proteína sin poder calcularla sería
          exactamente el número inventado que la app tiene prohibido. */}
      <div className="mb-3 tarjeta border border-dashed border-niebla-2 bg-white/60">
        <p className="text-[13px] font-bold text-tinta">Todavía no puedo contar proteína</p>
        <p className="mt-1 text-[12.5px] leading-[1.45] text-niebla text-pretty">
          Guardo lo que comés como texto, así que no tengo gramos que sumar. Cuando estime cada comida
          al registrarla, vas a poder ponerte un objetivo y cruzarlo con lo que gastás entrenando.
        </p>
      </div>

      {energia.length >= 3 && (
        <div className="mb-3 rounded-[16px] border border-iris-borde bg-white p-[14px_16px]">
          <p className="mb-1.5 text-[13px] font-bold text-tinta">Lo que se cruza</p>
          <p className="border-l-[3px] border-verde pl-2.5 text-[12.5px] leading-[1.45] text-tinta-soft text-pretty">
            El Analista cruza lo que comés con tu energía y tu sueño una vez por semana. Lo que encuentre
            aparece en <Link href="/cosas-chicas" className="font-semibold text-iris-deep">Relaciones</Link>.
          </p>
        </div>
      )}

      <div className="tarjeta border border-iris-borde bg-white">
        {/* ⚠️ CON PLAN SE LLAMA "ADEMÁS COMISTE", Y SIN ROJO (maqueta del 04/08).
            Lo que comés fuera del plan es un hecho, no una falta: un color de
            alarma acá convertiría Alimentación en la app de dieta con culpa, que
            es lo que este proyecto decidió no ser en ningún lado. */}
        <p className="mb-2 text-[13px] font-bold text-tinta">
          {hayPlan ? 'Además comiste' : 'Lo último que anotaste'}
        </p>
        {hayPlan && comidas.length > 0 && (
          <p className="mb-2 text-[11.5px] leading-[1.4] text-niebla text-pretty">
            Se anota igual. El plan es una guía, no un examen.
          </p>
        )}
        {comidas.length === 0 ? (
          <p className="text-[12.5px] leading-[1.45] text-niebla text-pretty">
            Contale al chat qué comiste y te lo guarda de un toque. También podés sacarle una foto.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comidas.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-baseline gap-2 border-b border-[#f1f0f7] pb-2 last:border-none last:pb-0">
                <span className="min-w-0 flex-1 text-[13.5px] leading-[1.35] text-tinta">{c.que}</span>
                <span className="flex-none font-mono text-[10px] text-niebla-2">{etiquetaFecha(c.creado)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

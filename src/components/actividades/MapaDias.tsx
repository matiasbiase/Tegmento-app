'use client';

import { type DiaMapa } from '@/lib/marcas';

// El mapa de días: cinco semanas de cuadraditos, como el tablero de uso de
// Claude o el de GitHub (referencia de Matías). Reemplaza a la fila de 7 días,
// que solo dejaba ver la semana y no contaba ninguna historia.
//
// ── Las tres decisiones ──────────────────────────────────────────────────────
//
// 1. LA RACHA ES LO QUE BRILLA, no el total. Un día suelto se pinta liso; los
//    días de la racha viva laten. Decisión de Matías, y es la correcta: premia
//    SOSTENER, que es lo que cuesta, en vez de premiar un puntaje acumulado.
//
// 2. LOS DÍAS QUE NO PASARON VAN VACÍOS, no "sin hacer". La diferencia entre un
//    dato y un reproche: el jueves que viene no lo fallaste.
//
// 3. Se sigue pintando solo hoy y ayer. Los demás cuadraditos son de lectura,
//    igual que antes: si se pudiera rellenar el mes de memoria, el dato deja de
//    servirle al Analista para cruzar con el ánimo.

export function MapaDias({
  semanas,
  pintadas,
  diasRacha,
  onTocar,
  color = 'var(--color-verde)',
}: {
  semanas: DiaMapa[][];
  pintadas: Set<string>;
  /** Las fechas de la racha viva: son las que se encienden. */
  diasRacha: Set<string>;
  onTocar: (d: DiaMapa, e: React.MouseEvent) => void;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      {semanas.map((semana, i) => (
        <div key={i} className="grid grid-cols-7 gap-[5px]">
          {semana.map((d) => {
            const on = pintadas.has(d.fecha);
            const enRacha = on && diasRacha.has(d.fecha);
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={(e) => onTocar(d, e)}
                disabled={!d.editable}
                aria-label={`${d.fecha}${on ? ', hecho' : ''}${d.futuro ? ', todavía no pasó' : ''}`}
                aria-pressed={on}
                className={`aspect-square rounded-[7px] transition-colors ${
                  enRacha ? 'dia-racha' : ''
                } ${
                  d.editable ? 'active:opacity-70' : 'cursor-default'
                }`}
                style={{
                  // Va por style y no por clase: el color llega por prop.
                  background: on ? color : d.futuro ? 'transparent' : 'var(--color-gris-tint-2)',
                  border: d.futuro ? '1px dashed var(--color-niebla-2)' : '1px solid transparent',
                  // "Hoy" va con outline y NO con box-shadow: la animación de la
                  // racha también escribe box-shadow y se lo comía justo el día
                  // que más importa (hoy suele ser parte de la racha).
                  outline: d.esHoy ? '2px solid var(--color-iris)' : undefined,
                  outlineOffset: d.esHoy ? '-2px' : undefined,
                  opacity: d.futuro ? 0.45 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

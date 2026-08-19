'use client';

import { montoConSimbolo } from '@/lib/moneda';
import { comparacionMesCerrado, hayTendencia, type MesGasto } from '@/lib/grafico-gastos';

/**
 * EL GRÁFICO GRANDE ARRIBA DE FINANZAS (pedido 1.11, del 31/07).
 *
 * ⚠️ REUSA LA TARJETA DE `GraficoSenales` A PROPÓSITO, y eso estaba en el
 * pedido con todas las letras: *"tipo los gráficos que hay de libido en
 * Cuerpo"*. Mismo alto, mismo header, mismas guías, mismo vacío que explica qué
 * hacer. **No hay un formato nuevo que aprender**: si ya entendiste Cuerpo,
 * entendiste esto.
 *
 * Barras y no línea por una diferencia real, no estética: la energía es un
 * estado que existe todo el tiempo y unir dos puntos con una recta dice algo
 * cierto sobre el medio. La plata de un mes es una suma cerrada — entre julio y
 * agosto no hay un "punto intermedio" que la línea pueda afirmar.
 */

const H = 96;

export function GraficoGastos({ meses, moneda }: { meses: MesGasto[]; moneda: string | null }) {
  const conDato = hayTendencia(meses);
  const comp = comparacionMesCerrado(meses);
  const tope = Math.max(...meses.map((m) => m.total), 0);

  return (
    <div className="mb-4 tarjeta bg-white shadow-[0_4px_18px_rgba(50,50,90,.05)]">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-tinta">Lo que gastás</span>
        <span className="font-mono text-[11px] text-niebla">últimos {meses.length} meses</span>
      </div>

      {!conDato ? (
        /* ⚠️ SIN DOS MESES NO SE DIBUJA NADA. Una sola barra no se compara
           contra nada y sugiere una forma que nadie midió. Y el vacío dice qué
           hacer, que es lo que hace `GraficoSenales`. */
        <p className="py-3 text-[13px] leading-snug text-niebla text-pretty">
          Todavía no hay dos meses cargados para comparar. Anotá gastos acá abajo o contámelos en
          el chat (“gasté 40 en el súper”) y en cuanto haya dos, esto se dibuja.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-1.5" style={{ height: H }}>
            {meses.map((m) => {
              // Un mes sin nada anotado NO es un mes de cero gasto. Se dibuja
              // como hueco, no como barra al ras, porque son cosas distintas.
              const vacio = m.cuantos === 0;
              const alto = tope > 0 ? Math.max(2, Math.round((m.total / tope) * (H - 18))) : 2;
              return (
                <div key={m.ym} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  {vacio ? (
                    <div
                      className="w-full rounded-[5px] border border-dashed border-gris-tint-2"
                      style={{ height: 10 }}
                      aria-label={`${m.etiqueta}: sin nada anotado`}
                    />
                  ) : (
                    <div
                      className="w-full rounded-[5px]"
                      style={{ height: alto, background: 'linear-gradient(180deg,#cf9243,#b5762a)' }}
                      aria-label={`${m.etiqueta}: ${montoConSimbolo(m.total, moneda)}`}
                    />
                  )}
                  <span className="font-mono text-[10.5px] text-niebla">{m.etiqueta}</span>
                </div>
              );
            })}
          </div>

          {/* ⚠️ EL RENGLÓN DE ABAJO ES UN HECHO, NO UNA EVALUACIÓN. Dice cuánto
              cambió, no si estuvo bien. "Gastaste 120 más" describe la cosa;
              "te fuiste de mano" te juzga a vos, y esa es la regla de la casa
              (*"está frío" vs "estás haciendo poco"*). Por eso tampoco hay
              flechitas verdes ni rojas: el color ya sería un veredicto. */}
          {comp && (
            <p className="mt-2.5 text-[12.5px] leading-snug text-niebla text-pretty">
              En {comp.etiqueta} gastaste{' '}
              <b className="text-tinta">{montoConSimbolo(comp.total, moneda)}</b>
              {comp.diferencia === 0 ? (
                <>, lo mismo que el mes anterior.</>
              ) : (
                <>
                  , {montoConSimbolo(Math.abs(comp.diferencia), moneda)}{' '}
                  {comp.diferencia > 0 ? 'más' : 'menos'} que el mes anterior.
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

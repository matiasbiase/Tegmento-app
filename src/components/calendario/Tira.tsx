'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { moodDe } from '@/lib/animo';
import { COLOR_CATEGORIA } from '@/lib/dia';
import { indiceDeHoy, type DiaTira } from '@/lib/tira';
import type { MarcaDia } from '@/components/calendario/CalendarioUI';

/**
 * LA TIRA: EL CALENDARIO DEJÓ DE SER UN CALENDARIO (06/08, pedido de Matías).
 *
 * *"Yo sacaría el calendario… calendario tenés en todos lados, para qué vamos a
 * hacer un calendario igual que los otros."* Reemplaza a `GrillaMes`. Es el
 * pedido C.10, aprobado sobre la maqueta del 06/08.
 *
 * ── LO QUE HACE, Y POR QUÉ CADA COSA ────────────────────────────────────────
 *
 * ⚠️ **EL DEL CENTRO SE VE GRANDE Y LOS DEMÁS SE ACHICAN.** Matías: *"lo que vas
 * viendo arriba se ve grande… casi como una ruleta, pero que no se vea la
 * ruleta, o sea que se vea una parte nomás de lo que sigue"*. Por eso no hay
 * perspectiva 3D ni curvatura falsa: se achica y se aclara parejo, y el
 * degradé de arriba y abajo deja ver apenas lo que viene.
 *
 * ⚠️ **EL DEL CENTRO DICE MÁS, NO SOLO MÁS FUERTE.** Solo el enfocado abre su
 * segunda línea. Es lo que hace que el foco signifique algo: si únicamente
 * cambiara la tipografía, sería el mismo renglón en negrita.
 *
 * ⚠️ **EL HILO PASA POR DETRÁS DE LOS PUNTOS Y SE CURVA CON ELLOS.** No es una
 * curva dibujada aparte: se mide dónde quedó CADA punto después de la
 * deformación y se pasa un trazo por esas posiciones reales. Por eso sigue
 * calzando aunque cambien las alturas de los renglones.
 *
 * ⚠️ **LOS PUNTOS NO SE DESVANECEN.** Matías: *"algunos puntos son transparentes,
 * esos tienen que ser completamente de color, porque si no se ve la línea pasar
 * por debajo"*. La opacidad se aplica a la fecha y al texto (`.tira-fade`) y
 * **nunca al punto**: si se le baja al punto, el hilo se le ve por adentro y el
 * dibujo se rompe. El aro del color del fondo es lo que corta el hilo alrededor.
 *
 * ⚠️ **EL CORRIMIENTO ES CUADRÁTICO** (`d²`), no lineal: plano en el centro y
 * acelerando hacia los bordes, que es como se curva algo de verdad. Lineal daba
 * una diagonal, no una curva.
 */

const MESES_LARGO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOW_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const CORAL = '#d1567a';

/**
 * ⚠️ SE PARSEA A MANO Y SE LEE EN UTC. `new Date('2026-08-06')` se interpreta
 * como medianoche UTC y en cualquier huso al oeste devuelve el día ANTERIOR:
 * el renglón diría "05 mié" arriba de un detalle del 06. Armando la fecha con
 * `Date.UTC` y leyendo con `getUTCDay`, el día es el que dice la clave.
 */
function partesDeClave(clave: string) {
  const [y, m, d] = clave.split('-').map(Number);
  return { anio: y, mes: m - 1, dia: d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function Tira({
  dias,
  hoy,
  marcas,
  onDia,
}: {
  dias: DiaTira[];
  hoy: string;
  marcas: Record<string, MarcaDia>;
  /** Qué día quedó en el centro. El detalle de abajo lo dibuja la pantalla. */
  onDia: (clave: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pedido = useRef(false);
  // El foco vive en un ref además del estado: `pintar` corre en cada cuadro de
  // scroll y no puede depender de que React ya haya re-renderizado.
  const focoRef = useRef<string | null>(null);
  const [foco, setFoco] = useState<string | null>(dias[indiceDeHoy(dias, hoy)]?.clave ?? null);
  const [modo, setModo] = useState<'mes' | 'ano'>('mes');

  const color = useCallback(
    (d: DiaTira) => {
      const marca = marcas[d.clave];
      if (marca?.ciclo) return CORAL;
      if (d.categoria === 'animo' && marca?.mood) return moodDe(marca.mood)?.color ?? COLOR_CATEGORIA.animo;
      return COLOR_CATEGORIA[d.categoria];
    },
    [marcas],
  );

  /** Los saltos: un chip por mes (o por año) que exista en la tira, sin repetir. */
  const saltos = useMemo(() => {
    const vistos = new Set<string>();
    const out: { clave: string; anio: number; mes: number; txt: string }[] = [];
    for (const d of dias) {
      const p = partesDeClave(d.clave);
      const k = modo === 'mes' ? `${p.anio}-${p.mes}` : String(p.anio);
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ clave: d.clave, anio: p.anio, mes: p.mes, txt: modo === 'mes' ? MESES_CORTO[p.mes] : String(p.anio) });
    }
    return out;
  }, [dias, modo]);

  const pintar = useCallback(() => {
    const cont = scroller.current;
    const wrap = marco.current;
    if (!cont || !wrap) return;
    const caja = cont.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const centro = caja.top + caja.height / 2;
    const items = Array.from(cont.querySelectorAll<HTMLElement>('[data-clave]'));

    let mejor: HTMLElement | null = null;
    let mejorD = Infinity;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - centro);
      if (dist < mejorD) {
        mejorD = dist;
        mejor = el;
      }
    }

    const pts: { x: number; y: number }[] = [];
    for (const el of items) {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - centro);
      const d = Math.min(1, dist / (caja.height / 2));
      const esFoco = el === mejor;

      el.style.transform = `translateX(-${(d * d * 26).toFixed(1)}px) scale(${(1 - 0.24 * d).toFixed(3)})`;
      // ⚠️ La opacidad va acá y NO en el renglón entero: el punto tiene que
      // quedar macizo o se le ve el hilo por adentro.
      for (const f of Array.from(el.querySelectorAll<HTMLElement>('.tira-fade'))) {
        f.style.opacity = (1 - 0.66 * d).toFixed(3);
      }
      const extra = el.querySelector<HTMLElement>('.tira-extra');
      if (extra) {
        extra.style.maxHeight = esFoco ? '60px' : '0';
        extra.style.opacity = esFoco ? '1' : '0';
        extra.style.marginTop = esFoco ? '3px' : '0';
      }
      const titulo = el.querySelector<HTMLElement>('.tira-titulo');
      if (titulo) {
        titulo.style.fontWeight = esFoco ? '600' : '400';
        titulo.style.fontSize = esFoco ? '15.5px' : '14px';
      }
      const punto = el.querySelector<HTMLElement>('.tira-punto');
      if (punto) {
        const p = punto.getBoundingClientRect();
        if (p.width > 0 && p.bottom > w.top - 60 && p.top < w.bottom + 60) {
          pts.push({ x: p.left + p.width / 2 - w.left, y: p.top + p.height / 2 - w.top });
        }
      }
    }

    // El hilo: una curva suave que pasa por los puntos medidos.
    pts.sort((a, b) => a.y - b.y);
    let d = '';
    if (pts.length > 1) {
      const a = pts[0], b = pts[1];
      const u = pts[pts.length - 1], v = pts[pts.length - 2];
      // Se estira más allá del primero y del último para que no arranque ni
      // termine en seco justo donde el degradé todavía deja ver.
      pts.unshift({ x: a.x + (a.x - b.x) * 1.1, y: -18 });
      pts.push({ x: u.x + (u.x - v.x) * 1.1, y: w.height + 18 });
      d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      const fin = pts[pts.length - 1];
      d += ` L${fin.x.toFixed(1)} ${fin.y.toFixed(1)}`;
    }
    if (svg.current) svg.current.firstElementChild?.setAttribute('d', d);

    const clave = mejor?.dataset.clave ?? null;
    if (clave && clave !== focoRef.current) {
      focoRef.current = clave;
      setFoco(clave);
      onDia(clave);
    }
  }, [onDia]);

  // Arranca en hoy (o en el día más cercano) y pinta la primera vez.
  useEffect(() => {
    const cont = scroller.current;
    if (!cont || dias.length === 0) return;
    const el = cont.querySelector<HTMLElement>(`[data-i="${indiceDeHoy(dias, hoy)}"]`);
    if (el) cont.scrollTop = el.offsetTop + el.offsetHeight / 2 - cont.clientHeight / 2;
    pintar();
    // Un segundo pase después del layout: las fuentes cambian las alturas y sin
    // esto el primer dibujo queda calculado con medidas viejas.
    const t = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(t);
  }, [dias, hoy, pintar]);

  function alScrollear() {
    if (pedido.current) return;
    pedido.current = true;
    requestAnimationFrame(() => {
      pintar();
      pedido.current = false;
    });
  }

  function saltar(anio: number, mes: number | null) {
    const cont = scroller.current;
    if (!cont) return;
    const i = dias.findIndex((d) => {
      const p = partesDeClave(d.clave);
      return p.anio === anio && (mes === null || p.mes === mes);
    });
    if (i < 0) return;
    const el = cont.querySelector<HTMLElement>(`[data-i="${i}"]`);
    if (el) cont.scrollTo({ top: el.offsetTop + el.offsetHeight / 2 - cont.clientHeight / 2, behavior: 'smooth' });
  }

  if (dias.length === 0) {
    return (
      <p className="tarjeta bg-white text-[13px] leading-relaxed text-niebla text-pretty sombra-card">
        Todavía no hay nada en la tira. En cuanto anotes algo —una charla, un gasto, un plan— tus días empiezan a
        aparecer acá.
      </p>
    );
  }

  const pFoco = foco ? partesDeClave(foco) : partesDeClave(dias[0].clave);

  return (
    <div>
      {/* ⚠️ EL MES Y EL AÑO SON BOTONES (06/08, Matías: *"si elegís el año, te
          lleva a esa zona de fechas, y lo mismo el mes"*). Y se actualizan solos
          al scrollear: el encabezado dice dónde estás parado, no dónde entraste. */}
      <div className="mb-2 flex items-baseline justify-between px-1">
        <button
          type="button"
          onClick={() => setModo('mes')}
          aria-label="Saltar por mes"
          className="font-serif text-[21px] text-tinta"
        >
          {MESES_LARGO[pFoco.mes]}
        </button>
        <button
          type="button"
          onClick={() => setModo('ano')}
          aria-label="Saltar por año"
          className="font-mono text-[11px] text-niebla"
        >
          {pFoco.anio}
        </button>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {saltos.map((s) => {
          const activo = modo === 'mes' ? s.anio === pFoco.anio && s.mes === pFoco.mes : s.anio === pFoco.anio;
          return (
            <button
              key={`${s.anio}-${modo === 'mes' ? s.mes : 'a'}`}
              type="button"
              onClick={() => saltar(s.anio, modo === 'mes' ? s.mes : null)}
              className={`flex-none rounded-full px-2.5 py-1 font-mono text-[10.5px] transition-colors ${
                activo ? 'bg-iris text-white' : 'bg-[#e9e9f4] text-niebla'
              }`}
            >
              {s.txt}
            </button>
          );
        })}
      </div>

      <div
        ref={marco}
        className="relative h-[300px]"
        style={{
          WebkitMaskImage: 'linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%)',
          maskImage: 'linear-gradient(180deg,transparent 0,#000 18%,#000 82%,transparent 100%)',
        }}
      >
        <svg ref={svg} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <path d="" fill="none" stroke="var(--color-iris)" strokeOpacity=".32" strokeWidth="1.7" strokeLinecap="round" />
        </svg>

        <div
          ref={scroller}
          onScroll={alScrollear}
          className="relative h-full overflow-y-auto"
          style={{ scrollSnapType: 'y proximity' }}
        >
          <div className="h-[120px]" />
          {dias.map((d, i) => {
            const p = partesDeClave(d.clave);
            const esHoy = d.clave === hoy;
            return (
              <div
                key={d.clave}
                data-clave={d.clave}
                data-i={i}
                className="origin-left px-1 py-[7px]"
                style={{ scrollSnapAlign: 'center', willChange: 'transform' }}
              >
                <div className="flex items-start gap-3">
                  <div className="tira-fade w-[34px] flex-none text-right">
                    <div className={`font-serif text-[20px] leading-none ${esHoy ? 'text-iris-deep' : 'text-tinta'}`}>
                      {String(p.dia).padStart(2, '0')}
                    </div>
                    <div className="mt-0.5 font-mono text-[9.5px] text-niebla">{esHoy ? 'hoy' : DOW_CORTO[p.dow]}</div>
                  </div>

                  {/* El punto: macizo siempre, con un aro que le corta el hilo
                      alrededor. Ver la nota de arriba.
                      ⚠️ EL ARO ES `--color-lavanda` Y NO EL FONDO ENTERO: el
                      fondo de la app (`--fondo-app`) son dos radiales encima del
                      lavanda, o sea que **no tiene un color, tiene un color por
                      píxel**, y ningún valor sólido lo iguala en toda la
                      pantalla. Se usa la base del degradé, que a esta escala —un
                      aro de 3,5px— es indistinguible: los radiales aportan menos
                      del 14% de tinte y a lo largo de 9px no cambian nada.
                      Tapar el hilo con un color aproximado se ve; dejar el hilo
                      cruzando el punto se ve mucho más. */}
                  <span
                    className="tira-punto mt-1.5 size-[9px] flex-none rounded-full"
                    style={{ background: color(d), boxShadow: '0 0 0 3.5px var(--color-lavanda)' }}
                    aria-hidden="true"
                  />

                  <div className="tira-fade min-w-0 flex-1">
                    <div className="tira-titulo text-[14px] leading-[1.35] text-tinta">{d.titulo}</div>
                    {d.detalle && (
                      <div
                        className="tira-extra overflow-hidden text-[12.5px] leading-[1.45] text-tinta-soft"
                        style={{ maxHeight: 0, opacity: 0, transition: 'max-height .22s ease, opacity .22s ease, margin .22s ease' }}
                      >
                        {d.detalle}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="h-[120px]" />
        </div>
      </div>
    </div>
  );
}

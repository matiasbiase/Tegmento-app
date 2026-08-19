'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pintarDia } from '@/lib/actions/actividades';
import { grillaMes, ymd, type DiaGrilla } from '@/lib/marcas';
import { Celebracion } from '@/components/ui/Celebracion';

// El mes como CALENDARIO, y abajo la lista de lo que seguís.
//
// ── Las tres formas que se descartaron antes de esta ─────────────────────────
// 1. Siete barritas por actividad → una semana no muestra ningún patrón.
// 2. Cuatro semanas de cuadraditos por actividad → mejor, pero una tira POR
//    actividad contesta "¿cómo vengo con esto?" y la pregunta real es
//    "¿qué hice este mes?".
// 3. Los 31 días en UNA sola línea → a 6px por día se leía como código de
//    barras. Ahora va en grilla, con los días de la semana arriba.
//
// ── UN COLOR CON INTENSIDAD, no un color por actividad ───────────────────────
// Antes cada actividad tenía su color y el día se partía en franjas. Dos
// problemas que marcó Matías: los colores **chocaban con los del ánimo y el
// sueño** —se confundía qué significaba cada uno— y las franjas eran ruido.
// Ahora el día es un solo cuadrado y lo que cambia es CUÁNTO PINTA: más
// actividades hechas ese día, más fuerte. Como el tablero de GitHub.
// El hue es de la familia del iris, que no compite con ningún otro dato.

/** Cuánto pinta el día según cuántas cosas hiciste. Índice = cantidad. */
const INTENSIDAD = [0, 0.3, 0.52, 0.74, 0.95];

/** Iniciales de domingo a sábado, para el encabezado del calendario. */
const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// 27/07: esta tarjeta se mudó del Home a la pestaña Seguimiento, que es su casa
// (el Home quedó para el diario y la charla). Adentro de Seguimiento no va el
// "Ver todas" —ya estás ahí— y el título es "Este mes", porque el "Estás
// siguiendo" lo dice la pantalla entera.
export function ActividadesHoy({
  actividades,
  titulo = 'Estás siguiendo',
  enlace = true,
}: {
  actividades: { id: number; titulo: string; marcadas: string[] }[];
  /**
   * ⚠️ `null` SACA EL ENCABEZADO ENTERO (05/08, Matías: *"sacá en seguimiento
   * este mes"*). Adentro de Seguimiento ese título decía dos veces lo mismo: la
   * pantalla ya se llama Seguimiento y la tarjeta ya tiene el mes escrito
   * adentro, en serif ("agosto"). Un título arriba de otro título no ordena,
   * empuja todo para abajo.
   */
  titulo?: string | null;
  enlace?: boolean;
}) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  // Copia local para que el cuadradito pinte al toque, sin esperar al server.
  const [extra, setExtra] = useState<Record<number, boolean>>({});
  // La celebración de marcar algo. Estaba en la pantalla de Actividades pero no
  // acá: el Home solo hacía el sonido, así que sonaba y no pasaba nada (lo
  // marcó Matías, 28/07: "antes tenía confete y se celebraba").
  const [fiesta, setFiesta] = useState<{ hito: boolean; origen: { x: number; y: number } } | null>(null);

  const ahora = new Date();
  const hoy = ymd(ahora);
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const dias: DiaGrilla[] = grillaMes(mesActual, ahora);

  // `grillaMes` arranca en el día 1 sin alinear, así que el 1 caería en la
  // primera columna aunque sea un jueves. Con los días de la semana arriba eso
  // sería mentira: hay que empujarlo a su columna real.
  const huecosIniciales = dias.length > 0 ? new Date(`${dias[0].fecha}T12:00:00`).getDay() : 0;
  // Y los de la última fila, para que el bloque cierre como un rectángulo y no
  // termine en una fila cortada a la mitad.
  const huecosFinales = (7 - ((huecosIniciales + dias.length) % 7)) % 7;

  const marcado = (a: { id: number; marcadas: string[] }, fecha: string) =>
    fecha === hoy ? (extra[a.id] ?? a.marcadas.includes(hoy)) : a.marcadas.includes(fecha);

  function tocar(id: number, yaEstaba: boolean, e: React.MouseEvent<HTMLButtonElement>) {
    setExtra((prev) => ({ ...prev, [id]: !yaEstaba }));
    // Desmarcar no festeja: sacar un tilde no es un logro.
    if (!yaEstaba) {
      const r = e.currentTarget.getBoundingClientRect();
      const origen = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      // CERRAR EL DÍA vale más que marcar una sola: si con esta quedan todas
      // las de hoy hechas, la celebración es la grande. Es la diferencia que
      // pidió Matías entre "hice una actividad" y "completé el día".
      // ⚠️ `Celebracion` ya hace sonar el tin al montarse: acá no va `sonarExito`
      // aparte, o suena dos veces.
      const cierraElDia = actividades.every((a) => (a.id === id ? true : (extra[a.id] ?? a.marcadas.includes(hoy))));
      setFiesta({ hito: cierraElDia && actividades.length > 1, origen });
    }
    arrancar(async () => {
      await pintarDia(id, hoy);
      router.refresh();
    });
  }

  if (actividades.length === 0) return null;

  const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(ahora);

  return (
    <div className="mb-5">
      {(titulo || enlace) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {titulo ? (
            <h2 className="font-serif text-[19px] font-semibold tracking-[-0.2px] text-tinta">{titulo}</h2>
          ) : (
            <span />
          )}
          {enlace && (
            <button
              type="button"
              onClick={() => router.push('/actividades')}
              className="flex h-9 flex-none items-center gap-1 rounded-full px-2 font-mono text-[11px] font-semibold text-iris"
            >
              Ver todas
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="glass-tinte tarjeta border border-iris-borde">
        {/* el mes: nombre grande y oscuro, y los días de la semana arriba, para
            que se entienda que los cuadraditos son un calendario */}
        <p className="mb-2 font-serif text-[15px] font-semibold capitalize text-tinta-soft">{mesLargo}</p>
        <div className="mb-1 grid grid-cols-7 gap-[5px]">
          {DOW.map((d, i) => (
            <span key={i} className="text-center font-mono text-[9.5px] font-semibold text-niebla-2">
              {d}
            </span>
          ))}
        </div>
        {/* ⚠️ LOS HUECOS AHORA SE DIBUJAN (07/08). Matías: *"acá aparece que
            empieza el mes a la derecha, o sea que quedó un solo cuadradito y los
            otros no hay directamente; yo pondría los cuadraditos así vacíos para
            completar los meses… para que quede rectangular"*.
            Antes eran `<span />` sin nada adentro: ocupaban la celda de la
            grilla pero no dibujaban, así que la primera fila del mes aparecía
            rota y **el bloque dejaba de leerse como un calendario**. Ahora se
            pintan apenas, del color del papel: se ve el rectángulo completo y se
            entiende que esos días son de otro mes. */}
        <div className="mb-3.5 grid grid-cols-7 gap-[5px]" aria-hidden="true">
          {Array.from({ length: huecosIniciales }, (_, i) => (
            <span key={`h${i}`} className="aspect-square rounded-[6px] bg-niebla-2/30" />
          ))}
          {dias.map((d) => {
            const cuantas = actividades.filter((a) => marcado(a, d.fecha)).length;
            const futuro = d.fecha > hoy;
            const fuerza = INTENSIDAD[Math.min(cuantas, INTENSIDAD.length - 1)];
            return (
              <span
                key={d.fecha}
                className="aspect-square rounded-[6px]"
                style={{
                  // ⚠️ LOS DÍAS QUE NO PASARON, EN LILA BIEN CLARO (07/08).
                  // Matías: *"los cuadraditos que no se llenaron todavía, en vez
                  // de que sean vacíos, que sean como lila bien clarito, cosa
                  // que te dé la idea de que hay que llenarlos"*.
                  // ⚠️ Y el borde punteado se fue con ellos: un contorno
                  // discontinuo se lee como "esto está deshabilitado", justo lo
                  // contrario de "esto te está esperando".
                  background: futuro
                    ? 'rgba(108,120,238,.05)'
                    : cuantas > 0
                      ? `oklch(0.58 0.16 288 / ${fuerza})`
                      : 'rgba(108,120,238,.08)',
                  border: undefined,
                  // ⚠️ SOLO SI EL DÍA ESTÁ VACÍO, igual que en `MesDeUso` (01/08,
                  // Matías: *"que no se vea el borde cuando está relleno"*). Este
                  // cuadradito no se toca —es un dibujo, no un botón—, así que el
                  // contorno solo está para ubicar hoy mientras no se distingue
                  // por color. Lleno, el color ya lo dice y el aro sobra.
                  outline: d.esHoy && cuantas === 0 ? '1.5px solid var(--color-iris)' : undefined,
                  outlineOffset: '-1.5px',
                }}
              />
            );
          })}
          {Array.from({ length: huecosFinales }, (_, i) => (
            <span key={`f${i}`} className="aspect-square rounded-[6px] bg-niebla-2/30" />
          ))}
        </div>

        {/* lo que seguís · tocar marca hoy, el chevrón lleva a editarla */}
        <div className="flex flex-col gap-0.5 border-t border-[rgba(108,120,238,.12)] pt-2.5">
          {actividades.map((a) => {
            const hechoHoy = extra[a.id] ?? a.marcadas.includes(hoy);
            const esteMes = a.marcadas.filter((f) => f.startsWith(mesActual)).length;
            const total = esteMes + (hechoHoy && !a.marcadas.includes(hoy) ? 1 : 0);
            return (
              <div key={a.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => tocar(a.id, hechoHoy, e)}
                  aria-pressed={hechoHoy}
                  aria-label={hechoHoy ? `${a.titulo}, hecho hoy` : `Marcar ${a.titulo} hoy`}
                  className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[12px] px-1 text-left"
                >
                  {/* Un tilde en un cuadrito: hecho hoy o no. Antes eran puntos
                      de color, unos llenos y otros huecos, y no se entendía qué
                      querían decir — acá el color ya no significa nada. */}
                  <span
                    className="grid size-[17px] flex-none place-items-center rounded-[5px]"
                    style={{
                      background: hechoHoy ? 'var(--color-iris)' : 'transparent',
                      boxShadow: hechoHoy ? undefined : 'inset 0 0 0 1.5px var(--color-niebla-2)',
                    }}
                  >
                    {hechoHoy && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="size-[10px]">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-tinta">{a.titulo}</span>
                  <span className="flex-none font-mono text-[11px] tabular-nums text-niebla">{total}</span>
                </button>
                {/* El chevrón lleva a editarla. Adentro de Seguimiento no va:
                    llevaría a la pantalla en la que ya estás. */}
                {enlace && (
                  <button
                    type="button"
                    onClick={() => router.push('/actividades')}
                    aria-label={`Editar ${a.titulo}`}
                    className="grid size-9 flex-none place-items-center rounded-full text-niebla-2"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {fiesta && <Celebracion hito={fiesta.hito} origen={fiesta.origen} onFin={() => setFiesta(null)} />}
    </div>
  );
}

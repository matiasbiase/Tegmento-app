'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cerrarActividad, marcarDiaria, pintarDia, renombrarActividad } from '@/lib/actions/actividades';
import { grillaDias, progresoMeta, racha, ymd, type DiaGrilla } from '@/lib/marcas';
import { GrillaDias } from '@/components/actividades/GrillaDias';
import { MetaSemanal } from '@/components/actividades/MetaSemanal';
import { Celebracion } from '@/components/ui/Celebracion';
import { marcarNotaDicha, notaDeActividad, notaYaDicha, type NotaSeguimiento } from '@/lib/notas-seguimiento';
import { sonarExito, sonarHito } from '@/lib/sonido';
import type { Actividad } from '@/components/actividades/ActividadesUI';
import { IconLapiz } from '@/components/ui/iconos';
import { GLIFO_TILDE_CAJA } from '@/components/ui/glifos';

/**
 * LOS CUATRO PAPELITOS — DOS MANCHAS EN ESQUINAS OPUESTAS (18/08).
 *
 * Tercera versión, y las dos anteriores las bajó él mirando la app:
 *
 *  1. **Relleno pastel parejo** → *"los contrastes están raros entre los grises
 *     que hay dentro, y rompe con la estética que veníamos trabajando"*.
 *  2. **Degradé de blanco arriba al color abajo** (la receta de Cuerpo) →
 *     *"queda medio inclinado, se ve como desde abajo, no me convence… como que
 *     sean dos spots, uno a la esquina derecha abajo y otro a la izquierda
 *     arriba, más como son las otras tarjetitas cuando combinan colores"*.
 *
 * 👉 Y LA SEGUNDA CORRECCIÓN ES EXACTA: un degradé vertical tiene **dirección**,
 * y una dirección se lee como una luz. Por eso parecía iluminado desde abajo. Lo
 * que hacen las tarjetas del bot no es un degradé, son **dos manchas de color en
 * esquinas opuestas que se apagan hacia el centro** — sin dirección, sin fuente
 * de luz, el color simplemente está.
 *
 * ⚠️ ES LA MISMA ESTRUCTURA DE `glass-tinte`, capa por capa: 140° desde arriba a
 * la izquierda, 320° desde abajo a la derecha, y blanco de base. Lo único que
 * cambia es el hue. No se copió el look: se usó la receta.
 *
 * ⚠️ CADA PAPELITO LLEVA DOS HUES Y NO UNO, que es lo que Matías llamó *"cuando
 * combinan colores"*: dos manchas del mismo hue exacto se leen como una sola
 * mancha partida al medio. Con hues vecinos, el centro donde se cruzan tiene un
 * color propio y ahí aparece la profundidad.
 *
 * ⚠️⚠️ EL BLANCO DE BASE ES LO QUE PROTEGE AL GRIS. `--color-niebla` (#6d6d87)
 * está elegido para leerse sobre blanco; sobre un pastel pleno se caía, que fue
 * la queja 1. Con las manchas al 14% sobre blanco al 88%, el texto sigue
 * apoyado sobre blanco — **medido después: 4.9:1, arriba del 4.5 de AA**.
 */
const PAPELITOS: [number, number][] = [
  [95, 62], // amarillo · se cruza con ámbar
  [160, 140], // verde · se cruza con verde oliva
  [230, 200], // celeste · se cruza con turquesa
  [350, 318], // rosa · se cruza con lila
];

function papelito(id: number): string {
  // ⚠️⚠️ NO ES `id % 4`, Y ESO SE VIO EN LA APP. Con el resto directo, las seis
  // actividades reales caían en tres colores y **el verde no aparecía nunca**:
  // los ids no vienen repartidos parejo —se crean de a tandas y se borran
  // algunos—, así que muchos comparten resto. Mezclándolo antes, ids
  // consecutivos caen en colores distintos.
  //
  // ⚠️ Y SIGUE SIENDO DETERMINISTA, que no es un lujo: `Math.random()` daría un
  // color en el servidor y otro en el navegador, o sea un error de hidratación.
  // Además hace que el color sirva para reconocer la actividad de un vistazo, en
  // vez de ser confeti que cambia en cada visita.
  const [a, b] = PAPELITOS[((id * 2654435761) >>> 0) % PAPELITOS.length];
  return (
    `linear-gradient(140deg, oklch(0.82 0.16 ${a} / 0.16) 0%, transparent 46%),` +
    `linear-gradient(320deg, oklch(0.80 0.15 ${b} / 0.14) 0%, transparent 52%),` +
    `rgba(255,255,255,.88)`
  );
}

// Un renglón por actividad, en vez de la tarjeta grande de antes: en una pantalla
// entran ocho en vez de tres. Lo que importa está a la vista sin abrir nada:
//   - el círculo de la izquierda marca HOY de un toque (era el gesto más pedido);
//   - la semana en miniatura a la derecha muestra cómo venís;
//   - abajo, cómo vas contra tu meta si te pusiste una.
// Tocando el renglón se abre el detalle: la grilla completa, la meta y las acciones.

export function RenglonActividad({
  a,
  onCharlar,
  yendo,
}: {
  a: Actividad;
  onCharlar: (a: Actividad) => void;
  yendo: boolean;
}) {
  const router = useRouter();
  const [, arrancar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState(a.titulo);
  const [nuevoObjetivo, setNuevoObjetivo] = useState(a.objetivo ?? '');
  const [pintadas, setPintadas] = useState<Set<string>>(() => new Set(a.marcadas));
  const [fiesta, setFiesta] = useState<{
    hito: boolean;
    origen: { x: number; y: number };
  } | null>(null);
  // Lo que la app nota de ESTA actividad, dicho justo cuando la marcás: es el
  // único momento en que tiene tu atención (ver lib/notas-seguimiento).
  const [nota, setNota] = useState<NotaSeguimiento | null>(null);

  const dias: DiaGrilla[] = grillaDias();
  const hoy = ymd(new Date());
  const hechoHoy = pintadas.has(hoy);
  // Para el pill de progreso que ahora vive arriba, en el lugar de "Último
  // movimiento" (30/07, ver más abajo por qué se movió).
  const hechosSemana = dias.filter((d) => pintadas.has(d.fecha)).length;
  const progreso = a.meta != null ? progresoMeta(hechosSemana, a.meta) : null;
  const seguidos = racha(pintadas);

  // El círculo: marcar o desmarcar hoy sin entrar a nada.
  function tocarHoy(e: React.MouseEvent) {
    e.stopPropagation();
    const yaEstaba = pintadas.has(hoy);
    const siguiente = new Set(pintadas);
    if (yaEstaba) siguiente.delete(hoy);
    else siguiente.add(hoy);
    setPintadas(siguiente);

    if (!yaEstaba) {
      const r = e.currentTarget.getBoundingClientRect();
      const origen = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const cumpleAhora =
        a.meta != null && dias.filter((d) => siguiente.has(d.fecha)).length === progresoMeta(0, a.meta).meta;
      const rachaNueva = racha(siguiente);
      if (cumpleAhora) setFiesta({ hito: true, origen });
      else if (rachaNueva > racha(pintadas) && rachaNueva >= 2)
        setFiesta({ hito: rachaNueva === 7 || rachaNueva === 30, origen });
      else sonarExito();

      // La nota va DESPUÉS de la celebración, nunca en lugar de ella: si acabás
      // de cerrar una racha, lo primero es el festejo. Se calcula con la marca
      // de hoy ya incluida.
      const conHoy = [...(a.conHora ?? []), { fecha: hoy, creado: new Date().toISOString() }];
      const posible = notaDeActividad(conHoy, hoy);
      // La misma clase de nota no se repite antes de dos semanas: si no, la de
      // horario aparecería en CADA marcado una vez que la condición se cumple.
      if (posible && !notaYaDicha(a.id, posible.clase, hoy)) {
        marcarNotaDicha(a.id, posible.clase, hoy);
        setNota(posible);
      }
    } else {
      setNota(null); // al desmarcar no se comenta nada
    }

    arrancar(async () => {
      await pintarDia(a.id, hoy);
      router.refresh();
    });
  }

  async function alternarDiaria() {
    await marcarDiaria(a.id, !a.diaria);
    router.refresh();
  }

  async function guardarNombre() {
    if (!nuevoTitulo.trim()) return;
    setEditando(false);
    await renombrarActividad(a.id, nuevoTitulo, nuevoObjetivo);
    router.refresh();
  }

  async function cerrar() {
    // Terminar algo que venías siguiendo merece el sonido grande, no el mismo
    // que marcar un día (decisión de Matías).
    sonarHito();
    await cerrarActividad(a.id);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-[18px] bg-white sombra-card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setAbierto((v) => !v))}
        aria-expanded={abierto}
        // ── ⚠️⚠️ EL COLOR DE POST-IT, SOLO EN LA CABECERA (18/08) ──────────────
        // Matías: *"inspirate en los colores de los post-its para que no se vea
        // tan plano, y hacerlo random, pero que sean esos cuatro"*, y después la
        // precisión que define todo: *"solo la tarjetita, la parte de donde está
        // cerrada; cuando se abre, blanco"*.
        //
        // 👉 POR ESO EL COLOR VA ACÁ Y NO EN EL `<div>` DE AFUERA. En el padre
        // teñiría también lo desplegable, y ahí adentro hay campos, botones y
        // texto largo: un fondo de color detrás de un formulario es ruido. La
        // cabecera es la etiqueta del papelito; lo que se abre es la hoja.
        //
        // ⚠️⚠️ Y NO ES RANDOM DE VERDAD: SALE DEL `id`. Un `Math.random()` acá
        // daría un color distinto en cada render —y otro más en el servidor que
        // en el navegador, o sea un error de hidratación—. Derivándolo del id,
        // cada actividad tiene SU color y lo tiene siempre: mañana Tegmento
        // sigue siendo el mismo amarillo, que es lo que hace que sirva para
        // reconocerla de un vistazo en vez de ser confeti.
        // ⚠️ SOLO EL FONDO VA INLINE. La sombra y los dos rims los pone
        // `pastilla-vidrio`, y tienen que quedarse ahí: un `box-shadow` inline
        // le ganaría a la clase y devolvería la pastilla a plana — está dicho en
        // `globals.css`, al lado de la regla.
        style={{ background: papelito(a.id) }}
        className="pastilla-vidrio flex w-full items-center gap-3 p-[12px_14px] text-left"
      >
        {a.diaria ? (
          <button
            type="button"
            onClick={tocarHoy}
            aria-label={hechoHoy ? `${a.titulo}, hecho hoy` : `Marcar ${a.titulo} como hecho hoy`}
            aria-pressed={hechoHoy}
            className={`grid size-9 flex-none place-items-center rounded-full transition-colors ${
              hechoHoy ? 'bg-verde text-white' : 'bg-white text-niebla-2'
            }`}
            style={hechoHoy ? undefined : { boxShadow: 'inset 0 0 0 2px #dededf' }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-[15px]"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>
        ) : (
          <span className="grid size-9 flex-none place-items-center rounded-[12px] bg-iris-soft text-iris">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-[17px]"
            >
              {GLIFO_TILDE_CAJA}
            </svg>
          </span>
        )}

        <div className="min-w-0 flex-1">
          {/* EL LÁPIZ AL FINAL DEL TÍTULO (29/07, pedido de Matías: *"para
              editar el nombre debería aparecer un lapicito al lado, no estar
              escrito porque es medio engorroso"*).
              Antes la única puerta era un texto —"cambiarle el nombre"— metido
              adentro del panel desplegado: había que abrir la actividad, bajar
              y leerlo. Un lápiz pegado al título se entiende sin leer nada y
              está donde está la cosa que edita.
              ⚠️ `stopPropagation` porque el renglón entero abre/cierra el
              panel: sin eso, tocar el lápiz también lo despliega. */}
          {/* ⚠️ SIN `flex-1` EN EL TÍTULO (30/07, Matías: *"el lápiz está muy
              lejos, lo pondría más cerca del título"*). Con `flex-1` el <p>
              se estiraba hasta ocupar todo el ancho disponible de esta fila
              —que es generoso, porque el renglón entero también tiene la
              grilla de la semana y la flechita más allá— así que el lápiz
              quedaba pegado al BORDE de esa caja estirada, no al texto. Sin
              `flex-1` el párrafo solo ocupa lo que su texto necesita, y el
              lápiz queda inmediatamente después. `min-w-0 truncate` se
              mantienen para que un título largo de verdad siga cortándose. */}
          <div className="flex items-center gap-1">
            <p className="min-w-0 truncate text-[15px] font-semibold text-tinta">{a.titulo}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNuevoTitulo(a.titulo);
                setNuevoObjetivo(a.objetivo ?? '');
                setEditando(true);
                setAbierto(true);
              }}
              aria-label={`Cambiarle el nombre a ${a.titulo}`}
              // `text-niebla`, no `niebla-2` (30/07): el UI kit documenta
              // `niebla-2` como "iconos INACTIVOS" — un lápiz que se toca no
              // es eso, y con ese gris más claro se leía menos como botón.
              // Mismo color que el lápiz de la meta, acá abajo.
              className="flex size-6 flex-none items-center justify-center rounded-full text-niebla"
            >
              <IconLapiz className="size-[13px]" />
            </button>
          </div>
          {/* ⚠️ ACÁ ABAJO SE REPETÍA "X de Y esta semana" (30/07). Se sacó
              porque el mismo dato vuelve a aparecer al abrir el renglón — y
              Matías pidió, en vez de eso, mostrar acá "Último movimiento",
              que antes solo se veía adentro. Así el renglón minimizado dice
              CUÁNDO fue la última vez, y adentro ves el detalle del progreso
              (que ahora vive arriba de todo, ver más abajo). */}
          <p className="truncate font-mono text-[11px] text-niebla">{a.diaria ? a.desde : a.objetivo || a.desde}</p>
        </div>

        {/* la semana en miniatura: siete puntos, uno por día */}
        {a.diaria && (
          <div className="flex flex-none items-end gap-[3px]" aria-hidden="true">
            {dias.map((d) => {
              const on = pintadas.has(d.fecha);
              return (
                <span
                  key={d.fecha}
                  className={`w-[5px] rounded-full ${on ? 'bg-verde' : 'bg-[#e8e8f0]'} ${
                    d.esHoy ? 'h-[18px]' : 'h-[13px]'
                  }`}
                />
              );
            })}
          </div>
        )}

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c4c4d4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-[16px] flex-none transition-transform ${abierto ? 'rotate-90' : ''}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      {abierto && (
        <div className="border-t border-[#f1f0f7] p-[12px_14px_14px]">
          {editando ? (
            // Antes lo que escribías al crearla quedaba para siempre, con typo y
            // todo, y la única salida era borrarla y perder los días pintados.
            <div className="mb-3">
              <input
                autoFocus
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && guardarNombre()}
                placeholder="Cómo se llama"
                className="w-full rounded-[12px] border border-iris-borde bg-white px-3 py-2 text-[16px] font-semibold text-tinta outline-none focus:border-iris"
              />
              <input
                value={nuevoObjetivo}
                onChange={(e) => setNuevoObjetivo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && guardarNombre()}
                placeholder="Para qué la hacés (opcional)"
                className="mt-1.5 w-full rounded-[12px] border border-iris-borde bg-white px-3 py-2 text-[16px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={guardarNombre}
                  disabled={!nuevoTitulo.trim()}
                  className="flex-none rounded-[12px] px-3.5 py-2 font-mono text-[12px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="flex-none rounded-[12px] border border-iris-borde px-3.5 py-2 font-mono text-[12px] font-semibold text-niebla"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            // ⚠️ ACÁ HABÍA UN BOTÓN DE TEXTO "cambiarle el nombre" (30/07,
            // Matías: *"sacá donde dice cambiar nombre escrito... solo con el
            // lápiz se entiende"*). Se justificaba como "segunda puerta" para
            // el objetivo, pero el lápiz del título de arriba abre EL MISMO
            // formulario, con el objetivo adentro — no hacía falta una puerta
            // aparte, era el mismo texto pidiendo lo que el ícono ya ofrece.
            a.objetivo && <p className="mb-1 text-[13px] text-niebla text-pretty">{a.objetivo}</p>
          )}

          {/* EL PROGRESO, ARRIBA DE TODO (30/07, Matías: *"lo que dice 0 de 7
              editable ponelo en el lugar de último movimiento, para que
              cuando se abre la tarjeta se vea rápido arriba"*). "Último
              movimiento" bajó a la vista minimizada (arriba de todo); acá,
              donde estaba, va lo que antes vivía al final de la grilla: el
              progreso de la semana y el lápiz para cambiar la meta, juntos,
              en un solo lugar. */}
          {a.diaria && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              {progreso ? (
                <span
                  className={`inline-block rounded-[8px] px-[7px] py-0.5 font-mono text-[11px] font-bold ${
                    progreso.cumplida ? 'bg-verde-tint text-verde' : 'bg-gris-tint text-tinta-soft'
                  }`}
                >
                  {progreso.cumplida
                    ? `${progreso.hechos} de ${progreso.meta}, como querías`
                    : `${progreso.hechos} de ${progreso.meta} · te falta${progreso.faltan > 1 ? 'n' : ''} ${progreso.faltan}`}
                </span>
              ) : (
                <span className="inline-block rounded-[8px] bg-gris-tint px-[7px] py-0.5 font-mono text-[11px] font-bold text-tinta-soft">
                  {hechosSemana} de {dias.length} días
                </span>
              )}
              {seguidos > 1 && (
                <span className="inline-block rounded-[8px] bg-verde-tint px-[7px] py-0.5 font-mono text-[11px] font-bold text-verde">
                  {seguidos} seguidos
                </span>
              )}
              <MetaSemanal lineaId={a.id} meta={a.meta} />
            </div>
          )}

          {a.diaria ? (
            <>
              {/* ⚠️ ACÁ HABÍA UN BOTÓN "dejar de seguir" (30/07, Matías: *"no
                  es una función que quiero, sacalo"*). Se borró la función
                  entera para volver a un proyecto libre; se mantiene poder ir
                  al revés ("Seguir día a día", más abajo), que no se pidió
                  sacar. */}
              <p className="mt-2.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-niebla">
                Pintá los días que la hiciste
              </p>
              <GrillaDias lineaId={a.id} marcadas={a.marcadas} meta={a.meta} />
            </>
          ) : (
            <button
              type="button"
              onClick={alternarDiaria}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-iris-borde bg-white py-2.5 font-mono text-[12px] font-semibold text-iris-deep"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[15px]"
              >
                <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                <path d="M3 9.5h18M8 3v3M16 3v3" />
              </svg>
              Seguir día a día
            </button>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onCharlar(a)}
              disabled={yendo}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2.5 font-mono text-[12px] font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))' }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[15px]"
              >
                <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
              </svg>
              Charlar sobre esto
            </button>
            <button
              type="button"
              onClick={cerrar}
              className="flex flex-none items-center justify-center gap-1.5 rounded-[12px] border border-iris-borde px-3.5 py-2.5 font-mono text-[12px] font-semibold text-niebla"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[14px]"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              {/* "Terminada", no "Listo" (29/07, Matías: *"listo es ambiguo,
                  parece que estás confirmando una configuración"*). Y tenía
                  razón: al lado de otros controles, "Listo" se lee como el
                  botón de cerrar un panel, no como dar por terminada la
                  actividad. El botón cierra algo de tu vida, no un diálogo. */}
              Terminada
            </button>
          </div>
        </div>
      )}

      {/* La nota, pegada abajo del renglón que acabás de marcar. Se cierra con
          la cruz y no vuelve hasta el próximo marcado: es un comentario al
          pasar, no un aviso que hay que atender. */}
      {nota && (
        <div className="flex items-start gap-2.5 border-t border-[#f1f0f7] bg-iris-soft/50 p-[11px_14px]">
          <span className="mt-[3px] flex-none text-iris">
            <svg viewBox="0 0 100 100" width="15" height="15" aria-hidden="true">
              <ellipse cx="36.6" cy="51.9" rx="9" ry="13" fill="currentColor" />
              <ellipse cx="63.4" cy="51.9" rx="9" ry="13" fill="currentColor" />
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-tinta-soft text-pretty">{nota.texto}</p>
          <button
            type="button"
            onClick={() => setNota(null)}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 flex-none p-1 text-niebla-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-[13px]">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      {fiesta && <Celebracion hito={fiesta.hito} origen={fiesta.origen} onFin={() => setFiesta(null)} />}
    </div>
  );
}

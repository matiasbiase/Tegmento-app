import { and, desc, eq, inArray, like } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db/client';
import { bitacora, lineas } from '@/lib/db/schema';
import { etiquetaFecha } from '@/lib/fechas';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { TarjetaExperimento } from '@/components/animo/TarjetaExperimento';
import { diasDeExperimento, MARCA_EXPERIMENTO } from '@/lib/experimentos';

export const dynamic = 'force-dynamic';

// "Probando": los experimentos, en su propia pantalla (30/07, decisión de Matías
// —"se los lleva a su propia pantalla"—). Antes vivían enterrados al medio del
// scroll de Relaciones, en la sección "Lo que estás probando".
//
// El nombre pega con el que ya usaba esa sección, así que no hay nada nuevo que
// aprender: es el mismo lugar, ahora con puerta propia en el menú.
//
// ⚠️ Un experimento se sigue CREANDO desde Relaciones (el botón "Probar unos
// días" de `TarjetaPatron`, que aparece recién cuando confirmás que la relación
// te pasa). Acá se le hace el seguimiento. Son dos momentos distintos y por eso
// están en dos lugares: aceptar una prueba es parte de leer la relación; anotar
// cómo viene, no.
export default async function ProbandoPage() {
  const enCurso = await db
    .select()
    .from(lineas)
    .where(
      and(eq(lineas.tipo, 'actividad'), eq(lineas.estado, 'activa'), like(lineas.notas, `${MARCA_EXPERIMENTO}%`)),
    )
    .orderBy(desc(lineas.ultimaActividad));

  // Lo anotado sobre esos experimentos, en una sola consulta y no una por
  // tarjeta. Vacío ⇒ no se consulta: `inArray` con lista vacía es SQL inválido.
  const notasCrudas = enCurso.length
    ? await db
        .select()
        .from(bitacora)
        .where(
          and(
            eq(bitacora.tipo, 'experimento'),
            inArray(
              bitacora.lineaId,
              enCurso.map((l) => l.id),
            ),
          ),
        )
        .orderBy(desc(bitacora.fecha))
    : [];

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Probando" />
      <div className="mt-4" />

      {enCurso.length === 0 ? (
        <div className="tarjeta border border-dashed border-niebla-2 bg-white/60">
          <p className="text-[14px] leading-[1.45] text-tinta-soft text-pretty">
            No estás probando nada ahora. Los experimentos salen de las relaciones: cuando confirmás que una te pasa, ahí
            te propongo algo chico para probar unos días.
          </p>
          <Link href="/cosas-chicas" className="mt-3 inline-flex items-center gap-1 font-mono text-[12px] font-semibold text-iris">
            Ver las relaciones
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-[12px]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      ) : (
        <>
          {enCurso.map((l) => (
            <TarjetaExperimento
              key={l.id}
              lineaId={l.id}
              titulo={l.titulo}
              dias={diasDeExperimento(l.notas)}
              notas={notasCrudas
                .filter((n) => n.lineaId === l.id)
                .map((n) => ({ id: n.id, texto: n.contenido, cuando: etiquetaFecha(n.fecha) }))}
            />
          ))}
          {/* Qué es un experimento acá, en dos líneas: lo que lo distingue de una
              actividad es que ESPERA UN VEREDICTO y se cierra. */}
          <p className="mt-3 px-0.5 text-[12.5px] leading-[1.5] text-niebla text-pretty">
            Un experimento no es un hábito: se prueba unos días, se anota qué pasó, y eso es lo que confirma o tumba la
            relación que lo originó.
          </p>
        </>
      )}
    </div>
  );
}

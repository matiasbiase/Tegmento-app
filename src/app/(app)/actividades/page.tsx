import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { lineas, marcas } from '@/lib/db/schema';
import { etiquetaFecha } from '@/lib/fechas';
import { ymd } from '@/lib/marcas';
import { ActividadesUI, type Actividad, type Hecha } from '@/components/actividades/ActividadesUI';
import { ActividadesHoy } from '@/components/chat/ActividadesHoy';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { ObjetivosSeccion } from '@/components/objetivos/ObjetivosSeccion';

export const dynamic = 'force-dynamic';

export default async function ActividadesPage() {
  const filas = await db
    .select({
      id: lineas.id,
      titulo: lineas.titulo,
      objetivo: lineas.objetivo,
      estado: lineas.estado,
      ultima: lineas.ultimaActividad,
      diaria: lineas.diaria,
      meta: lineas.metaSemanal,
    })
    .from(lineas)
    .where(and(eq(lineas.tipo, 'actividad'), inArray(lineas.estado, ['activa', 'hecha', 'cerrada'])))
    .orderBy(desc(lineas.ultimaActividad));

  // Días pintados de la ventana visible (más un colchón, para que la racha pueda
  // contar hacia atrás más allá de los 7 cuadritos que se ven).
  const desde = ymd(new Date(Date.now() - 90 * 86_400_000));
  const marcadas = await db.select().from(marcas).where(gte(marcas.fecha, desde));
  const porLinea = new Map<number, string[]>();
  // Y aparte con la HORA: de acá salen las notas al marcar ("la marcás casi
  // siempre de noche"). `creado` es cuándo la marcaste, que no siempre es cuándo
  // la hiciste: por eso las frases dicen "la marcás" y no "la hacés".
  const horasPorLinea = new Map<number, { fecha: string; creado: string }[]>();
  for (const m of marcadas) {
    const lista = porLinea.get(m.lineaId);
    if (lista) lista.push(m.fecha);
    else porLinea.set(m.lineaId, [m.fecha]);
    const conHora = horasPorLinea.get(m.lineaId);
    if (conHora) conHora.push({ fecha: m.fecha, creado: m.creado });
    else horasPorLinea.set(m.lineaId, [{ fecha: m.fecha, creado: m.creado }]);
  }

  const actividades: Actividad[] = filas
    .filter((f) => f.estado === 'activa')
    .map((f) => ({
      id: f.id,
      titulo: f.titulo,
      objetivo: f.objetivo,
      desde: f.ultima ? `Último movimiento: ${etiquetaFecha(f.ultima)}` : 'Recién sumada',
      diaria: f.diaria,
      meta: f.meta,
      marcadas: porLinea.get(f.id) ?? [],
      conHora: horasPorLinea.get(f.id) ?? [],
    }));

  // ⚠️ Acá estaba el agujero: "Listo" pasa la actividad a estado 'cerrada', pero
  // la consulta pedía solo 'activa' y 'hecha' y la pestaña Hechas filtraba
  // 'hecha'. O sea que al cerrar una actividad desaparecía de las TRES pestañas
  // y no había forma de recuperarla desde la app (el dato nunca se borró: a
  // Matías le habían quedado 5 invisibles). Ahora las cerradas también entran, y
  // se pueden reactivar.
  // Las diarias, para el calendario del mes de arriba.
  const diarias = actividades
    .filter((a) => a.diaria)
    .map((a) => ({ id: a.id, titulo: a.titulo, marcadas: a.marcadas }));

  // ⚠️ LAS TAREAS QUE TILDASTE HOY SIGUEN EN LA LISTA, TACHADAS (05/08, pedido
  // de Matías: *"cuando marcás una aparece por tres segundos… estaría bueno que
  // se mantenga durante un día"*). Antes el tachado duraba lo que tardaba el
  // refresco del server —la tarea pasaba a `cerrada` y ya no venía en
  // `actividades`—, así que la línea que acababas de tocar desaparecía sola. El
  // día que la cerraste sigue siendo tu día: la marca se queda hasta que cambie.
  const hoyYmd = ymd(new Date());
  const cerradasHoy: Actividad[] = filas
    .filter((f) => f.estado === 'cerrada' && !f.diaria && !!f.ultima && ymd(new Date(f.ultima)) === hoyYmd)
    .map((f) => ({
      id: f.id,
      titulo: f.titulo,
      objetivo: f.objetivo,
      desde: 'Cerrada hoy',
      diaria: false,
      meta: f.meta,
      marcadas: [],
      conHora: [],
    }));

  const hechas: Hecha[] = filas
    .filter((f) => f.estado === 'hecha' || f.estado === 'cerrada')
    .map((f) => ({
      id: f.id,
      titulo: f.titulo,
      cuando: f.ultima ? etiquetaFecha(f.ultima) : '',
      reactivable: f.estado === 'cerrada',
      // Para que el pie de "Cerradas" muestre las de la pestaña donde estás.
      diaria: f.diaria,
    }));

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Seguimiento" />
      <div className="mt-4" />
      {/* El mes entero, que hasta hoy vivía en el Home. Contesta la pregunta con
          la que se entra a esta pantalla ("¿cómo vengo?") antes de la lista, que
          es para administrar.
          ⚠️ SIN TÍTULO (05/08): decía "Este mes" arriba de una tarjeta que ya
          dice "agosto" adentro, en una pantalla que ya se llama Seguimiento.
          ⚠️ Y YA NO SE DIBUJA ACÁ: entra por `mes` y lo pinta la pestaña
          Seguimiento. Suelto en la página se veía también en Tareas y en
          Cerradas, que es justo lo que Matías pidió que dejara de pasar. */}
      <ActividadesUI
        actividades={actividades}
        hechas={hechas}
        cerradasHoy={cerradasHoy}
        /* ⚠️⚠️ EL `key` NO ES DECORACIÓN: SIN ÉL, SEGUIMIENTO TIRA UN WARNING EN
           CONSOLA (06/08). Es el *"Each child in a list should have a unique key
           prop — check the render method of `ActividadesUI`, it was passed a
           child from `ActividadesPage`"* que costó dos días de búsqueda.

           ⚠️ Y NO HABÍA NINGÚN `.map()` SIN `key`: se escanearon los 155 `.tsx`
           con el parser de TypeScript, dos veces. La lista no la hacía un map.

           Lo que pasa es esto, y es la parte que no se ve:
           1. Esto es un Server Component y `ActividadesUI` es cliente, así que
              este elemento **viaja serializado** y del otro lado no llega como
              elemento: llega como un **nodo lazy** (sin `type`, sin `_store`).
           2. `ActividadesUI` lo dibuja adentro de `<>{mes}<div/></>`. Un fragment
              con DOS hijos es un array, y ahí React pide `key` en cada uno.
           3. Frente a un lazy, el reconciliador lo RESUELVE y valida lo que hay
              adentro — que es este elemento, creado acá y sin `key`.
           De ahí que el warning nombre a los dos componentes a la vez: la lista
           es de uno y el elemento es del otro.

           ⚠️ REGLA QUE QUEDA: **un elemento que se pasa como prop de server a
           cliente lleva `key`.** No se puede saber desde acá si del otro lado va
           a caer en una lista, y ponerlo no cuesta nada. */
        mes={diarias.length > 0 ? <ActividadesHoy key="mes" actividades={diarias} titulo={null} enlace={false} /> : null}
        /* ⚠️ OBJETIVOS ENTERO, RENDERIZADO EN EL SERVER Y PASADO COMO NODO
           (06/08). Es el mismo truco que `mes`: `ActividadesUI` es cliente y no
           puede hacer consultas, así que la sección llega ya dibujada. La
           alternativa era repetir acá las cien líneas de consultas de Objetivos,
           que es la forma segura de que las dos vistas se desincronicen. */
        objetivos={<ObjetivosSeccion key="objetivos" />}
      />
    </div>
  );
}

import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cuerpo } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { AlimentacionUI } from '@/components/alimentacion/AlimentacionUI';
import { RegistrarComida } from '@/components/alimentacion/RegistrarComida';
import { PlanAlimentacion } from '@/components/alimentacion/PlanAlimentacion';
import { leerMarcas, leerPlanActivo } from '@/lib/actions/plan';

export const dynamic = 'force-dynamic';

/**
 * ALIMENTACIÓN: el apartado, con el objetivo arriba.
 *
 * Sale del mockup del 02/08 y del reencuadre de Matías: *"darle valor al
 * usuario, no darle cosas para que haga"*. Lo primero no es la lista de lo que
 * comiste — es para qué lo estás siguiendo.
 *
 * ⚠️ LO QUE ESTA PANTALLA TODAVÍA NO PUEDE CONTESTAR, Y NO SE FINGE. Matías pidió
 * seguir proteína y cruzar lo que entra con lo que gastás en las actividades.
 * Para eso hace falta ESTIMAR gramos de cada comida, y hoy la app guarda la
 * comida como texto ("milanesa con puré"): no hay ningún número. El paso que
 * falta es que el modelo estime al registrar y que ese número se guarde — recién
 * ahí el objetivo puede ser de proteína.
 *
 * Mientras tanto la pantalla dice lo que SÍ sabe: cuántos días registraste, qué
 * comiste, y el cruce con energía y sueño, que ya están cargados. Es poco, pero
 * es cierto — y es la regla de la casa: nunca un número inventado.
 */
export default async function AlimentacionPage() {
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const hace60 = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const comidas = await db
    .select({ id: cuerpo.id, nota: cuerpo.nota, creado: cuerpo.creado })
    .from(cuerpo)
    .where(eq(cuerpo.tipo, 'comida'))
    .orderBy(desc(cuerpo.creado))
    .limit(60);

  const energia = await db
    .select({ valor: cuerpo.valor, creado: cuerpo.creado })
    .from(cuerpo)
    .where(gte(cuerpo.creado, hace30))
    .orderBy(desc(cuerpo.creado));

  // Las de hoy, para el formulario de carga que se mudó desde Cuerpo el 03/08.
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const hoyISO = inicioHoy.toISOString();
  const comidasHoy = comidas
    .filter((c) => c.nota && c.creado >= hoyISO)
    .map((c) => ({
      id: c.id,
      nota: c.nota as string,
      hora: new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(c.creado)),
    }));

  // ── EL PLAN (04/08, §0.9c) ────────────────────────────────────────────────
  // No tener plan es el estado normal: `leerPlanActivo` devuelve null y la
  // pantalla muestra la puerta punteada en vez de un hueco.
  const plan = await leerPlanActivo();
  const marcas = plan ? await leerMarcas(60) : [];

  // El sueño de los últimos dos meses, en minutos por día, para el cruce.
  // ⚠️ SE AGRUPA POR DÍA QUEDÁNDOSE CON EL MÁXIMO: si una noche quedó cargada
  // dos veces (pasa al corregir), sumarlas daría dieciséis horas de sueño y el
  // cruce afirmaría una diferencia que no existe.
  const suenoCrudo = await db
    .select({ valor: cuerpo.valor, creado: cuerpo.creado })
    .from(cuerpo)
    .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, hace60)));
  const porDia = new Map<string, number>();
  for (const s of suenoCrudo) {
    if (s.valor == null) continue;
    const dia = s.creado.slice(0, 10);
    porDia.set(dia, Math.max(porDia.get(dia) ?? 0, s.valor));
  }
  const sueno = [...porDia].map(([fecha, minutos]) => ({ fecha, minutos }));

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Alimentación" />
      <div className="mt-4" />

      {/* ⚠️ EL PLAN VA ARRIBA DE TODO cuando existe: es lo que mirás varias
          veces por día. La foto del papel vive adentro de este componente, abajo
          de todo, porque se toca una vez cada tres meses (maqueta del 04/08). */}
      <PlanAlimentacion plan={plan} marcas={marcas} sueno={sueno} />

      <AlimentacionUI
        comidas={comidas.map((c) => ({ id: c.id, que: c.nota ?? '', creado: c.creado }))}
        energia={energia.filter((e) => e.valor != null).map((e) => ({ valor: e.valor as number, creado: e.creado }))}
        hayPlan={plan != null}
      />

      {/* ── LA CARGA, QUE VINO DE CUERPO (03/08, pedido de Matías) ──────────────
          Estaba en `/cuerpo` con su propio título de sección, mientras este
          apartado —que existe desde el 02/08— solo miraba. Con la carga en el
          otro lado, Cuerpo era el camino real y esto una vidriera.

          ⚠️ VA ABAJO Y NO ARRIBA, y es la misma decisión del 02/08 que ordenó
          Finanzas: *"darle valor al usuario, no darle cosas para que haga"*. Lo
          primero que ves sigue siendo para qué lo estás siguiendo; el formulario
          es de dónde sale el dato, no el motivo. */}
      <div className="mb-6 mt-2">
        <RegistrarComida recientes={comidasHoy} />
      </div>
    </div>
  );
}

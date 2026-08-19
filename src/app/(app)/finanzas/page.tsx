import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { gastos } from '@/lib/db/schema';
import { insightsFinanzas } from '@/lib/insight-finanzas';
import { InsightFinanzas } from '@/components/finanzas/InsightFinanzas';
import { FinanzasUI, type GastoVista } from '@/components/finanzas/FinanzasUI';
import { AgregarGasto } from '@/components/finanzas/AgregarGasto';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { ObjetivoPlata, CrearObjetivoPlata } from '@/components/finanzas/ObjetivoPlata';
import { leerObjetivosPlata } from '@/lib/actions/objetivo-plata';
import { gastosPorMes } from '@/lib/grafico-gastos';
import { GraficoGastos } from '@/components/finanzas/GraficoGastos';
import { Noticias } from '@/components/descubrir/Noticias';
import { Acciones } from '@/components/finanzas/Acciones';
import { leerPapeles } from '@/lib/actions/acciones';

export const dynamic = 'force-dynamic';

// El título dice el mes entero ("Gastado en agosto"), como en la maqueta. La
// abreviatura sigue viviendo en el gráfico, que sí necesita entrar en un eje.
const MES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Fecha efectiva del gasto: la que traiga si es válida, sino la de carga.
// (Cuando existía el ticket, la primera salía de la foto.)
function fechaDe(g: { fecha: string | null; creado: string }): string {
  return g.fecha && /^\d{4}-\d{2}-\d{2}/.test(g.fecha) ? g.fecha : g.creado.slice(0, 10);
}

function etiquetaCorta(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${Number(d)}/${Number(m)}`;
}

// ⚠️ Acá vivía `parsearItems`, que leía la columna `items` para dibujar el
// ticket desmembrado. Se sacó el 03/08 con la vista (ver `FinanzasUI`). La
// columna sigue guardándose: lo que se fue es el dibujo, no el dato.

export default async function FinanzasPage() {
  const rows = await db.select().from(gastos).orderBy(desc(gastos.creado));

  const now = new Date();
  const ymActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const delMes = rows.filter((g) => fechaDe(g).slice(0, 7) === ymActual && g.total != null);
  const totalMes = delMes.reduce((s, g) => s + (g.total ?? 0), 0);
  const moneda = delMes.find((g) => g.moneda)?.moneda ?? rows.find((g) => g.moneda)?.moneda ?? '';

  // Seis meses de gasto para el gráfico de arriba. Misma fecha efectiva que usa
  // todo lo demás de la pantalla.
  // ⚠️ SE LE PASA LA MONEDA (03/08): sin eso sumaba euros con pesos sin mirar.
  // `moneda` es la que ya usa el resto de la pantalla, sacada de tus gastos.
  const mesesGasto = gastosPorMes(
    rows.map((g) => ({ fecha: fechaDe(g), total: g.total, moneda: g.moneda })),
    now,
    6,
    moneda,
  );

  // Lo que se nota en el mes, calculado sobre la fecha efectiva de cada gasto.
  const insights = insightsFinanzas(
    rows.map((g) => ({
      fecha: fechaDe(g),
      total: g.total,
      moneda: g.moneda,
      categoria: g.categoria,
      comercio: g.comercio,
    })),
    now,
  );

  const lista: GastoVista[] = rows.map((g) => ({
    id: g.id,
    comercio: g.comercio,
    total: g.total,
    moneda: g.moneda,
    categoria: g.categoria,
    fecha: etiquetaCorta(fechaDe(g)),
    // ⚠️ SE DECIDE ACÁ Y NO EN EL COMPONENTE: la fecha efectiva de un gasto es
    // la lógica que ya usa toda esta página (`fechaDe`), y duplicarla adentro
    // del cliente habría dejado dos definiciones de "este mes" que se
    // desincronizan sin avisar.
    delMes: fechaDe(g).slice(0, 7) === ymActual && g.total != null,
  }));

  const objetivosPlata = await leerObjetivosPlata();
  const papelesSeguidos = await leerPapeles();

  // La moneda del alta sale de lo que ya usás, no de una constante. Antes el
  // placeholder decía "(€)" fijo aunque la tarjeta de abajo mostrara otra cosa.
  const monedaObjetivos = objetivosPlata[0]?.moneda ?? moneda ?? '€';

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Finanzas" />
      <div className="mt-4" />

      {/* ── EL OBJETIVO VA PRIMERO (02/08) ────────────────────────────────────
          Matías: *"objetivos de cuánto uno guarda dinero… darle valor al
          usuario, no darle cosas para que haga"*. Lo primero que ves no es
          cuánto gastaste: es para qué estás juntando y cuándo llegás.
          Los gastos siguen abajo, que es donde corresponde — son de dónde sale
          la plata, no el objetivo. */}
      {/* ⚠️ EL BOTÓN DE CREAR VA SIEMPRE, NO EN UN `else` (03/08).
          Estaba en la rama de "no hay ninguno", así que en cuanto creabas el
          primero la puerta desaparecía y no se podía tener un segundo objetivo.
          El `.map()` ya soportaba N — el límite no estaba en el render, estaba
          en el docstring que decía "cuando todavía no hay ningún objetivo". */}
      {objetivosPlata.map((o) => (
        <ObjetivoPlata key={o.id} objetivo={o} />
      ))}
      <CrearObjetivoPlata compacto={objetivosPlata.length > 0} moneda={monedaObjetivos} />

      {/* ── EL GRÁFICO GRANDE (pedido 1.11 del 31/07, hecho el 03/08) ─────────
          Va acá y no arriba del objetivo a propósito: lo primero sigue siendo
          para qué estás juntando (decisión del 02/08). El gráfico contesta la
          segunda pregunta —cómo venís gastando—, que es de dónde sale la plata
          para lo de arriba. */}
      <GraficoGastos meses={mesesGasto} moneda={moneda} />

      {/* ── GASTADO EN {MES}, CON LOS GASTOS ADENTRO (04/08) ──────────────────
          Antes esto eran dos tarjetas: el total acá y "Últimos gastos" abajo de
          todo. La flechita las juntó a pedido de Matías, y el motivo es más que
          el espacio: **los gastos son el detalle de este número**. Ver el
          docstring de `FinanzasUI`. */}
      <FinanzasUI gastos={lista} mes={MES_LARGO[now.getMonth()]} total={totalMes} moneda={moneda} />

      <InsightFinanzas insights={insights} />

      <AgregarGasto />

      {/* ── ACCIONES, COMO SUBGRUPO (§0.13, aprobado por él el 04/08) ─────────
          *"Tendría que ser solamente una sola pantalla dentro de Finanzas,
          bastante sencillo"* y *"que no pague el de Finanzas"*: por eso entra
          acá y no como sección hermana, con el título en mono y no en serif.

          ⚠️ NO HAY BARRA CONTEXTUAL (§0.14). Él pidió las dos cosas en el mismo
          mensaje —todo en una pantalla Y una barra que cambie— y son dos
          soluciones al mismo problema; hacer las dos deja subsecciones a las que
          se llega por dos caminos. Quedó "todo en una pantalla". */}
      <Acciones papeles={papelesSeguidos} />

      {/* ── NOTICIAS (0.6, del 03/08) ─────────────────────────────────────────
          *"Debajo de lo que está siguiendo en Finanzas le aparecen noticias
          sobre los temas que está siguiendo, guardables con una estrellita."*

          ⚠️ VA AL PIE, Y ESO ES LA MITAD DEL PEDIDO. El motor existía desde el
          24/07 pero vivía en Descubrir, que es una pantalla aparte — justo lo
          que el pedido dice que NO tiene que ser: *"es el pie de la pantalla, no
          un lector de noticias"*. Acá abajo, lo primero sigue siendo para qué
          estás juntando; esto es contexto de afuera, y el contexto va después.

          ⚠️ SOLO LAS DE 'Finanzas'. El clasificador ya tenía esa área con su
          vocabulario (`lib/noticias.ts`), así que no hubo que inventar un filtro:
          se le pasa la categoría que el componente ya sabía aceptar.

          ⚠️ Y el ranking mira TUS OBJETIVOS activos desde hoy (ver
          `api/noticias/route.ts`): decisión suya, *"que salen de los objetivos"*.
          Si no hay nada relevante, el componente no muestra nada — callarse
          sigue siendo una opción válida. */}
      <div className="mt-6">
        <Noticias categoria="Finanzas" titulo="Para informarse" />
      </div>
    </div>
  );
}

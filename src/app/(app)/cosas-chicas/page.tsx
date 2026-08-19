import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { analisis, config, sugerencias } from '@/lib/db/schema';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { TarjetaLiviana } from '@/components/animo/TarjetaLiviana';
import { Apartados } from '@/components/ui/Apartados';
import { ResumenSemanal } from '@/components/animo/ResumenSemanal';
import { claveSemana, datosResumen, fallbackResumen } from '@/lib/resumen';
import { verAnalisis } from '@/lib/analisis-guardado';
import { limpiarObservacion } from '@/lib/observacion-valida';
import { relacionesLivianas } from '@/lib/relaciones-livianas';
import { juntarObservaciones, separarPorRespuesta } from '@/lib/relaciones-historial';

export const dynamic = 'force-dynamic';

// "Relaciones": los cruces livianos de dos puntas ("pantalla → ánimo").
//
// ⚠️ LA RUTA SE LLAMA `/cosas-chicas` Y LA PANTALLA "Relaciones" (30/07,
// decisión de Matías). El nombre viejo era "Cosas chicas"; cambió el rótulo, no
// la ruta, porque `/relaciones` —que ahora se muestra como "Patrones"— se nombra
// en 18 lugares del código. Ver la nota en `components/nav/Sidebar.tsx`.
//
// ── POR QUÉ ES UNA PANTALLA Y NO UNA PESTAÑA (30/07) ─────────────────────────
// La maqueta decía pestaña dentro de Relaciones, y así se construyó primero.
// Matías pidió separarlas, y separarlas arregla algo concreto: en el menú había
// DOS íconos distintos (la neurona y los tres nodos) apuntando al mismo destino,
// que es un dibujo de más para aprender. Ahora cada uno tiene su pantalla, y las
// dos viven en el menú lateral:
//   - la NEURONA → "Patrones" (`/relaciones`), la lectura del Analista: una
//     tesis, la evidencia, los experimentos. Es a lo que se ENTRA a leer.
//   - los TRES NODOS → "Relaciones" (acá), cruces contables con el dedo. Es lo
//     que se mira DE PASO.
//
// ⚠️ NO HAY DATO DUPLICADO: las dos leen el MISMO análisis guardado (la última
// fila de `analisis`) y lo muestran distinto. Si en algún momento una de las dos
// necesita su propio cálculo, hay que parar y pensarlo: dos motores para lo
// mismo se desincronizan solos, como ya pasó con el badge 'hecho' el 30/07.
/**
 * ⚠️ CUÁNTOS ANÁLISIS SE LEEN, Y POR QUÉ NO UNO SOLO (05/08).
 *
 * Hasta hoy esta pantalla leía **el último análisis y nada más**: dos o tres
 * observaciones. Con eso, contestarlas la dejaba vacía hasta la próxima corrida
 * del Analista, que puede tardar días. Matías: *"si Relaciones hace días que no
 * tiene nada, está vacío. Eso siempre tiene que tener algo"*.
 *
 * Veinte es un techo, no un objetivo: los patrones se repiten entre corridas y
 * `juntarObservaciones` los deduplica, así que veinte análisis no dan veinte
 * tarjetas — dan las relaciones distintas que el Analista encontró en su vida.
 */
const ANALISIS_A_LEER = 20;

export default async function CosasChicasPage() {
  const [corridas, decididas] = await Promise.all([
    db.select().from(analisis).orderBy(desc(analisis.id)).limit(ANALISIS_A_LEER),
    db.select().from(sugerencias).where(eq(sugerencias.tipo, 'observacion')),
  ]);

  // De la más nueva a la más vieja, deduplicando el mismo cruce redactado
  // distinto. Ver `lib/relaciones-historial.ts`.
  const todas = juntarObservaciones(
    corridas.map((c) => verAnalisis(c.fecha, c.resultado)?.observaciones ?? []),
  );

  // ⚠️ LO QUE CONFIRMÓ NO SE ESCONDE: SE MUDA ABAJO. Era lo que vaciaba la
  // pantalla — contestaba las tres que había y no quedaba nada. Y es al revés de
  // lo que parecía: una observación que él validó es el ÚNICO dato de la app que
  // pasó por su criterio. Lo descartado sí desaparece: dijo que no le pasa.
  const { preguntar, confirmadas, dudosas } = separarPorRespuesta(
    todas,
    decididas.filter((s) => s.estado === 'anotada').map((s) => s.contenido),
    decididas.filter((s) => s.estado === 'descartada').map((s) => s.contenido),
    decididas.filter((s) => s.estado === 'en_duda').map((s) => s.contenido),
  );

  // Las que no se pueden reducir a dos puntas quedan afuera solas (ver
  // `relacionesLivianas`): esta pantalla promete "A → B", y una frase que no se
  // parte en dos no cumple esa promesa. Esas viven en Patrones.
  const sinContestarTodas = relacionesLivianas(preguntar, limpiarObservacion);

  /**
   * ⚠️ LAS QUE NO SE PUEDEN CONTESTAR NO VAN EN "SIN CONTESTAR" (06/08).
   *
   * Matías: *"muchas que se están cocinando aparecen en sin contestar… algunas
   * dicen me pasa/no me pasa y otras no dicen nada"*. Y era literal: la tarjeta
   * solo muestra los botones si `fuerza.pideConfirmacion`, o sea si hay
   * evidencia suficiente. Las flojas caían igual en ese apartado **sin ninguna
   * forma de contestarlas**.
   *
   * Un apartado que se llama "Sin contestar" y tiene adentro cosas que no se
   * pueden contestar no es un apartado: es una lista de cosas que no entendés
   * por qué están ahí. Se van con las otras que están esperando datos, que es
   * exactamente lo que son.
   */
  const livianas = sinContestarTodas.filter((r) => r.fuerza.pideConfirmacion);
  const flojas = sinContestarTodas.filter((r) => !r.fuerza.pideConfirmacion);
  const yaConfirmadas = relacionesLivianas(confirmadas, limpiarObservacion);
  // Cocinándose junta ahora TRES motivos, y cada tarjeta dice el suyo: las que
  // contestaste "no sé", y las que todavía no tienen evidencia suficiente.
  const cocinandose = [...relacionesLivianas(dudosas, limpiarObservacion), ...flojas];
  const evidencias = Object.fromEntries(todas.map((o) => [o.patron, o.evidencia]));

  /**
   * ⚠️ ACÁ SE CALCULABA TODO LO DE LAS TRES TARJETAS BORRADAS (06/08): el hilo,
   * "leído hace…", el número de lecturas, los veredictos para el Analista, la
   * frescura del análisis y las cuatro series de ánimo. Se fue con ellas.
   *
   * Las consultas que lo alimentaban también: `registros`, `cuantasLecturas` y
   * los cuatro `max(...)` de última señal. Sacarlas es lo que hace que esta
   * pantalla vuelva a pedirle a la base solo lo que muestra.
   */

  // Resumen semanal: el cacheado si es de esta semana; si no, fallback al toque
  // y el client lo enriquece con IA en segundo plano.
  const [cfgResumen, cfgClave] = await Promise.all([
    db.select().from(config).where(eq(config.clave, 'resumen_texto')),
    db.select().from(config).where(eq(config.clave, 'resumen_clave')),
  ]);
  const esDeEstaSemana = cfgClave[0]?.valor === claveSemana(new Date());
  const textoResumen =
    esDeEstaSemana && cfgResumen[0]?.valor ? cfgResumen[0].valor : fallbackResumen(await datosResumen());

  const vacio =
    livianas.length === 0 && yaConfirmadas.length === 0 && cocinandose.length === 0;

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Relaciones" />
      <div className="mt-4" />

      {/* ── EL RESUMEN DE LA SEMANA, ARRIBA DE TODO (06/08) ──────────────────
          Matías: *"resumen de la semana está bueno, tendría que aparecer arriba
          de todo… porque ahora aparece la cercanía del examen; eso ahí podés
          poner resumen de la semana directamente"*.

          ⚠️ ESTE LUGAR LO TENÍA EL HILO, que había subido acá anoche al borrar
          Patrones, y se va sin haber durado un día. Tenía sentido: era la única
          frase que resumía la lectura. Pero el resumen de la semana hace lo
          mismo mejor —cuenta la semana entera y no una lectura suelta— y **dos
          párrafos que resumen, uno arriba del otro, compiten en vez de sumar**.
          El hilo no se pierde del todo: sigue viviendo adentro del análisis.

          ⚠️ Y DEJA DE ESTAR PLEGADO. Abajo y cerrado, el resumen era algo que
          había que ir a buscar; arriba y abierto es lo primero que la pantalla
          te devuelve, sin pedirte un toque.
          Es la misma regla del 02/08 que ordenó Finanzas: *"darle valor al
          usuario, no darle cosas para que haga"*. */}
      <div className="mb-5">
        <ResumenSemanal texto={textoResumen} esDeEstaSemana={esDeEstaSemana} />
      </div>

      {/* ⚠️ ESTE VACÍO MENTÍA, Y ES EL ARREGLO QUE MÁS IMPORTA. Decía "todavía no
          encontré ninguna relación chica" en el caso más común: que las hubiera
          encontrado TODAS y él ya las hubiera contestado. Ahora solo aparece
          cuando de verdad no hay nada — ni para preguntar ni confirmado. */}
      {vacio ? (
        <div className="tarjeta border border-dashed border-niebla-2 bg-white/60">
          <p className="text-[14px] leading-[1.45] text-tinta-soft text-pretty">
            Todavía no encontré ninguna relación. Aparecen cuando hay unos días de registros para cruzar: pantalla con
            ánimo, siesta con energía, esas cosas. Abajo, en “La lectura completa”, podés pedirme que mire ahora.
          </p>
        </div>
      ) : (
        <>
          {/* ── LOS TRES APARTADOS (05/08) ────────────────────────────────────
              La misma barrita que Seguimiento y Patrones. Acá arregla algo
              propio de esta pantalla: "Lo que confirmaste" **crece para siempre
              y nunca se vacía** (es su gracia), así que con el tiempo empujaba
              hacia abajo lo único que pide algo de vos. Ahora cada montón tiene
              su lugar y ninguno le come el scroll al otro. */}
          <Apartados
            apartados={[
              {
                clave: 'preguntar',
                label: 'Sin contestar',
                n: livianas.length,
                contenido:
                  livianas.length === 0 ? (
                    <p className="rounded-[16px] border border-iris-borde bg-white p-[16px] text-[13px] leading-relaxed text-niebla text-pretty">
                      Contestaste todas las que había. Cuando el Analista cruce datos nuevos, aparecen acá.
                    </p>
                  ) : (
                    <>
                      {livianas.map((r) => (
                        <TarjetaLiviana key={r.patron} r={r} evidencia={evidencias[r.patron] ?? ''} />
                      ))}
                      {/* ⚠️ ACÁ ESTABAN LAS `TarjetaPatron` (06/08). Matías:
                          *"siguen apareciendo tarjetitas de patrones abajo que
                          dicen me pasa, no me pasa, no sé; ya tendrías que
                          sacarlas. Dejar solo las relaciones"*.
                          Es una decisión con costo y conviene tenerla escrita:
                          esas eran las observaciones que **no se pueden partir
                          en dos etiquetas**, y como Patrones ya no existe,
                          sacarlas de acá **las saca de la app entera**. Se le
                          preguntó antes de hacerlo y lo confirmó. Si algún día
                          se las quiere de vuelta, el dato sigue en `analisis`:
                          lo que falta es dónde mostrarlas. */}
                      <p className="mt-3 px-0.5 text-[12.5px] leading-[1.5] text-niebla text-pretty">
                        Son cruces chicos entre dos cosas que registrás. No son una explicación de nada: son algo que se
                        repitió lo suficiente para que valga mirarlo.
                      </p>
                    </>
                  ),
              },
              {
                /* ⚠️ ES LA PARTE QUE NO SE VACÍA NUNCA, y por eso existe esta
                   pantalla en la barra. Cada una la propuso el Analista y **vos
                   dijiste que te pasa**: es el único contenido de toda la app
                   que pasó por tu criterio, y hasta el 05/08 se tiraba a la
                   basura apenas la contestabas.
                   ⚠️ NO TIENEN BOTONES. No se vuelven a preguntar ni se pueden
                   "descontestar" de un toque: ya las contestaste. Es una lista
                   de lo que sabés de vos, no una bandeja de pendientes. */
                clave: 'confirmadas',
                label: 'Confirmadas',
                n: yaConfirmadas.length,
                contenido:
                  yaConfirmadas.length === 0 ? (
                    <p className="tarjeta border border-iris-borde bg-white text-[13px] leading-relaxed text-niebla text-pretty">
                      Acá quedan las que digas que te pasan. Es lo que la app sabe de vos con tu confirmación, no con su
                      cálculo.
                    </p>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-[18px] bg-white sombra-card">
                        {yaConfirmadas.map((r) => (
                          <div key={r.patron} className="border-b border-[#f1f0f7] p-[13px_15px] last:border-none">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              {r.lados.map((l) => (
                                <span
                                  key={l.clave}
                                  className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                                  style={{ background: `color-mix(in oklab, ${l.color} 14%, #fff)`, color: l.color }}
                                >
                                  {l.etiqueta}
                                </span>
                              ))}
                              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-verde)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-[13px]">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className="text-[13.5px] leading-[1.4] text-tinta text-pretty">{r.frase}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 px-0.5 text-[12.5px] leading-[1.5] text-niebla text-pretty">
                        Estas las dijiste vos: el Analista las propuso y las diste por ciertas.
                      </p>
                    </>
                  ),
              },
              {
                clave: 'cocinandose',
                label: 'Cocinándose',
                n: cocinandose.length,
                contenido:
                  cocinandose.length === 0 ? (
                    <p className="tarjeta border border-iris-borde bg-white text-[13px] leading-relaxed text-niebla text-pretty">
                      Las que contestes “no sé” quedan acá, y te las vuelvo a preguntar cuando haya más días.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-[7px]">
                      {cocinandose.map((r) => (
                        <div key={r.patron} className="rounded-[16px] border border-dashed border-niebla-2 bg-white p-[13px_14px]">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            {r.lados.map((l) => (
                              <span
                                key={l.clave}
                                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
                                style={{ background: `color-mix(in oklab, ${l.color} 14%, #fff)`, color: l.color }}
                              >
                                {l.etiqueta}
                              </span>
                            ))}
                          </div>
                          <p className="text-[13.5px] leading-[1.4] text-tinta-soft text-pretty">{r.frase}</p>
                          <p className="mt-1.5 font-mono text-[11px] text-niebla text-pretty">
                            Dijiste que no sabías — te la vuelvo a preguntar con más días.
                          </p>
                        </div>
                      ))}
                    </div>
                  ),
              },
            ]}
            inicial={livianas.length > 0 ? 'preguntar' : undefined}
          />

          {/* ⚠️ ACÁ HABÍA UN ENLACE A PATRONES ("hay otras N cosas que noté que
              no entran en dos etiquetas, están en Patrones"). Se fue con la
              pantalla: esas observaciones ahora se muestran arriba, en Sin
              contestar. Un enlace a una pantalla borrada es un 404 con cara de
              función. */}
        </>
      )}

      {/* ── ⚠️ LAS TRES TARJETAS DE ABAJO SE FUERON (06/08) ───────────────────
          Vinieron de Patrones anoche y no llegaron a las 24 horas. Matías:
          *"todas las tarjetitas de patrones ya no las vamos a usar, no sirven,
          y la lectura completa también sacala"*.

          Dónde quedó cada una, porque ninguna se perdió:
          · **Resumen de la semana** → subió arriba de todo, abierto.
          · **Cómo viene tu ánimo** → se fue a Cuerpo, adentro de Ánimo, que es
            donde él lo pidió: *"ese gráfico, esa tarjetita que dice promedio,
            ponelo directamente en Cuerpo, en la parte de ánimo"*. Ya está ahí.
          · **La lectura completa** → borrada. Ayer se había quedado por lo que
            HACE (correr el análisis), con el nombre marcado como problema. Hoy
            la cortó entera, así que el nombre dejó de ser el tema.

          ⚠️ LO QUE HAY QUE MIRAR SI ALGO DEJA DE ANDAR: con el panel del
          Analista borrado, **ya no queda ningún botón en la app para correr el
          análisis a mano**. Corre solo cuando hay datos nuevos
          (`necesitaAnalisis`), que es como funciona el 99% del tiempo, pero si
          alguna vez hace falta forzarlo, el disparador hay que volver a poner.
      */}
    </div>
  );
}

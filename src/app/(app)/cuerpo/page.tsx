import { and, asc, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, config, cuerpo, marcas, periodos } from '@/lib/db/schema';
import { lecturasCerebro } from '@/lib/cerebro';
import { CerebroCard } from '@/components/cuerpo/CerebroCard';
import { ymd } from '@/lib/marcas';
import { serieSueno, promedioSueno, serieSenal, nivelSenal, type RegistroSueno } from '@/lib/cuerpo';
import { GraficoSueno } from '@/components/cuerpo/GraficoSueno';
import { RegistrarSueno } from '@/components/cuerpo/RegistrarSueno';
import { MetaSuenio } from '@/components/perfil/MetaSuenio';
import { META_SUENIO_DEFECTO } from '@/lib/cuerpo';
import { CicloCard } from '@/components/cuerpo/CicloCard';
import { SenalesPanel } from '@/components/cuerpo/SenalesPanel';
import { TituloFijo } from '@/components/ui/TituloFijo';
import { estadoCiclo } from '@/lib/ciclo';
import { TituloSeccion } from '@/components/ui/TituloSeccion';
import { AnillosHoy, type AnilloConHoja } from '@/components/cuerpo/AnillosHoy';
import { PastillasCuerpo, type Pastilla } from '@/components/cuerpo/PastillasCuerpo';
// ⚠️ ESTOS TRES VINIERON DE `/animo`, que se borró el 05/08: su contenido ahora
// se despliega desde la pastilla de Ánimo, acá abajo.
import { GraficoAnimo } from '@/components/animo/GraficoAnimo';
import { AnimoUI, type AnimoInicial } from '@/components/animo/AnimoUI';
import { moodDe, serieAnimo, serieSemanas, serieMeses, resumenAnimo, type MoodKey } from '@/lib/animo';
// (GLIFO_LUNA y GLIFO_PULSO salieron con sus secciones: Descanso y Cómo venís
//  ahora se despliegan desde su pastilla, que trae su propio ícono.)
import { GLIFO_CEREBRO } from '@/components/ui/glifos';

export const dynamic = 'force-dynamic';

// Un ícono por sección: en una pantalla larga la forma se reconoce antes que la
// palabra, y se puede scrollear buscando el dibujo (pedido de Matías).
function Ic({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
      {children}
    </svg>
  );
}
const IcCerebro = <Ic color="var(--color-oro-2)">{GLIFO_CEREBRO}</Ic>;
const IcCiclo = (
  <Ic color="var(--color-anillo-cuerpo)">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7v5l3 2" />
  </Ic>
);


export default async function CuerpoPage() {
  const hace8 = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const hace15 = new Date(Date.now() - 15 * 86_400_000).toISOString();
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  // Ventana de los últimos 7 días para la tarjeta del cerebro.
  const hace7 = new Date(Date.now() - 7 * 86_400_000);

  const [suenos, comidas, cfgRows, periodosRows, senales, checkinsRecientes, marcasSemana, checkinHoy, todoCuerpo] = await Promise.all([
    db
      .select({ valor: cuerpo.valor, calidad: cuerpo.calidad, creado: cuerpo.creado })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'sueno'), gte(cuerpo.creado, hace8)))
      .orderBy(desc(cuerpo.creado)),
    db
      .select({ id: cuerpo.id, nota: cuerpo.nota, creado: cuerpo.creado })
      .from(cuerpo)
      .where(and(eq(cuerpo.tipo, 'comida'), gte(cuerpo.creado, inicioHoy.toISOString())))
      .orderBy(desc(cuerpo.creado)),
    db.select().from(config).where(inArray(config.clave, ['genero', 'sigue_ciclo', 'meta_suenio'])),
    db.select().from(periodos).orderBy(asc(periodos.inicio)),
    db
      .select({ tipo: cuerpo.tipo, valor: cuerpo.valor, creado: cuerpo.creado })
      .from(cuerpo)
      .where(and(inArray(cuerpo.tipo, ['energia', 'libido']), gte(cuerpo.creado, hace15)))
      .orderBy(desc(cuerpo.creado)),
    // Check-ins generales de la última semana: de acá salen las palabras
    // (estresado/ansioso) y los factores sociales de la tarjeta del cerebro.
    db
      .select({ estado: animoCheckins.estado, factores: animoCheckins.factores, palabras: animoCheckins.palabras })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, hace7.toISOString())))
      .orderBy(desc(animoCheckins.creado)),
    db.select({ fecha: marcas.fecha }).from(marcas).where(gte(marcas.fecha, ymd(hace7))),
    // ── Los tres anillos de "Hoy" (se mudaron del Home el 27/07) ──────────────
    // El check-in de hoy ENTERO: el estado da el color y factores/palabras dicen
    // cuánto lo llenaste. El anillo mide cuánto registraste, no qué tan bien te
    // fue: ver la nota larga en AnillosDia.tsx.
    db
      .select({ estado: animoCheckins.estado, factores: animoCheckins.factores, palabras: animoCheckins.palabras })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, inicioHoy.toISOString())))
      .orderBy(desc(animoCheckins.creado))
      .limit(1),
    // Todo lo que hay en `cuerpo`, sin ventana de tiempo: alimenta la lista de
    // abajo, que contesta "¿qué está juntando la app y desde cuándo?" (29/07).
    db.select({ tipo: cuerpo.tipo, valor: cuerpo.valor, calidad: cuerpo.calidad, nota: cuerpo.nota, creado: cuerpo.creado }).from(cuerpo),
  ]);

  const cfg = new Map(cfgRows.map((r) => [r.clave, r.valor]));
  const sigueCiclo = cfg.get('sigue_ciclo') === '1';
  // Series de 14 días de energía y libido, para el gráfico. Y si ya cargó hoy,
  // para no volver a invitar a hacerlo.
  const serieEnergia = serieSenal(senales.filter((s) => s.tipo === 'energia'), new Date(), 14);
  const serieLibido = serieSenal(senales.filter((s) => s.tipo === 'libido'), new Date(), 14);
  // (`cargoSenalHoy` se fue el 06/08 con el botón condicional del panel: las
  //  barras de energía y libido están siempre, hayas cargado o no.)

  const comidasHoy = comidas
    .filter((c) => c.nota)
    .map((c) => ({
      id: c.id,
      nota: c.nota as string,
      hora: new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(c.creado)),
    }));

  const serie = serieSueno(suenos as RegistroSueno[]);
  const promedio = promedioSueno(serie);
  const deHoy = suenos.find((s) => s.creado >= inicioHoy.toISOString());

  // Lo que suele haber detrás de lo que anotó. Ojo: solo pasa datos reales; si
  // no alcanzan, `lecturasCerebro` devuelve [] y la tarjeta lo dice.
  const listaJson = (v: string | null): string[] => {
    try {
      const arr = JSON.parse(v ?? '[]');
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  const lecturas = lecturasCerebro({
    suenos: suenos.map((s) => s.valor),
    checkins: checkinsRecientes.map((c) => ({
      estado: c.estado,
      factores: listaJson(c.factores),
      palabras: listaJson(c.palabras),
    })),
    diasMarcados: new Set(marcasSemana.map((m) => m.fecha)).size,
  });

  // ── Los tres anillos de "Hoy" ───────────────────────────────────────────────
  // Mismo criterio que tenían en el Home: el relleno mide CUÁNTO REGISTRASTE de
  // cada área, no qué tan bien te fue. Un día de bajón no es un anillo vacío.
  const checkin = checkinHoy[0];
  const mood = moodDe(checkin?.estado);
  const listaLlena = (v: string | null | undefined) => listaJson(v ?? null).length > 0;
  // Ánimo se llena en tres partes: la carita, los factores y las palabras.
  const partesAnimo = checkin ? 1 + (listaLlena(checkin.factores) ? 1 : 0) + (listaLlena(checkin.palabras) ? 1 : 0) : 0;

  const metaSuenio = Number(cfg.get('meta_suenio')) || META_SUENIO_DEFECTO;
  const minutosSueno = deHoy?.valor ?? 0;
  // Anotar la calidad es lo que lo termina de cerrar: sin ella queda en 85%.
  const progresoSueno = deHoy ? Math.min(minutosSueno / metaSuenio, 1) * (deHoy.calidad ? 1 : 0.85) : 0;
  const textoSueno = deHoy ? `${Math.floor(minutosSueno / 60)}h${String(minutosSueno % 60).padStart(2, '0')}` : null;

  // ⚠️ EL TERCER ANILLO ES "CÓMO VENÍS", NO SEGUIMIENTO (27/07, Matías).
  // Seguimiento no es cuerpo: marcar que hiciste alemán no dice nada de cómo
  // está tu cuerpo, y encima ya tiene su propia pestaña con el mes entero.
  // Energía y libido sí: son las dos señales que se cargan una vez por día y
  // que después explican por qué un día rindió y otro no.
  const senalesHoy = senales.filter((s) => s.creado >= inicioHoy.toISOString());
  const tiposSenal = new Set(senalesHoy.map((s) => s.tipo));
  // El último valor de hoy de cada una, para mostrarlo en su anillo.
  const ultimoDeHoy = (tipo: string) =>
    todoCuerpo
      .filter((r) => r.tipo === tipo && r.creado >= inicioHoy.toISOString())
      .sort((a, b) => (a.creado < b.creado ? 1 : -1))[0]?.valor ?? null;
  // ⚠️ ALTO / MEDIO / BAJO, no "4/5" (29/07, Matías). Se guarda 1-5 porque el
  // gráfico de catorce días lo necesita; lo que se muestra es el rótulo. Ver la
  // nota en `nivelSenal`.
  const valorEnergia = nivelSenal(ultimoDeHoy('energia'));
  const valorLibido = nivelSenal(ultimoDeHoy('libido'));

  const anillos: AnilloConHoja[] = [
    {
      etiqueta: 'Ánimo',
      accion: 'Contar',
      color: mood?.color ?? 'var(--color-anillo-pista)',
      deep: mood?.deep ?? 'var(--color-niebla)',
      progreso: partesAnimo / 3,
      valor: mood?.label ?? null,
      hoja: 'animo',
    },
    {
      etiqueta: 'Sueño',
      accion: 'Anotar',
      color: 'var(--color-anillo-suenio)',
      deep: 'var(--color-anillo-suenio-deep)',
      progreso: progresoSueno,
      valor: textoSueno,
      hoja: 'sueno',
    },
    // ⚠️ ENERGÍA Y LIBIDO VAN SEPARADAS (29/07, pedido de Matías). Antes eran un
    // solo anillo "Cómo venís" que se llenaba de a mitades, y no se podía elegir
    // ver una sin la otra. Ahora cada una tiene su anillo y su pastilla, y la
    // ruedita decide cuáles ver.
    {
      etiqueta: 'Energía',
      accion: 'Marcar',
      color: 'var(--color-anillo-cuerpo)',
      deep: 'var(--color-anillo-cuerpo-deep)',
      progreso: tiposSenal.has('energia') ? 1 : 0,
      valor: valorEnergia,
      hoja: 'energia',
    },
    {
      etiqueta: 'Libido',
      accion: 'Marcar',
      // El rosa de la paleta. NO un color mezclado: en esta app el hue YA
      // significa algo y sumarle un significado nuevo rompe el idioma.
      color: 'var(--color-rosa)',
      deep: 'var(--color-rosa)',
      progreso: tiposSenal.has('libido') ? 1 : 0,
      valor: valorLibido,
      hoja: 'libido',
    },
  ];


  // ── Las filas de la tarjeta: lo que se MIRA y se CARGA ────────────────────
  // Van DENTRO de la tarjeta del anillo, del ancho entero, con el dato de hoy,
  // el ícono y el vidrio (pedido de Matías, 29/07 de noche).
  //
  // ⚠️ CADA FILA LLEVA EL COLOR DE SU ANILLO. Es lo que la vuelve, además de
  // botón, la leyenda del dibujo de arriba — y por eso el anillo ya no necesita
  // filas propias.
  //
  // (Acá hubo una lista de solo lectura con todas las señales y su historial.
  // Matías la descartó: *"respiración, libido, energía ahí no tienen sentido
  // porque no podés editar ni nada"*. Tenía razón — en Cuerpo lo que se necesita
  // es la puerta para cargar, no un resumen para mirar.)
  const hoyISO = inicioHoy.toISOString();
  // Estado del ciclo para la pastilla: en qué día va y cuántos faltan.
  const estadoCicloHoy = sigueCiclo && periodosRows.length > 0 ? estadoCiclo(periodosRows) : null;
  const diasParaProximo = estadoCicloHoy
    ? Math.max(
        0,
        Math.round(
          (new Date(`${estadoCicloHoy.proximoInicio}T12:00:00`).getTime() - inicioHoy.getTime()) / 86_400_000,
        ),
      )
    : 0;
  const cargadoHoy = (tipo: string) => todoCuerpo.some((r) => r.tipo === tipo && r.creado >= hoyISO);

  const comidasDeHoy = comidasHoy.length;

  /**
   * ── LOS DATOS QUE ERAN DE `/animo` (05/08) ─────────────────────────────────
   * 190 días cubren los seis meses del switcher del gráfico. Es la misma
   * consulta que hacía aquella pantalla, movida acá con ella.
   * ⚠️ NO se trajo la `BarraPatrones` que tenía arriba: mandaba a Patrones, que
   * ya no existe, y lo que noté vive en Relaciones.
   */
  const registrosAnimo = await db
    .select()
    .from(animoCheckins)
    .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, new Date(Date.now() - 190 * 86_400_000).toISOString())))
    .orderBy(desc(animoCheckins.creado));

  const serieAnimoDia = serieAnimo(registrosAnimo);
  const semanasAnimo = serieSemanas(registrosAnimo);
  const mesesAnimo = serieMeses(registrosAnimo);
  const resumenDeAnimo = resumenAnimo(registrosAnimo);

  // Si ya registró hoy, se precarga para poder editarlo en vez de duplicarlo.
  const arranqueHoy = new Date();
  arranqueHoy.setHours(0, 0, 0, 0);
  const animoDeHoy = registrosAnimo.find((r) => new Date(r.creado) >= arranqueHoy);
  const leerArr = (t: string | null): string[] => {
    if (!t) return [];
    try {
      const v = JSON.parse(t);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const animoInicial: AnimoInicial = animoDeHoy
    ? {
        estado: animoDeHoy.estado as MoodKey,
        factores: leerArr(animoDeHoy.factores),
        palabras: leerArr(animoDeHoy.palabras),
        nota: animoDeHoy.nota ?? '',
      }
    : null;

  const pastillas: Pastilla[] = [
    {
      clave: 'animo',
      nombre: 'Ánimo',
      // ⚠️ SIN `hoja`: ya no abre la hoja de carga, se DESPLIEGA. Adentro está
      // todo lo que era la pantalla `/animo`, que se borró (05/08, Matías:
      // *"hoy en día Ánimo aparece como una pantalla propia; eliminá esa
      // pantalla y lo que aparece ponelo en este botón"*).
      panel: (
        <div className="-m-[11px_13px] flex flex-col gap-3 p-[2px]">
          <GraficoAnimo serie={serieAnimoDia} semanas={semanasAnimo} meses={mesesAnimo} resumen={resumenDeAnimo} />
          <AnimoUI inicial={animoInicial} />
        </div>
      ),
      hecho: partesAnimo > 0,
      valor: mood?.label ?? null,
      anillo: 'Ánimo',
      // Sin check-in el mood no tiene color: se cae al iris, que es la identidad
      // de Ánimo en el resto de la app (los chips, la hoja).
      color: mood?.color ?? 'var(--color-iris)',
      deep: mood?.deep ?? 'var(--color-iris-deep)',
    },
    {
      clave: 'sueno',
      // ⚠️ "DESCANSO" Y NO "SUEÑO" (05/08, Matías: *"acá están descanso, pero
      // tendrían que ser sueño, o descanso… lo mantenemos en descanso"*). Los
      // dos nombres convivían para la misma cosa: la sección de abajo decía
      // Descanso y esta pastilla decía Sueño. La `clave` queda `sueno` porque es
      // el identificador del dato, no lo que se lee.
      nombre: 'Descanso',
      panel: (
        <div className="flex flex-col gap-3 p-[2px]">
          <GraficoSueno serie={serie} promedio={promedio} />
          <RegistrarSueno yaHoy={deHoy ? { minutos: deHoy.valor ?? 0, calidad: deHoy.calidad ?? null } : null} />
          {/* ⚠️ LA META SE VINO ADENTRO con el resto de la sección. Si quedaba
              afuera, "cuánto querés dormir" iba a parar a una pantalla sin
              sección propia — o sea, a ningún lado. */}
          <MetaSuenio inicial={Number(cfg.get('meta_suenio')) || META_SUENIO_DEFECTO} />
        </div>
      ),
      hecho: cargadoHoy('sueno'),
      // La única que se cierra de verdad: anoche dormiste lo que dormiste. Por
      // eso cargada muestra un tilde y no un `+` (ver `unaVezPorDia`). Las otras
      // cinco se pueden volver a cargar en el día, así que ahí el `+` es la
      // verdad de lo que pasa si las tocás.
      unaVezPorDia: true,
      valor: textoSueno,
      anillo: 'Sueño',
      color: 'var(--color-anillo-suenio)',
      deep: 'var(--color-anillo-suenio-deep)',
    },
    {
      clave: 'comida',
      nombre: 'Alimentación',
      // ⚠️ SIN `hoja` DESDE EL 03/08: tocarla ya no abre el formulario de carga,
      // muestra QUÉ comiste. Pedido de Matías, y va de la mano con que la carga
      // se mudó entera a `/alimentacion` el mismo día.
      hecho: cargadoHoy('comida'),
      // Acá el dato es CUÁNTAS anotaste: la comida no tiene un valor del día
      // como el sueño, se carga varias veces.
      // Y NO TIENE ANILLO, así que su dato se muestra en el botón: es lo único
      // que lo dice.
      valor: comidasDeHoy > 0 ? `${comidasDeHoy} ${comidasDeHoy === 1 ? 'anotada' : 'anotadas'}` : null,
      detalle: comidasHoy.map((c) => ({ texto: c.nota, hora: c.hora })),
      // Sin `verEn`: llevaba a /alimentacion, que no está en esta copia.
      color: 'var(--color-verde)',
      deep: 'var(--color-verde)',
    },
    {
      /**
       * ⚠️ ENERGÍA Y LIBIDO, EN UN SOLO BOTÓN (05/08, Matías: *"energía y libido
       * tenían que unirse en un botón, y tendría que mostrar de cuánto es el
       * puntaje de energía y cuánto libido ahí nomás"*).
       *
       * Se llama "Cómo venís" porque **ya se llamaba así**: es el título que
       * tenía la sección de abajo, la que este botón se comió. Él mismo lo dijo
       * dudando —*"puede ser cómo venís o cómo estás… como estaba eso, dejalo
       * así"*— y el nombre que ya estaba escrito gana: no hay que aprenderlo.
       *
       * ⚠️ LOS DOS ANILLOS SIGUEN SIENDO DOS. Se une el botón, no el dato: en el
       * aro de arriba Energía y Libido se siguen viendo por separado y se
       * siguen pudiendo elegir de a una con la ruedita.
       */
      clave: 'senales',
      nombre: 'Cómo venís',
      panel: (
        <div className="p-[2px]">
          <SenalesPanel
            energia={serieEnergia}
            libido={serieLibido}
            nivelEnergia={ultimoDeHoy('energia')}
            nivelLibido={ultimoDeHoy('libido')}
          />
        </div>
      ),
      hecho: cargadoHoy('energia') || cargadoHoy('libido'),
      // Los dos puntajes juntos, que es lo que pidió ver "ahí nomás".
      valor: [valorEnergia && `E ${valorEnergia}`, valorLibido && `L ${valorLibido}`].filter(Boolean).join(' · ') || null,
      color: 'var(--color-anillo-cuerpo)',
      deep: 'var(--color-anillo-cuerpo-deep)',
    },
    {
      /**
       * CONCENTRACIÓN: por ahora un placeholder, y está dicho en pantalla.
       * Matías: *"podríamos agregar otro botón que sea concentración y que tenga
       * un cerebrito… dejarlo como placeholder para después ver si lo cambiamos
       * o lo agregamos"*.
       *
       * ⚠️ NO PROMETE NADA QUE NO HAGA: no tiene `+`, y al abrirse dice que
       * todavía no registra. Un botón que parece cargable y no carga es peor que
       * no tenerlo.
       */
      clave: 'concentracion',
      nombre: 'Concentración',
      panel: (
        <p className="p-[2px] text-[12.5px] leading-relaxed text-niebla text-pretty">
          Todavía no registra nada. La idea es medir cuánto pudiste sostener la atención en el día y cruzarlo con el
          sueño y la energía. Está acá para verlo en su lugar antes de construirlo.
        </p>
      ),
      hecho: false,
      valor: null,
      color: 'var(--color-iris)',
      deep: 'var(--color-iris-deep)',
    },
    // ⚠️ SOLO SI SIGUE EL CICLO (29/07, idea de Matías). Para quien lo sigue es
    // de las señales que más explica el resto (energía, ánimo, sueño); para
    // quien no, no aparece: mejor una fila menos que una que nunca va a tocar.
    // No abre hoja para "cargar": dice en qué día del ciclo estás, y el detalle
    // vive en la tarjeta de Ciclo, más abajo en esta misma pantalla.
    ...(sigueCiclo
      ? [
          {
            clave: 'ciclo',
            nombre: 'Ciclo',
            hecho: !!estadoCicloHoy,
            valor: estadoCicloHoy
              ? estadoCicloHoy.enPeriodo
                ? `Día ${estadoCicloHoy.diaCiclo}`
                : `Faltan ${diasParaProximo} d`
              : null,
            color: 'var(--color-rosa)',
            deep: 'var(--color-rosa)',
          } satisfies Pastilla,
        ]
      : []),
  ];

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Cuerpo" />
      <div className="mt-4" />

      {/* "Hoy" arriba de todo: es el estado del día y contesta la pregunta con
          la que se entra acá. Vino del Home el 27/07.

          ⚠️ LA TARJETA QUEDÓ SOLO CON EL ARO Y LA RUEDITA (05/08, Matías: *"esta
          tarjeta que tiene los anillos dejaría solamente los anillos y la
          ruedita para modificar lo que querés que se vea; los botones los
          sacaría de la tarjeta, pero los dejaría como están"*).
          Los botones bajaron afuera y cada uno **se despliega** con lo que lo
          compone. El aro quedó siendo una sola cosa: el estado del día. */}
      <AnillosHoy anillos={anillos} brillos={mood?.key === 'genial'} soloVer />

      {/* ── LOS BOTONES, AFUERA Y DESPLEGABLES ────────────────────────────────
          ⚠️ ESTO REEMPLAZA A LAS SECCIONES DE ABAJO, no se suma a ellas. Antes
          la misma señal aparecía DOS veces en esta pantalla: como pastilla
          arriba y como sección con título más abajo (Descanso, Cómo venís). Se
          borraron las secciones: lo que tenían adentro es exactamente lo que
          ahora se despliega desde su botón.
          *"Que te permita agregar, pero también ver los datos que ya hay
          adentro"*. */}
      <div className="mb-6">
        <PastillasCuerpo pastillas={pastillas} enAnillo={new Set(anillos.map((a) => a.etiqueta))} />
      </div>

      <TituloSeccion icono={IcCerebro}>Lo que no se ve</TituloSeccion>
      <div className="mb-6">
        <CerebroCard lecturas={lecturas} />
      </div>

      {/* ⚠️ ACÁ VIVÍA ALIMENTACIÓN ENTERA, con su formulario de carga. Se mudó a
          `/alimentacion` el 03/08 a pedido de Matías: el apartado ya existe desde
          el 02/08 y tener la carga en dos lados hacía que Cuerpo fuera el camino
          real y el apartado una vidriera.

          Lo que queda en Cuerpo es la PASTILLA del día (ver `PastillasCuerpo`),
          que muestra qué comiste hoy sin traerse el formulario de vuelta. */}

      {sigueCiclo && (
        <>
          <TituloSeccion icono={IcCiclo}>Ciclo</TituloSeccion>
          <div className="mb-6">
            <CicloCard periodos={periodosRows} />
          </div>
        </>
      )}

      {/* ⚠️ ACÁ ESTABA "CÓMO VENÍS" (energía y libido). Se fue adentro del botón
          que ahora lleva ese mismo nombre, arriba. */}

      <p className="mt-2 px-1 text-[12px] leading-relaxed text-niebla text-pretty">
        ¿Necesitás bajar un cambio? Abrí <span className="font-semibold text-iris-deep">Calma</span> desde el menú para
        respirar a pantalla completa.
      </p>
    </div>
  );
}

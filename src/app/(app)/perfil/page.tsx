import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config, cuerpo } from '@/lib/db/schema';
import { leerTokens } from '@/lib/google/auth';
import { NIVELES_DEFAULT, type Niveles } from '@/lib/personalidad';
import { PersonalidadPerfil } from '@/components/perfil/PersonalidadPerfil';
import { SobreVosPerfil } from '@/components/perfil/SobreVosPerfil';
import { DondeVivis } from '@/components/perfil/DondeVivis';
import { ConexionesNativas } from '@/components/perfil/ConexionesNativas';
import { VozPerfil } from '@/components/perfil/VozPerfil';
import { SonidoPerfil } from '@/components/perfil/SonidoPerfil';
import { TiempoPantalla, type PantallaHoy } from '@/components/cuerpo/TiempoPantalla';
import { type AppUso } from '@/lib/pantalla';
import type { Genero } from '@/lib/actions/sobre-vos';
import { GoogleConexion } from '@/components/perfil/GoogleConexion';
import { BotonSalir } from '@/components/perfil/BotonSalir';
import { BotonRehacerRueda } from '@/components/perfil/BotonRehacerRueda';
import { RitualPerfil } from '@/components/perfil/RitualPerfil';
import { leerEstadoRitual } from '@/lib/actions/ritual';

export const dynamic = 'force-dynamic';

function parseNiveles(s: string | undefined): Niveles {
  if (!s) return NIVELES_DEFAULT;
  try {
    return { ...NIVELES_DEFAULT, ...(JSON.parse(s) as Partial<Niveles>) };
  } catch {
    return NIVELES_DEFAULT;
  }
}

// Rótulo de las secciones de Perfil. Usa el mismo tamaño y la misma serif que
// TituloSeccion; se queda como constante local porque acá lleva el margen de
// arriba que separa un bloque del anterior.
const ROTULO = 'mb-3 mt-7 font-serif text-[19px] font-semibold tracking-[-0.2px] text-tinta';

export default async function Perfil() {
  const filas = await db.select().from(config);
  // Tiempo en pantalla se mudó acá desde Cuerpo (26/07): es un dato crudo que
  // se mira de vez en cuando, no algo que registrás. Cuerpo quedó para lo que
  // te devuelve una lectura; los datos sueltos viven en "Base de datos".
  const pantallaRows = await db
    .select({ valor: cuerpo.valor, nota: cuerpo.nota, creado: cuerpo.creado })
    .from(cuerpo)
    .where(eq(cuerpo.tipo, 'pantalla'))
    .orderBy(desc(cuerpo.creado))
    .limit(1);
  const pr = pantallaRows[0];
  let pantallaHoy: PantallaHoy = null;
  if (pr?.valor != null) {
    let apps: AppUso[] = [];
    try {
      const arr = JSON.parse(pr.nota ?? '[]');
      if (Array.isArray(arr)) apps = arr;
    } catch {
      apps = [];
    }
    pantallaHoy = {
      totalMin: pr.valor,
      apps,
      hora: new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(pr.creado)),
    };
  }
  const cfg = new Map(filas.map((f) => [f.clave, f.valor]));
  const estadoRitual = await leerEstadoRitual();
  const googleConectado = (await leerTokens()) != null;

  const nombre = cfg.get('nombre') ?? 'Matías';
  const inicial = nombre.trim().charAt(0).toUpperCase() || 'M';
  const niveles = parseNiveles(cfg.get('personalidad_niveles'));

  const generoInicial = (['mujer', 'hombre', 'reservado'].includes(cfg.get('genero') ?? '')
    ? cfg.get('genero')
    : null) as Genero | null;
  let neuroInicial: string[] = [];
  try {
    const arr = JSON.parse(cfg.get('neurodivergencia') ?? '[]');
    if (Array.isArray(arr)) neuroInicial = arr.map(String);
  } catch {
    neuroInicial = [];
  }

  return (
    <div className="flotar px-[22px] pb-2 pt-2">
      {/* header */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/chat"
          aria-label="Volver"
          className="flex size-10 flex-none items-center justify-center rounded-full bg-white shadow-[0_4px_14px_rgba(50,50,90,.06)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#1c1c2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.4px] text-tinta">Perfil</h1>
      </div>

      {/* identidad */}
      <div
        className="flex items-center gap-4 tarjeta border border-iris-borde shadow-[0_6px_20px_rgba(108,120,238,.08)]"
        style={{ background: 'linear-gradient(135deg,var(--color-iris-tint-2) 0%,#f4ecfe 52%,#e9f2fe 100%)' }}
      >
        <div
          className="flex size-[60px] flex-none items-center justify-center rounded-full text-[24px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 6px 16px rgba(108,120,238,.35)' }}
        >
          {inicial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-bold tracking-[-0.2px] text-tinta">{nombre}</p>
          <p className="mt-1 font-mono text-[11px] font-semibold tracking-[0.3px] text-[#7a7a93]">Expediente personal · v0.1</p>
        </div>
      </div>

      {/* sobre vos */}
      <p className={ROTULO}>Sobre vos</p>
      <SobreVosPerfil
        generoInicial={generoInicial}
        sigueCicloInicial={cfg.get('sigue_ciclo') === '1'}
        neuroInicial={neuroInicial}
      />

      {/* dónde vivís: el contexto real, el que te atraviesa */}
      <p className={ROTULO}>Dónde vivís</p>
      <DondeVivis inicial={cfg.get('lugar') ?? null} />

      {/* personalidad */}
      <p className={ROTULO}>Personalidad del asistente</p>
      <PersonalidadPerfil inicial={niveles} />

      {/* voz */}
      <p className={ROTULO}>Voz del asistente</p>
      <VozPerfil vozInicial={cfg.get('voz') ?? 'kokoro:em_alex'} vozAutoInicial={cfg.get('voz_auto') === '1'} />

      {/* ── EL RITUAL (26/07, hecho el 04/08) ────────────────────────────────
          ⚠️ VA ANTES DE LAS CONEXIONES, y no es un orden cualquiera: esto es lo
          único de Perfil que cambia cómo usás la app todos los días. Las
          conexiones son plomería (traer pasos, traer eventos); esto decide si la
          app te busca o te espera. */}
      <p className={ROTULO}>El ritual del día</p>
      <RitualPerfil inicial={estadoRitual} />

      {/* conexiones del iPhone (Salud, Calendario). Su componente va PEGADO al
          título: antes se habían colado dos secciones en el medio y el título
          quedaba huérfano, encimado con lo que venía abajo. */}
      <p className={ROTULO}>Conexiones del iPhone</p>
      <ConexionesNativas />

      {/* Datos crudos que se miran de vez en cuando, no cosas que registrás. */}
      <p className={ROTULO}>Base de datos</p>
      <TiempoPantalla ultimo={pantallaHoy} />

      <SonidoPerfil />

      {/* cuentas */}
      <p className={ROTULO}>Cuentas conectadas</p>
      <div className="rounded-[18px] bg-white px-[18px] shadow-[0_4px_18px_rgba(50,50,90,.05)]">
        <div className="flex items-center gap-3 border-b border-[rgba(108,120,238,.08)] py-[15px]">
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[12px] bg-verde-tint">
            <svg viewBox="0 0 24 24" fill="none" stroke="#3d9b80" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[19px]">
              <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-tinta">Google</p>
            <p className="mt-px font-mono text-[12px] text-niebla">Gmail + Calendar</p>
          </div>
          {googleConectado ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-verde-tint px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.2px] text-verde">
              <span className="size-1.5 rounded-full bg-verde" />
              Conectado
            </span>
          ) : (
            <GoogleConexion conectado={false} />
          )}
        </div>
      </div>

      {/* rueda */}
      <p className={ROTULO}>Tu rueda de la vida</p>
      <BotonRehacerRueda />

      <div className="mt-7">
        <BotonSalir />
      </div>
      <p className="mt-4 text-center font-mono text-[12px] text-niebla-3">Tegmento · v0.1</p>
    </div>
  );
}

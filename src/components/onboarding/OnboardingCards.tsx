'use client';

import { useState } from 'react';
import { completarOnboardingCards } from '@/lib/actions/onboarding-cards';
import { SobreVosCampos } from '@/components/perfil/SobreVosCampos';
import type { Genero } from '@/lib/actions/sobre-vos';
import { GLIFO_IA } from '@/components/ui/glifos';

const GRAD_IRIS = 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))';
const SOMBRA_CTA = '0 8px 20px rgba(108,120,238,.35)';

// Catálogo por categorías (genérico, sin sesgo): listas largas para tocar lo
// que aplica. Cada categoría con su ícono. Se agregan propias al final.
const ic = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[16px]">
    <path d={d} />
  </svg>
);
const CATEGORIAS: { nombre: string; icono: React.ReactNode; opciones: string[] }[] = [
  { nombre: 'Deportes', icono: ic('M13 4v3M6 8l3 3M13 7a5 5 0 1 0 .1 0M6 21l2-5 3 1 1 4M13 17l2 4'), opciones: ['Correr', 'Gimnasio', 'Fútbol', 'Natación', 'Ciclismo', 'Escalada', 'Tenis', 'Básquet', 'Yoga', 'Boxeo', 'Pádel', 'Vóley'] },
  { nombre: 'Aire libre', icono: ic('M12 3l4 7h-8zM12 8l5 9H7zM10 21h4'), opciones: ['Caminar', 'Senderismo', 'Bici', 'Camping', 'Playa', 'Montaña', 'Jardín'] },
  { nombre: 'Creativo', icono: ic('M12 3a9 9 0 1 0 0 18c1 0 1.5-.5 1.5-1.3 0-1.2-1-1.4-1-2.4 0-.8.7-1.3 1.5-1.3H16a4 4 0 0 0 4-4c0-4-3.6-6-8-6z'), opciones: ['Dibujar', 'Pintar', 'Fotografía', 'Escribir', 'Bailar', 'Tocar un instrumento', 'Cantar', 'Manualidades'] },
  { nombre: 'Aprender', icono: ic('M4 5h11a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5v12'), opciones: ['Leer', 'Un idioma', 'Un curso', 'Programar', 'Estudiar', 'Podcasts', 'Documentales'] },
  { nombre: 'Vínculos', icono: ic('M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c1-3 3.5-4.5 6-4.5M16 11a3 3 0 1 0 0-6M21 20c-1-3-3.5-4.5-6-4.5'), opciones: ['Amigos', 'Familia', 'Pareja', 'Salir', 'Juntadas', 'Llamadas'] },
  { nombre: 'Mente y bienestar', icono: ic('M12 3a5 5 0 0 0-5 5c0 2 1 3 1 5v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3c0-2 1-3 1-5a5 5 0 0 0-5-5z'), opciones: ['Meditar', 'Respirar', 'Terapia', 'Journaling', 'Dormir mejor', 'Descansar'] },
  { nombre: 'Casa y oficios', icono: ic('M4 11l8-6 8 6M6 10v9h12v-9'), opciones: ['Cocinar', 'Ordenar', 'Bricolaje', 'Plantas', 'Costura'] },
  { nombre: 'Ocio', icono: ic('M7 12h4M9 10v4M15 11h.01M18 13h.01M6 8h12a3 3 0 0 1 3 3l-1 5a2.5 2.5 0 0 1-4.5 1L14 16h-4l-1.5 2A2.5 2.5 0 0 1 4 17l-1-6a3 3 0 0 1 3-3z'), opciones: ['Videojuegos', 'Series', 'Cine', 'Música', 'Juegos de mesa', 'Salir a comer'] },
  { nombre: 'Trabajo y proyectos', icono: ic('M4 7h16v13H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2'), opciones: ['Trabajo', 'Proyectos propios', 'Emprender', 'Freelance', 'Networking', 'Finanzas'] },
];

const INTENCIONES = [
  'Por qué me canso tanto',
  'Dónde se me va el tiempo',
  'Qué me hace bien',
  'Cómo me afecta el sueño',
  'Qué me estresa',
  'En qué gasto la plata',
  'Cómo cuido mis vínculos',
  'Qué me motiva de verdad',
];

function Chips({
  opciones,
  elegidas,
  onToggle,
}: {
  opciones: string[];
  elegidas: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((v) => {
        const on = elegidas.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className="rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors"
            style={{
              background: on ? 'var(--color-iris)' : '#fff',
              color: on ? '#fff' : 'var(--color-tinta-soft)',
              border: `1.5px solid ${on ? 'var(--color-iris)' : 'rgba(108,120,238,.16)'}`,
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function AgregarPropio({ onAgregar, placeholder }: { onAgregar: (v: string) => void; placeholder: string }) {
  const [valor, setValor] = useState('');
  function agregar() {
    const v = valor.trim();
    if (!v) return;
    onAgregar(v);
    setValor('');
  }
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-[12px] border border-iris-borde bg-white px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-niebla"
      />
      <button
        type="button"
        onClick={agregar}
        className="flex-none rounded-[12px] border border-iris-borde bg-white px-4 font-mono text-[13px] font-semibold text-iris"
      >
        Sumar
      </button>
    </div>
  );
}

function CategoriasSelector({
  elegidas,
  onToggle,
}: {
  elegidas: string[];
  onToggle: (v: string) => void;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-5">
      {CATEGORIAS.map((cat) => (
        <div key={cat.nombre}>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex size-7 flex-none items-center justify-center rounded-[8px] bg-iris-soft text-iris">
              {cat.icono}
            </span>
            <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-tinta">{cat.nombre}</p>
          </div>
          <Chips opciones={cat.opciones} elegidas={elegidas} onToggle={onToggle} />
        </div>
      ))}

      {/* lo que no estaba en ninguna categoría */}
      <div>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex size-7 flex-none items-center justify-center rounded-[8px] bg-iris-soft text-iris">
            {ic('M12 5v14M5 12h14')}
          </span>
          <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-tinta">Lo tuyo</p>
        </div>
        {extras.length > 0 && <Chips opciones={extras} elegidas={elegidas} onToggle={onToggle} />}
        <AgregarPropio
          placeholder="Sumá una actividad tuya…"
          onAgregar={(v) => {
            setExtras((e) => (e.includes(v) ? e : [...e, v]));
            onToggle(v);
          }}
        />
      </div>
    </div>
  );
}

/**
 * Onboarding estilo cards: en vez de un examen (puntuar 8 áreas), preguntas
 * fáciles que arman el perfil desde el día 1: qué hacés y qué querés entender.
 * La rueda se profundiza después, desde Ánimo o Perfil.
 */
export function OnboardingCards() {
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState('Matías');
  const [actividades, setActividades] = useState<string[]>([]);
  const [intenciones, setIntenciones] = useState<string[]>([]);
  const [extraIntenciones, setExtraIntenciones] = useState<string[]>([]);
  const [genero, setGenero] = useState<Genero | null>(null);
  const [sigueCiclo, setSigueCiclo] = useState(true);
  const [neuro, setNeuro] = useState<string[]>([]);
  const [neuroReservado, setNeuroReservado] = useState(false);
  const [lugar, setLugar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void) => (v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const total = 5;
  const progreso = Math.round((paso / (total - 1)) * 100);
  const puedeAvanzar = paso === 2 ? actividades.length > 0 : true;

  async function finalizar() {
    setGuardando(true);
    try {
      await completarOnboardingCards({
        nombre,
        actividades,
        intenciones,
        genero: genero ?? 'reservado',
        sigueCiclo: genero !== 'hombre' ? sigueCiclo : false,
        neuro: neuroReservado ? ['reservado'] : neuro,
        lugar: lugar.trim() || undefined,
      });
    } catch {
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-lavanda">
      {/* progreso */}
      <div className="px-[22px] pb-3 pt-[max(24px,env(safe-area-inset-top))]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(108,120,238,.14)]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progreso}%`, background: 'linear-gradient(90deg,var(--color-iris),var(--color-iris-2))' }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-[22px] py-2.5">
        {paso === 0 && (
          <div className="flotar flex flex-col gap-3.5 pt-2">
            <span className="flex size-12 items-center justify-center rounded-[14px]" style={{ background: GRAD_IRIS, boxShadow: SOMBRA_CTA }}>
              {/* El mismo glifo que el asistente en el Home: un concepto, un
                  ícono. Antes acá había una chispa y allá otra cosa. */}
              <svg viewBox="0 0 24 24" className="size-6 text-white">
                {GLIFO_IA}
              </svg>
            </span>
            <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-iris">Bienvenido a Tegmento</p>
            <h1 className="font-serif text-[32px] font-semibold leading-[1.12] tracking-[-0.4px] text-tinta text-balance">
              Tu vida, un poco más clara.
            </h1>
            <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
              Tegmento es tu bitácora personal con una IA que corre <strong className="font-semibold text-tinta">100% en tu teléfono</strong>. Registrás tu día en 30 segundos y, con el tiempo, te muestra <strong className="font-semibold text-tinta">por qué te sentís como te sentís</strong>, para cambiar lo que te aleja de vivir a pleno.
            </p>
            <div className="flex flex-col gap-2">
              {[
                ['Privado y tuyo', 'Nada sale de tu teléfono. Sin algoritmos que te encierren.'],
                ['Te va conociendo', 'Cuanto más registrás, mejores y más personales son sus consejos.'],
                ['Sin exámenes', 'Un minuto para arrancar. Lo profundizás cuando quieras.'],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start gap-2.5 rounded-[18px] border border-iris-borde bg-blanco p-[11px_13px]">
                  <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full" style={{ background: GRAD_IRIS }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <p className="text-[13px] leading-snug text-tinta-soft text-pretty">
                    <strong className="font-semibold text-tinta">{t}.</strong> {d}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-1 rounded-2xl border border-iris-borde bg-blanco p-4">
              <p className="mb-2.5 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Para arrancar, ¿cómo te llamás?</p>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-[12px] border border-iris-borde bg-papel-2 px-3.5 py-2.5 text-[16px] text-tinta outline-none"
              />
            </div>
          </div>
        )}

        {paso === 1 && (
          <div className="flotar flex flex-col gap-4 pt-2">
            <div>
              <h1 className="font-serif text-[26px] font-semibold tracking-[-0.3px] text-tinta">Sobre vos</h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-niebla text-pretty">
                Esto me ayuda a leer mejor tus señales del cuerpo y del ánimo. Todo es opcional y lo cambiás cuando quieras desde Perfil.
              </p>
            </div>
            <SobreVosCampos
              genero={genero}
              setGenero={setGenero}
              sigueCiclo={sigueCiclo}
              setSigueCiclo={setSigueCiclo}
              neuro={neuro}
              setNeuro={setNeuro}
              neuroReservado={neuroReservado}
              setNeuroReservado={setNeuroReservado}
            />
            {/* Dónde vivís: enciende el contexto real de Descubrir (lo que pasa
                cerca tuyo, no el mundo entero). Opcional, se cambia en Perfil. */}
            <div>
              <p className="mb-2 font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">¿Dónde vivís?</p>
              <input
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                placeholder="Núremberg, Alemania"
                className="w-full rounded-[18px] border border-iris-borde bg-white px-4 py-3 text-[16px] text-tinta outline-none placeholder:text-niebla focus:border-iris"
              />
              <p className="mt-1.5 text-[12px] leading-snug text-niebla text-pretty">
                Para traerte en Descubrir lo que pasa donde estás, en vez de noticias del mundo que no te tocan.
              </p>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="flotar flex flex-col gap-4 pt-2">
            <div>
              <h1 className="font-serif text-[26px] font-semibold tracking-[-0.3px] text-tinta">
                Elegí lo que te representa
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-niebla text-pretty">
                Recorré las categorías y tocá lo que hay en tu vida. Esto le da al asistente una idea de quién sos, para darte consejos más personales y organizados. Cuanto más marques, mejor te conoce. No hay respuestas correctas.
              </p>
            </div>
            <CategoriasSelector elegidas={actividades} onToggle={toggle(actividades, setActividades)} />
          </div>
        )}

        {paso === 3 && (
          <div className="flotar flex flex-col gap-4 pt-2">
            <div>
              <h1 className="font-serif text-[26px] font-semibold tracking-[-0.3px] text-tinta">
                ¿Qué querés entender de vos?
              </h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-niebla text-pretty">
                Esto guía lo que el analista busca en tus datos. Elegí lo que te resuene (opcional).
              </p>
            </div>
            <Chips
              opciones={[...INTENCIONES, ...extraIntenciones]}
              elegidas={intenciones}
              onToggle={toggle(intenciones, setIntenciones)}
            />
            <AgregarPropio
              placeholder="Otra pregunta tuya…"
              onAgregar={(v) => {
                setExtraIntenciones((e) => (e.includes(v) ? e : [...e, v]));
                setIntenciones((i) => (i.includes(v) ? i : [...i, v]));
              }}
            />
          </div>
        )}

        {paso === 4 && (
          <div className="flotar flex flex-col gap-4 pt-2">
            <h1 className="font-serif text-[26px] font-semibold leading-[1.15] tracking-[-0.3px] text-tinta">
              Listo, {nombre.trim() || 'vamos'}.
            </h1>
            <p className="text-[15px] leading-relaxed text-tinta-soft text-pretty">
              {actividades.length} {actividades.length === 1 ? 'actividad' : 'actividades'} para seguir
              {intenciones.length ? ` y ${intenciones.length} ${intenciones.length === 1 ? 'pregunta' : 'preguntas'} sobre vos` : ''}.
              Cada noche, un check-in de 30 segundos: cómo estuviste y qué hiciste. El resto lo va armando la IA.
            </p>
            <div className="rounded-2xl border border-iris-borde bg-blanco p-4">
              <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-niebla">Tus actividades</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-tinta text-pretty">{actividades.join(' · ')}</p>
            </div>
            <p className="text-[13px] leading-relaxed text-niebla text-pretty">
              Cuando quieras profundizar, en Ánimo te espera la rueda de la vida: una foto de tus 8 áreas.
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-[22px] pb-[max(18px,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          disabled={!puedeAvanzar || guardando}
          onClick={() => (paso === total - 1 ? finalizar() : setPaso((p) => p + 1))}
          className="w-full rounded-[18px] py-3.5 font-mono text-[13px] font-bold tracking-[0.3px] text-white disabled:opacity-50"
          style={{ background: GRAD_IRIS, boxShadow: SOMBRA_CTA }}
        >
          {guardando
            ? 'Abriendo…'
            : paso === 0
              ? 'Empezar'
              : paso === total - 1
                ? 'Empezar mi bitácora'
                : 'Siguiente'}
        </button>
        {paso > 0 && !guardando && (
          <button
            type="button"
            onClick={() => setPaso((p) => p - 1)}
            className="mt-2 w-full py-2 text-center font-mono text-[12px] font-semibold text-niebla"
          >
            Volver
          </button>
        )}
      </div>
    </main>
  );
}

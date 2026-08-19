import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { conocimiento, skills } from '@/lib/db/schema';
import {
  alternarConocimiento,
  alternarSkill,
  borrarConocimiento,
  borrarSkill,
  crearConocimiento,
  crearSkill,
} from '@/lib/actions/cerebro';
import { BotonCerrar } from '@/components/ui/BotonCerrar';
import { Card } from '@/components/ui/Card';
import { Sello } from '@/components/ui/Sello';

export const dynamic = 'force-dynamic';

function Fila({
  id,
  titulo,
  detalle,
  activa,
  onAlternar,
  onBorrar,
}: {
  id: number;
  titulo: string;
  detalle: string;
  activa: boolean;
  onAlternar: (formData: FormData) => Promise<void>;
  onBorrar: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="border-b border-borde/60 py-2 last:border-0">
      <BotonCerrar href="/perfil" posicion="pantalla" />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[15px] ${activa ? 'text-crema' : 'text-muted line-through'}`}>{titulo}</span>
        <div className="flex shrink-0 items-center gap-2">
          <form action={onAlternar}>
            <input type="hidden" name="id" value={id} />
            <button type="submit">
              <Sello color={activa ? 'teal' : 'muted'}>{activa ? 'Activa' : 'Apagada'}</Sello>
            </button>
          </form>
          <form action={onBorrar}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="rounded-[4px] border border-brick/60 px-2 py-px font-mono text-[12px] text-brick">
              ✕
            </button>
          </form>
        </div>
      </div>
      <p className={`mt-1 text-[12px] leading-relaxed ${activa ? 'text-muted' : 'text-muted/50'}`}>{detalle}</p>
    </div>
  );
}

export default async function Cerebro() {
  const [skillsRows, saberes] = await Promise.all([
    db.select().from(skills).orderBy(desc(skills.creado)),
    db.select().from(conocimiento).orderBy(desc(conocimiento.creado)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[19px] font-semibold text-crema">Skills & Conocimiento</h1>
        <p className="mt-1 text-[15px] text-muted">
          Lo que cargues acá se conecta directo con Gemma: las skills definen cómo trabaja, el conocimiento son
          hechos tuyos que siempre tiene presentes.
        </p>
      </div>

      <div className="relieve rounded-app border border-ambar-deep bg-[var(--color-burbuja)] p-4">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-ambar-dim">Cuanto más contexto, mejores conexiones</p>
        <p className="mt-2 text-[13px] leading-relaxed text-crema-soft">
          Mientras más sepa de tu vida, mejor relaciona lo que hacés con cómo te sentís. Ideas para sumar:
        </p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-crema-soft">
          <li>· Sacale foto a los tickets del súper (sabe cómo te alimentás y en qué gastás).</li>
          <li>· Contale a quién ves seguido y cómo es tu vínculo.</li>
          <li>· Anotá tus horarios reales: cuándo entrenás, cuándo dormís.</li>
          <li>· Sumá tus rutinas y manías, lo que te carga y lo que te descarga.</li>
        </ul>
      </div>

      <Card titulo={`SKILLS · ${skillsRows.filter((s) => s.activa).length} ACTIVAS`}>
        {skillsRows.map((s) => (
          <Fila
            key={s.id}
            id={s.id}
            titulo={s.nombre}
            detalle={s.instrucciones}
            activa={s.activa}
            onAlternar={alternarSkill}
            onBorrar={borrarSkill}
          />
        ))}
        {skillsRows.length === 0 && <p className="text-[15px] text-muted">Sin skills todavía, creá la primera abajo.</p>}
        <form action={crearSkill} className="mt-4 flex flex-col gap-2">
          <input
            name="nombre"
            required
            placeholder="Nombre, ej: Coach de hábitos"
            className="rounded-[4px] border border-borde bg-bg px-3 py-2 text-[16px] text-crema placeholder:text-muted"
          />
          <textarea
            name="instrucciones"
            required
            rows={3}
            placeholder="Instrucciones, ej: cuando hablemos de hábitos, preguntame por la frecuencia real de la última semana antes de opinar, y proponé el siguiente paso más chico posible."
            className="rounded-[4px] border border-borde bg-bg px-3 py-2 text-[16px] leading-relaxed text-crema placeholder:text-muted"
          />
          <button type="submit" className="rounded-app bg-ambar py-3 font-mono text-[15px] font-semibold tracking-[0.3px] text-[#412402]">
            Agregar skill
          </button>
        </form>
      </Card>

      <Card titulo={`CONOCIMIENTO · ${saberes.filter((c) => c.activa).length} ACTIVOS`}>
        {saberes.map((c) => (
          <Fila
            key={c.id}
            id={c.id}
            titulo={c.titulo}
            detalle={c.contenido}
            activa={c.activa}
            onAlternar={alternarConocimiento}
            onBorrar={borrarConocimiento}
          />
        ))}
        {saberes.length === 0 && (
          <p className="text-[15px] text-muted">Sin conocimiento cargado, contale algo de vos abajo.</p>
        )}
        <form action={crearConocimiento} className="mt-4 flex flex-col gap-2">
          <input
            name="titulo"
            required
            placeholder="Título, ej: Trabajo"
            className="rounded-[4px] border border-borde bg-bg px-3 py-2 text-[16px] text-crema placeholder:text-muted"
          />
          <textarea
            name="contenido"
            required
            rows={3}
            placeholder="El hecho, ej: soy diseñador UX freelance, mis clientes principales están en Alemania, por eso el alemán es clave para mi carrera."
            className="rounded-[4px] border border-borde bg-bg px-3 py-2 text-[16px] leading-relaxed text-crema placeholder:text-muted"
          />
          <button type="submit" className="rounded-app bg-ambar py-3 font-mono text-[15px] font-semibold tracking-[0.3px] text-[#412402]">
            Agregar conocimiento
          </button>
        </form>
      </Card>
    </div>
  );
}

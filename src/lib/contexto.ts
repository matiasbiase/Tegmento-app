import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, areas, bitacora, config, conocimiento, cuerpo, eventos, hechos, lineaAreas, lineas, mails, marcas } from '@/lib/db/schema';
import { paraElChat, type Hecho } from '@/lib/cerebro-hechos';
import { fechaDeInicio } from '@/lib/agenda';
import { fraseDeRitmo } from '@/lib/ritmo-semanal';
import { calcularDensidad, instruccionSegunDensidad } from '@/lib/densidad';

export type DatosContexto = {
  ahora: Date;
  nombre: string | null;
  areas: { nombre: string; scoreActual: number | null; scoreDeseado: number | null }[];
  lineas: {
    titulo: string;
    tipo: string;
    estado: string;
    objetivo: string | null;
    deadline: string | null;
    areas: string[];
    parentTitulo: string | null;
  }[];
  agenda: { titulo: string; inicio: string }[];
  /**
   * QUÉ DÍAS DE LA SEMANA SUELE CAER CADA ACTIVIDAD, ya en palabras.
   *
   * ⚠️ EXISTE PARA QUE `#plan` PROPONGA EN VEZ DE PREGUNTAR (11/08). El
   * asistente recibía las actividades pero no las `marcas`, así que sabía que
   * "Bouldern" existe y no que cae los viernes — y terminaba preguntando algo
   * que la app ya sabe, que es lo que la regla de la casa prohíbe.
   *
   * ⚠️ Viene ya filtrado: solo las que tienen patrón de verdad (dos veces el
   * mismo día). Ver `lib/ritmo-semanal`. Vacío es lo normal al principio, y el
   * texto lo dice en vez de inventar un día.
   *
   * ⚠️ OPCIONAL, como `conocimiento`, `faltaHoy` y `yaHoy`: es un campo que se
   * sumó después y hacerlo obligatorio rompía a todos los que ya armaban un
   * contexto sin él. Ausente y vacío significan lo mismo acá —no hay patrón—,
   * así que no hace falta distinguirlos.
   */
  ritmos?: string[];
  mailsImportantes: { remitente: string; asunto: string }[];
  ultimasEntradas: { tipo: string; fecha: string; contenido: string }[];
  conocimiento?: { titulo: string; contenido: string }[];
  /**
   * Lo que el cerebro aprendió, ya ordenado por `paraElChat`: **primero lo que
   * él confirmó**, después lo que la app dedujo y todavía no validó.
   */
  aprendido?: { contenido: string; confirmado: boolean; origen: string }[];
  /** Qué datos de hoy todavía no cargó. El asistente los pide AL PASAR. */
  faltaHoy?: string[];
  /** Lo que YA cargó hoy. Va aparte para poder prohibir que lo vuelva a pedir. */
  yaHoy?: string[];
  /** En cuántos días DISTINTOS registró el ánimo: de acá sale cuánto puede
   *  afirmar la app hoy (ver lib/densidad). */
  diasConAnimo?: number;
};

export function armarContexto(d: DatosContexto): string {
  const f = (iso: string) => iso.slice(11, 16);
  const partes: string[] = [];
  partes.push(`Fecha y hora: ${d.ahora.toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}`);
  if (d.nombre) partes.push(`Usuario: ${d.nombre}`);
  partes.push(
    `\n### Rueda de la vida (actual → deseado)\n` +
      d.areas.map((a) => `- ${a.nombre}: ${a.scoreActual ?? '?'}/5 → ${a.scoreDeseado ?? '?'}/5`).join('\n'),
  );
  partes.push(
    `\n### Líneas\n` +
      d.lineas
        .map((l) => {
          const meta = [l.tipo, l.estado, l.areas.join('+') || null, l.deadline ? `deadline ${l.deadline}` : null]
            .filter(Boolean)
            .join(', ');
          const rama = l.parentTitulo ? ` (rama de "${l.parentTitulo}")` : '';
          return `- ${l.titulo}${rama} [${meta}]${l.objetivo ? `, objetivo: ${l.objetivo}` : ''}`;
        })
        .join('\n'),
  );
  partes.push(
    `\n### Qué días suele caer cada cosa (inferido de cómo la viene marcando)\n` +
      (d.ritmos?.length
        ? d.ritmos.map((r) => `- ${r}`).join('\n')
        : '- (todavía no hay patrón: NO inventes días, preguntáselos)'),
  );
  partes.push(
    `\n### Agenda (próximos 7 días; recordale lo que se acerca cuando venga al caso)\n` +
      (d.agenda.length
        ? d.agenda
            .map((e) => {
              const hora = f(e.inicio);
              return `- ${fechaDeInicio(e.inicio)}${hora ? ` ${hora}` : ' (todo el día)'} ${e.titulo}`;
            })
            .join('\n')
        : '- (sin eventos)'),
  );
  partes.push(
    `\n### Mails importantes recientes\n` +
      (d.mailsImportantes.length ? d.mailsImportantes.map((m) => `- ${m.remitente}: ${m.asunto}`).join('\n') : '- (ninguno)'),
  );
  partes.push(
    `\n### Últimas entradas de la bitácora\n` +
      d.ultimasEntradas.map((e) => `- [${e.tipo} · ${e.fecha.slice(0, 10)}] ${e.contenido}`).join('\n'),
  );
  // Lo que falta de hoy va al final y con la instrucción pegada: si el modelo lo
  // lee como una lista suelta, la escupe entera como un formulario.
  partes.push(
    `\n### Lo que falta de hoy\n` +
      (d.faltaHoy && d.faltaHoy.length
        ? `${d.faltaHoy.map((x) => `- ${x}`).join('\n')}\n` +
          `(Preguntá UNA sola de estas, al pasar y solo si viene al caso en la charla. Nunca las enumeres.)`
        : '- (nada: hoy ya cargó todo)'),
  );
  if (d.yaHoy && d.yaHoy.length) {
    partes.push(
      `\n### YA REGISTRADO HOY: ${d.yaHoy.join(', ')}\n` +
        `⛔ NO se lo vuelvas a pedir ni le ofrezcas el link para hacerlo: ya está hecho. ` +
        `Ofrecerle registrar algo que acaba de registrar es la forma más rápida de que sienta que no le prestás atención.`,
    );
  }
  // Cuánto puede afirmar hoy. Va al final, que es lo último que lee antes de
  // contestar, y define qué tiene permitido decir (no solo cómo decirlo).
  if (d.diasConAnimo != null) {
    partes.push(`\n${instruccionSegunDensidad(calcularDensidad(d.diasConAnimo), d.diasConAnimo)}`);
  }
  if (d.conocimiento && d.conocimiento.length > 0) {
    partes.push(
      `\n### Conocimiento personal (hechos que Matías cargó, dalos por ciertos)\n` +
        d.conocimiento.map((c) => `- ${c.titulo}: ${c.contenido}`).join('\n'),
    );
  }
  /**
   * ── ⚠️⚠️ LO QUE ÉL CONFIRMÓ, SEPARADO DE LO QUE LA APP DEDUJO (13/08) ───────
   *
   * Es el arreglo del bug más viejo del cerebro: hasta hoy el bot recibía un
   * párrafo donde **todo pesaba igual**, armado filtrando por la confianza que
   * el modelo se ponía a sí mismo. Sus 34 veredictos no influían en nada, y algo
   * que él marcó "no me pasa" podía estar aconsejándolo.
   *
   * Ahora vienen en dos listas y con el rótulo puesto. El orden lo decide
   * `paraElChat`, que tiene sus tests; acá solo se dibuja.
   *
   * ⚠️ EL RÓTULO NO ES DECORACIÓN: es lo que le permite al asistente hablar
   * distinto de una cosa y de la otra. Sobre lo confirmado puede apoyarse; sobre
   * lo deducido tiene que preguntar. Sin la distinción, la única salida honesta
   * sería tratar todo como dudoso, que es peor.
   */
  const confirmados = (d.aprendido ?? []).filter((h) => h.confirmado);
  const deducidos = (d.aprendido ?? []).filter((h) => !h.confirmado);
  if (confirmados.length > 0) {
    partes.push(
      `\n### Lo que Matías CONFIRMÓ sobre él (dalo por cierto, podés apoyarte en esto)\n` +
        confirmados.map((h) => `- ${h.contenido}`).join('\n'),
    );
  }
  if (deducidos.length > 0) {
    partes.push(
      `\n### Lo que la app dedujo y él TODAVÍA NO confirmó (no lo afirmes: si viene al caso, preguntáselo)\n` +
        deducidos.map((h) => `- ${h.contenido} (sale de: ${h.origen})`).join('\n'),
    );
  }
  return partes.join('\n');
}

export async function contextoAsistente(): Promise<string> {
  const hoy = new Date();
  // el inicio interno va como "YYYY-MM-DD[THH:MM]" local; comparar por string alcanza
  const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const en7 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 8);
  const hasta = `${en7.getFullYear()}-${String(en7.getMonth() + 1).padStart(2, '0')}-${String(en7.getDate()).padStart(2, '0')}`;
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const desdeHoy = inicioHoy.toISOString();
  const [areasRows, lineasRows, vinculos, marcasRows, agenda, importantes, entradas, cfg, saberes, hechosRows, animoHoy, cuerpoHoy, todosLosAnimos] = await Promise.all([
    db.select().from(areas),
    db.select().from(lineas),
    db.select().from(lineaAreas),
    // Las marcas, para inferir qué días cae cada cosa (ver `lib/ritmo-semanal`).
    db.select({ lineaId: marcas.lineaId, fecha: marcas.fecha }).from(marcas),
    db.select().from(eventos).where(gte(eventos.inicio, desde)).orderBy(eventos.inicio),
    db.select().from(mails).where(eq(mails.importante, true)).orderBy(desc(mails.recibido)).limit(5),
    db.select().from(bitacora).orderBy(desc(bitacora.fecha)).limit(5),
    db.select().from(config).where(eq(config.clave, 'nombre')),
    db.select().from(conocimiento).where(eq(conocimiento.activa, true)),
    db.select().from(hechos),
    // Para saber qué falta de hoy y poder preguntarlo al pasar.
    db
      .select({ id: animoCheckins.id })
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, desdeHoy)))
      .limit(1),
    db
      .select({ tipo: cuerpo.tipo })
      .from(cuerpo)
      .where(and(inArray(cuerpo.tipo, ['comida', 'energia', 'libido']), gte(cuerpo.creado, desdeHoy))),
    // Días DISTINTOS con check-in de ánimo, en toda la historia: es la medida de
    // cuánto puede afirmar la app (ver lib/densidad).
    db.select({ creado: animoCheckins.creado }).from(animoCheckins).where(isNull(animoCheckins.areaId)),
  ]);
  const diasConAnimo = new Set(todosLosAnimos.map((a) => a.creado.slice(0, 10))).size;

  // ⚠️ SUEÑO Y AGENDA NO ENTRAN ACÁ a propósito: son los datos que van a llegar
  // solos de Salud y del Calendario. Preguntar por algo que la app ya tiene (o
  // va a tener sin molestar a nadie) es la forma más rápida de volverse pesada.
  // Los gastos tampoco: para eso está la marca [+gasto:] (la foto del ticket
  // se sacó el 03/08).
  const tiposCuerpo = new Set(cuerpoHoy.map((c) => c.tipo));
  const faltaHoy = [
    animoHoy.length === 0 ? 'cómo estuvo el día (ánimo)' : null,
    !tiposCuerpo.has('comida') ? 'qué comió' : null,
    !tiposCuerpo.has('energia') && !tiposCuerpo.has('libido') ? 'cómo viene de energía' : null,
  ].filter((x): x is string => x !== null);

  // El REVERSO de la lista de arriba, y hace falta decirlo aparte.
  // Saber qué falta no alcanzaba: el asistente ofrecía "Registrar mi ánimo"
  // cinco segundos después de que Matías lo había registrado (29/07). El link
  // no sale de "Lo que falta de hoy", sale de la lista de rutas del prompt, y
  // el modelo no ataba una sección con la otra. Nombrar lo YA hecho, con la
  // prohibición pegada, es lo que lo corta.
  const yaHoy = [
    animoHoy.length > 0 ? 'el ánimo' : null,
    tiposCuerpo.has('comida') ? 'la comida' : null,
    tiposCuerpo.has('energia') || tiposCuerpo.has('libido') ? 'la energía' : null,
  ].filter((x): x is string => x !== null);
  const nombreArea = new Map(areasRows.map((a) => [a.id, a.nombre]));
  const tituloLinea = new Map(lineasRows.map((l) => [l.id, l.titulo]));
  return armarContexto({
    ahora: new Date(),
    nombre: cfg[0]?.valor ?? null,
    areas: areasRows.filter((a) => a.activa),
    lineas: lineasRows.map((l) => ({
      titulo: l.titulo,
      tipo: l.tipo,
      estado: l.estado,
      objetivo: l.objetivo,
      deadline: l.deadline,
      areas: vinculos.filter((v) => v.lineaId === l.id).map((v) => nombreArea.get(v.areaId) ?? ''),
      parentTitulo: l.parentId ? (tituloLinea.get(l.parentId) ?? null) : null,
    })),
    // ⚠️ Solo las ACTIVAS: el ritmo de algo que archivaste no ayuda a planear.
    ritmos: lineasRows
      .filter((l) => l.tipo === 'actividad' && l.estado === 'activa')
      .map((l) => fraseDeRitmo(l.titulo, marcasRows.filter((m) => m.lineaId === l.id).map((m) => m.fecha)))
      .filter((f): f is string => f !== null),
    agenda: agenda.filter((e) => fechaDeInicio(e.inicio) < hasta),
    mailsImportantes: importantes,
    ultimasEntradas: entradas,
    conocimiento: saberes,
    // ⚠️ El orden y el filtrado los decide `paraElChat`, que tiene sus tests:
    // primero lo confirmado, después lo deducido, nada de lo descartado, nada
    // vencido, y con tope para no comerse el contexto del modelo local.
    aprendido: paraElChat(
      hechosRows.map(
        (h): Hecho => ({
          id: h.id,
          tipo: h.tipo as Hecho['tipo'],
          contenido: h.contenido,
          porque: h.porque,
          areaId: h.areaId,
          estado: h.estado as Hecho['estado'],
          origen: h.origen as Hecho['origen'],
          cuando: h.cuando,
          vence: h.vence,
          saleDe: [],
        }),
      ),
      new Date().toISOString(),
    ).map((h) => ({ contenido: h.contenido, confirmado: h.estado === 'confirmado', origen: h.origen })),
    faltaHoy,
    yaHoy,
    diasConAnimo,
  });
}

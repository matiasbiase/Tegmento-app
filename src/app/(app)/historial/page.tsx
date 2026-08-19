import { desc, eq, gte, inArray, isNull, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { animoCheckins, bitacora, chats, chatMensajes, config, cuerpo, notas } from '@/lib/db/schema';
import { notasQueRecibenChats } from '@/lib/notas-contenido';
import { tituloVisible } from '@/lib/notas';
import { etiquetaFecha } from '@/lib/fechas';
import { moodDe } from '@/lib/animo';
import { HistorialTabs, type DiaRegistros, type Registro } from '@/components/historial/HistorialTabs';
import { type ChatItem, type CarpetaVista } from '@/components/historial/Charlas';
import { CLAVE_CARPETAS, carpetaDe, contarPorCarpeta, leerCarpetas } from '@/lib/carpetas';
import { titular } from '@/lib/titulos';
import { TituloFijo } from '@/components/ui/TituloFijo';

export const dynamic = 'force-dynamic';

// Colores de badge por tipo de registro.
const BADGE: Record<string, { etiqueta: string; color: string; tint: string }> = {
  animo: { etiqueta: 'Ánimo', color: '#4a56c8', tint: '#eaebfc' },
  sueno: { etiqueta: 'Sueño', color: '#6c78ee', tint: '#eef0fe' },
  respiracion: { etiqueta: 'Calma', color: '#3d9b80', tint: '#e3f1ec' },
  comida: { etiqueta: 'Alimentación', color: '#c25571', tint: '#fbe7ec' },
  manual: { etiqueta: 'Nota', color: '#c79238', tint: '#faf0dd' },
  // Lo anotado mientras corre un experimento del Analista. Se distingue de una
  // nota suelta a propósito: fue escrita mirando algo puntual.
  experimento: { etiqueta: 'Experimento', color: '#8a7cf0', tint: '#f0eefe' },
  // Un hecho suelto que la IA sacó de la charla al cerrarla ("durmió una
  // siesta"), no algo que Matías tipeó como nota. Etiqueta distinta para que
  // se note de dónde salió.
  detectado: { etiqueta: 'Detectado', color: '#6c78ee', tint: '#eaebfc' },
  hecho: { etiqueta: 'Hecho', color: '#4a56c8', tint: '#eaebfc' },
  chat: { etiqueta: 'Charla', color: '#6d6d87', tint: '#eef0f4' },
  sync: { etiqueta: 'Sync', color: '#3d9b80', tint: '#e3f1ec' },
  sistema: { etiqueta: 'Sistema', color: '#6d6d87', tint: '#eef0f4' },
};

function hora(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

function claveDia(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function etiquetaDia(iso: string): string {
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (claveDia(iso) === claveDia(hoy.toISOString())) return 'Hoy';
  if (claveDia(iso) === claveDia(ayer.toISOString())) return 'Ayer';
  const s = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replaceAll('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Historial() {
  const hace45 = new Date(Date.now() - 45 * 86_400_000).toISOString();

  const [chatsRows, bitacoraRows, cuerpoRows, animoRows, cfgCarpetas] = await Promise.all([
    // ⚠️ Sin join a `areas`: las 8 áreas de la rueda ya NO ordenan esta pantalla
    // (27/07). Se siguen clasificando solas y el Analista las usa; simplemente
    // dejaron de mandar acá, porque son un orden que el usuario no eligió.
    db
      .select({ id: chats.id, titulo: chats.titulo, ultimaActividad: chats.ultimaActividad })
      .from(chats)
      .orderBy(desc(chats.ultimaActividad)),
    db.select().from(bitacora).where(gte(bitacora.fecha, hace45)).orderBy(desc(bitacora.fecha)),
    db.select().from(cuerpo).where(gte(cuerpo.creado, hace45)).orderBy(desc(cuerpo.creado)),
    db
      .select()
      .from(animoCheckins)
      .where(and(isNull(animoCheckins.areaId), gte(animoCheckins.creado, hace45)))
      .orderBy(desc(animoCheckins.creado)),
    db.select().from(config).where(eq(config.clave, CLAVE_CARPETAS)).limit(1),
  ]);

  // ---- Vista Charlas (lista por día, tipo Notas) ----
  const ids = chatsRows.map((c) => c.id);
  const msgs = ids.length
    ? await db.select().from(chatMensajes).where(inArray(chatMensajes.chatId, ids)).orderBy(desc(chatMensajes.creado))
    : [];
  const ultimoMsg = new Map<number, string>();
  for (const m of msgs) if (!ultimoMsg.has(m.chatId)) ultimoMsg.set(m.chatId, m.contenido);

  const estadoCarpetas = leerCarpetas(cfgCarpetas[0]?.valor ?? null);
  const cuentas = contarPorCarpeta(estadoCarpetas);
  const nombreCarpeta = new Map(estadoCarpetas.carpetas.map((c) => [c.id, c.nombre]));
  const carpetasVista: CarpetaVista[] = estadoCarpetas.carpetas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    cuantos: cuentas[c.id] ?? 0,
  }));

  const listaChats: ChatItem[] = chatsRows.map((c) => {
    const idCarpeta = carpetaDe(estadoCarpetas, c.id);
    return {
      id: c.id,
      // El título se recorta en el final de la idea, no en el carácter 40: si el
      // chat quedó titulado con una frase larga, así al menos se lee entera.
      titulo: titular(c.titulo, 52),
      dia: etiquetaDia(c.ultimaActividad),
      hora: hora(c.ultimaActividad),
      snippet: ultimoMsg.get(c.id) ?? null,
      carpeta: idCarpeta ? (nombreCarpeta.get(idCarpeta) ?? null) : null,
    };
  });

  // ---- Vista Registros (todo lo subido, por día) ----
  const crudos: { fecha: string; tipo: string; texto: string; origen: Registro['origen']; id: number }[] = [];
  for (const b of bitacoraRows) {
    // el check-in y el sueño ya aparecen como registros propios; no los duplicamos
    if (b.contenido.startsWith('Check-in del día')) continue;
    if (b.contenido.startsWith('Dormí ')) continue;
    crudos.push({ fecha: b.fecha, tipo: b.tipo, texto: b.contenido, origen: 'bitacora', id: b.id });
  }
  for (const c of cuerpoRows) {
    if (c.tipo === 'sueno' && c.valor != null) {
      const hs = (c.valor / 60).toLocaleString('es-AR', { maximumFractionDigits: 1 });
      const cal = c.calidad === 'bien' ? 'descansaste' : c.calidad === 'mal' ? 'dormiste mal' : 'dormiste regular';
      crudos.push({ fecha: c.creado, tipo: 'sueno', texto: `Dormiste ${hs}h, ${cal}.`, origen: 'cuerpo', id: c.id });
    }
    if (c.tipo === 'respiracion' && c.valor != null) {
      crudos.push({ fecha: c.creado, tipo: 'respiracion', texto: `Sesión de respiración de ${c.valor}s.`, origen: 'cuerpo', id: c.id });
    }
    if (c.tipo === 'comida' && c.nota) {
      crudos.push({ fecha: c.creado, tipo: 'comida', texto: `Comiste: ${c.nota}`, origen: 'cuerpo', id: c.id });
    }
  }
  for (const a of animoRows) {
    const label = moodDe(a.estado)?.label ?? a.estado;
    crudos.push({ fecha: a.creado, tipo: 'animo', texto: `Ánimo: ${label}.${a.nota ? ` ${a.nota}` : ''}`, origen: 'animo', id: a.id });
  }
  crudos.sort((x, y) => (x.fecha < y.fecha ? 1 : -1));

  const porDia = new Map<string, DiaRegistros>();
  for (const r of crudos) {
    const clave = claveDia(r.fecha);
    if (!porDia.has(clave)) porDia.set(clave, { dia: etiquetaDia(r.fecha), items: [] });
    const b = BADGE[r.tipo] ?? BADGE.sistema;
    const item: Registro = {
      hora: hora(r.fecha),
      etiqueta: b.etiqueta,
      color: b.color,
      tint: b.tint,
      texto: r.texto,
      origen: r.origen,
      id: r.id,
    };
    porDia.get(clave)!.items.push(item);
  }
  const registros = [...porDia.values()];

  // A qué notas se puede mandar una charla.
  //
  // ⚠️ LAS PRIVADAS NO ESTÁN, Y NO PORQUE FALTE EL PIN ACÁ: es que ni siquiera
  // se cargan. El Historial no tiene llave, así que si viajaran al navegador,
  // todos los títulos privados estarían en el HTML de una pantalla sin candado —
  // la cortina se correría desde otro lado. Con `false` fijo, `seMuestra` las
  // deja afuera del servidor para adentro.
  // Se pierde poder mandar una charla a una nota privada desde acá. Es el precio
  // correcto: la promesa de la nota privada vale más que ese atajo.
  const notasElegibles = notasQueRecibenChats(
    await db
      .select({ id: notas.id, titulo: notas.titulo, privada: notas.privada })
      .from(notas)
      .orderBy(desc(notas.actualizado)),
    false,
  ).map((n) => ({ id: String(n.id), nombre: tituloVisible(n), cuantas: 0 }));

  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Historial" />
      <HistorialTabs chats={listaChats} carpetas={carpetasVista} registros={registros} notas={notasElegibles} />
    </div>
  );
}

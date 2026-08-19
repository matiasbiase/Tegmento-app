import { db } from './client';
import * as s from './schema';

const hoy = new Date();
const iso = (d: Date) => d.toISOString();
const diasAtras = (n: number, h = 12) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
};
const hoyA = (h: number, m = 0) => {
  const d = new Date(hoy);
  d.setHours(h, m, 0, 0);
  return d;
};

async function main() {
  // Orden inverso por FKs
  for (const tabla of [
    s.sugerencias, s.analisis, s.bitacora, s.chatMensajes, s.chats, s.temas,
    s.eventos, s.mails, s.lineaAreas, s.lineas, s.areaCheckins, s.areas, s.config,
  ]) {
    await db.delete(tabla);
  }

  const [saludMental, saludFisica, social, ocio, carrera, finanzas, crecimiento, contexto] = await db
    .insert(s.areas)
    .values([
      { nombre: 'Salud mental', scoreActual: 3, scoreDeseado: 4, color: '#9a86c8', orden: 0, foco: true },
      { nombre: 'Salud física', scoreActual: 3, scoreDeseado: 4, color: '#4a9d8e', orden: 1, foco: true },
      { nombre: 'Vida social', scoreActual: 3, scoreDeseado: 3, color: '#7ca3c8', orden: 2 },
      { nombre: 'Ocio y tiempo libre', scoreActual: 2, scoreDeseado: 3, color: '#a3a86b', orden: 3 },
      { nombre: 'Negocios y carrera', scoreActual: 4, scoreDeseado: 4, color: '#e8861b', orden: 4, foco: true },
      { nombre: 'Finanzas', scoreActual: 3, scoreDeseado: 4, color: '#b5732a', orden: 5 },
      { nombre: 'Crecimiento personal', scoreActual: 3, scoreDeseado: 4, color: '#d8956b', orden: 6 },
      { nombre: 'Contexto', scoreActual: 3, scoreDeseado: 4, color: '#c87c95', orden: 7 },
    ])
    .returning();

  await db.insert(s.areaCheckins).values(
    [saludMental, saludFisica, social, ocio, carrera, finanzas, crecimiento, contexto].map((a) => ({
      areaId: a.id,
      score: a.scoreActual!,
      fecha: iso(diasAtras(30)),
    })),
  );

  const [boulder, dormir, portfolio, cursoB1] = await db
    .insert(s.lineas)
    .values([
      { titulo: 'Boulder 3x/sem', tipo: 'habito', estado: 'activa', objetivo: 'Sostener 3 sesiones semanales', ultimaActividad: iso(diasAtras(1)) },
      { titulo: 'Dormir antes 00:30', tipo: 'habito', estado: 'activa', objetivo: 'Acostarme antes de las 00:30', ultimaActividad: iso(diasAtras(2)) },
      { titulo: 'Portfolio v2', tipo: 'proyecto', estado: 'activa', objetivo: 'Publicar el portfolio renovado', ultimaActividad: iso(diasAtras(0)) },
      { titulo: 'Curso B1 de alemán', tipo: 'proyecto', estado: 'activa', objetivo: 'Aprobar el examen B1 de alemán', deadline: '2026-06-28', ultimaActividad: iso(diasAtras(1)) },
    ])
    .returning();

  await db.insert(s.lineas).values([
    { parentId: boulder.id, titulo: 'Competencia local', tipo: 'proyecto', estado: 'activa', objetivo: 'Competir en el torneo del gym' },
    { parentId: portfolio.id, titulo: 'Case study TVA', tipo: 'proyecto', estado: 'activa', objetivo: 'Escribir el case del proyecto TVA' },
  ]);

  // Alemán ahora es una LÍNEA dentro de CARRERA (su deadline real), no un área propia
  await db.insert(s.lineaAreas).values([
    { lineaId: boulder.id, areaId: saludFisica.id },
    { lineaId: boulder.id, areaId: social.id },
    { lineaId: dormir.id, areaId: saludFisica.id },
    { lineaId: portfolio.id, areaId: carrera.id },
    { lineaId: cursoB1.id, areaId: carrera.id },
  ]);
  const salud = saludFisica;
  const aleman = carrera;

  const [temaB1, temaPortfolio] = await db
    .insert(s.temas)
    .values([
      { nombre: 'B1', descripcion: 'Examen y curso de alemán B1' },
      { nombre: 'PORTFOLIO', descripcion: 'Renovación del portfolio' },
    ])
    .returning();

  const [chatAleman, chatPendientes, chatFoto] = await db
    .insert(s.chats)
    .values([
      { titulo: '¿Cómo vengo con el alemán?', temaId: temaB1.id, iniciado: iso(diasAtras(1, 18)), ultimaActividad: iso(diasAtras(1, 18)), estado: 'archivado' },
      { titulo: 'Pendientes de la semana', temaId: temaPortfolio.id, iniciado: iso(diasAtras(3, 9)), ultimaActividad: iso(diasAtras(3, 9)), estado: 'archivado' },
      { titulo: 'Foto: pizarra de planificación', temaId: temaPortfolio.id, iniciado: iso(diasAtras(4, 20)), ultimaActividad: iso(diasAtras(4, 20)), estado: 'archivado' },
    ])
    .returning();

  await db.insert(s.chatMensajes).values([
    { chatId: chatAleman.id, rol: 'user', contenido: '¿Cómo vengo con el alemán?', creado: iso(diasAtras(1, 18)) },
    { chatId: chatAleman.id, rol: 'assistant', contenido: 'Examen B1 confirmado para el 28/6. Esta semana tuviste 1 clase y 0 sesiones de estudio registradas, el deadline está a 17 días.', creado: iso(diasAtras(1, 18)) },
    { chatId: chatPendientes.id, rol: 'user', contenido: '¿Qué tengo pendiente esta semana?', creado: iso(diasAtras(3, 9)) },
    { chatId: chatPendientes.id, rol: 'assistant', contenido: 'Portfolio: responder a Mariana y cerrar el case study. Alemán: confirmar inscripción al examen.', creado: iso(diasAtras(3, 9)) },
    { chatId: chatFoto.id, rol: 'user', contenido: '(foto de la pizarra)', adjuntoTipo: 'imagen', adjuntoPath: 'mock/pizarra.jpg', creado: iso(diasAtras(4, 20)) },
    { chatId: chatFoto.id, rol: 'assistant', contenido: 'Veo 3 columnas: ideas, en curso, hecho. "Case study TVA" está en curso desde hace 2 semanas.', creado: iso(diasAtras(4, 20)) },
  ]);

  await db.insert(s.bitacora).values([
    { tipo: 'sistema', contenido: 'EXPEDIENTE ABIERTO, onboarding completado: 4 áreas, 6 líneas.', fecha: iso(diasAtras(30)) },
    { tipo: 'chat', contenido: 'Chat sobre el estado del alemán: examen B1 el 28/6, ritmo de estudio bajo.', fecha: iso(diasAtras(1, 18)), temaId: temaB1.id, areaId: aleman.id, chatId: chatAleman.id },
    { tipo: 'sync', contenido: 'Llegaron 14 mails, 2 marcados. El Goethe confirmó el examen B1 para el 28/6, la línea "Curso B1" tiene fecha límite real ahora. Mariana espera respuesta del portfolio hoy.', fecha: iso(hoyA(11, 42)), temaId: temaB1.id },
    { tipo: 'manual', contenido: 'Buena sesión de boulder anoche, primer V4 del año. Dormí mejor que toda la semana.', fecha: iso(diasAtras(1, 23)), areaId: salud.id, lineaId: boulder.id },
  ]);

  await db.insert(s.eventos).values([
    { titulo: 'Standup proyecto CX', inicio: iso(hoyA(10)), fin: iso(hoyA(10, 30)), areaId: carrera.id },
    { titulo: 'Clase de alemán', inicio: iso(hoyA(14, 30)), fin: iso(hoyA(16)), areaId: aleman.id, lineaId: cursoB1.id },
    { titulo: 'Boulder con Juli', inicio: iso(hoyA(19)), fin: iso(hoyA(21)), areaId: salud.id, lineaId: boulder.id },
    { titulo: 'Trabajo focus portfolio', inicio: iso(diasAtras(1, 9)), fin: iso(diasAtras(1, 13)), areaId: carrera.id, lineaId: portfolio.id },
    { titulo: 'Sprint review', inicio: iso(diasAtras(2, 15)), fin: iso(diasAtras(2, 17)), areaId: carrera.id },
    { titulo: 'Clase de alemán', inicio: iso(diasAtras(3, 14)), fin: iso(diasAtras(3, 16)), areaId: aleman.id, lineaId: cursoB1.id },
    { titulo: 'Cena con amigos', inicio: iso(diasAtras(3, 21)), fin: iso(diasAtras(3, 23)), areaId: social.id },
    { titulo: 'Boulder', inicio: iso(diasAtras(4, 19)), fin: iso(diasAtras(4, 21)), areaId: salud.id, lineaId: boulder.id },
  ]);

  await db.insert(s.mails).values([
    { remitente: 'Goethe Institut', asunto: 'Confirmación de inscripción, examen B1', snippet: 'Confirmación de inscripción, examen B1, 28 de junio', importante: true, areaId: aleman.id, lineaId: cursoB1.id, recibido: iso(hoyA(9, 15)) },
    { remitente: 'Mariana, Estudio K', asunto: 'Feedback propuesta portfolio', snippet: 'Feedback sobre la propuesta del portfolio, responder hoy', importante: true, areaId: carrera.id, lineaId: portfolio.id, recibido: iso(hoyA(8, 40)) },
    { remitente: 'Newsletter UX', asunto: 'Top 10 patrones de junio', snippet: 'Los patrones más usados…', importante: false, recibido: iso(hoyA(7)) },
    { remitente: 'Banco', asunto: 'Resumen de cuenta', snippet: 'Tu resumen ya está disponible', importante: false, recibido: iso(diasAtras(1, 10)) },
  ]);

  await db.insert(s.sugerencias).values([
    {
      tipo: 'deadline',
      contenido: 'El mail del Goethe confirma el examen el 28/6, ¿fijar deadline en la línea "Curso B1"?',
      lineaId: cursoB1.id,
      evidencia: JSON.stringify({ mails: ['Goethe Institut, Confirmación de inscripción'] }),
      creado: iso(hoyA(11, 42)),
    },
  ]);

  await db.insert(s.config).values([
    { clave: 'onboarding', valor: 'completado' },
    { clave: 'nombre', valor: 'Matías' },
    { clave: 'sync_minutos', valor: '45' },
    // ⚠️ SOLO TRES CLAVES DE MODELO, y son las tres que `roles.ts` lee de verdad
    // (RÁPIDO / CHARLA / PROFUNDO). Acá había cinco: `modelo_clasificador`,
    // `modelo_cronista` y `modelo_entrevistador` se sembraban desde una versión
    // vieja en la que cada rol tenía su fila, y nadie las leyó nunca más.
    // Config muerta es peor que no tenerla: la cambiás, no pasa nada, y te
    // volvés loco buscando por qué. Faltaba `modelo_rapido`, que sí se usa.
    { clave: 'modelo_rapido', valor: 'ollama:gemma4:12b' },
    { clave: 'modelo_asistente', valor: 'ollama:gemma4:12b' },
    { clave: 'modelo_analista', valor: 'ollama:gemma4:12b' },
  ]);

  console.log('Seed OK');
}

main();

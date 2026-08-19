import cron from 'node-cron';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { cicloSync } from '@/lib/sync';
import { cerrarChatsInactivos } from '@/lib/archivado';
import { MINUTOS_CHAT_VIVO } from '@/lib/ventana-chat';
import { analizar } from '@/lib/analista';
import { estimarObjetivosNuevos } from '@/lib/estimador';

function log(mensaje: string) {
  console.log(`[worker ${new Date().toLocaleTimeString('es-AR', { hour12: false })}] ${mensaje}`);
}

async function correrSync() {
  try {
    const resultado = await cicloSync();
    log(`sync → ${resultado}`);
  } catch (e) {
    log(`sync ERROR → ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function correrCierre() {
  try {
    const cerrados = await cerrarChatsInactivos(MINUTOS_CHAT_VIVO);
    if (cerrados > 0) log(`chats archivados → ${cerrados}`);
  } catch (e) {
    log(`cierre ERROR → ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function correrAnalisis() {
  try {
    const ok = await analizar();
    log(`análisis → ${ok ? 'patrones actualizados' : 'sin cambios (asistente offline o sin datos)'}`);
  } catch (e) {
    log(`análisis ERROR → ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function correrEstimaciones() {
  try {
    const puestas = await estimarObjetivosNuevos();
    if (puestas > 0) log(`estimaciones → ${puestas} objetivo(s) con cifra general`);
  } catch (e) {
    log(`estimaciones ERROR → ${e instanceof Error ? e.message.slice(0, 200) : e}`);
  }
}

async function main() {
  const fila = await db.select().from(config).where(eq(config.clave, 'sync_minutos'));
  const minutos = Math.max(5, Number(fila[0]?.valor) || 45);

  log(`arrancando, sync cada ${minutos} min, cierre de chats inactivos ${MINUTOS_CHAT_VIVO} min (chequeo cada 5), análisis semanal`);
  cron.schedule(`*/${minutos} * * * *`, correrSync);
  cron.schedule('*/5 * * * *', correrCierre);
  cron.schedule('0 9 * * 1', correrAnalisis); // lunes 9:00, semanal
  // Cada 10 min y de a tres: un objetivo nuevo tiene su frase en el próximo
  // rato, sin pelearle el modelo al chat, que sí tiene a alguien esperando.
  cron.schedule('*/10 * * * *', correrEstimaciones);
  await correrSync(); // una pasada al arrancar
}

main();

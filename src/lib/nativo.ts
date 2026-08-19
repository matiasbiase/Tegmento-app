// Puente nativo: lo que solo puede leer la app del iPhone (calendario, salud) se
// lee acá y se empuja al server de la Mac, que lo guarda en las tablas de siempre.
// En la PWA/Safari no hay plugins: todo devuelve { ok:false, motivo:'web' }.

import { ymd } from '@/lib/marcas';

export type ResultadoSync = { ok: true; mensaje: string } | { ok: false; motivo: 'web' | 'permiso' | 'error'; mensaje: string };

// Nuestro plugin propio de sueño (ios/App/App/SuenoPlugin.swift). El plugin
// community de salud no expone `sleepAnalysis`, así que leemos el sueño acá.
interface PluginSueno {
  disponible(): Promise<{ disponible: boolean }>;
  pedirPermiso(): Promise<{ ok: boolean }>;
  consultar(opciones: { desde: number; hasta: number }): Promise<{ noches: { fecha: string; minutos: number }[] }>;
}

/** ¿Estamos dentro de la app nativa (Capacitor) y no en Safari? */
export function esNativo(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Un evento del iPhone al formato de la app: con hora, o de todo el día. */
function aInicio(ms: number, todoElDia: boolean): string {
  const d = new Date(ms);
  if (todoElDia) return ymd(d);
  return `${ymd(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Trae los eventos del calendario del iPhone (próximos 60 días) y los guarda.
 * Pide permiso la primera vez; iOS muestra el diálogo del sistema.
 */
export async function sincronizarCalendario(): Promise<ResultadoSync> {
  if (!esNativo()) {
    return { ok: false, motivo: 'web', mensaje: 'Esto se activa desde la app del iPhone.' };
  }
  try {
    const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
    const permiso = await CapacitorCalendar.requestFullCalendarAccess();
    if (permiso.result !== 'granted') {
      return { ok: false, motivo: 'permiso', mensaje: 'Necesito permiso para leer tu calendario.' };
    }

    const desde = Date.now() - 7 * 86_400_000; // una semana atrás, por contexto
    const hasta = Date.now() + 60 * 86_400_000;
    const { result } = await CapacitorCalendar.listEventsInRange({ from: desde, to: hasta });

    const eventos = (result ?? [])
      .filter((e) => e.title && typeof e.startDate === 'number')
      .map((e) => {
        // "todo el día" cuando arranca 00:00 y dura 24h o más
        const dur = (e.endDate ?? e.startDate) - e.startDate;
        const ini = new Date(e.startDate);
        const todoElDia = ini.getHours() === 0 && ini.getMinutes() === 0 && dur >= 23 * 3_600_000;
        return {
          uid: e.id,
          titulo: e.title,
          inicio: aInicio(e.startDate, todoElDia),
          fin: aInicio(e.endDate ?? e.startDate, todoElDia),
        };
      });

    const res = await fetch('/api/calendario/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventos }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, motivo: 'error', mensaje: data?.error ?? 'No se pudo guardar.' };

    const n = data?.nuevos ?? 0;
    const a = data?.actualizados ?? 0;
    return {
      ok: true,
      mensaje: n || a ? `Listo: ${n} evento${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'}${a ? `, ${a} actualizado${a === 1 ? '' : 's'}` : ''}.` : 'No había eventos nuevos.',
    };
  } catch (e) {
    return { ok: false, motivo: 'error', mensaje: e instanceof Error ? e.message : 'Falló la sincronización.' };
  }
}

/**
 * Trae de Apple Salud: pasos por día (plugin community) + sueño por noche
 * (nuestro plugin propio SuenoPlugin.swift). Empuja ambos al mismo endpoint.
 */
export async function sincronizarSalud(): Promise<ResultadoSync> {
  if (!esNativo()) {
    return { ok: false, motivo: 'web', mensaje: 'Esto se activa desde la app del iPhone.' };
  }
  try {
    const { Health } = await import('capacitor-health');
    const { available } = await Health.isHealthAvailable();
    if (!available) return { ok: false, motivo: 'error', mensaje: 'Apple Salud no está disponible acá.' };

    await Health.requestHealthPermissions({ permissions: ['READ_STEPS'] });

    const hasta = new Date();
    const desde = new Date(Date.now() - 14 * 86_400_000);
    const { aggregatedData } = await Health.queryAggregated({
      startDate: desde.toISOString(),
      endDate: hasta.toISOString(),
      dataType: 'steps',
      bucket: 'day',
    });

    const pasos = (aggregatedData ?? [])
      .filter((s) => s.value > 0)
      .map((s) => ({ fecha: s.startDate.slice(0, 10), pasos: Math.round(s.value) }));

    // Sueño: lo lee nuestro plugin propio (HealthKit sleepAnalysis). Si el build
    // todavía no lo tiene, seguimos igual con los pasos (no rompe la sync).
    let sueno: { fecha: string; minutos: number }[] = [];
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const Sueno = registerPlugin<PluginSueno>('Sueno');
      const { disponible } = await Sueno.disponible();
      if (disponible) {
        await Sueno.pedirPermiso();
        const { noches } = await Sueno.consultar({ desde: desde.getTime(), hasta: hasta.getTime() });
        sueno = (noches ?? []).filter((s) => s.minutos > 0);
      }
    } catch {
      // plugin de sueño ausente (build viejo) → seguimos solo con pasos.
    }

    const res = await fetch('/api/salud/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pasos, sueno }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, motivo: 'error', mensaje: data?.error ?? 'No se pudo guardar.' };

    const n = data?.nuevos ?? 0;
    const detalle = sueno.length ? 'pasos y sueño' : 'pasos';
    return { ok: true, mensaje: n ? `Listo: ${n} registro${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'} (${detalle}).` : 'No había datos nuevos.' };
  } catch (e) {
    return { ok: false, motivo: 'error', mensaje: e instanceof Error ? e.message : 'Falló la sincronización.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EL RITUAL: LAS NOTIFICACIONES DEL DÍA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Programa (o cancela) los dos avisos del ritual en el iPhone.
 *
 * ⚠️ SON NOTIFICACIONES **LOCALES**, Y ESO ES TODO EL DESBLOQUEO. No hay
 * servidor, ni certificados, ni cuenta de Apple paga, ni push remotas: se le
 * pide a iOS que avise a tal hora y iOS avisa, **aunque la Mac esté apagada**.
 * Estaba anotado desde el 27/07 como lo primero a verificar; era cierto.
 *
 * ⚠️ EL LÍMITE QUE HAY QUE DECIR: el aviso llega con la Mac apagada, pero al
 * TOCARLO la app no abre, porque la app vive en la Mac. El recordatorio funciona
 * siempre; contestarlo depende de que la Mac esté prendida. La pantalla de
 * ajustes lo dice con todas las letras — descubrirlo solo se vive como una
 * promesa incumplida.
 *
 * ⚠️ SE CANCELA ANTES DE PROGRAMAR, siempre. Sin eso, el aviso que hoy se
 * saltea (porque ya cargaste el sueño) seguiría encolado de la programación
 * anterior y sonaría igual — el bug clásico que hace que la gente apague los
 * recordatorios para siempre. Ver `idsACancelar` en `lib/ritual.ts`.
 */
export async function programarRitual(
  avisos: { id: number; titulo: string; cuerpo: string; hora: { hora: number; minuto: number } }[],
  cancelar: number[],
): Promise<ResultadoSync> {
  if (!esNativo()) {
    return { ok: false, motivo: 'web', mensaje: 'Los avisos se activan desde la app del iPhone.' };
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // El permiso se pide UNA vez; si ya lo diste, `checkPermissions` alcanza y
    // no vuelve a molestar. Si lo negaste, iOS no vuelve a preguntar nunca: hay
    // que ir a Ajustes, y por eso el mensaje lo dice en vez de fallar en silencio.
    let permiso = (await LocalNotifications.checkPermissions()).display;
    if (permiso === 'prompt' || permiso === 'prompt-with-rationale') {
      permiso = (await LocalNotifications.requestPermissions()).display;
    }
    if (permiso !== 'granted') {
      return {
        ok: false,
        motivo: 'permiso',
        mensaje: 'iOS tiene los avisos bloqueados para Tegmento. Se prende en Ajustes › Tegmento › Notificaciones.',
      };
    }

    if (cancelar.length > 0) {
      await LocalNotifications.cancel({ notifications: cancelar.map((id) => ({ id })) });
    }

    if (avisos.length > 0) {
      await LocalNotifications.schedule({
        notifications: avisos.map((a) => ({
          id: a.id,
          title: a.titulo,
          body: a.cuerpo,
          // ⚠️ `repeats: true` con `on: {hour, minute}` es lo que lo hace DIARIO
          // sin que la app tenga que abrirse. Sin `repeats`, el aviso suena una
          // vez y el ritual dura un día.
          schedule: { on: { hour: a.hora.hora, minute: a.hora.minuto }, repeats: true, allowWhileIdle: true },
        })),
      });
    }

    if (avisos.length === 0) return { ok: true, mensaje: 'Avisos apagados.' };
    return { ok: true, mensaje: `Listo: ${avisos.length === 1 ? 'un aviso' : 'dos avisos'} por día.` };
  } catch (e) {
    return { ok: false, motivo: 'error', mensaje: e instanceof Error ? e.message : 'No se pudieron programar.' };
  }
}

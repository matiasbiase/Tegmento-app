// Tiempo en pantalla: como Apple no deja leerlo automático, el usuario saca un
// screenshot de Ajustes → Tiempo en pantalla y Gemma extrae el total + las apps.
// Mismo patrón que los tickets (foto → JSON → dato estructurado).

export type AppUso = { nombre: string; min: number };
export type PantallaParseada = { totalMin: number; apps: AppUso[] };

/** Convierte "6 h 12 min", "6h12", "372", "5 hrs" a minutos. */
export function minutosDeTexto(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  const t = v.toLowerCase();
  const hm = t.match(/(\d+)\s*h[a-z]*\s*(\d+)?\s*m?/);
  if (hm) return Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0);
  const soloMin = t.match(/^(\d+)\s*min/);
  if (soloMin) return Number(soloMin[1]);
  const n = parseInt(t.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function app(x: unknown): AppUso | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as { nombre?: unknown; min?: unknown };
  const nombre = typeof o.nombre === 'string' ? o.nombre.trim().slice(0, 40) : '';
  const min = minutosDeTexto(o.min);
  if (!nombre || min == null) return null;
  return { nombre, min };
}

export function parsearPantalla(crudo: string): PantallaParseada | null {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (j.esPantalla === false) return null;
  const totalMin = minutosDeTexto(j.totalMin ?? j.total);
  if (totalMin == null || totalMin <= 0) return null;
  const apps = Array.isArray(j.apps) ? j.apps.map(app).filter((a): a is AppUso => a != null).slice(0, 8) : [];
  return { totalMin, apps };
}

export function fmtHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function resumenPantalla(p: PantallaParseada): string {
  const top = p.apps[0];
  return top ? `${fmtHoras(p.totalMin)} · ${top.nombre} lo más usado` : fmtHoras(p.totalMin);
}

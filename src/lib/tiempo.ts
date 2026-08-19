export type EventoTiempo = { areaId: number | null; inicio: string; fin: string };

export function horasPorArea(eventos: EventoTiempo[]): Map<number, number> {
  const horas = new Map<number, number>();
  for (const e of eventos) {
    if (e.areaId == null) continue;
    const ms = new Date(e.fin).getTime() - new Date(e.inicio).getTime();
    if (!(ms > 0)) continue;
    horas.set(e.areaId, (horas.get(e.areaId) ?? 0) + ms / 3_600_000);
  }
  return horas;
}

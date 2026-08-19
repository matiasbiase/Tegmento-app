import type { EventoCrudo } from './mapear';

export async function listarEventos(token: string): Promise<EventoCrudo[]> {
  const timeMin = new Date(Date.now() - 86_400_000).toISOString();
  const timeMax = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Calendar ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { items?: EventoCrudo[] };
  return data.items ?? [];
}

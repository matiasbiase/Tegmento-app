export type MailCrudo = {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

export function mapearMail(m: MailCrudo) {
  const header = (n: string) =>
    m.payload?.headers?.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? '';
  const remitente = header('From').replace(/<[^>]*>/g, '').replace(/"/g, '').trim();
  return {
    gmailId: m.id,
    remitente: remitente || '(desconocido)',
    asunto: header('Subject') || '(sin asunto)',
    snippet: m.snippet ?? '',
    recibido: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
    raw: JSON.stringify(m),
  };
}

export type EventoCrudo = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function aIso(p?: { dateTime?: string; date?: string }): string | null {
  if (p?.dateTime) return p.dateTime;
  if (p?.date) return `${p.date}T00:00:00`;
  return null;
}

export function mapearEvento(e: EventoCrudo) {
  return {
    gcalId: e.id,
    titulo: e.summary ?? '(sin título)',
    inicio: aIso(e.start),
    fin: aIso(e.end),
    raw: JSON.stringify(e),
  };
}

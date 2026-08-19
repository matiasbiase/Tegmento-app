import type { MailCrudo } from './mapear';

async function gFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function listarMails(token: string, dias = 2): Promise<MailCrudo[]> {
  const lista = await gFetch<{ messages?: { id: string }[] }>(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:${dias}d&maxResults=25`,
  );
  const resultado: MailCrudo[] = [];
  for (const { id } of lista.messages ?? []) {
    resultado.push(
      await gFetch<MailCrudo>(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      ),
    );
  }
  return resultado;
}

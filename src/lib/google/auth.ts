import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';
import { cifrar, descifrar } from '@/lib/cifrado';

const SCOPES =
  'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';
const redirectUri = () => `${process.env.APP_URL ?? 'http://localhost:3000'}/api/google/callback`;
const secreto = () => process.env.MASTER_PASSWORD ?? process.env.SESSION_SECRET ?? '';

export type TokensGoogle = { refresh_token: string; access_token: string; expiry: number };

/**
 * Arranca el consentimiento de Google. El `state` es un número al azar que
 * viaja a Google y tiene que volver igual: sin él, alguien podría mandarte un
 * link de callback armado y terminarías conectando SU cuenta de Google a tu app
 * sin darte cuenta. Lo guarda quien llama, en una cookie, y lo compara al volver.
 */
export function urlConsentimiento(): { url: string; state: string } {
  const state = randomBytes(16).toString('hex');
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`, state };
}

async function pedirToken(extra: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      ...extra,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
}

async function guardarTokens(t: TokensGoogle) {
  const valor = cifrar(JSON.stringify(t), secreto());
  await db
    .insert(config)
    .values({ clave: 'google_tokens', valor })
    .onConflictDoUpdate({ target: config.clave, set: { valor } });
}

export async function intercambiarCodigo(code: string): Promise<void> {
  const t = await pedirToken({ code, grant_type: 'authorization_code', redirect_uri: redirectUri() });
  if (!t.refresh_token) throw new Error('Google no devolvió refresh_token (reintentá revocando el acceso previo)');
  await guardarTokens({
    refresh_token: t.refresh_token,
    access_token: t.access_token,
    expiry: Date.now() + t.expires_in * 1000,
  });
}

export async function leerTokens(): Promise<TokensGoogle | null> {
  const fila = await db.select().from(config).where(eq(config.clave, 'google_tokens'));
  if (!fila[0]) return null;
  try {
    return JSON.parse(descifrar(fila[0].valor, secreto())) as TokensGoogle;
  } catch {
    return null;
  }
}

export async function tokenAcceso(): Promise<string | null> {
  const t = await leerTokens();
  if (!t) return null;
  if (t.expiry > Date.now() + 60_000) return t.access_token;
  const nuevo = await pedirToken({ refresh_token: t.refresh_token, grant_type: 'refresh_token' });
  await guardarTokens({ ...t, access_token: nuevo.access_token, expiry: Date.now() + nuevo.expires_in * 1000 });
  return nuevo.access_token;
}

export async function desconectar(): Promise<void> {
  await db.delete(config).where(eq(config.clave, 'google_tokens'));
}

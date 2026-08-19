const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signSession(secret: string, ttlMs: number, ahora = Date.now()): Promise<string> {
  const exp = String(ahora + ttlMs);
  return `${exp}.${await hmac(secret, exp)}`;
}

export async function verifySession(secret: string, token: string | undefined, ahora = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [exp, firma] = token.split('.');
  if (!exp || !firma) return false;
  if (!(Number(exp) > ahora)) return false;
  return (await hmac(secret, exp)) === firma;
}

import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/session';

const SECRET = 'secreto-de-test';

describe('sesión', () => {
  it('firma y verifica', async () => {
    const token = await signSession(SECRET, 60_000);
    expect(await verifySession(SECRET, token)).toBe(true);
  });

  it('rechaza token expirado', async () => {
    const token = await signSession(SECRET, 60_000, 1_000_000);
    expect(await verifySession(SECRET, token, 2_000_000)).toBe(false);
  });

  it('rechaza token adulterado', async () => {
    const token = await signSession(SECRET, 60_000);
    const [exp, firma] = token.split('.');
    const adulterado = `${Number(exp) + 99_999}.${firma}`;
    expect(await verifySession(SECRET, adulterado)).toBe(false);
  });

  it('rechaza secreto distinto, vacío y basura', async () => {
    const token = await signSession(SECRET, 60_000);
    expect(await verifySession('otro-secreto', token)).toBe(false);
    expect(await verifySession(SECRET, undefined)).toBe(false);
    expect(await verifySession(SECRET, 'sin-punto')).toBe(false);
  });
});

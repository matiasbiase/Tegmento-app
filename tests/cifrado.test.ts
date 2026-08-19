import { describe, it, expect } from 'vitest';
import { cifrar, descifrar } from '@/lib/cifrado';

describe('cifrado', () => {
  it('roundtrip cifra y descifra', () => {
    const token = cifrar('{"refresh_token":"abc123"}', 'mi-secreto');
    expect(token).not.toContain('abc123');
    expect(descifrar(token, 'mi-secreto')).toBe('{"refresh_token":"abc123"}');
  });

  it('secreto incorrecto lanza', () => {
    const token = cifrar('dato', 'secreto-a');
    expect(() => descifrar(token, 'secreto-b')).toThrow();
  });

  it('formato roto lanza', () => {
    expect(() => descifrar('no-es-un-token', 'x')).toThrow();
  });
});

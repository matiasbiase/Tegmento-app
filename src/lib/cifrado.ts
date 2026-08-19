import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

function clave(secreto: string): Buffer {
  return scryptSync(secreto, 'bitacora-de-vida', 32);
}

export function cifrar(textoPlano: string, secreto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', clave(secreto), iv);
  const datos = Buffer.concat([cipher.update(textoPlano, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), datos.toString('base64')].join('.');
}

export function descifrar(token: string, secreto: string): string {
  const [ivB, tagB, datosB] = token.split('.');
  if (!ivB || !tagB || !datosB) throw new Error('Formato de token cifrado inválido');
  const decipher = createDecipheriv('aes-256-gcm', clave(secreto), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(datosB, 'base64')), decipher.final()]).toString('utf8');
}

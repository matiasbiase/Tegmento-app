import fs from 'node:fs';
import path from 'node:path';

export const ADJUNTOS_DIR = path.join(process.cwd(), 'data', 'adjuntos');

const EXTENSIONES = ['jpg', 'wav', 'm4a', 'webm', 'ogg', 'mp4'] as const;
type Extension = (typeof EXTENSIONES)[number];

/** Techo para las fotos que se suben. No es defensa contra un atacante — la app
 *  es tuya y local — es que cada foto se convierte entera a base64 en memoria y
 *  se le manda al modelo. Sin techo, un archivo enorme deja al server sin aire.
 *  12 MB: una foto del iPhone pesa ~3 MB, así que sobra. */
export const LIMITE_FOTO = 12_000_000;

/** true si la foto pasa el techo. El mensaje al usuario lo pone cada ruta. */
export function fotoMuyGrande(f: File): boolean {
  return f.size > LIMITE_FOTO;
}

export function guardarAdjunto(buffer: Buffer, ext: Extension): string {
  if (!EXTENSIONES.includes(ext)) throw new Error(`Extensión no permitida: ${ext}`);
  fs.mkdirSync(ADJUNTOS_DIR, { recursive: true });
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(ADJUNTOS_DIR, nombre), buffer);
  return nombre;
}

export function rutaAdjunto(nombre: string): string | null {
  if (!/^[\w.-]+$/.test(nombre) || nombre.includes('..')) return null;
  const ruta = path.join(ADJUNTOS_DIR, nombre);
  return fs.existsSync(ruta) ? ruta : null;
}

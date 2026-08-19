import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { rutaAdjunto } from '@/lib/adjuntos';

const TIPOS: Record<string, string> = {
  jpg: 'image/jpeg',
  wav: 'audio/wav',
};

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await params;
  const ruta = rutaAdjunto(archivo);
  if (!ruta) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const ext = archivo.split('.').pop() ?? '';
  const cuerpo = fs.readFileSync(ruta);
  return new NextResponse(new Uint8Array(cuerpo), {
    headers: { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' },
  });
}

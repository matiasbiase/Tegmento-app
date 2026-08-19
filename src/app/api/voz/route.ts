import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { config } from '@/lib/db/schema';

const ejecutar = promisify(execFile);

async function generarKokoro(texto: string, voz: string): Promise<Buffer> {
  const salida = path.join(os.tmpdir(), `bv-kokoro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`);
  try {
    await ejecutar('python3', [path.join(process.cwd(), 'scripts', 'voz.py'), texto, voz, salida], {
      timeout: 90_000,
      env: process.env,
    });
    return fs.readFileSync(salida);
  } finally {
    fs.rmSync(salida, { force: true });
  }
}

async function generarEleven(texto: string, vozId: string): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Falta ELEVENLABS_API_KEY en .env.local');
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${vozId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2' }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 100)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generarSay(texto: string, voz: string): Promise<Buffer> {
  const base = path.join(os.tmpdir(), `bv-voz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const txt = `${base}.txt`;
  const aiff = `${base}.aiff`;
  const m4a = `${base}.m4a`;
  try {
    fs.writeFileSync(txt, texto, 'utf8');
    await ejecutar('say', ['-v', voz, '-f', txt, '-o', aiff], { timeout: 30_000 });
    await ejecutar('afconvert', ['-f', 'm4af', '-d', 'aac', aiff, m4a], { timeout: 30_000 });
    return fs.readFileSync(m4a);
  } finally {
    for (const f of [txt, aiff, m4a]) fs.rmSync(f, { force: true });
  }
}

export async function POST(req: Request) {
  const { texto } = (await req.json().catch(() => ({}))) as { texto?: string };
  const limpio = String(texto ?? '').trim().slice(0, 2000);
  if (!limpio) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });

  const fila = await db.select().from(config).where(eq(config.clave, 'voz'));
  const valor = fila[0]?.valor || 'kokoro:ef_dora';
  const [motor, voz] = valor.includes(':') ? valor.split(':', 2) : ['say', valor];

  // Cascada: motor elegido → kokoro local → voz del sistema (nunca falla)
  const intentos: [string, () => Promise<{ datos: Buffer; tipo: string }>][] = [];
  if (motor === 'eleven') {
    intentos.push(['eleven', async () => ({ datos: await generarEleven(limpio, voz), tipo: 'audio/mpeg' })]);
  }
  if (motor === 'kokoro' || motor === 'eleven') {
    const vozKokoro = motor === 'kokoro' ? voz : 'ef_dora';
    intentos.push(['kokoro', async () => ({ datos: await generarKokoro(limpio, vozKokoro), tipo: 'audio/wav' })]);
  }
  if (motor === 'say') {
    intentos.push(['say', async () => ({ datos: await generarSay(limpio, voz), tipo: 'audio/mp4' })]);
  }
  intentos.push(['say-fallback', async () => ({ datos: await generarSay(limpio, 'Mónica'), tipo: 'audio/mp4' })]);

  for (const [nombre, generar] of intentos) {
    try {
      const { datos, tipo } = await generar();
      return new NextResponse(new Uint8Array(datos), { headers: { 'Content-Type': tipo } });
    } catch (e) {
      console.error(`[voz] ${nombre} falló:`, e instanceof Error ? e.message.slice(0, 300) : e);
    }
  }
  return NextResponse.json({ error: 'No se pudo generar la voz con ningún motor' }, { status: 503 });
}

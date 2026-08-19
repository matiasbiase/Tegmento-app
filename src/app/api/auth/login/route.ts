import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { signSession } from '@/lib/auth/session';

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

// Anti fuerza bruta: el server escucha en toda la LAN, así que sin esto alguien
// en tu red podría probar los 10.000 PINs en segundos. Después de varios fallos
// se bloquea un rato. Estado en memoria: se resetea si reinicia el server, y
// como es de un solo usuario alcanza con un contador global.
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;
let fallos = 0;
let bloqueadoHasta = 0;

/** Compara el PIN en tiempo constante (no filtra por cuánto tarda). */
function pinValido(pin: unknown): boolean {
  const real = process.env.APP_PIN ?? '';
  if (!real || typeof pin !== 'string') return false;
  const a = Buffer.from(pin);
  const b = Buffer.from(real);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ahora = Date.now();
  if (ahora < bloqueadoHasta) {
    const seg = Math.ceil((bloqueadoHasta - ahora) / 1000);
    return NextResponse.json({ ok: false, error: `Demasiados intentos. Esperá ${seg}s.` }, { status: 429 });
  }

  const { pin } = await req.json().catch(() => ({ pin: '' }));
  if (!pinValido(pin)) {
    fallos += 1;
    // Decir cuántos quedan: sin esto se llega al bloqueo sin aviso y el
    // mensaje siguiente ("esperá 5 minutos") parece que salió de la nada.
    if (fallos >= MAX_INTENTOS) {
      bloqueadoHasta = ahora + BLOQUEO_MS;
      fallos = 0;
      return NextResponse.json(
        { ok: false, error: 'Demasiados intentos. Esperá 5 minutos o reiniciá el server.' },
        { status: 429 },
      );
    }
    const quedan = MAX_INTENTOS - fallos;
    return NextResponse.json(
      { ok: false, error: `PIN incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.` },
      { status: 401 },
    );
  }

  fallos = 0;
  const token = await signSession(process.env.SESSION_SECRET!, TTL_MS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('bv_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    // Si entraste por HTTPS (que es como corre la app: certificado propio,
    // Tailscale, el iPhone), la cookie no vuelve a salir nunca en claro por la
    // red. Se mira la URL en vez de fijarlo siempre en true para no romper un
    // http://localhost suelto, donde `secure` haría que el login no pegue.
    secure: new URL(req.url).protocol === 'https:',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
  return res;
}

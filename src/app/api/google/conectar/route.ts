import { NextResponse } from 'next/server';
import { urlConsentimiento } from '@/lib/google/auth';

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local' },
      { status: 500 },
    );
  }
  const { url, state } = urlConsentimiento();
  const res = NextResponse.redirect(url);
  // El `state` queda en una cookie corta para poder comprobarlo al volver: así
  // un callback que no arrancó acá no puede conectar una cuenta ajena.
  res.cookies.set('g_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(req.url).protocol === 'https:',
    path: '/',
    maxAge: 600, // 10 minutos: lo que tarda dar el consentimiento
  });
  return res;
}

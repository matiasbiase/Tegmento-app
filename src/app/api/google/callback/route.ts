import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { intercambiarCodigo } from '@/lib/google/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // El `state` tiene que ser el mismo que se guardó al arrancar en /conectar.
  // Si no coincide, este callback no lo empezaste vos: se corta sin tocar nada.
  const esperado = (await cookies()).get('g_state')?.value;
  if (!code || !state || !esperado || state !== esperado) {
    return NextResponse.redirect(new URL('/perfil?google=error', req.url));
  }

  let res: NextResponse;
  try {
    await intercambiarCodigo(code);
    res = NextResponse.redirect(new URL('/perfil?google=ok', req.url));
  } catch {
    res = NextResponse.redirect(new URL('/perfil?google=error', req.url));
  }

  // El state es de un solo uso, pase lo que pase.
  res.cookies.delete('g_state');
  return res;
}

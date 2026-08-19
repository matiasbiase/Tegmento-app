import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET ?? '';
  const token = req.cookies.get('bv_session')?.value;
  // Si el secreto falta o es débil, NUNCA autorizar (evita sesiones forjables)
  if (secret.length >= 16 && (await verifySession(secret, token))) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  // ⚠️ SE LLEVA A DÓNDE IBAS (13/08). Antes redirigía a `/login` pelado y el
  // login siempre terminaba en `/chat`, así que **cualquier link a cualquier
  // pantalla se perdía si la sesión había vencido**. Se descubrió con un link
  // con parámetro (`/chat?bot=demo`), que llegaba sin el parámetro y parecía que
  // la función no andaba — pero pasa igual con `/notas/12` o con cualquier otra.
  //
  // ⚠️ Solo se guarda RUTA + QUERY, nunca una URL completa: si aceptara
  // `?volver=https://otrositio…`, el login se volvería un trampolín para mandar
  // a alguien afuera desde un dominio de confianza. Ver la validación del lado
  // del login, que además exige que empiece con `/`.
  const destino = req.nextUrl.pathname + req.nextUrl.search;
  const login = new URL('/login', req.url);
  if (destino && destino !== '/') login.searchParams.set('volver', destino);
  return NextResponse.redirect(login);
}

// ⚠️ LOS ÍCONOS TIENEN QUE SER PÚBLICOS, y no es un descuido de seguridad:
// el navegador los pide desde la PANTALLA DE LOGIN, donde todavía no hay
// sesión. Si el middleware los intercepta, devuelve un redirect a /login y el
// navegador recibe HTML donde esperaba un PNG — resultado: no aparece ningún
// ícono, ni en la pestaña ni al agregar la app a la pantalla de inicio.
//
// ⚠️ `icons` cubre la carpeta /public/icons, pero NO cubre `icon.png` ni
// `apple-icon.png`, que son rutas que genera Next por convención desde
// src/app/. Van listadas aparte y con el punto escapado.
export const config = {
  matcher: [
    '/((?!login|api/auth/login|_next|manifest\\.webmanifest|icons|icon\\.png|apple-icon\\.png|apple-touch-icon|favicon\\.ico).*)',
  ],
};

import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

/**
 * QUÉ VERSIÓN ESTÁ CORRIENDO, sacada del commit y no escrita a mano.
 *
 * Pedido de Matías (30/07): *"abajo en el menú dice v0.1 y no sé en qué versión
 * vamos, porque hicimos muchos cambios"*. Tenía razón: ese número estaba fijo en
 * `Sidebar.tsx` y no lo movió nadie en semanas.
 *
 * ⚠️ SALE DEL COMMIT A PROPÓSITO, y no de `package.json`. Lo que él necesita es
 * poder mirar la app y saber **a qué punto volver si algo se rompe** — y para eso
 * "0.1.0" no sirve, porque no apunta a ningún lado. El hash sí: con ese código se
 * vuelve exactamente a esta versión.
 *
 * Se lee UNA vez al arrancar el build. Si git no está (una copia bajada sin
 * `.git`, un contenedor pelado), no rompe nada: queda "—" y la app anda igual.
 */
function versionDelCommit(): { hash: string; fecha: string } {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const fecha = execSync('git log -1 --format=%cd --date=format:%d/%m', { encoding: 'utf8' }).trim();
    return { hash, fecha };
  } catch {
    return { hash: '—', fecha: '' };
  }
}

const { hash, fecha } = versionDelCommit();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT: hash,
    NEXT_PUBLIC_COMMIT_FECHA: fecha,
  },
  serverExternalPackages: ['better-sqlite3'],
  // ⚠️ SIN ESTO NO SE PUEDE SUBIR NINGUNA FOTO (06/08). Las server actions de
  // Next traen un techo de **1 MB** en el cuerpo del pedido, y una foto del
  // iPhone pesa ~3 MB: el pedido moría en el framework con "Body exceeded 1 MB
  // limit" **antes de llegar a la acción**, así que el chequeo propio de 12 MB
  // (`LIMITE_FOTO` en `lib/adjuntos.ts`) no se ejecutaba nunca y el mensaje
  // lindo que teníamos escrito para las fotos grandes no lo vio nadie.
  // Dos techos para lo mismo y el que mandaba era el que no sabíamos que
  // existía. Este se pone igual al nuestro para que **el que corte sea el
  // nuestro**, que es el que sabe explicarse.
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
  },
  outputFileTracingRoot: __dirname,
  // Oculta el badge "N" de Next en modo dev (aparecía flotando en la app nativa).
  devIndicators: false,
  // Permite correr una 2da instancia (ej: prueba de onboarding) con su propia
  // carpeta de build, así no se pisan el .next. Default: .next para la app real.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Sin esto, el dev server responde 404 a los assets /_next cuando se entra
  // por Tailscale o por la IP de la LAN, y la app se ve en blanco.
  // Poné los tuyos en DEV_ORIGINS, separados por coma: el nombre de tu
  // máquina en Tailscale, la IP de tu LAN, lo que uses para entrar.
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? 'localhost')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export default nextConfig;

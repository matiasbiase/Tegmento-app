'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * A dónde ibas antes de que te pidiera el PIN. Lo pone el middleware en
   * `?volver=` cuando te intercepta.
   *
   * ⚠️ SE LEE DE `window.location` Y NO CON `useSearchParams()`, y no es capricho:
   * ese hook obliga a envolver la página en un `<Suspense>` o el build falla con
   * *"should be wrapped in a suspense boundary"*. Lo cazó `build:check`. Acá el
   * valor solo hace falta al apretar el botón —o sea, en el cliente y con la URL
   * ya cargada—, así que el hook no aporta nada y sí costaba estructura.
   *
   * ⚠️ SOLO RUTAS INTERNAS. Tiene que empezar con una barra y NO con dos: para el
   * navegador `//otrositio.com` es otro dominio, así que sin este filtro el login
   * sería un trampolín para mandar a alguien afuera desde una URL que parece de
   * la app. Es la clase de agujero que se abre solo al agregar una comodidad.
   */
  function aDondeIba(): string {
    if (typeof window === 'undefined') return '/chat';
    const crudo = new URLSearchParams(window.location.search).get('volver') ?? '';
    return /^\/(?![/\\])/.test(crudo) ? crudo : '/chat';
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      router.push(aDondeIba());
      return;
    }
    // El server manda el motivo real: sobre todo el bloqueo por intentos
    // fallidos, que antes se mostraba como "PIN incorrecto" y dejaba a Matías
    // probando sin entender por qué nada funcionaba.
    const data = await res.json().catch(() => null);
    setError(data?.error ?? 'PIN incorrecto');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-7 bg-lavanda px-8 pt-[env(safe-area-inset-top)]">
      <div className="text-center">
        <p className="font-mono text-[12px] font-semibold tracking-[0.3px] text-iris">Tegmento</p>
        <h1 className="mt-2 font-serif text-[32px] font-semibold tracking-[-0.4px] text-tinta">Hola de nuevo</h1>
        <p className="mt-1 text-[15px] text-niebla">Ingresá tu PIN para entrar.</p>
      </div>
      <form onSubmit={entrar} className="flex w-full flex-col gap-3">
        {/* ⚠️ SIN `inputMode="numeric"`. Lo tenía, y con un PIN que incluye
            letras el iPhone abría el teclado numérico: era físicamente
            imposible escribirlo. El PIN puede ser alfanumérico, así que el
            campo tiene que aceptar el teclado completo. */}
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="w-full rounded-2xl border border-iris-borde bg-white px-4 py-3.5 text-center font-mono text-[19px] tracking-[6px] text-tinta outline-none placeholder:tracking-normal placeholder:text-niebla focus:border-iris"
        />
        <button
          type="submit"
          className="rounded-2xl py-3.5 font-mono text-[13px] font-bold tracking-[0.3px] text-white"
          style={{ background: 'linear-gradient(135deg,var(--color-iris),var(--color-iris-2))', boxShadow: '0 8px 20px rgba(108,120,238,.35)' }}
        >
          Entrar
        </button>
        {error && (
          <p className="text-center font-mono text-[12px] font-semibold leading-relaxed tracking-[0.2px] text-brick text-pretty">
            {error}
          </p>
        )}
      </form>
      <p className="font-mono text-[12px] text-niebla-3">Tegmento · v0.1</p>
    </main>
  );
}

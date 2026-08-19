'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * LA LLAVE DE LAS NOTAS PRIVADAS.
 *
 * Pedido de Matías (31/07): notas que te pidan contraseña, *"como en Apple"*, y
 * con la aclaración de que **por ahora puede ser simulado**.
 *
 * ── QUÉ PROTEGE Y QUÉ NO, DICHO SIN VUELTAS ──────────────────────────────────
 *
 * ⚠️ **ES UNA CORTINA, NO UNA CAJA FUERTE.** El texto de la nota está sin cifrar
 * en el SQLite: cualquiera con el archivo la lee, y este PIN no lo impide. Lo que
 * sí impide —que es el caso real— es que aparezca en pantalla cuando alguien te
 * mira por encima del hombro, o cuando abrís la app delante de otro.
 *
 * El PIN vive en `localStorage` y se compara en el navegador. Está bien para lo
 * que promete y **no hay que venderlo como más de lo que es**: el día que esto
 * proteja de verdad, hay que cifrar el cuerpo de la nota en reposo, y ahí el PIN
 * pasa a ser la clave de descifrado en vez de un portero.
 *
 * ── LAS TRES DECISIONES ──────────────────────────────────────────────────────
 *
 * 1. **La llave dura lo que dura la pestaña.** Al recargar vuelve a pedirse. Es
 *    lo que uno espera de algo bajo llave, y cubre solo el caso que importa
 *    (dejar el teléfono sobre la mesa) sin trabajo extra.
 * 2. **El primer uso define el PIN**, sin pantalla de configuración aparte. Un
 *    ajuste más en Perfil para algo que se usa una vez es una pantalla que nadie
 *    encuentra.
 * 3. ⚠️ **No hay "recuperar PIN", y se avisa antes de crearlo.** Un "olvidé mi
 *    PIN" que te deja entrar igual no es una llave; y uno que borra las notas es
 *    peor. Si se pierde, se pierde el acceso desde la app — el dato sigue en la
 *    base.
 */

const CLAVE = 'tegmento:pin-notas';

/** Guarda una huella del PIN, no el PIN. No es criptografía seria —el PIN tiene
 *  cuatro dígitos y se puede probar entero en un segundo— pero evita que quede
 *  escrito en claro para el que abra las herramientas del navegador. */
function huella(pin: string): string {
  let h = 0;
  for (const c of `tegmento·${pin}`) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return String(h);
}

export function usarLlave() {
  const [abierta, setAbierta] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  return {
    abierta,
    pidiendo,
    pedir: () => setPidiendo(true),
    cerrar: () => setPidiendo(false),
    confirmar: () => {
      setAbierta(true);
      setPidiendo(false);
    },
    /** Volver a cerrar sin recargar, para el botón de "esconder". */
    trancar: () => setAbierta(false),
  };
}

export function PuertaPrivada({ onAbrir, onCerrar }: { onAbrir: () => void; onCerrar: () => void }) {
  const montado = usarPortal();
  const crearPortal = (n: React.ReactNode) => (montado ? createPortal(n, document.body) : null);
  const guardado = typeof window !== 'undefined' ? window.localStorage.getItem(CLAVE) : null;
  const primeraVez = !guardado;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    if (pin.length < 4) {
      setError('Tienen que ser cuatro números.');
      return;
    }
    if (primeraVez) {
      window.localStorage.setItem(CLAVE, huella(pin));
      onAbrir();
      return;
    }
    if (huella(pin) !== guardado) {
      setError('Ese no es.');
      setPin('');
      return;
    }
    onAbrir();
  }

  /**
   * ⚠️ VA POR PORTAL A `document.body` (01/08, salió del inventario de UI).
   *
   * Esta hoja se monta desde `NotasUI`, que vive adentro de `.flotar` — y esa
   * clase deja un `transform` aplicado para siempre, así que un `fixed inset-0`
   * NO cubre la pantalla: cubre la caja del contenedor.
   *
   * Acá el bug era peor que en otros lados y por eso se arregló apenas apareció:
   * el fondo oscuro de esta hoja es lo que TAPA LA LISTA DE NOTAS mientras pedís
   * el PIN. Si no llega a los bordes, la pantalla que promete esconder queda
   * asomando alrededor — la cortina con un agujero.
   *
   * Es la misma causa que dejó la cruz de cerrar a media pantalla y el menú de
   * los tres puntitos debajo de los mensajes.
   */
  return crearPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(28,28,43,.28)] p-4" onClick={onCerrar}>
      <div
        className="glass-tinte w-full max-w-[380px] rounded-[20px] border border-iris-borde p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-semibold text-tinta">
          {primeraVez ? 'Elegí un PIN de cuatro números' : 'Tus notas privadas'}
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.45] text-niebla text-pretty">
          {primeraVez
            ? 'Va a hacer falta para abrirlas. ⚠️ No se puede recuperar: si lo perdés, no vas a poder abrirlas desde la app.'
            : 'Poné el PIN para verlas.'}
        </p>

        <input
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
          // `inputMode` y no `type="password"`: en el teléfono queremos el teclado
          // numérico, y los puntitos los da el `text-security` de abajo.
          inputMode="numeric"
          autoComplete="off"
          aria-label="PIN"
          className="mt-3.5 w-full rounded-[12px] border border-iris-borde bg-white px-3 py-3 text-center font-mono text-[22px] tracking-[0.5em] text-tinta outline-none focus:border-iris"
          style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
        />

        {error && <p className="mt-2 text-[12.5px] font-semibold text-brick">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={confirmar}
            className="h-[38px] flex-1 rounded-full bg-iris font-mono text-[12.5px] font-bold text-white"
          >
            {primeraVez ? 'Crear el PIN' : 'Abrir'}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="h-[38px] rounded-full border border-iris-borde bg-white/70 px-4 font-mono text-[12.5px] font-semibold text-niebla"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
  );
}

/** El portal, con el montado en dos pasos: en el server no hay `document`, y el
 *  primer dibujo del navegador tiene que ser idéntico al HTML que vino. */
function usarPortal() {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}

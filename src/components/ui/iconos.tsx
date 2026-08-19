import { GLIFO_NEURONA, GLIFO_RUEDA } from '@/components/ui/glifos';
type Props = { className?: string };
const base = 'size-5';

export function IconNeurona({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {GLIFO_NEURONA}
    </svg>
  );
}

/**
 * EL LÁPIZ, RELLENO Y SIN RAYITA (05/08, pedido de Matías: *"que el lapicito
 * sea un lapicito sin rayita y que sea un lapicito que esté relleno, no que
 * sean líneas… y en todos lados que diga editar, que sea el lapicito"*).
 *
 * ⚠️ ROMPE LA REGLA DE LA CASA (*íconos a trazo, nunca rellenos*) A PROPÓSITO, y
 * es la segunda excepción después de la llama de la racha. El motivo es el
 * mismo: a 13px, un lápiz de contorno con la rayita de abajo son **cinco líneas
 * finas en 13 píxeles** y se lee como un borrón, no como un lápiz. Relleno tiene
 * silueta, y una silueta se reconoce a cualquier tamaño.
 *
 * ⚠️ Y SIN LA RAYITA, que era el subrayado del lápiz viejo (`M12 20h9`): decía
 * "escribí sobre una línea" en botones donde no hay ninguna línea. Sobraba.
 *
 * El dibujo es el `pencil-filled` de Tabler (MIT), el mismo set de las maquetas
 * que él eligió. Va copiado acá y no como dependencia: son seis glifos, y esta
 * app tiene un solo lugar para los íconos.
 *
 * ⚠️ NO LLEVA `stroke`: es relleno puro, así que hereda el color por `fill`.
 */
export function IconLapiz({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.085 6.5l5.415 5.415l-8.793 8.792a1 1 0 0 1 -.707 .293h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 .293 -.707zm5.406 -2.698a3.828 3.828 0 0 1 1.716 6.405l-.292 .293l-5.415 -5.415l.293 -.292a3.83 3.83 0 0 1 3.698 -.991" />
    </svg>
  );
}

/**
 * ── LOS CINCO DE LAS HERRAMIENTAS (05/08) ────────────────────────────────────
 * Matías, viendo la maqueta: *"me gustan los íconos que dibujaste acá… ¿por qué
 * no usás estos y los ponés en el menú? están perfectos"*. Son de Tabler (MIT),
 * copiados tal cual — trazo 2, `round`, viewBox 24 —, que es el mismo lenguaje
 * que ya usaban los de acá.
 *
 * ⚠️ COPIADOS, NO INSTALADOS. `@tabler/icons` trae 5.800 dibujos y acá hacen
 * falta seis; una dependencia entera para eso deja además DOS sistemas de
 * íconos conviviendo, que es justo lo que este archivo existe para evitar.
 */
export function IconCalma({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24" />
      <path d="M3 12h15.5a2.5 2.5 0 1 1 -2.34 3.24" />
      <path d="M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24" />
    </svg>
  );
}

export function IconFoco({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    </svg>
  );
}

export function IconPolaridad({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 17l-18 0" />
      <path d="M6 10l-3 -3l3 -3" />
      <path d="M3 7l18 0" />
      <path d="M18 20l3 -3l-3 -3" />
    </svg>
  );
}

export function IconProbando({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3l6 0" />
      <path d="M10 9l4 0" />
      <path d="M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6" />
    </svg>
  );
}

/** La manzana con el brillito: *"esa manzana que tiene incluso un brillito, me
 *  encanta el ícono"*. El brillito son los dos trazos cortos de adentro. */
export function IconManzana({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 11.319c0 3.102 .444 5.319 2.222 7.978c1.351 1.797 3.156 2.247 5.08 .988c.426 -.268 .97 -.268 1.397 0c1.923 1.26 3.728 .809 5.079 -.988c1.778 -2.66 2.222 -4.876 2.222 -7.977c0 -2.661 -1.99 -5.32 -4.444 -5.32c-1.267 0 -2.41 .693 -3.22 1.44a.5 .5 0 0 1 -.672 0c-.809 -.746 -1.953 -1.44 -3.22 -1.44c-2.454 0 -4.444 2.66 -4.444 5.319" />
      <path d="M7 12c0 -1.47 .454 -2.34 1.5 -3" />
      <path d="M12 7c0 -1.2 .867 -4 3 -4" />
    </svg>
  );
}

/**
 * DOS PERSONAS, una detrás de la otra: "cómo lo lee el otro".
 *
 * ⚠️ SE MUDÓ ACÁ DESDE `Sidebar` (05/08). Estaba definido suelto adentro del
 * menú, y al necesitarlo también el chip del chat la opción fácil era copiar el
 * path — que es exactamente cómo la app terminó con dos manzanas distintas.
 * Se probó una persona con ondas de sonido y se descartó: se leía como "audio",
 * no como "alguien más te está leyendo".
 */
export function IconComoSeLee({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8.5" cy="8" r="3.4" />
      <path d="M2.5 20c1.1-3.2 3.2-4.8 6-4.8s4.9 1.6 6 4.8" />
      <circle cx="16.5" cy="6.5" r="2.8" />
      <path d="M15 12.4c2.9-.5 5.2 1.1 6.3 4.1" />
    </svg>
  );
}

export function IconFork({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="12" cy="18" r="2.4" />
      <path d="M6 8.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5M12 13v2.5" />
    </svg>
  );
}

export function IconCalendario({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

export function IconCuaderno({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M13 8h3M13 12h3" />
    </svg>
  );
}

// ⚠️ EL TRAZO VIVE EN `glifos.tsx` (06/08) y no acá, porque había DOS ruedas
// distintas en la app: esta —que no la usaba nadie— y otra escrita a mano
// adentro del `Sidebar`, con otro dibujo. Dos dibujos para el mismo destino es
// lo que hace creer que hay dos pantallas. Ahora las dos salen de acá.
export function IconRueda({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {GLIFO_RUEDA}
    </svg>
  );
}

export function IconUsuario({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" />
    </svg>
  );
}

export function IconMic({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function IconCamara({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconAltavoz({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function IconAltavozOff({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

export function IconFlechaArriba({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

// --- Iconos del rediseño (nav nueva: Hoy / Rueda / Chat / Ánimo / Relaciones) ---

// Un toque más grande (30/07): compartía barra con el busto y la montaña, que
// usan el cuadro entero, y quedaba media talla abajo. Mismo dibujo, más aire.
export function IconCasa({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11.2l9-8 9 8M5.4 9.3V20.5h13.2V9.3" />
    </svg>
  );
}

export function IconReloj({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" /><path d="M12 3.5v8.5l6 6" />
    </svg>
  );
}

export function IconChat({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.2A8.5 8.5 0 1 1 21 11.5z" /><path d="M8.5 11h7M8.5 14h4" />
    </svg>
  );
}

export function IconCara({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="0.7" fill="currentColor" /><circle cx="15" cy="10" r="0.7" fill="currentColor" /><path d="M8.5 14.5a4 4 0 0 0 7 0" />
    </svg>
  );
}

export function IconOjo({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconOjoOff({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.4 5.2A9.4 9.4 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-2.4 3.1M6.1 6.2A17 17 0 0 0 2 12s4 7 10 7a9.3 9.3 0 0 0 3.3-.6" />
    </svg>
  );
}

// Reloj con flecha antihoraria: historial (distinto del reloj a secas, que lee como "timer").
export function IconHistorial({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7" />
      <path d="M3.5 3.5v3.3h3.3" />
      <path d="M12 7.5V12l3.5 3.5" />
    </svg>
  );
}

/**
 * Objetivos: UNA MONTAÑA, no una bandera ni un blanco de tiro.
 *
 * Los dos descartados dicen "llegar a un punto", y la mitad de los objetivos no
 * tiene punto de llegada: "buscar trabajo" no tiene meta ni fecha, tiene una
 * subida larga. El dibujo tiene que decir ARCO, no meta.
 *
 * ⚠️ Vive acá y no en cada barra porque lo usan LOS DOS lugares (la barra de
 * abajo y —si algún día vuelve— el menú). Un concepto, un ícono: si cada barra
 * dibujara el suyo, serían dos cosas distintas para el usuario.
 */
// ⚠️ LA MONTAÑA CRECIÓ HACIA ARRIBA (30/07, Matías: *"el ícono está medio chico
// en relación al tamaño de los otros"*). No era chico el trazo: ocupaba solo la
// MITAD DE ABAJO del cuadro (de y=8.5 para abajo) mientras Casa y el busto usan
// de y=4 a y=20. Al lado de ellos se veía hundido. Ahora la cumbre arranca en
// y=4.5 y usa el alto entero, sin tocar el ancho.
export function IconObjetivos({ className = base }: Props) {
  return (
    // ⚠️ ESTIRADO A LO ALTO PARA QUE MIDA LO MISMO QUE LOS OTROS (31/07, Matías:
    // *"el ícono un poco más alto, porque [se ve] chico con relación a los otros
    // íconos"*). No se le subió el `size`: se le corrigió el DIBUJO.
    // La montaña iba de y=4.5 a y=20 (15.5 de alto) mientras la casa va de 3 a
    // 20.5 (17.5) — 2 unidades menos dentro de la misma caja, y por eso se leía
    // más chico aunque las cajas fueran iguales.
    // Ahora apoya en y=20.5, que es la línea donde se apoyan TODOS los de la
    // barra (la casa y las tres barritas de Seguimiento), y el pico llega a y=3.
    // Los puntos del medio se escalaron con el mismo factor para no deformarla.
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 20.5h19" />
      <path d="M3.5 20.5l7-17.5 4 9 2.5-4.5 4.5 13" />
    </svg>
  );
}

// La brújula de Descubrir. Es el mismo dibujo que ya usa el menú lateral, para
// que sea obvio que la pestaña nueva y la del menú son el mismo lugar.
export function IconDescubrir({ className = base }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </svg>
  );
}

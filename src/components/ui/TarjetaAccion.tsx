// La tarjeta de acción: ícono grande en un cuadro de color a la izquierda,
// título y bajada a la derecha. Es el patrón que Matías viene pidiendo hace
// varias sesiones y no estaba en ningún lado.
//
// Sirve para cuando hay que ELEGIR UN CAMINO, no para listar cosas: dos o tres
// opciones que se distinguen de un vistazo, sin leer. Por eso el ícono es grande
// de verdad (no un iconito de 14px al lado del texto) y cada opción tiene su
// color: la mano va al color y a la forma antes que a la palabra.

export function TarjetaAccion({
  icono,
  titulo,
  bajada,
  color,
  tint,
  onClick,
  destacada = false,
}: {
  icono: React.ReactNode;
  titulo: string;
  bajada: string;
  /** Color del ícono y del título. */
  color: string;
  /** Fondo del cuadro del ícono (y de la tarjeta si es destacada). */
  tint: string;
  onClick: () => void;
  /** La principal lleva el fondo de color en toda la tarjeta. */
  destacada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] p-[13px_14px] text-left sombra-card"
      style={{
        background: destacada ? tint : '#fff',
        // El borde interno le da contraste sobre el fondo lavanda, que es claro
        // como el tinte. Va junto con la sombra de tarjeta: si se pone solo el
        // inset, el box-shadow inline pisa el de `sombra-card` y queda plana.
        boxShadow: destacada
          ? `inset 0 0 0 1.5px ${color}2e, 0 1px 2px rgba(50,50,90,.05), 0 8px 24px rgba(50,50,90,.07)`
          : undefined,
      }}
    >
      <span
        className="grid size-[48px] flex-none place-items-center rounded-[14px]"
        style={{ background: destacada ? '#fff' : tint, color }}
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[19px] font-semibold leading-tight tracking-[-0.2px]" style={{ color }}>
          {titulo}
        </span>
        {/* La bajada entra en dos renglones: por eso es corta y el texto usa
            todo el ancho (el chevrón se achicó y el padding bajó). Con la copia
            larga quedaba en cuatro y la tarjeta se veía inflada. */}
        <span className="mt-0.5 block text-[13px] leading-[1.35] text-tinta-soft text-pretty">{bajada}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[15px] flex-none opacity-40"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

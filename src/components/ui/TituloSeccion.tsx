import type { ReactNode } from 'react';

// Título de sección: UNO solo para toda la app, para que "Noticias", "Descanso",
// "En curso" o "Actividades para probar" se vean exactamente igual en todas las
// pantallas. Antes cada pantalla repetía a mano una etiqueta mono de 11px en
// gris; se leían como texto chiquito perdido y no como títulos. Es un escalón
// abajo del título grande de la pantalla (TituloFijo): misma serif, más chico.
//
// `aside` es para el dato al ras de la derecha (ej: "al día · hace 2 min").
// `icono` va a la izquierda: en pantallas largas como Cuerpo, la forma se
// reconoce antes que la palabra y se puede scrollear buscando el dibujo.
export function TituloSeccion({
  children,
  aside,
  icono,
}: {
  children: ReactNode;
  aside?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {icono && <span className="flex-none">{icono}</span>}
        <h2 className="truncate font-serif text-[19px] font-semibold tracking-[-0.2px] text-tinta">{children}</h2>
      </div>
      {aside && <span className="flex-none font-mono text-[11px] text-niebla-2">{aside}</span>}
    </div>
  );
}

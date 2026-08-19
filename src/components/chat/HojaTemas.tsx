'use client';

import { agruparMensajes, crearTemaYAgrupar } from '@/lib/actions/mensajes';
import { colorDeTema } from '@/lib/cristales';
import { HojaElegirOCrear } from '@/components/ui/HojaElegirOCrear';

// La hoja para elegir a qué tema van los mensajes seleccionados, o crear uno
// nuevo. Mismo trabajo que `HojaCarpetas` en Historial (elegir una etiqueta ya
// creada o hacer una al toque); la parte compartida vive en
// `HojaElegirOCrear` (30/07, ver el comentario ahí para el porqué).

export function HojaTemas({
  mensajeIds,
  temas,
  onCerrar,
  onListo,
}: {
  mensajeIds: number[];
  temas: { id: number; nombre: string }[];
  onCerrar: () => void;
  /** Se llama con el tema que quedó asignado, para que ChatUI actualice su estado local. */
  onListo: (tema: { id: number; nombre: string }) => void;
}) {
  return (
    <HojaElegirOCrear
      titulo="¿De qué es esto?"
      subtitulo={`${mensajeIds.length} ${mensajeIds.length === 1 ? 'mensaje' : 'mensajes'}`}
      items={temas}
      renderFila={(t) => <span className="size-2 flex-none rounded-full" style={{ background: colorDeTema(t.id) }} />}
      placeholderNuevo="Nombre del tema"
      textoNuevo="Tema nuevo"
      maxLength={30}
      onCerrar={onCerrar}
      onElegir={async (tema) => {
        await agruparMensajes(mensajeIds, tema.id);
        onListo(tema);
      }}
      onCrear={async (nombre) => {
        const tema = await crearTemaYAgrupar(nombre, mensajeIds);
        if (tema) onListo(tema);
      }}
    />
  );
}

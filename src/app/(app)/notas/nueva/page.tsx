import { TituloFijo } from '@/components/ui/TituloFijo';
import { EditorNota } from '@/components/notas/EditorNota';

// Una nota que todavía no existe. Se abre en blanco y NACE en el primer
// guardado (ver `guardarNota`): así, entrar acá y arrepentirse no deja una fila
// vacía en la lista.
export default function NotaNuevaPage() {
  return (
    <div className="flotar px-[22px] pt-2">
      {/* ⚠️ SIN `cerrarHref`: la cruz se mudó adentro del editor, junto al tilde y al tacho (06/08). Dejarla acá arriba también daría dos cruces. */}
      <TituloFijo titulo="Nota" />
      <div className="mt-4" />
      <EditorNota nota={{ id: null, titulo: '', cuerpo: '' }} />
    </div>
  );
}

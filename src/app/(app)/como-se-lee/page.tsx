import { TituloFijo } from '@/components/ui/TituloFijo';
import { ComoSeLeeUI } from '@/components/comoselee/ComoSeLeeUI';

// "Cómo se lee" (30/07). NUEVA Y SEPARADA de lo que ya existe: `/polaridad` mide
// con cuánto cuidado leer un contenido externo, y la marca `[+comolove:]` del
// chat interpreta algo que pasó. Esto hace una sola cosa: mirar un mensaje y
// marcar qué frases podrían leerse distinto. Ver
// `docs/maquetas/2026-07-30-lo-nuevo.md`.
export default function ComoSeLeePage() {
  return (
    <div className="flotar px-[22px] pt-2">
      <TituloFijo titulo="Cómo se lee" />
      <div className="mt-4" />
      <ComoSeLeeUI />
    </div>
  );
}

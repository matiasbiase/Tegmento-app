'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarraChat, type Envio } from '@/components/chat/BarraChat';

export function PillInput() {
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();

  async function enviar(e: Envio) {
    setOcupado(true);
    try {
      let res: Response;
      if (e.tipo === 'foto') {
        const form = new FormData();
        form.append('contenido', e.contenido);
        form.append('foto', e.foto, 'foto.jpg');
        res = await fetch('/api/chat', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido: e.contenido,
            ...(e.tipo === 'audio' ? { adjuntoTipo: 'audio', adjuntoPath: e.adjuntoPath } : {}),
          }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        router.push(`/chat/${data.chatId}?hablar=1`);
        return;
      }
      setOcupado(false);
    } catch {
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+max(10px,env(safe-area-inset-bottom)))]">
      <div className="mx-auto max-w-md px-4">
        <BarraChat onEnviar={enviar} ocupado={ocupado} placeholder="Nuevo chat, escribí acá…" />
      </div>
    </div>
  );
}

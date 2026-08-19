'use client';

// Un único elemento Audio compartido. iOS solo permite reproducir audio
// "bendecido" por un gesto del usuario: desbloquearAudio() se llama
// sincrónicamente dentro del tap/submit, y después reproducirVoz() puede
// usar el mismo elemento aunque la respuesta llegue async.

const SILENCIO =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let compartido: HTMLAudioElement | null = null;

export function desbloquearAudio(): void {
  if (typeof window === 'undefined') return;
  if (!compartido) compartido = new Audio();
  compartido.src = SILENCIO;
  compartido.play().catch(() => {});
}

export function detenerVoz(): void {
  if (compartido) {
    compartido.pause();
    compartido.currentTime = 0;
  }
}

export async function reproducirVoz(texto: string): Promise<void> {
  if (!compartido) compartido = new Audio();
  const el = compartido;
  const res = await fetch('/api/voz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) throw new Error('voz falló');
  el.src = URL.createObjectURL(await res.blob());
  await el.play();
  await new Promise<void>((resolve) => {
    el.onended = () => resolve();
    el.onerror = () => resolve();
  });
}

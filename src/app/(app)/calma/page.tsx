import type { Viewport } from 'next';
import { CalmaPantalla } from '@/components/tools/CalmaPantalla';

// Tope oscuro (también en Safari) para que la barra de estado no corte la pantalla.
export const viewport: Viewport = { themeColor: '#16142b' };

export default function CalmaPage() {
  return <CalmaPantalla />;
}

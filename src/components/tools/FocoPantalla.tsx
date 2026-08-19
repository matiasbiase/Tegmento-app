'use client';

import { useRouter } from 'next/navigation';
import { FocoOverlay } from '@/components/tools/FocoOverlay';

export function FocoPantalla() {
  const router = useRouter();
  return <FocoOverlay titulo="Tu sesión de foco" onSalir={() => router.back()} />;
}

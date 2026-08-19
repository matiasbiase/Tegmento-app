'use client';

import { useRouter } from 'next/navigation';
import { CalmaOverlay } from '@/components/tools/CalmaOverlay';

export function CalmaPantalla() {
  const router = useRouter();
  return <CalmaOverlay onSalir={() => router.back()} />;
}

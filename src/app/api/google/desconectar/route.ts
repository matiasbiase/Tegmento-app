import { NextResponse } from 'next/server';
import { desconectar } from '@/lib/google/auth';

export async function POST() {
  await desconectar();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valida la contraseña del panel contra ADMIN_PASSWORD.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const ok = !!process.env.ADMIN_PASSWORD && body.password === process.env.ADMIN_PASSWORD;
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

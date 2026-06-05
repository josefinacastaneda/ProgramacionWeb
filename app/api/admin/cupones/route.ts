import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CuponBody {
  codigo?: string;
  descuento?: number;
}

export async function GET(req: NextRequest) {
  if (!esAdmin(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('cupones')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cupones: data });
}

export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const body = (await req.json()) as CuponBody;
  const codigo = (body.codigo ?? '').trim().toUpperCase();
  const descuento = Number(body.descuento);
  if (!codigo || !Number.isFinite(descuento) || descuento <= 0 || descuento > 100) {
    return NextResponse.json({ error: 'Código y descuento (1-100) válidos requeridos.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('cupones')
    .insert({ codigo, descuento, usos: 0, activo: true })
    .select()
    .single();
  if (error) {
    const msg = error.code === '23505' ? 'Ese código ya existe.' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ cupon: data });
}

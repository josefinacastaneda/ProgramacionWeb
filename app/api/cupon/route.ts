import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { codigo?: string };
  const codigo = (body.codigo ?? '').trim().toUpperCase();

  if (!codigo) {
    return NextResponse.json({ valido: false, error: 'Ingresá un código.' }, { status: 400 });
  }

  const { data: cupon, error } = await supabaseAdmin
    .from('cupones')
    .select('codigo, descuento, activo')
    .eq('codigo', codigo)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ valido: false, error: 'No se pudo validar el cupón.' }, { status: 500 });
  }
  if (!cupon || !cupon.activo) {
    return NextResponse.json({ valido: false, error: 'Código inválido.' });
  }

  // Acá sólo validamos: el contador de "usos" se incrementa en el webhook,
  // recién cuando el pago se concreta (approved), para no inflarlo.
  return NextResponse.json({ valido: true, codigo: cupon.codigo, descuento: cupon.descuento });
}

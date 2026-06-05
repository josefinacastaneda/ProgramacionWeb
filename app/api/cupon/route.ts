import { NextRequest, NextResponse } from 'next/server';
import { validarCupon } from '@/lib/cupones';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { codigo?: string };
  const codigo = (body.codigo ?? '').trim();

  if (!codigo) {
    return NextResponse.json({ valido: false, error: 'Ingresá un código.' }, { status: 400 });
  }

  const descuento = validarCupon(codigo);
  if (descuento === null) {
    return NextResponse.json({ valido: false, error: 'Código inválido.' });
  }

  return NextResponse.json({ valido: true, codigo: codigo.toUpperCase(), descuento });
}

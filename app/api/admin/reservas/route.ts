import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Estados que se pueden marcar a mano desde el panel. "pagada" la pone el
// webhook cuando MercadoPago confirma; desde acá sólo se avanza de ahí.
const ESTADOS = ['pendiente', 'pagada', 'avisada', 'devuelta'];

function noAutorizado() {
  return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, producto_nombre, email, monto, estado, mp_payment_id, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reservas: data });
}

// Cambiar el estado de una reserva (avisada / devuelta). El reembolso real se
// hace en el panel de MercadoPago: acá sólo se deja registro.
export async function PATCH(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const body = (await req.json().catch(() => ({}))) as { id?: string; estado?: string };
  if (!body.id || !body.estado || !ESTADOS.includes(body.estado)) {
    return NextResponse.json({ error: 'Faltan id o estado válido.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .update({ estado: body.estado })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reserva: data });
}

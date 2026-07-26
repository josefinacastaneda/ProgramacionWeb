import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function noAutorizado() {
  return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const { data, error } = await supabaseAdmin
    .from('suscriptores')
    .select('id, email, activo, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suscriptores: data });
}

// Baja manual desde el panel (por pedido de la persona, por ejemplo por
// WhatsApp). No borramos la fila: la marcamos inactiva para respetar la baja
// aunque después vuelva a entrar por el popup.
export async function PATCH(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const body = (await req.json().catch(() => ({}))) as { id?: string; activo?: boolean };
  if (!body.id || typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'Faltan id o activo.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('suscriptores')
    .update({ activo: body.activo })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suscriptor: data });
}

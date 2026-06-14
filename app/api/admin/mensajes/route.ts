import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lista todos los mensajes de contacto (más nuevos primero).
export async function GET(req: NextRequest) {
  if (!esAdmin(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mensajes: data });
}

// Marca un mensaje como leído (o no leído).
export async function PATCH(req: NextRequest) {
  if (!esAdmin(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const body = (await req.json()) as { id?: string; leido?: boolean };
  if (!body.id || typeof body.leido !== 'boolean') {
    return NextResponse.json({ error: 'Faltan id o leido.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .update({ leido: body.leido })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mensaje: data });
}

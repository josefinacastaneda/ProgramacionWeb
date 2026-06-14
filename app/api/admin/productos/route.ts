import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProductoBody {
  id?: string;
  nombre?: string;
  categoria?: string;
  precio?: number;
  descripcion?: string;
  material?: string;
  talles?: string[];
  stock?: Record<string, number>;
  badge?: string | null;
  activo?: boolean;
  imagenes?: string[];
}

function noAutorizado() {
  return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
}

// Arma el objeto a guardar a partir del body (sin el id).
function filaDesdeBody(b: ProductoBody) {
  return {
    nombre: (b.nombre ?? '').trim(),
    categoria: (b.categoria ?? '').trim(),
    precio: Number(b.precio) || 0,
    descripcion: (b.descripcion ?? '').trim(),
    material: (b.material ?? '').trim(),
    talles: Array.isArray(b.talles) ? b.talles : [],
    stock: b.stock && typeof b.stock === 'object' ? b.stock : {},
    badge: b.badge?.trim() ? b.badge.trim() : null,
    activo: b.activo ?? true,
    imagenes: Array.isArray(b.imagenes) ? b.imagenes : [],
  };
}

export async function GET(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const { data, error } = await supabaseAdmin
    .from('productos')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ productos: data });
}

export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const body = (await req.json()) as ProductoBody;
  const fila = filaDesdeBody(body);
  if (!fila.nombre || !fila.categoria) {
    return NextResponse.json({ error: 'Nombre y categoría son obligatorios.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from('productos').insert(fila).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ producto: data });
}

export async function PUT(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const body = (await req.json()) as ProductoBody;
  if (!body.id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 });
  const fila = filaDesdeBody(body);
  const { data, error } = await supabaseAdmin
    .from('productos')
    .update(fila)
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ producto: data });
}

export async function PATCH(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const body = (await req.json()) as { id?: string; activo?: boolean };
  if (!body.id || typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'Faltan id o activo.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('productos')
    .update({ activo: body.activo })
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ producto: data });
}

// Elimina un producto por id.
export async function DELETE(req: NextRequest) {
  if (!esAdmin(req)) return noAutorizado();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 });
  const { error } = await supabaseAdmin.from('productos').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

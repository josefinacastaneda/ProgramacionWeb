import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Forma que espera el cliente (Tienda.tsx): fecha en vez de created_at.
interface ResenaCliente {
  nombre: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}

interface ResenaRow {
  nombre: string;
  estrellas: number;
  comentario: string;
  created_at: string;
}

function aCliente(r: ResenaRow): ResenaCliente {
  return {
    nombre: r.nombre,
    estrellas: r.estrellas,
    comentario: r.comentario,
    fecha: (r.created_at ?? '').slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ resenas: [] });
  }

  const { data, error } = await supabaseAdmin
    .from('resenas')
    .select('nombre, estrellas, comentario, created_at')
    .eq('producto_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error leyendo reseñas:', error.message);
    return NextResponse.json({ resenas: [] });
  }

  return NextResponse.json({ resenas: (data as ResenaRow[]).map(aCliente) });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    nombre?: string;
    estrellas?: number;
    comentario?: string;
  };

  const id = (body.id ?? '').trim();
  const nombre = (body.nombre ?? '').trim();
  const estrellas = Number(body.estrellas) || 0;
  const comentario = (body.comentario ?? '').trim();

  if (!id || nombre.length < 2 || estrellas < 1 || estrellas > 5 || comentario.length < 10) {
    return NextResponse.json({ error: 'Datos de reseña inválidos.' }, { status: 400 });
  }

  const { error: errInsert } = await supabaseAdmin.from('resenas').insert({
    producto_id: id,
    nombre,
    estrellas,
    comentario,
  });

  if (errInsert) {
    console.error('No se pudo guardar la reseña:', errInsert.message);
    return NextResponse.json({ error: 'No se pudo guardar la reseña.' }, { status: 500 });
  }

  const { data } = await supabaseAdmin
    .from('resenas')
    .select('nombre, estrellas, comentario, created_at')
    .eq('producto_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ok: true, resenas: (data as ResenaRow[] ?? []).map(aCliente) });
}

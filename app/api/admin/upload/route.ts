import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'productos';

// Crea el bucket "productos" (público) si todavía no existe.
async function asegurarBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  // Si dos requests lo crean a la vez, ignoramos el "ya existe".
  if (error && !/exists/i.test(error.message)) throw new Error(error.message);
}

// Nombre de archivo único y sin caracteres raros.
function nombreSeguro(original: string): string {
  const limpio = original.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${limpio}`;
}

export async function POST(req: NextRequest) {
  if (!esAdmin(req)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Se esperaba multipart/form-data.' }, { status: 400 });
  }

  const archivos = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (archivos.length === 0) {
    return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
  }

  try {
    await asegurarBucket();
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo preparar el bucket: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  const urls: string[] = [];
  for (const archivo of archivos) {
    if (!archivo.type.startsWith('image/')) {
      return NextResponse.json({ error: `"${archivo.name}" no es una imagen.` }, { status: 400 });
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const path = nombreSeguro(archivo.name);
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: archivo.type, upsert: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}

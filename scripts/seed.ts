import { cargarEnv } from './_env';
cargarEnv();
import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

interface ProductoJson {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagenes: string[];
  talles: string[];
  stock?: Record<string, number>;
  descripcion: string;
  material: string;
  badge: string | null;
}

interface ResenaJson {
  nombre: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}

function leerJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), rel), 'utf-8')) as T;
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const productos = leerJson<ProductoJson[]>('productos.json');
  const resenasMap = leerJson<Record<string, ResenaJson[]>>('data/resenas.json');

  // Limpieza para que el seed sea repetible. resenas primero (FK → productos).
  await sb.from('resenas').delete().not('id', 'is', null);
  await sb.from('productos').delete().not('id', 'is', null);

  // Insert de productos. La columna `colores` no existe en el esquema pedido,
  // así que esa variante de color no se migra (queda fuera del alcance).
  const filasProd = productos.map((p) => ({
    nombre: p.nombre,
    categoria: p.categoria,
    precio: p.precio,
    descripcion: p.descripcion,
    material: p.material,
    badge: p.badge,
    imagenes: p.imagenes,
    talles: p.talles,
    stock: p.stock ?? {},
    activo: true,
  }));

  const { data: insertados, error: errProd } = await sb
    .from('productos')
    .insert(filasProd)
    .select('id, nombre');
  if (errProd) throw new Error(`Insert productos: ${errProd.message}`);
  console.log(`✓ ${insertados!.length} productos insertados.`);

  // nombre → uuid (el nombre es único entre los productos del catálogo).
  const nombreAId = new Map(insertados!.map((r) => [r.nombre, r.id]));
  // slug original → nombre (para mapear las reseñas del JSON).
  const slugANombre = new Map(productos.map((p) => [p.id, p.nombre]));

  const filasResena: {
    producto_id: string;
    nombre: string;
    estrellas: number;
    comentario: string;
    created_at: string;
  }[] = [];

  for (const [slug, resenas] of Object.entries(resenasMap)) {
    const nombre = slugANombre.get(slug);
    const productoId = nombre ? nombreAId.get(nombre) : undefined;
    if (!productoId) {
      console.warn(`! Reseñas de "${slug}" omitidas: producto no encontrado.`);
      continue;
    }
    for (const r of resenas) {
      filasResena.push({
        producto_id: productoId,
        nombre: r.nombre,
        estrellas: r.estrellas,
        comentario: r.comentario,
        created_at: new Date(r.fecha).toISOString(),
      });
    }
  }

  if (filasResena.length) {
    const { error: errRes } = await sb.from('resenas').insert(filasResena);
    if (errRes) throw new Error(`Insert resenas: ${errRes.message}`);
  }
  console.log(`✓ ${filasResena.length} reseñas insertadas.`);
  console.log('Seed completo.');
}

main().catch((e) => {
  console.error('Error en el seed:', (e as Error).message);
  console.error(
    'Si la tabla no existe, primero corré la migración: npm run migrate (necesita SUPABASE_DB_URL).',
  );
  process.exit(1);
});

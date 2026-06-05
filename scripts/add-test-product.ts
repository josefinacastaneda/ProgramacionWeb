import { cargarEnv } from './_env';
cargarEnv();
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb
    .from('productos')
    .insert({
      nombre: 'Glitter Test ✨',
      categoria: 'accesorios',
      precio: 100,
      descripcion: 'Accesorio brilloso edición limitada. Solo para prueba.',
      material: 'Glitter premium',
      badge: '✨ NUEVO',
      talles: ['UNICO'],
      stock: { UNICO: 10 },
      activo: true,
      imagenes: [],
    })
    .select('id, nombre')
    .single();

  if (error) throw new Error(error.message);
  console.log(`✓ Producto insertado: ${data!.nombre} (${data!.id})`);
}

main().catch((e) => {
  console.error('Error:', (e as Error).message);
  process.exit(1);
});

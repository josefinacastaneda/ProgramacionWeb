import { cargarEnv } from './_env';
cargarEnv();
import { createClient } from '@supabase/supabase-js';

// Renombra el producto de prueba "Glitter Test ✨" a "Prueba de pago",
// dejando intacto el resto (precio, stock, etc).
async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb
    .from('productos')
    .update({ nombre: 'Prueba de pago' })
    .eq('nombre', 'Glitter Test ✨')
    .select('id, nombre');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    console.log('No se encontró ningún producto llamado "Glitter Test ✨" (¿ya estaba renombrado?).');
    return;
  }
  for (const p of data) console.log(`✓ Renombrado: ${p.nombre} (${p.id})`);
}

main().catch((e) => {
  console.error('Error:', (e as Error).message);
  process.exit(1);
});

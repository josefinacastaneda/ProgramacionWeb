import { cargarEnv } from './_env';
cargarEnv();
import { createClient } from '@supabase/supabase-js';
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: buckets, error: e1 } = await sb.storage.listBuckets();
  if (e1) throw new Error('listBuckets: ' + e1.message);
  if (buckets?.some((b) => b.name === 'productos')) {
    console.log('OK bucket "productos" ya existe.');
    return;
  }
  const { error } = await sb.storage.createBucket('productos', { public: true });
  if (error) throw new Error('createBucket: ' + error.message);
  console.log('OK bucket "productos" creado (publico).');
}
main().catch((e) => { console.error('Error:', (e as Error).message); process.exit(1); });

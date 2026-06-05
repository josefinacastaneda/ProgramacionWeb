import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente admin (SOLO server): usa la service_role key, que saltea RLS.
// NUNCA importar este módulo en código que corra en el browser.
//
// Se inicializa de forma perezosa (lazy): si faltan las env vars, el error
// recién salta cuando se usa el cliente, no al importar el módulo. Así el
// build de Vercel no se cae entero por una variable sin configurar.
let cliente: SupabaseClient | null = null;

function getCliente(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Configuralas en Vercel (ver VERCEL_ENV.md).'
    );
  }
  cliente = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getCliente();
    return Reflect.get(c, prop, c);
  },
});

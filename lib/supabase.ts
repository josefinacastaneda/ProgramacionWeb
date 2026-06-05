import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente público (browser y server reads): usa la anon key.
// Seguro para exponer al cliente; respeta las políticas RLS de la tabla.
//
// Lazy: si faltan las env vars, el error salta al usar el cliente, no al
// importar. Evita que el build de Vercel se caiga por una var sin configurar.
let cliente: SupabaseClient | null = null;

function getCliente(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configuralas en Vercel (ver VERCEL_ENV.md).'
    );
  }
  cliente = createClient(url, anonKey);
  return cliente;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getCliente();
    return Reflect.get(c, prop, c);
  },
});

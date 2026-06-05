import { createClient } from '@supabase/supabase-js';

// Cliente admin (SOLO server): usa la service_role key, que saltea RLS.
// NUNCA importar este módulo en código que corra en el browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

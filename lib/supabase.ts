import { createClient } from '@supabase/supabase-js';

// Cliente público (browser y server reads): usa la anon key.
// Seguro para exponer al cliente; respeta las políticas RLS de la tabla.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Validación de cupones contra la tabla `cupones` de Supabase (única fuente de
// verdad). SOLO server: importa el cliente admin. Antes había una lista
// hardcodeada, pero quedaba desincronizada con los cupones del panel admin.
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface CuponValido {
  codigo: string;
  descuento: number;
}

// Devuelve el cupón (código normalizado + % de descuento) si existe y está
// activo, o null si es inválido/inactivo. Respeta el campo `activo`.
export async function validarCupon(codigo: string): Promise<CuponValido | null> {
  const key = (codigo ?? '').trim().toUpperCase();
  if (!key) return null;

  const { data, error } = await supabaseAdmin
    .from('cupones')
    .select('codigo, descuento, activo')
    .eq('codigo', key)
    .maybeSingle();

  if (error || !data || !data.activo) return null;

  const descuento = Number(data.descuento);
  if (!Number.isFinite(descuento) || descuento <= 0) return null;

  return { codigo: data.codigo as string, descuento };
}

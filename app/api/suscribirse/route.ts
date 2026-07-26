import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailValido, MSG_VALIDACION } from '@/lib/validaciones';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cupón que se entrega al suscribirse. Vive en la tabla `cupones` (lo crea la
// migración 006), así que el checkout lo valida como a cualquier otro.
const CUPON_BIENVENIDA = 'BIENVENIDA15';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();

  if (!emailValido(email)) {
    return NextResponse.json({ error: MSG_VALIDACION.email }, { status: 400 });
  }

  const { data: existente, error: errLectura } = await supabaseAdmin
    .from('suscriptores')
    .select('id, activo')
    .eq('email', email)
    .maybeSingle();

  if (errLectura) {
    console.error('Suscripción: no se pudo leer', errLectura.message);
    return NextResponse.json({ error: 'No pudimos procesar la suscripción.' }, { status: 500 });
  }

  if (existente) {
    // Ya estaba. Si se había dado de baja y ahora se suscribe de nuevo por su
    // cuenta, es una acción explícita suya: la reactivamos.
    if (!existente.activo) {
      await supabaseAdmin.from('suscriptores').update({ activo: true }).eq('id', existente.id);
    }
    // Devolvemos el cupón igual: no tiene sentido castigar a quien reenvía el
    // formulario, y no revela si el mail ya estaba en la lista.
    return NextResponse.json({ ok: true, cupon: CUPON_BIENVENIDA, descuento: 15 });
  }

  const { error } = await supabaseAdmin.from('suscriptores').insert({ email, origen: 'popup' });

  if (error) {
    // 23505 = unique_violation: dos envíos casi simultáneos del mismo mail.
    // No es un error real, ya quedó suscripto.
    if (error.code !== '23505') {
      console.error('Suscripción: no se pudo guardar', error.message);
      return NextResponse.json({ error: 'No pudimos procesar la suscripción.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, cupon: CUPON_BIENVENIDA, descuento: 15 });
}

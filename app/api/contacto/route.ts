import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarAviso } from '@/lib/resend';
import { nombreValido, emailValido, MSG_VALIDACION } from '@/lib/validaciones';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Escapa HTML para no inyectar markup en el email.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { nombre?: string; email?: string; mensaje?: string };
  const nombre = (body.nombre ?? '').trim();
  const email = (body.email ?? '').trim();
  const mensaje = (body.mensaje ?? '').trim();

  // Misma validación que el formulario del cliente (mensajes claros por campo).
  const MENSAJE_MIN = 10;
  if (!nombreValido(nombre)) {
    return NextResponse.json({ error: MSG_VALIDACION.nombre }, { status: 400 });
  }
  if (!emailValido(email)) {
    return NextResponse.json({ error: MSG_VALIDACION.email }, { status: 400 });
  }
  if (mensaje.length < MENSAJE_MIN) {
    return NextResponse.json(
      { error: `El mensaje debe tener al menos ${MENSAJE_MIN} caracteres.` },
      { status: 400 },
    );
  }

  // 1) Guardamos el mensaje en Supabase.
  const { error } = await supabaseAdmin.from('mensajes').insert({ nombre, email, mensaje });
  if (error) {
    console.error('No se pudo guardar el mensaje de contacto:', error.message);
    return NextResponse.json({ error: 'No se pudo guardar el mensaje.' }, { status: 500 });
  }

  // 2) Avisamos por email (no bloquea ni rompe si Resend falla).
  await enviarAviso({
    subject: `Nuevo mensaje de contacto — ${nombre}`,
    replyTo: email,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto">
        <h1 style="font-size:20px">Nuevo mensaje de contacto ✉️</h1>
        <p><strong>Nombre:</strong> ${esc(nombre)}<br/>
           <strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="white-space:pre-wrap">${esc(mensaje)}</p>
      </div>`,
  });

  return NextResponse.json({ ok: true });
}

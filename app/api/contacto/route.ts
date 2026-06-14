import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarAviso } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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

  // Misma validación que el formulario del cliente.
  if (nombre.length < 2 || !emailValido(email) || mensaje.length < 5) {
    return NextResponse.json({ error: 'Datos de contacto inválidos.' }, { status: 400 });
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

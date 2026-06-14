import { Resend } from 'resend';

// Cliente de Resend para los emails de aviso (compras y contacto).
// Se inicializa de forma perezosa: si falta RESEND_API_KEY, no rompe el build
// ni el resto del request — devolvemos null y quien llama decide qué hacer.
let cliente: Resend | null = null;

function getResend(): Resend | null {
  if (cliente) return cliente;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cliente = new Resend(apiKey);
  return cliente;
}

// Remitente de prueba de Resend (no requiere dominio propio).
export const EMAIL_FROM = 'FINALOOK <onboarding@resend.dev>';
// Casilla que recibe todos los avisos internos.
export const EMAIL_AVISOS = 'finalookstudio@gmail.com';

interface EmailParams {
  subject: string;
  html: string;
  replyTo?: string;
}

// Envía un email de aviso a la casilla interna. Nunca lanza: si algo falla,
// loguea y devuelve false para que el caller (webhook, contacto) no se rompa.
export async function enviarAviso({ subject, html, replyTo }: EmailParams): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('Resend sin configurar (falta RESEND_API_KEY); se omite el email.');
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_AVISOS,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error('Resend devolvió error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('No se pudo enviar el email con Resend:', (err as Error).message);
    return false;
  }
}

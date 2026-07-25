// Valida la firma `x-signature` que MercadoPago manda en cada webhook, según
// su documentación oficial (manifest HMAC-SHA256):
// https://www.mercadopago.com.mx/developers/en/docs/checkout-pro/payment-notifications
//
// Si MP_WEBHOOK_SECRET todavía no está configurado, no bloqueamos (para no
// cortar el procesamiento de pagos en producción antes de que se cargue la
// variable en Vercel) pero lo dejamos bien visible en los logs.
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export type ResultadoFirma = 'valida' | 'invalida' | 'sin-configurar';

export function validarFirmaWebhook(req: NextRequest): ResultadoFirma {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return 'sin-configurar';

  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';
  const dataId = (req.nextUrl.searchParams.get('data.id') ?? '').toLowerCase();

  let ts = '';
  let hash = '';
  for (const part of xSignature.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === 'ts') ts = val;
    if (key === 'v1') hash = val;
  }
  if (!ts || !hash) return 'invalida';

  const partes: string[] = [];
  if (dataId) partes.push(`id:${dataId}`);
  if (xRequestId) partes.push(`request-id:${xRequestId}`);
  partes.push(`ts:${ts}`);
  const manifest = partes.join(';') + ';';

  const calculado = createHmac('sha256', secret).update(manifest).digest('hex');

  const bufCalculado = Buffer.from(calculado);
  const bufRecibido = Buffer.from(hash);
  if (bufCalculado.length !== bufRecibido.length) return 'invalida';

  return timingSafeEqual(bufCalculado, bufRecibido) ? 'valida' : 'invalida';
}

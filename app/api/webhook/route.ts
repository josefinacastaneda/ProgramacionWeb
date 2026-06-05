import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Compra {
  producto_id: string;
  talle: string | null;
  cantidad: number;
}

// MercadoPago manda el id del pago de varias formas según el evento.
function extraerPaymentId(req: NextRequest, body: Record<string, unknown>): string | null {
  const url = req.nextUrl;
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? (body.type as string);
  const esPago = !type || type === 'payment';
  if (!esPago) return null;

  const dataObj = body.data as { id?: string | number } | undefined;
  const id =
    url.searchParams.get('data.id') ??
    url.searchParams.get('id') ??
    (dataObj?.id != null ? String(dataObj.id) : null);
  return id ?? null;
}

// Resta `cantidad` al stock del talle comprado, sin bajar de 0.
async function descontarStock(compras: Compra[]) {
  for (const c of compras) {
    if (!c.producto_id || !c.talle) continue;
    const { data: prod, error } = await supabaseAdmin
      .from('productos')
      .select('stock')
      .eq('id', c.producto_id)
      .single();
    if (error || !prod) {
      console.error('Webhook: producto no encontrado', c.producto_id, error?.message);
      continue;
    }
    const stock = { ...((prod.stock as Record<string, number>) ?? {}) };
    stock[c.talle] = Math.max(0, (stock[c.talle] ?? 0) - (c.cantidad || 1));
    const { error: errUpd } = await supabaseAdmin
      .from('productos')
      .update({ stock })
      .eq('id', c.producto_id);
    if (errUpd) console.error('Webhook: error al actualizar stock', errUpd.message);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // MercadoPago a veces notifica sin body (solo query params).
  }

  const paymentId = extraerPaymentId(req, body);
  if (!paymentId) {
    // Evento que no es de pago: respondemos 200 para que MP no reintente.
    return NextResponse.json({ ignored: true });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('Webhook: falta MP_ACCESS_TOKEN');
    return NextResponse.json({ error: 'Sin token' }, { status: 500 });
  }

  let payment;
  try {
    const client = new MercadoPagoConfig({ accessToken });
    payment = await new Payment(client).get({ id: paymentId });
  } catch (err) {
    console.error('Webhook: no se pudo leer el pago', (err as Error).message);
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 200 });
  }

  const estado = payment.status ?? 'unknown'; // approved | rejected | pending | ...
  const metadata = (payment.metadata ?? {}) as {
    compras?: Compra[];
    comprador?: Record<string, string>;
    pais?: string;
    cupon?: string | null;
  };
  const compras = Array.isArray(metadata.compras) ? metadata.compras : [];
  const comprador = metadata.comprador ?? {};

  // Idempotencia: si ya guardamos este pago, no lo procesamos de nuevo.
  const { data: existente } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .eq('mp_payment_id', String(paymentId))
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  const { error: errPedido } = await supabaseAdmin.from('pedidos').insert({
    mp_payment_id: String(paymentId),
    mp_preference_id: payment.order?.id ? String(payment.order.id) : null,
    estado,
    total: Math.round(payment.transaction_amount ?? 0),
    comprador_nombre: comprador.nombre ?? payment.payer?.first_name ?? null,
    comprador_email: comprador.email ?? payment.payer?.email ?? null,
    comprador_telefono: comprador.telefono ?? null,
    direccion_envio: {
      calle: comprador.calle ?? null,
      numero: comprador.numero ?? null,
      ciudad: comprador.ciudad ?? null,
      provincia: comprador.provincia ?? null,
      cp: comprador.cp ?? null,
      pais: metadata.pais ?? null,
    },
    items: compras,
  });
  if (errPedido) {
    console.error('Webhook: no se pudo guardar el pedido', errPedido.message);
    return NextResponse.json({ error: 'No se pudo guardar el pedido' }, { status: 500 });
  }

  // Solo descontamos stock cuando el pago quedó aprobado.
  if (estado === 'approved') {
    await descontarStock(compras);
  }

  return NextResponse.json({ ok: true, estado });
}

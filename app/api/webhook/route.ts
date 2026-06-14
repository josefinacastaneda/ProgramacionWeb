import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarAviso } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Compra {
  producto_id: string;
  talle: string | null;
  cantidad: number;
}

interface DatosComprador {
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  calle?: string | null;
  numero?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  cp?: string | null;
}

// Arma y envía el email de aviso de nueva compra. No lanza nunca.
async function avisarCompra(opts: {
  compras: Compra[];
  comprador: DatosComprador;
  total: number;
  entrega: string;
  pais: string | null;
}) {
  const { compras, comprador, total, entrega, pais } = opts;

  // Buscamos los nombres de los productos para que el email sea legible.
  const ids = [...new Set(compras.map((c) => c.producto_id).filter(Boolean))];
  const nombres: Record<string, string> = {};
  if (ids.length > 0) {
    const { data } = await supabaseAdmin.from('productos').select('id, nombre').in('id', ids);
    for (const p of data ?? []) nombres[p.id as string] = p.nombre as string;
  }

  const filas = compras
    .map((c) => {
      const nombre = nombres[c.producto_id] ?? c.producto_id;
      const talle = c.talle ? ` · Talle ${c.talle}` : '';
      return `<li style="margin-bottom:6px">${nombre}${talle} — <strong>x${c.cantidad}</strong></li>`;
    })
    .join('');

  const esRetiro = entrega === 'retiro';
  const direccion = esRetiro
    ? 'Retiro en local'
    : [comprador.calle, comprador.numero, comprador.ciudad, comprador.provincia, comprador.cp]
        .filter(Boolean)
        .join(', ') || 'Sin datos de dirección';

  const totalFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(total);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto">
      <h1 style="font-size:20px">Nueva compra en FINALOOK 🛍️</h1>
      <p><strong>Comprador:</strong> ${comprador.nombre ?? 'Sin nombre'}<br/>
         <strong>Email:</strong> ${comprador.email ?? 'Sin email'}${
           comprador.telefono ? `<br/><strong>Teléfono:</strong> ${comprador.telefono}` : ''
         }</p>
      <p><strong>Productos:</strong></p>
      <ul style="padding-left:18px">${filas || '<li>Sin detalle</li>'}</ul>
      <p><strong>Total pagado:</strong> ${totalFmt}</p>
      <p><strong>Entrega:</strong> ${esRetiro ? 'Retiro en local' : `Envío${pais ? ` (${pais})` : ''}`}<br/>
         <strong>Dirección:</strong> ${direccion}</p>
    </div>`;

  await enviarAviso({
    subject: 'Nueva compra en FINALOOK 🛍️',
    html,
    replyTo: comprador.email ?? undefined,
  });
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
    entrega?: string;
    cupon?: string | null;
  };
  const compras = Array.isArray(metadata.compras) ? metadata.compras : [];
  const comprador = metadata.comprador ?? {};

  // Idempotencia (fast path): si ya guardamos este pago, no lo reprocesamos.
  const { data: existente } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .eq('mp_payment_id', String(paymentId))
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  // El insert es la barrera real contra duplicados: la columna mp_payment_id
  // tiene un UNIQUE (migración 003), así que si dos webhooks del mismo pago
  // llegan a la vez, sólo uno inserta y el otro recibe el error 23505.
  const { data: insertado, error: errPedido } = await supabaseAdmin
    .from('pedidos')
    .insert({
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
    })
    .select('id')
    .maybeSingle();

  if (errPedido) {
    // 23505 = unique_violation: otro webhook del mismo pago ganó la carrera.
    // No es un error: el pedido ya quedó registrado, no descontamos de nuevo.
    if (errPedido.code === '23505') {
      return NextResponse.json({ ok: true, duplicado: true });
    }
    console.error('Webhook: no se pudo guardar el pedido', errPedido.message);
    return NextResponse.json({ error: 'No se pudo guardar el pedido' }, { status: 500 });
  }

  // Solo descontamos stock y avisamos la primera vez (insert exitoso) y si
  // quedó aprobado. El email va en su propio try/catch (vía enviarAviso) para
  // que un fallo de Resend nunca rompa el webhook.
  if (insertado && estado === 'approved') {
    await descontarStock(compras);
    try {
      await avisarCompra({
        compras,
        comprador,
        total: Math.round(payment.transaction_amount ?? 0),
        entrega: metadata.entrega ?? 'envio',
        pais: metadata.pais ?? null,
      });
    } catch (err) {
      console.error('Webhook: fallo al enviar el email de aviso', (err as Error).message);
    }
  }

  return NextResponse.json({ ok: true, estado });
}

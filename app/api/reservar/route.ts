import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailValido, MSG_VALIDACION } from '@/lib/validaciones';
import { MONTO_RESERVA } from '@/lib/productos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reserva de una prenda sin stock: se cobra una seña por MercadoPago y se
// registra en la tabla `reservas`. El reembolso y el aviso de restock los
// maneja Josefina desde el panel.
export async function POST(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'Falta MP_ACCESS_TOKEN.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    producto_id?: string;
    email?: string;
  };
  const productoId = (body.producto_id ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();

  if (!emailValido(email)) {
    return NextResponse.json({ error: MSG_VALIDACION.email }, { status: 400 });
  }
  if (!productoId) {
    return NextResponse.json({ error: 'Falta el producto.' }, { status: 400 });
  }

  // El producto y su falta de stock se verifican SIEMPRE contra la base: no
  // alcanza con que el cliente diga que está agotado. Si no, se podría pagar
  // una seña por algo que en realidad hay disponible.
  const { data: producto, error: errProd } = await supabaseAdmin
    .from('productos')
    .select('id, nombre, stock, activo')
    .eq('id', productoId)
    .maybeSingle();

  if (errProd) {
    console.error('Reserva: no se pudo leer el producto', errProd.message);
    return NextResponse.json({ error: 'No pudimos procesar la reserva.' }, { status: 500 });
  }
  if (!producto || !producto.activo) {
    return NextResponse.json({ error: 'Esa prenda ya no está disponible.' }, { status: 400 });
  }

  const stock = (producto.stock ?? {}) as Record<string, number>;
  const hayStock =
    Object.keys(stock).length > 0 &&
    Object.values(stock).some((n) => (Number(n) || 0) > 0);
  if (hayStock) {
    return NextResponse.json(
      { error: 'Esa prenda volvió a tener stock: podés agregarla al carrito.' },
      { status: 400 },
    );
  }

  const origin =
    req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? origin;
  const esLocal = /localhost|127\.0\.0\.1/.test(origin);

  const client = new MercadoPagoConfig({ accessToken });

  const preferencia = {
    items: [
      {
        id: `reserva-${producto.id}`,
        title: `Reserva — ${producto.nombre}`,
        quantity: 1,
        // Monto fijo del server. Nunca se toma del cliente.
        unit_price: MONTO_RESERVA,
        currency_id: 'ARS',
      },
    ],
    payer: { email },
    back_urls: {
      success: `${origin}/gracias`,
      pending: `${origin}/pendiente`,
      failure: `${origin}/error`,
    },
    // El webhook usa `tipo` para saber que esto es una reserva y no un pedido.
    metadata: {
      tipo: 'reserva',
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      email,
    },
    ...(esLocal && !process.env.NEXT_PUBLIC_BASE_URL
      ? {}
      : { notification_url: `${baseUrl}/api/webhook` }),
    ...(esLocal ? {} : { auto_return: 'approved' }),
  };

  try {
    const pref = await new Preference(client).create({ body: preferencia });
    if (!pref.init_point) {
      return NextResponse.json({ error: 'MP no devolvió init_point' }, { status: 500 });
    }

    // Dejamos la reserva registrada como pendiente. El webhook la pasa a
    // "pagada" cuando MercadoPago confirma.
    const { error: errIns } = await supabaseAdmin.from('reservas').insert({
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      email,
      monto: MONTO_RESERVA,
      estado: 'pendiente',
      mp_preference_id: pref.id ?? null,
    });

    // Si no podemos registrar la reserva, NO mandamos a pagar. Cobrar una seña
    // sin dejar registro es peor que no cobrarla: quedaría plata cobrada sin
    // forma de saber a quién avisarle ni a quién devolverle.
    if (errIns) {
      console.error('Reserva: no se pudo guardar la fila pendiente', errIns.message);
      const falta = /schema cache|does not exist/i.test(errIns.message);
      return NextResponse.json(
        {
          error: falta
            ? 'Las reservas todavía no están habilitadas. Escribinos y te la guardamos.'
            : 'No pudimos registrar la reserva. Probá de nuevo.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ init_point: pref.init_point });
  } catch (err) {
    console.error('Reserva: error al crear la preferencia', (err as Error).message);
    return NextResponse.json({ error: 'No pudimos iniciar el pago.' }, { status: 500 });
  }
}

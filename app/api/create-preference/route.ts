import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';

// Cada ítem del carrito que llega desde el front.
interface ItemBody {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Falta MP_ACCESS_TOKEN. Completá .env.local con tus credenciales de MercadoPago.' },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json()) as { items?: ItemBody[] };
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });
    }

    // back_urls absolutas: usamos el origin del request (o una URL configurada).
    const origin =
      req.headers.get('origin') ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      'http://localhost:3000';

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: items.map((it) => ({
          id: String(it.id),
          title: String(it.title),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price),
          currency_id: 'ARS',
        })),
        back_urls: {
          success: `${origin}/gracias`,
          pending: `${origin}/pendiente`,
          failure: `${origin}/error`,
        },
        auto_return: 'approved',
      },
    });

    return NextResponse.json({ id: result.id, init_point: result.init_point });
  } catch (err) {
    console.error('Error creando preferencia de MercadoPago:', err);
    return NextResponse.json(
      { error: 'No se pudo crear la preferencia de pago.' },
      { status: 500 },
    );
  }
}

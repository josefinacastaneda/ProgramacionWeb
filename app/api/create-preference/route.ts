import { MercadoPagoConfig, Preference } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';
import { validarCupon } from '@/lib/cupones';

// Cada ítem del carrito que llega desde el front.
interface ItemBody {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  talle?: string;
}

// Costo de envío fijo según destino.
const COSTO_ENVIO: Record<string, number> = {
  argentina: 10000,
  internacional: 20000,
};

// Datos del comprador capturados en el formulario de checkout.
interface CompradorBody {
  nombre?: string;
  email?: string;
  telefono?: string;
  calle?: string;
  numero?: string;
  ciudad?: string;
  provincia?: string;
  cp?: string;
}

export async function POST(req: NextRequest) {
  console.log(
    'Token cargado:',
    !!process.env.MP_ACCESS_TOKEN,
    'primeros 8 chars:',
    process.env.MP_ACCESS_TOKEN?.slice(0, 8),
  );

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Falta MP_ACCESS_TOKEN. Completá .env.local con tus credenciales de MercadoPago.' },
      { status: 500 },
    );
  }

  const body = (await req.json()) as {
    items?: ItemBody[];
    comprador?: CompradorBody;
    pais?: string;
    entrega?: string;
    cupon?: string;
  };
  const items = body.items;
  const comprador = body.comprador ?? {};
  const pais = body.pais === 'internacional' ? 'internacional' : 'argentina';
  const entrega = body.entrega === 'retiro' ? 'retiro' : 'envio';

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });
  }

  // Ítems de producto + envío + (opcional) descuento como ítem negativo.
  const itemsProducto = items.map((it) => ({
    id: String(it.id),
    title: String(it.title),
    quantity: Number(it.quantity) || 1,
    unit_price: Number(it.unit_price),
    currency_id: 'ARS',
  }));

  const subtotalProductos = itemsProducto.reduce(
    (acc, it) => acc + it.unit_price * it.quantity,
    0,
  );

  const itemsFinal = [...itemsProducto];

  // Descuento por cupón (se valida de nuevo en el server).
  const pctDescuento = body.cupon ? validarCupon(body.cupon) : null;
  if (pctDescuento) {
    const montoDescuento = Math.round((subtotalProductos * pctDescuento) / 100);
    if (montoDescuento > 0) {
      itemsFinal.push({
        id: 'descuento',
        title: `Descuento ${body.cupon!.trim().toUpperCase()} (-${pctDescuento}%)`,
        quantity: 1,
        unit_price: -montoDescuento,
        currency_id: 'ARS',
      });
    }
  }

  // Envío como ítem separado para que MercadoPago muestre el desglose.
  // Con retiro en local no se cobra envío, así que no agregamos el ítem.
  if (entrega !== 'retiro') {
    itemsFinal.push({
      id: `envio-${pais}`,
      title: pais === 'argentina' ? 'Envío (Argentina)' : 'Envío (Internacional)',
      quantity: 1,
      unit_price: COSTO_ENVIO[pais],
      currency_id: 'ARS',
    });
  }

  // back_urls absolutas: usamos el origin del request (o una URL configurada).
  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'http://localhost:3000';

  // URL pública para el notification_url del webhook (preferimos la configurada).
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? origin;

  // MercadoPago rechaza auto_return con back_urls de localhost: sólo lo activamos
  // con una URL pública (producción / túnel).
  const esLocal = /localhost|127\.0\.0\.1/.test(origin);

  const client = new MercadoPagoConfig({ accessToken });

  // Datos del comprador → payer + dirección de envío de la preferencia.
  const nombreCompleto = (comprador.nombre ?? '').trim();
  const [nombrePila, ...resto] = nombreCompleto.split(' ');
  const apellido = resto.join(' ');

  const preferenceData = {
    items: itemsFinal,
    payer: {
      name: nombrePila || undefined,
      surname: apellido || undefined,
      email: comprador.email?.trim() || undefined,
      phone: comprador.telefono?.trim() ? { number: comprador.telefono.trim() } : undefined,
      address: {
        zip_code: comprador.cp?.trim() || undefined,
        street_name: comprador.calle?.trim() || undefined,
        street_number: comprador.numero?.trim() || undefined,
      },
    },
    // Sin dirección de envío cuando el comprador retira en el local.
    ...(entrega === 'envio'
      ? {
          shipments: {
            receiver_address: {
              zip_code: comprador.cp?.trim() || undefined,
              street_name: comprador.calle?.trim() || undefined,
              street_number: comprador.numero?.trim() || undefined,
              city_name: comprador.ciudad?.trim() || undefined,
              state_name: comprador.provincia?.trim() || undefined,
              country_name: pais === 'argentina' ? 'Argentina' : undefined,
            },
          },
        }
      : {}),
    back_urls: {
      success: `${origin}/gracias`,
      pending: `${origin}/pendiente`,
      failure: `${origin}/error`,
    },
    // El webhook descuenta stock y guarda el pedido. Guardamos en metadata
    // qué talle se compró de cada producto (MP no lo transmite por sí solo).
    metadata: {
      pais,
      entrega,
      cupon: body.cupon ?? null,
      comprador: {
        nombre: comprador.nombre ?? null,
        email: comprador.email ?? null,
        telefono: comprador.telefono ?? null,
        calle: comprador.calle ?? null,
        numero: comprador.numero ?? null,
        ciudad: comprador.ciudad ?? null,
        provincia: comprador.provincia ?? null,
        cp: comprador.cp ?? null,
      },
      compras: items.map((it) => ({
        producto_id: String(it.id),
        talle: it.talle ?? null,
        cantidad: Number(it.quantity) || 1,
      })),
    },
    ...(esLocal && !process.env.NEXT_PUBLIC_BASE_URL
      ? {}
      : { notification_url: `${baseUrl}/api/webhook` }),
    ...(esLocal ? {} : { auto_return: 'approved' }),
  };

  try {
    const preference = await new Preference(client).create({ body: preferenceData });
    console.log('MP Response:', JSON.stringify(preference, null, 2));
    if (!preference.init_point) {
      return NextResponse.json(
        { error: 'MP no devolvió init_point', detail: preference },
        { status: 500 },
      );
    }
    return NextResponse.json({ init_point: preference.init_point });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: unknown };
    console.error('MP Error completo:', e?.message, e?.cause, JSON.stringify(err));
    return NextResponse.json({ error: e?.message || 'Error SDK', detail: e?.cause }, { status: 500 });
  }
}

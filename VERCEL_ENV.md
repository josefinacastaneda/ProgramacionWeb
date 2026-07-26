# Variables de entorno en Vercel — FINALOOK

Estas son TODAS las variables que hay que cargar en Vercel para que el deploy
funcione. Si falta alguna, las páginas que usan Supabase o MercadoPago fallan en
runtime (y antes de este fix, el build entero se caía).

Cargalas en: **Vercel → tu proyecto → Settings → Environment Variables**.
Marcá los tres entornos (Production, Preview, Development) salvo que se indique
lo contrario. Después de agregarlas, hacé **Redeploy** para que tomen efecto.

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Public key de MercadoPago. Se expone al browser para inicializar el checkout. |
| `MP_ACCESS_TOKEN` | Access token (secreto) de MercadoPago. Solo server: crea preferencias y procesa el webhook de pagos. |
| `MP_WEBHOOK_SECRET` | Clave secreta del webhook (MercadoPago → Tus integraciones → Webhooks → "Clave secreta"). Solo server: valida la firma `x-signature` de cada notificación antes de procesarla. Mientras no esté configurada, el webhook sigue funcionando pero sin esa verificación extra (ver `SECURITY.md`). |
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio: **`https://finalook.com.ar`**. La usan el `notification_url` de MercadoPago, el canonical, el sitemap y el Open Graph. En local es `http://localhost:3000`. ⚠️ Ver abajo el orden para cambiarla. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. La usan tanto el cliente público como el admin. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de Supabase. Para lecturas desde el browser, respeta las políticas RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (SECRETA). Solo server: saltea RLS para el panel admin, el webhook y la validación de cupones. **Nunca** marcarla como `NEXT_PUBLIC_`. |
| `ADMIN_PASSWORD` | Contraseña del panel de administración (`/admin`). |

## Solo para correr migraciones (opcional, no hace falta en runtime)

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_DB_URL` | Connection string de Postgres de Supabase (`postgresql://...`). La usa `npm run migrate` para aplicar los archivos de `supabase/migrations/`. No es necesaria para el deploy del sitio. |

## ⚠️ Cambiar `NEXT_PUBLIC_BASE_URL` al dominio nuevo: el ORDEN importa

Esta variable define el `notification_url`, que es la dirección a la que
MercadoPago avisa que se concretó un pago. Si apunta a un dominio que todavía
no resuelve, **el aviso no llega**: se cobra la plata, no queda el pedido
registrado y no llega el mail.

Por eso el orden correcto es:

1. Agregar `finalook.com.ar` en Vercel y cargar el DNS en el registrador.
2. **Esperar** a que Vercel muestre "Valid Configuration" y que
   `https://finalook.com.ar` abra bien en el navegador.
3. Recién ahí cambiar `NEXT_PUBLIC_BASE_URL` a `https://finalook.com.ar`.
4. Redeploy.

No pasa nada si la variable queda un tiempo apuntando al dominio `.vercel.app`:
ese dominio sigue funcionando aunque agregues el propio, así que los pagos
siguen entrando normalmente mientras esperás el DNS.

Las `back_urls` (a dónde vuelve el comprador después de pagar) no dependen de
esta variable: se arman con el dominio desde el que la persona está navegando,
así que se actualizan solas.

## Notas

- Las variables `NEXT_PUBLIC_*` se incrustan en el bundle del cliente: no pongas
  secretos ahí.
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` y
  `ADMIN_PASSWORD` son secretas: van solo del lado server.
- En desarrollo local estas mismas variables viven en `.env.local` (que está en
  `.gitignore` y no se sube al repo).

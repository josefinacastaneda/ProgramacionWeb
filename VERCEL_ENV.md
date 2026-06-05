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
| `NEXT_PUBLIC_BASE_URL` | URL pública del sitio (ej: `https://finalook.vercel.app`). Se usa para las `back_urls` y el `notification_url` de MercadoPago. En local es `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. La usan tanto el cliente público como el admin. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de Supabase. Para lecturas desde el browser, respeta las políticas RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (SECRETA). Solo server: saltea RLS para el panel admin, el webhook y la validación de cupones. **Nunca** marcarla como `NEXT_PUBLIC_`. |
| `ADMIN_PASSWORD` | Contraseña del panel de administración (`/admin`). |

## Solo para correr migraciones (opcional, no hace falta en runtime)

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_DB_URL` | Connection string de Postgres de Supabase (`postgresql://...`). La usa `npm run migrate` para aplicar los archivos de `supabase/migrations/`. No es necesaria para el deploy del sitio. |

## Notas

- Las variables `NEXT_PUBLIC_*` se incrustan en el bundle del cliente: no pongas
  secretos ahí.
- `MP_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_PASSWORD` son secretas:
  van solo del lado server.
- En desarrollo local estas mismas variables viven en `.env.local` (que está en
  `.gitignore` y no se sube al repo).

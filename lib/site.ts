// URL pública del sitio, en un solo lugar.
//
// Se lee de NEXT_PUBLIC_BASE_URL, que es la misma variable que usa MercadoPago
// para el notification_url del webhook. Tener una sola variable evita que el
// SEO y los pagos apunten a dominios distintos.
//
// En local vale http://localhost:3000 (así el sitemap y los canonical de
// desarrollo no mienten). En Vercel tiene que valer https://finalook.com.ar.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || 'https://finalook.com.ar'
).replace(/\/+$/, '');

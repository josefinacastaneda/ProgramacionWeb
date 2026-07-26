import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El panel y las APIs no van a un buscador. Las pantallas de resultado
      // de pago tampoco: no aportan nada indexadas.
      disallow: ['/admin', '/api/', '/gracias', '/pendiente', '/error'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

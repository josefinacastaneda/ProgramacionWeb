import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Sólo las páginas que tiene sentido indexar. /gracias, /pendiente y /error son
// pantallas de resultado de pago: no aportan nada en un buscador y quedan
// bloqueadas en robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: ahora,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/nosotros`,
      lastModified: ahora,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}

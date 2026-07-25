// Rate limiting básico para endpoints sensibles. En esta versión de Next.js
// `middleware.ts` está deprecado a favor de `proxy.ts` (mismo runtime Node.js,
// misma ubicación en la raíz del proyecto).
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

interface Regla {
  test: (pathname: string) => boolean;
  limite: number;
  ventanaMs: number;
}

const REGLAS: Regla[] = [
  // Webhook de MercadoPago: alto volumen esperado, pero no infinito.
  { test: (p) => p === '/api/webhook', limite: 60, ventanaMs: 60_000 },
  // Creación de preferencias de pago.
  { test: (p) => p === '/api/create-preference', limite: 20, ventanaMs: 60_000 },
  // Login y API del panel admin: el objetivo principal es frenar fuerza bruta.
  { test: (p) => p === '/api/admin/auth', limite: 10, ventanaMs: 60_000 },
  { test: (p) => p.startsWith('/api/admin/'), limite: 60, ventanaMs: 60_000 },
  // Formulario de contacto y validación de cupones: bajo volumen normal.
  { test: (p) => p === '/api/contacto', limite: 5, ventanaMs: 60_000 },
  { test: (p) => p === '/api/cupon', limite: 20, ventanaMs: 60_000 },
];

function obtenerIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconocida';
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const regla = REGLAS.find((r) => r.test(pathname));
  if (regla) {
    const ip = obtenerIp(req);
    const key = `${pathname}:${ip}`;
    if (!rateLimit(key, regla.limite, regla.ventanaMs)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Probá de nuevo en un minuto.' },
        { status: 429 },
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

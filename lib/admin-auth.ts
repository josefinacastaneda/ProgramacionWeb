import { timingSafeEqual } from 'crypto';

// Compara dos strings en tiempo constante (evita timing attacks al adivinar
// la contraseña carácter por carácter).
export function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Protección simple del panel admin: el cliente manda la contraseña en el
// header `x-admin-password` y la comparamos con ADMIN_PASSWORD (server-only).
export function esAdmin(req: Request): boolean {
  const pass = req.headers.get('x-admin-password') ?? '';
  const esperado = process.env.ADMIN_PASSWORD ?? '';
  return !!esperado && compararSeguro(pass, esperado);
}

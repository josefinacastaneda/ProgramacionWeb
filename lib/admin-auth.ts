// Protección simple del panel admin: el cliente manda la contraseña en el
// header `x-admin-password` y la comparamos con ADMIN_PASSWORD (server-only).
export function esAdmin(req: Request): boolean {
  const pass = req.headers.get('x-admin-password');
  const esperado = process.env.ADMIN_PASSWORD;
  return !!esperado && pass === esperado;
}

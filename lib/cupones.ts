// Códigos de descuento válidos (hardcodeados). Valor = porcentaje de descuento.
export const CUPONES: Record<string, number> = {
  FINALOOK10: 10,
  FINALOOK20: 20,
  DROP01: 15,
};

// Devuelve el porcentaje de descuento de un código, o null si es inválido.
export function validarCupon(codigo: string): number | null {
  const key = codigo.trim().toUpperCase();
  return key in CUPONES ? CUPONES[key] : null;
}

// Datos y utilidades de productos (antes modulo-productos.js) — ahora en TypeScript.
// Los productos se leen desde productos.json (en la raíz del proyecto).

import productosJson from '../productos.json';

export interface ColorVariante {
  nombre: string;
  hex: string;
  imagenes: string[];
}

// Drop al que pertenece una prenda. Define en qué mundo se muestra:
// '01' → Night Out (noche), '02' → Cruddo (día).
export type Drop = '01' | '02';

export const DROPS: {
  id: Drop;
  numero: string;
  nombre: string;
  mundo: 'night' | 'day';
}[] = [
  { id: '01', numero: 'Drop - 01', nombre: 'NIGHT OUT', mundo: 'night' },
  { id: '02', numero: 'Drop - 02', nombre: 'CRUDDO', mundo: 'day' },
];

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagenes: string[];
  talles: string[];
  stock?: Record<string, number>;
  descripcion: string;
  material: string;
  badge: string | null;
  colores?: ColorVariante[];
  // Los productos viejos (y productos.json) no lo traen: por eso es opcional
  // y se normaliza a '01' al leerlos.
  drop?: Drop;
}

// Normaliza el drop de un producto. Cualquier valor raro cae en '01' para que
// la prenda siga siendo visible en algún mundo en vez de desaparecer.
export function dropDe(p: Producto): Drop {
  return p.drop === '02' ? '02' : '01';
}

export function filtrarPorDrop(productos: Producto[], drop: Drop): Producto[] {
  return productos.filter((p) => dropDe(p) === drop);
}

export type Categoria = 'todos' | string;

// productos.json es la fuente de datos. El cast la tipa como Producto[].
export const productosData: Producto[] = productosJson as Producto[];

export function getProductos(): Producto[] {
  return productosData;
}

export function formatearPrecio(precio: number): string {
  return '$' + precio.toLocaleString('es-AR');
}

// Seña que se paga para reservar una prenda sin stock. Después se descuenta
// del precio final.
export const MONTO_RESERVA = 10000;

// Una prenda está sin stock cuando no queda ni una unidad en ningún talle.
// Si no tiene el objeto `stock` cargado, asumimos que SÍ hay stock: es el
// comportamiento que había antes y no queremos bloquear ventas por un dato
// que falta.
export function sinStock(p: Producto): boolean {
  const stock = p.stock;
  if (!stock || Object.keys(stock).length === 0) return false;
  return Object.values(stock).every((n) => (Number(n) || 0) <= 0);
}

export function filtrarPorCategoria(productos: Producto[], categoria: Categoria): Producto[] {
  if (categoria === 'todos') return productos;
  // Insensible a mayúsculas: la categoría se escribe a mano en el panel, así
  // que "Pantalones" y "pantalones" tienen que ser lo mismo.
  const buscada = categoria.trim().toLowerCase();
  return productos.filter((p) => (p.categoria ?? '').trim().toLowerCase() === buscada);
}

// Construye la lista de filtros a partir de las categorías que REALMENTE
// existen entre los productos dados. Nada hardcodeado: si se carga una
// categoría nueva en el panel, aparece sola.
export function categoriasDe(productos: Producto[]): { label: string; value: string }[] {
  const vistas = new Map<string, string>();
  for (const p of productos) {
    const crudo = (p.categoria ?? '').trim();
    if (!crudo) continue;
    const value = crudo.toLowerCase();
    // Nos quedamos con la primera forma escrita, capitalizada para mostrar.
    if (!vistas.has(value)) {
      vistas.set(value, crudo.charAt(0).toUpperCase() + crudo.slice(1));
    }
  }
  const ordenadas = [...vistas.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([value, label]) => ({ label, value }));
  return [{ label: 'Todos', value: 'todos' }, ...ordenadas];
}

export function ordenarPorPrecio(productos: Producto[], orden: '' | 'asc' | 'desc'): Producto[] {
  const lista = [...productos];
  if (orden === 'asc') lista.sort((a, b) => a.precio - b.precio);
  if (orden === 'desc') lista.sort((a, b) => b.precio - a.precio);
  return lista;
}

export function buscarProductos(productos: Producto[], query: string): Producto[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q),
  );
}

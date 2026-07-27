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

export const DROPS: { id: Drop; etiqueta: string; mundo: 'night' | 'day' }[] = [
  { id: '01', etiqueta: 'Drop 01 · Night Out', mundo: 'night' },
  { id: '02', etiqueta: 'Drop 02 · Cruddo', mundo: 'day' },
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

export function filtrarPorCategoria(productos: Producto[], categoria: Categoria): Producto[] {
  if (categoria === 'todos') return productos;
  return productos.filter((p) => p.categoria === categoria);
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

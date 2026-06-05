// Datos y utilidades de productos (antes modulo-productos.js) — ahora en TypeScript.
// Los productos se leen desde productos.json (en la raíz del proyecto).

import productosJson from '../productos.json';

export interface ColorVariante {
  nombre: string;
  hex: string;
  imagenes: string[];
}

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

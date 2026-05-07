// Módulo ES6 — exporta datos y utilidades para ser importados desde index.html

export const productosData = [
  {
    id: 'camisa-oversize',
    nombre: 'Camisa Oversize',
    categoria: 'camisas',
    precio: 38000,
    imagenes: ['img/camisa_oversize.jpg'],
    talles: ['S','M','L','XL'],
    descripcion: 'Camisa oversize de denim claro con bolsillo delantero.',
    material: 'Denim claro',
    badge: null
  }
];

export function formatearPrecio(precio) {
  return '$' + precio.toLocaleString('es-AR');
}

export function filtrarPorCategoria(productos, categoria) {
  if (categoria === 'todos') return productos;
  return productos.filter(p => p.categoria === categoria);
}
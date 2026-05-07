'use client';

import { useState, useEffect } from 'react';
import ProductoCard from './components/ProductoCard';
import Header from './components/Header';

const productos = [
  { id: 1, nombre: 'Camisa Oversize', categoria: 'camisas', precio: 38000 },
  { id: 2, nombre: 'Vestido Fina',    categoria: 'vestidos', precio: 45000 },
  { id: 3, nombre: 'Top Halter',      categoria: 'tops',     precio: 22000 },
];

export default function Home() {
  const [filtro, setFiltro] = useState('todos');
  const [lista, setLista]   = useState(productos);

  useEffect(() => {
    if (filtro === 'todos') {
      setLista(productos);
    } else {
      setLista(productos.filter(p => p.categoria === filtro));
    }
  }, [filtro]);

  return (
    <main style={{ background: '#080808', minHeight: '100vh', padding: '2rem', fontFamily: 'sans-serif' }}>
      <Header />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {['todos','camisas','vestidos','tops'].map(cat => (
          <button
            key={cat}
            onClick={() => setFiltro(cat)}
            style={{
              background: filtro === cat ? '#4A6890' : 'transparent',
              color: '#F2EDE4',
              border: '1px solid #4A6890',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.2em'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
        {lista.map(p => <ProductoCard key={p.id} producto={p} />)}
      </div>
    </main>
  );
}
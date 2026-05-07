type Props = {
  producto: {
    id: number;
    nombre: string;
    categoria: string;
    precio: number;
  };
};

export default function ProductoCard({ producto }: Props) {
  return (
    <article style={{
      border: '1px solid rgba(255,255,255,0.07)',
      padding: '1.5rem',
      color: '#F2EDE4',
      background: '#0F0F0F'
    }}>
      <p style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#6B8EB5', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {producto.categoria}
      </p>
      <h3 style={{ fontFamily: 'serif', fontWeight: 300, fontSize: '1.4rem', marginBottom: '0.75rem' }}>
        {producto.nombre}
      </h3>
      <p style={{ color: '#B8976A', fontFamily: 'serif', fontSize: '1.2rem' }}>
        ${producto.precio.toLocaleString('es-AR')}
      </p>
    </article>
  );
}
async function getNosotrosData() {
  return {
    titulo: 'Diseño con identidad propia',
    descripcion: 'Finalook Studio nació de la necesidad de crear prendas que combinen la estética del denim con un diseño editorial contemporáneo. Cada pieza es confeccionada de forma artesanal, pensada para durar.',
    fundacion: '2024',
    pais: 'Argentina'
  };
}

export default async function Nosotros() {
  const data = await getNosotrosData();

  return (
    <main style={{ background: '#080808', minHeight: '100vh', padding: '4rem 2rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1.5rem' }}>
        <h1 style={{ color: '#F2EDE4', fontFamily: 'serif', fontSize: '2rem', letterSpacing: '0.4em', fontWeight: 300 }}>
          FINALOOK <span style={{ color: '#6B8EB5', fontWeight: 200 }}>STUDIO</span>
        </h1>
      </header>

      <section style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '0.58rem', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#6B8EB5', marginBottom: '2rem' }}>
          Nosotros
        </p>
        <h2 style={{ fontFamily: 'serif', fontSize: '2.5rem', fontWeight: 300, color: '#F2EDE4', marginBottom: '2rem', fontStyle: 'italic' }}>
          {data.titulo}
        </h2>
        <p style={{ color: 'rgba(242,237,228,0.55)', lineHeight: 1.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {data.descripcion}
        </p>
        <p style={{ color: '#6B8EB5', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
          Fundada en {data.fundacion} · {data.pais}
        </p>

        <a href="/" style={{
          display: 'inline-block', marginTop: '3rem',
          border: '1px solid #4A6890', color: '#F2EDE4',
          padding: '0.7rem 2rem', fontSize: '0.6rem',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          textDecoration: 'none'
        }}>
          ← Volver a la colección
        </a>
      </section>
    </main>
  );
}
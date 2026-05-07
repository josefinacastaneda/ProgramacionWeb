export default function Header() {
  return (
    <header style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1.5rem' }}>
      <h1 style={{ color: '#F2EDE4', fontFamily: 'serif', fontSize: '2rem', letterSpacing: '0.4em', fontWeight: 300 }}>
        FINALOOK <span style={{ color: '#6B8EB5', fontWeight: 200 }}>STUDIO</span>
      </h1>
      <p style={{ color: 'rgba(242,237,228,0.55)', fontSize: '0.65rem', letterSpacing: '0.3em', marginTop: '0.5rem' }}>
        DROP 01 — 2026
      </p>
      <nav style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
        <a href="/" style={{ color: 'rgba(242,237,228,0.55)', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Colección
        </a>
        <a href="/nosotros" style={{ color: 'rgba(242,237,228,0.55)', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Nosotros
        </a>
      </nav>
    </header>
  );
}
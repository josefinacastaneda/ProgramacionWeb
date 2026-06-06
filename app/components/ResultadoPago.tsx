import Link from 'next/link';

type Variante = 'exito' | 'pendiente' | 'error';

const CONFIG: Record<Variante, { icono: string; color: string; titulo: string; mensaje: string }> = {
  exito: {
    icono: '◈',
    color: 'var(--denim-claro)',
    titulo: '¡Gracias por tu compra!',
    mensaje: 'Tu pago se aprobó correctamente. Te enviamos los detalles del pedido por email.',
  },
  pendiente: {
    icono: '◉',
    color: 'var(--oro)',
    titulo: 'Pago pendiente',
    mensaje: 'Tu pago está siendo procesado. Te avisaremos por email cuando se confirme.',
  },
  error: {
    icono: '◎',
    color: '#c0392b',
    titulo: 'No pudimos procesar tu pago',
    mensaje: 'Algo salió mal con el pago. No se realizó ningún cobro. Probá nuevamente.',
  },
};

export default function ResultadoPago({
  variante,
  paymentId,
  status,
}: {
  variante: Variante;
  paymentId?: string;
  status?: string;
}) {
  const c = CONFIG[variante];
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--negro)',
        color: 'var(--marfil)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        gap: '1.5rem',
      }}
    >
      <span style={{ fontSize: '3rem', color: c.color }} aria-hidden="true">
        {c.icono}
      </span>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 300,
          letterSpacing: '0.05em',
        }}
      >
        {c.titulo}
      </h1>

      <p style={{ color: 'var(--marfil-dim)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '440px' }}>
        {c.mensaje}
      </p>

      {(paymentId || status) && (
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--denim-claro)' }}>
          {paymentId && <>Pago #{paymentId}</>}
          {paymentId && status && ' — '}
          {status && <>Estado: {status}</>}
        </p>
      )}

      <Link
        href="/"
        style={{
          marginTop: '1.5rem',
          border: '1px solid var(--marfil-dim)',
          color: 'var(--marfil)',
          padding: '0.9rem 2rem',
          fontSize: '0.62rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}
      >
        ← Volver a la tienda
      </Link>
    </main>
  );
}

// Se muestra automáticamente mientras el server component de la home
// espera los productos de Supabase (App Router: archivo loading.tsx).
export default function Cargando() {
  return (
    <main className="catalogo-cargando" aria-busy="true" aria-live="polite">
      <span className="catalogo-spinner" aria-hidden="true" />
      <p className="catalogo-cargando-texto">Cargando la colección…</p>
    </main>
  );
}

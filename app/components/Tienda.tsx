/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  type Producto,
  type ColorVariante,
  formatearPrecio,
  filtrarPorCategoria,
  ordenarPorPrecio,
  buscarProductos,
} from '@/lib/productos';

const NOMBRE_TIENDA = process.env.NEXT_PUBLIC_NOMBRE_TIENDA || 'FINALOOK STUDIO';
const NOSOTROS_TEXTO =
  'Cada pieza nace de la obsesión por el detalle. Creamos con tiempo, con intención, y sin apuro. FinaLook Studio no es una tienda. Es un punto de vista.';

interface CartItem {
  producto: Producto;
  talle: string;
  color: string | null;
  imgSrc: string;
}
interface FavItem {
  producto: Producto;
  imgSrc: string;
}

type Orden = '' | 'asc' | 'desc';
type SidebarActivo = 'carrito' | 'favs' | null;

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="heart-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Tienda({ productos }: { productos: Producto[] }) {
  // ── Logo: parte la marca en "FINALOOK" + "STUDIO" ──
  const [logoMain, ...logoRest] = NOMBRE_TIENDA.split(' ');
  const logoStudio = logoRest.join(' ');

  // ── Estado general ──
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [sortActivo, setSortActivo] = useState<Orden>('');
  const [vistaTres, setVistaTres] = useState(true);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [favoritos, setFavoritos] = useState<FavItem[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [sidebarActivo, setSidebarActivo] = useState<SidebarActivo>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cardImgIdx, setCardImgIdx] = useState<Record<string, number>>({});

  // ── Modal ──
  const [modalProd, setModalProd] = useState<Producto | null>(null);
  const [modalImgs, setModalImgs] = useState<string[]>([]);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [modalTalle, setModalTalle] = useState<string | null>(null);
  const [modalColor, setModalColor] = useState<ColorVariante | null>(null);

  // ── Toast ──
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Contacto / Calculadora ──
  const [campos, setCampos] = useState({ nombre: '', email: '', mensaje: '' });
  const [errores, setErrores] = useState({ nombre: false, email: false, mensaje: false });
  const [formEnviado, setFormEnviado] = useState(false);
  const [calcPais, setCalcPais] = useState('');
  const [calcResultado, setCalcResultado] = useState<string | null>(null);

  // ── Refs ──
  const heroTituloRef = useRef<HTMLHeadingElement>(null);
  const heroContenidoRef = useRef<HTMLDivElement>(null);
  const nosotrosRef = useRef<HTMLParagraphElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const coleccionRef = useRef<HTMLElement>(null);

  // ────────────────────────────────────────────────
  // TOAST
  // ────────────────────────────────────────────────
  function mostrarToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  }

  // ────────────────────────────────────────────────
  // NAVBAR scroll + HERO parallax
  // ────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const scroll = window.scrollY;
      setScrolled(scroll > 60);

      const vh = window.innerHeight;
      const titulo = heroTituloRef.current;
      const contenido = heroContenidoRef.current;
      if (!titulo || !contenido) return;

      if (scroll > vh) return; // solo mientras el hero está visible
      const prog = scroll / vh;
      titulo.style.letterSpacing = `${0.18 + prog * 0.37}em`;
      contenido.style.transform = `scale(${1 + prog * 0.04})`;
      contenido.style.opacity = String(Math.max(0, 1 - prog * 1.4));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ────────────────────────────────────────────────
  // NOSOTROS word-by-word reveal
  // ────────────────────────────────────────────────
  useEffect(() => {
    const container = nosotrosRef.current;
    if (!container) return;
    const words = Array.from(container.querySelectorAll<HTMLElement>('.reveal-word'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    words.forEach((w) => obs.observe(w));
    return () => obs.disconnect();
  }, []);

  // ────────────────────────────────────────────────
  // REVEAL de secciones
  // ────────────────────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const secciones = Array.from(root.querySelectorAll<HTMLElement>('.reveal-section'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 },
    );
    secciones.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // ────────────────────────────────────────────────
  // Bloquear scroll del body con overlays abiertos + tecla Escape
  // ────────────────────────────────────────────────
  useEffect(() => {
    const bloqueado = modalProd !== null || sidebarActivo !== null || searchOpen;
    document.body.style.overflow = bloqueado ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalProd, sidebarActivo, searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalProd(null);
        setSidebarActivo(null);
        cerrarSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ────────────────────────────────────────────────
  // GALERÍA de cards
  // ────────────────────────────────────────────────
  function setImgCard(prod: Producto, idx: number) {
    setCardImgIdx((prev) => ({ ...prev, [prod.id]: idx }));
  }
  function cambiarImgCard(prod: Producto, dir: number) {
    const total = prod.imagenes.length;
    const actual = cardImgIdx[prod.id] || 0;
    setImgCard(prod, (actual + dir + total) % total);
  }

  // ────────────────────────────────────────────────
  // MODAL
  // ────────────────────────────────────────────────
  function abrirModal(prod: Producto) {
    const color = prod.colores ? prod.colores[0] : null;
    const imgs = color ? color.imagenes : prod.imagenes;
    const idxInicial = Math.min(cardImgIdx[prod.id] || 0, imgs.length - 1);
    setModalProd(prod);
    setModalColor(color);
    setModalImgs(imgs);
    setModalImgIdx(idxInicial);
    setModalTalle(null);
  }
  function cerrarModal() {
    setModalProd(null);
  }
  function modalPrev() {
    if (!modalImgs.length) return;
    setModalImgIdx((i) => (i - 1 + modalImgs.length) % modalImgs.length);
  }
  function modalNext() {
    if (!modalImgs.length) return;
    setModalImgIdx((i) => (i + 1) % modalImgs.length);
  }
  function seleccionarColor(col: ColorVariante) {
    setModalColor(col);
    setModalImgs(col.imagenes);
    setModalImgIdx(0);
  }

  // ────────────────────────────────────────────────
  // CARRITO
  // ────────────────────────────────────────────────
  function agregarAlCarrito(prod: Producto, talle: string, color: string | null, imgSrc: string) {
    setCarrito((prev) => [...prev, { producto: prod, talle, color, imgSrc }]);
    mostrarToast(`${prod.nombre} (${talle}) agregado`);
  }
  function removerDelCarrito(idx: number) {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  }
  function agregarDesdeModal() {
    if (!modalProd) return;
    if (!modalTalle) {
      mostrarToast('Seleccioná un talle');
      return;
    }
    const colorLabel = modalColor ? modalColor.nombre : null;
    const imgSrc = modalImgs[modalImgIdx] || modalProd.imagenes[0];
    agregarAlCarrito(modalProd, modalTalle, colorLabel, imgSrc);
    cerrarModal();
    setSidebarActivo('carrito');
  }
  function checkout() {
    if (carrito.length === 0) {
      alert('Tu carrito está vacío. ¡Agregá alguna prenda primero!');
      return;
    }
    const nombre = prompt('¿Cuál es tu nombre para confirmar el pedido?');
    if (nombre && nombre.trim() !== '') {
      alert(`¡Gracias por tu compra, ${nombre.trim()}!\n${NOMBRE_TIENDA} te contactará pronto.`);
      setCarrito([]);
      setSidebarActivo(null);
    } else {
      alert('Necesitamos tu nombre para procesar el pedido.');
    }
  }
  const carritoTotal = carrito.reduce((acc, it) => acc + it.producto.precio, 0);

  // ────────────────────────────────────────────────
  // FAVORITOS
  // ────────────────────────────────────────────────
  function esFavorito(id: string) {
    return favoritos.some((f) => f.producto.id === id);
  }
  function toggleFavorito(prod: Producto, imgSrc: string) {
    setFavoritos((prev) => {
      const existe = prev.some((f) => f.producto.id === prod.id);
      if (existe) {
        mostrarToast(`${prod.nombre} removido de favoritos`);
        return prev.filter((f) => f.producto.id !== prod.id);
      }
      mostrarToast(`${prod.nombre} guardado en favoritos`);
      return [...prev, { producto: prod, imgSrc }];
    });
  }
  function moverFavsAlCarrito() {
    if (favoritos.length === 0) {
      mostrarToast('No tenés favoritos guardados');
      return;
    }
    setCarrito((prev) => [
      ...prev,
      ...favoritos.map((it) => ({ producto: it.producto, talle: '—', color: null, imgSrc: it.imgSrc })),
    ]);
    mostrarToast(`${favoritos.length} prenda/s movida/s al carrito`);
  }

  // ────────────────────────────────────────────────
  // BUSCADOR
  // ────────────────────────────────────────────────
  function abrirSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }
  function cerrarSearch() {
    setSearchOpen(false);
    setSearchQuery('');
  }
  const searchResultados = searchQuery.trim() ? buscarProductos(productos, searchQuery) : [];
  function irAProductoDesdeSearch(prod: Producto) {
    cerrarSearch();
    setFiltroActivo(prod.categoria);
    scrollAColeccion();
    setTimeout(() => abrirModal(prod), 600);
  }

  // ────────────────────────────────────────────────
  // FILTROS / NAV
  // ────────────────────────────────────────────────
  function scrollAColeccion() {
    coleccionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  function filtrarDesdeNav(cat: string) {
    setFiltroActivo(cat);
    scrollAColeccion();
  }

  // ────────────────────────────────────────────────
  // CALCULADORA DE ENVÍO
  // ────────────────────────────────────────────────
  function calcularEnvio() {
    if (!calcPais) {
      mostrarToast('Seleccioná tu país primero');
      return;
    }
    const precio = calcPais === 'argentina' ? '$10.000 ARS' : '$20.000 ARS (internacional)';
    setCalcResultado(`Costo de envío estimado: ${precio}`);
  }

  // ────────────────────────────────────────────────
  // FORMULARIO DE CONTACTO
  // ────────────────────────────────────────────────
  function enviarContacto(e: React.FormEvent) {
    e.preventDefault();
    const nuevos = {
      nombre: campos.nombre.trim().length < 2,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email),
      mensaje: campos.mensaje.trim().length < 5,
    };
    setErrores(nuevos);
    if (!nuevos.nombre && !nuevos.email && !nuevos.mensaje) {
      setFormEnviado(true);
      mostrarToast('Mensaje enviado con éxito');
    }
  }

  // ── Lista de productos visible (filtro + orden) ──
  const listaVisible = ordenarPorPrecio(filtrarPorCategoria(productos, filtroActivo), sortActivo);
  const categorias: { label: string; value: string }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Tops', value: 'tops' },
    { label: 'Vestidos', value: 'vestidos' },
    { label: 'Camisas', value: 'camisas' },
  ];

  return (
    <div ref={rootRef}>
      {/* ═══ TOAST ═══ */}
      <div className={`toast${toastVisible ? ' visible' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>

      {/* ═══ HEADER + NAV ═══ */}
      <header className={scrolled ? 'scrolled' : ''}>
        <nav aria-label="Navegación principal">
          <a href="#hero" className="nav-logo" aria-label={`${NOMBRE_TIENDA} – Inicio`}>
            {logoMain} <span className="studio">{logoStudio}</span>
          </a>

          <ul className="nav-links" role="list">
            <li className="nav-item">
              <a href="#hero">Inicio</a>
            </li>
            <li className="nav-item">
              <a href="#coleccion">Colección</a>
              <div className="nav-dropdown" role="menu" aria-label="Categorías">
                {categorias.map((c) => (
                  <a
                    key={c.value}
                    href="#coleccion"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      filtrarDesdeNav(c.value);
                    }}
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            </li>
            <li className="nav-item">
              <a href="#nosotros">Nosotros</a>
            </li>
            <li className="nav-item">
              <a href="#envios">Envíos</a>
            </li>
            <li className="nav-item">
              <a href="#contacto">Contacto</a>
            </li>
          </ul>

          <div className="nav-acciones">
            <button className="nav-icon-btn" onClick={abrirSearch} aria-label="Buscar productos">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>

            <button className="nav-icon-btn" onClick={() => setSidebarActivo('favs')} aria-label="Ver favoritos" aria-haspopup="dialog">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <span className="nav-badge" aria-live="polite">
                {favoritos.length}
              </span>
            </button>

            <button className="nav-icon-btn" onClick={() => setSidebarActivo('carrito')} aria-label="Ver carrito" aria-haspopup="dialog">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="nav-badge" aria-live="polite">
                {carrito.length}
              </span>
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ═══ HERO ═══ */}
        <section className="hero" id="hero" aria-label={`Hero – ${NOMBRE_TIENDA}`}>
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-grain" aria-hidden="true" />

          <div className="hero-contenido" ref={heroContenidoRef}>
            <p className="hero-drop-label" aria-label="Drop número uno">
              DROP — 01
            </p>
            <h1 className="hero-titulo" ref={heroTituloRef}>
              {logoMain}
              <span className="hero-studio-sub">{logoStudio}</span>
            </h1>
            <p className="hero-tagline">curated denim pieces</p>
          </div>

          <div className="hero-scroll-indicator" aria-hidden="true">
            <div className="scroll-line" />
            <span className="scroll-lbl">Scroll</span>
          </div>
        </section>

        {/* ═══ NOSOTROS ═══ */}
        <section className="nosotros-section reveal-section" id="nosotros" aria-labelledby="nosotros-titulo">
          <div className="nosotros-inner">
            <span className="nosotros-label">Sobre nosotros</span>
            <p className="nosotros-texto-animado" ref={nosotrosRef} aria-label="Texto sobre la marca">
              {NOSOTROS_TEXTO.split(/\s+/).map((palabra, i) => (
                <span key={i} className="reveal-word" style={{ transitionDelay: `${i * 0.04}s` }}>
                  {palabra}{' '}
                </span>
              ))}
            </p>
            <p className="nosotros-firma">Buenos Aires — Drop 01 — 2026</p>
          </div>
        </section>

        {/* ═══ COLECCIÓN ═══ */}
        <section className="coleccion-section reveal-section" id="coleccion" ref={coleccionRef} aria-labelledby="coleccion-titulo">
          <div className="seccion-header">
            <h2 className="seccion-titulo" id="coleccion-titulo">
              Colección
            </h2>
            <div className="seccion-linea" aria-hidden="true" />
            <span className="seccion-sub">Drop 01 — 2026</span>
          </div>

          <div className="toolbar" role="group" aria-label="Opciones de la colección">
            <div className="filtros-grupo" role="group" aria-label="Filtrar por categoría">
              {categorias.map((c) => (
                <button
                  key={c.value}
                  className={`filtro-btn${filtroActivo === c.value ? ' activo' : ''}`}
                  aria-pressed={filtroActivo === c.value}
                  onClick={() => setFiltroActivo(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="toolbar-derecha">
              <select
                className="sort-select"
                aria-label="Ordenar productos"
                value={sortActivo}
                onChange={(e) => setSortActivo(e.target.value as Orden)}
              >
                <option value="">Ordenar</option>
                <option value="asc">Precio ↑</option>
                <option value="desc">Precio ↓</option>
              </select>

              <div className="grid-toggle" role="group" aria-label="Vista de la grilla">
                <button
                  className={`grid-toggle-btn${vistaTres ? ' activo' : ''}`}
                  aria-label="Vista en filas de tres"
                  aria-pressed={vistaTres}
                  onClick={() => setVistaTres(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="2" width="6" height="6" /><rect x="9" y="2" width="6" height="6" /><rect x="16" y="2" width="6" height="6" />
                    <rect x="2" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" /><rect x="16" y="9" width="6" height="6" />
                  </svg>
                </button>
                <button
                  className={`grid-toggle-btn${!vistaTres ? ' activo' : ''}`}
                  aria-label="Vista de una por fila"
                  aria-pressed={!vistaTres}
                  onClick={() => setVistaTres(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="9" /><rect x="2" y="13" width="20" height="9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className={`productos-grid${vistaTres ? '' : ' vista-uno'}`} aria-live="polite">
            {listaVisible.length === 0 ? (
              <p style={{ color: 'var(--marfil-dim)', fontSize: '0.8rem', letterSpacing: '0.1em', padding: '3rem 0' }}>
                No hay prendas en esta categoría.
              </p>
            ) : (
              listaVisible.map((prod) => {
                const idx = cardImgIdx[prod.id] || 0;
                const fav = esFavorito(prod.id);
                return (
                  <article className="producto-card" data-id={prod.id} aria-label={prod.nombre} key={prod.id}>
                    <div
                      className="producto-img-wrap"
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver ${prod.nombre} en pantalla completa`}
                      onClick={() => abrirModal(prod)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') abrirModal(prod);
                      }}
                    >
                      <img
                        src={prod.imagenes[idx]}
                        alt={prod.nombre}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fb) fb.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                          const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fb) fb.style.display = 'none';
                        }}
                      />
                      <div className="img-fallback" aria-hidden="true">
                        FK
                      </div>

                      {prod.badge && <span className="producto-badge">{prod.badge}</span>}

                      {prod.imagenes.length > 1 && (
                        <>
                          <button
                            className="img-arrow img-arrow-prev"
                            aria-label="Foto anterior"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarImgCard(prod, -1);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          </button>
                          <button
                            className="img-arrow img-arrow-next"
                            aria-label="Foto siguiente"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarImgCard(prod, 1);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </>
                      )}

                      <button
                        className={`btn-fav-card${fav ? ' favorito' : ''}`}
                        aria-label={`Agregar ${prod.nombre} a favoritos`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorito(prod, prod.imagenes[0]);
                        }}
                      >
                        <HeartIcon filled={fav} />
                      </button>

                      {prod.imagenes.length > 1 && (
                        <div className="galeria-dots" aria-hidden="true">
                          {prod.imagenes.map((_, i) => (
                            <button
                              key={i}
                              className={`galeria-dot${i === idx ? ' activo' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setImgCard(prod, i);
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {prod.colores && (
                        <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', zIndex: 3 }}>
                          {prod.colores.map((c) => (
                            <span key={c.nombre} className="color-preview-dot" style={{ background: c.hex }} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="producto-info" onClick={() => abrirModal(prod)}>
                      <p className="producto-cat">{prod.categoria}</p>
                      <h3 className="producto-nombre">{prod.nombre}</h3>
                      <div className="producto-footer-card">
                        <span className="producto-precio">{formatearPrecio(prod.precio)}</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* ═══ ENVÍOS ═══ */}
        <section className="envios-section reveal-section" id="envios" aria-labelledby="envios-titulo">
          <div className="envios-inner">
            <div className="seccion-header">
              <h2 className="seccion-titulo" id="envios-titulo">
                Envíos
              </h2>
              <div className="seccion-linea" aria-hidden="true" />
            </div>

            <div className="envios-grid">
              <div className="envio-card">
                <span className="envio-icon" aria-hidden="true">◈</span>
                <p className="envio-titulo">Argentina</p>
                <p className="envio-precio">$10.000</p>
                <p className="envio-desc">Envío a todo el país. Tiempo estimado 3 a 7 días hábiles.</p>
              </div>
              <div className="envio-card">
                <span className="envio-icon" aria-hidden="true">◉</span>
                <p className="envio-titulo">Internacional</p>
                <p className="envio-precio">$20.000</p>
                <p className="envio-desc">Envíos internacionales. Tiempo estimado 10 a 20 días hábiles.</p>
              </div>
              <div className="envio-card">
                <span className="envio-icon" aria-hidden="true">◎</span>
                <p className="envio-titulo">Devoluciones</p>
                <p className="envio-precio">30 días</p>
                <p className="envio-desc">Aceptamos devoluciones dentro de los 30 días de recibido el paquete.</p>
              </div>
            </div>

            <div className="calc-box">
              <h3>Calculá tu envío</h3>
              <div className="calc-form">
                <div className="calc-grupo">
                  <label className="calc-label" htmlFor="calc-pais">
                    País de destino
                  </label>
                  <select className="calc-select" id="calc-pais" value={calcPais} onChange={(e) => setCalcPais(e.target.value)}>
                    <option value="">Seleccioná tu país</option>
                    <option value="argentina">Argentina</option>
                    <option value="internacional">Internacional</option>
                  </select>
                </div>
                <button className="btn-calc" onClick={calcularEnvio}>
                  Calcular
                </button>
              </div>
              {calcResultado && (
                <p className="calc-resultado visible" aria-live="polite">
                  {calcResultado}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ═══ CONTACTO ═══ */}
        <section className="contacto-section reveal-section" id="contacto" aria-labelledby="contacto-titulo">
          <span className="nosotros-label" style={{ display: 'block', marginBottom: '1.5rem' }}>
            Contacto
          </span>
          <h2 className="seccion-titulo" id="contacto-titulo" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 300, marginBottom: '0.5rem' }}>
            Escribinos
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--marfil-dim)', letterSpacing: '0.05em' }}>Respondemos en menos de 24 horas.</p>

          {!formEnviado ? (
            <form className="contacto-form" noValidate aria-label="Formulario de contacto" onSubmit={enviarContacto}>
              <div className="form-grupo">
                <label className="form-label" htmlFor="campo-nombre">
                  Tu nombre
                </label>
                <input
                  className={`form-input${errores.nombre ? ' error' : ''}`}
                  type="text"
                  id="campo-nombre"
                  name="nombre"
                  placeholder="Nombre completo"
                  autoComplete="name"
                  value={campos.nombre}
                  onChange={(e) => {
                    setCampos((c) => ({ ...c, nombre: e.target.value }));
                    setErrores((er) => ({ ...er, nombre: false }));
                  }}
                />
                <span className={`form-error${errores.nombre ? ' visible' : ''}`}>Por favor ingresá tu nombre.</span>
              </div>

              <div className="form-grupo">
                <label className="form-label" htmlFor="campo-email">
                  Email
                </label>
                <input
                  className={`form-input${errores.email ? ' error' : ''}`}
                  type="email"
                  id="campo-email"
                  name="email"
                  placeholder="tucorreo@mail.com"
                  autoComplete="email"
                  value={campos.email}
                  onChange={(e) => {
                    setCampos((c) => ({ ...c, email: e.target.value }));
                    setErrores((er) => ({ ...er, email: false }));
                  }}
                />
                <span className={`form-error${errores.email ? ' visible' : ''}`}>Ingresá un email válido.</span>
              </div>

              <div className="form-grupo">
                <label className="form-label" htmlFor="campo-mensaje">
                  Mensaje
                </label>
                <textarea
                  className={`form-textarea${errores.mensaje ? ' error' : ''}`}
                  id="campo-mensaje"
                  name="mensaje"
                  placeholder="¿En qué te podemos ayudar?"
                  rows={4}
                  value={campos.mensaje}
                  onChange={(e) => {
                    setCampos((c) => ({ ...c, mensaje: e.target.value }));
                    setErrores((er) => ({ ...er, mensaje: false }));
                  }}
                />
                <span className={`form-error${errores.mensaje ? ' visible' : ''}`}>Escribí tu mensaje antes de enviar.</span>
              </div>

              <button type="submit" className="btn-enviar">
                Enviar mensaje
              </button>
            </form>
          ) : (
            <div className="form-exito visible" aria-live="polite">
              Mensaje recibido. Te contactamos pronto — {NOMBRE_TIENDA}
            </div>
          )}

          <div className="contacto-redes">
            <div className="contacto-dato">
              <span style={{ display: 'block', fontSize: '0.52rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--denim-claro)', marginBottom: '0.35rem' }}>
                Email
              </span>
              <a href="mailto:finalookstudio@gmail.com">finalookstudio@gmail.com</a>
            </div>
            <div className="contacto-dato">
              <span style={{ display: 'block', fontSize: '0.52rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--denim-claro)', marginBottom: '0.35rem' }}>
                Instagram
              </span>
              <a href="https://instagram.com/finalook.studio" target="_blank" rel="noopener noreferrer">
                @finalook.studio
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="footer-inner">
          <p className="footer-logo">
            {logoMain} <span className="studio">{logoStudio}</span>
          </p>
          <p className="footer-copy">© 2026 {NOMBRE_TIENDA}. Drop 01. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* ═══ MODAL PRODUCTO ═══ */}
      <div className={`modal-overlay${modalProd ? ' abierto' : ''}`} role="dialog" aria-modal="true" aria-label="Detalle del producto">
        {modalProd && (
          <>
            <div className="modal-galeria" aria-label="Imágenes del producto">
              <img
                key={`${modalProd.id}-${modalColor?.nombre ?? ''}-${modalImgIdx}`}
                src={modalImgs[modalImgIdx]}
                alt={modalProd.nombre}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <div className="img-fallback" aria-hidden="true">
                FK
              </div>
              {modalImgs.length > 1 && (
                <>
                  <button className="modal-arrow modal-arrow-prev" onClick={modalPrev} aria-label="Imagen anterior">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button className="modal-arrow modal-arrow-next" onClick={modalNext} aria-label="Imagen siguiente">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <div className="modal-galeria-dots">
                    {modalImgs.map((_, i) => (
                      <button
                        key={i}
                        className={`modal-galeria-dot${i === modalImgIdx ? ' activo' : ''}`}
                        aria-label={`Ángulo ${i + 1}`}
                        onClick={() => setModalImgIdx(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="modal-info">
              <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar">
                <CloseIcon />
              </button>

              <p className="modal-cat-label">{modalProd.categoria}</p>
              <h2 className="modal-nombre">{modalProd.nombre}</h2>
              <p className="modal-precio-display">{formatearPrecio(modalProd.precio)}</p>
              <p className="modal-descripcion">{modalProd.descripcion}</p>
              <p className="modal-material">Material: {modalProd.material}</p>

              {modalProd.colores && (
                <div>
                  <span className="modal-label">Color</span>
                  <div className="modal-colores">
                    {modalProd.colores.map((col) => (
                      <button
                        key={col.nombre}
                        className={`modal-color-swatch${modalColor?.nombre === col.nombre ? ' activo' : ''}`}
                        style={{ background: col.hex, boxShadow: col.hex === '#FFFFFF' ? '0 0 0 1px rgba(255,255,255,0.3)' : undefined }}
                        aria-label={`Color ${col.nombre}`}
                        onClick={() => seleccionarColor(col)}
                      />
                    ))}
                    <span className="modal-color-nombre">{modalColor?.nombre}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="modal-label">Talle</span>
                <div className="modal-talles">
                  {modalProd.talles.map((t) => (
                    <button
                      key={t}
                      className={`modal-talle-btn${modalTalle === t ? ' seleccionado' : ''}`}
                      aria-label={`Talle ${t}`}
                      onClick={() => setModalTalle(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-acciones">
                <button className="btn-modal-cart" onClick={agregarDesdeModal}>
                  Agregar al carrito
                </button>
                <button
                  className={`btn-modal-fav${esFavorito(modalProd.id) ? ' activo' : ''}`}
                  aria-label="Agregar a favoritos"
                  onClick={() => toggleFavorito(modalProd, modalImgs[modalImgIdx] || modalProd.imagenes[0])}
                >
                  <HeartIcon filled={esFavorito(modalProd.id)} />
                  Guardar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ SIDEBAR OVERLAY ═══ */}
      <div className={`sidebar-overlay${sidebarActivo ? ' abierto' : ''}`} onClick={() => setSidebarActivo(null)} />

      {/* Carrito */}
      <aside className={`sidebar${sidebarActivo === 'carrito' ? ' abierto' : ''}`} role="dialog" aria-modal="true" aria-label="Carrito de compras">
        <div className="sidebar-header">
          <h2 className="sidebar-titulo">Carrito</h2>
          <button className="sidebar-cerrar" onClick={() => setSidebarActivo(null)} aria-label="Cerrar carrito">
            <CloseIcon />
          </button>
        </div>
        <div className="sidebar-items">
          {carrito.length === 0 ? (
            <div className="sidebar-vacio">
              Tu carrito está vacío.
              <br />
              Explorá la colección.
            </div>
          ) : (
            carrito.map((it, idx) => {
              const detalle = [it.talle ? `Talle ${it.talle}` : '', it.color || ''].filter(Boolean).join(' · ');
              return (
                <div className="sidebar-item" key={idx}>
                  <div className="sidebar-item-img">
                    <img src={it.imgSrc} alt={it.producto.nombre} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="sidebar-item-info">
                    <p className="sidebar-item-nombre">{it.producto.nombre}</p>
                    <p className="sidebar-item-detalle">{detalle}</p>
                    <p className="sidebar-item-precio">{formatearPrecio(it.producto.precio)}</p>
                  </div>
                  <button className="sidebar-item-remove" aria-label={`Quitar ${it.producto.nombre}`} onClick={() => removerDelCarrito(idx)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-total">
            <span className="sidebar-total-label">Total</span>
            <span className="sidebar-total-precio">{formatearPrecio(carritoTotal)}</span>
          </div>
          <button className="btn-checkout" onClick={checkout}>
            Confirmar pedido
          </button>
        </div>
      </aside>

      {/* Favoritos */}
      <aside className={`sidebar${sidebarActivo === 'favs' ? ' abierto' : ''}`} role="dialog" aria-modal="true" aria-label="Productos favoritos">
        <div className="sidebar-header">
          <h2 className="sidebar-titulo">Favoritos</h2>
          <button className="sidebar-cerrar" onClick={() => setSidebarActivo(null)} aria-label="Cerrar favoritos">
            <CloseIcon />
          </button>
        </div>
        <div className="sidebar-items">
          {favoritos.length === 0 ? (
            <div className="sidebar-vacio">
              Todavía no guardaste favoritos.
              <br />
              Tocá el corazón en las prendas.
            </div>
          ) : (
            favoritos.map((it, idx) => (
              <div className="sidebar-item" key={idx}>
                <div className="sidebar-item-img">
                  <img src={it.imgSrc} alt={it.producto.nombre} onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="sidebar-item-info">
                  <p className="sidebar-item-nombre">{it.producto.nombre}</p>
                  <p className="sidebar-item-detalle">{it.producto.categoria}</p>
                  <p className="sidebar-item-precio">{formatearPrecio(it.producto.precio)}</p>
                </div>
                <button
                  className="sidebar-item-remove"
                  aria-label={`Quitar ${it.producto.nombre} de favoritos`}
                  onClick={() => setFavoritos((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
        <div className="sidebar-footer">
          <button className="btn-checkout" style={{ background: 'var(--denim)', color: 'var(--marfil)' }} onClick={moverFavsAlCarrito}>
            Mover todo al carrito
          </button>
        </div>
      </aside>

      {/* ═══ BUSCADOR ═══ */}
      <div className={`search-overlay${searchOpen ? ' abierto' : ''}`} role="search" aria-label="Buscador de productos">
        <button className="search-close-btn" onClick={cerrarSearch} aria-label="Cerrar buscador">
          <CloseIcon size={22} />
        </button>
        <div className="search-wrap">
          <input
            className="search-input"
            ref={searchInputRef}
            type="search"
            placeholder="Buscar prendas..."
            aria-label="Ingresá el nombre o categoría"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <p className="search-hint">Escribí el nombre o categoría — ej: &quot;tops&quot;, &quot;vestido fina&quot;</p>
        </div>
        <div className="search-resultados" aria-live="polite">
          {searchResultados.map((prod) => (
            <div
              className="search-result-item"
              role="option"
              aria-selected="false"
              tabIndex={0}
              key={prod.id}
              onClick={() => irAProductoDesdeSearch(prod)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') irAProductoDesdeSearch(prod);
              }}
            >
              <div className="search-result-thumb">
                <img src={prod.imagenes[0]} alt={prod.nombre} onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
              <span className="search-result-nombre">{prod.nombre}</span>
              <span className="search-result-precio">{formatearPrecio(prod.precio)}</span>
            </div>
          ))}
        </div>
        {searchQuery.trim() && searchResultados.length === 0 && (
          <div className="search-no-results visible" aria-live="polite">
            No encontramos resultados para tu búsqueda.
            <br />
            Probá viendo{' '}
            <a
              href="#coleccion"
              onClick={(e) => {
                e.preventDefault();
                cerrarSearch();
                scrollAColeccion();
              }}
            >
              la colección completa
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
interface Resena {
  nombre: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}

// Mezcla un array sin mutar el original (para productos relacionados).
function mezclar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [comprando, setComprando] = useState(false);

  // ── Checkout: datos del comprador ──
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [comprador, setComprador] = useState({
    nombre: '',
    email: '',
    telefono: '',
    calle: '',
    numero: '',
    ciudad: '',
    provincia: '',
    cp: '',
  });

  // ── Envío dinámico ──
  const [pais, setPais] = useState<'argentina' | 'internacional'>('argentina');

  // ── Cupón de descuento ──
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; descuento: number } | null>(null);
  const [cuponError, setCuponError] = useState('');
  const [aplicandoCupon, setAplicandoCupon] = useState(false);

  // ── Stock por talle (en memoria) ──
  const [stockMap, setStockMap] = useState<Record<string, Record<string, number>>>(() => {
    const m: Record<string, Record<string, number>> = {};
    productos.forEach((p) => {
      if (p.stock) m[p.id] = { ...p.stock };
    });
    return m;
  });

  // ── Social proof (personas viendo) ──
  const [viendoAhora, setViendoAhora] = useState(4);

  // ── Guía de talles ──
  const [guiaAbierta, setGuiaAbierta] = useState(false);

  // ── Programa de referidos ──
  const [refSuffix, setRefSuffix] = useState('');

  // ── Reseñas del producto en el modal ──
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [reseNombre, setReseNombre] = useState('');
  const [reseEstrellas, setReseEstrellas] = useState(0);
  const [reseHover, setReseHover] = useState(0);
  const [reseComentario, setReseComentario] = useState('');
  const [enviandoResena, setEnviandoResena] = useState(false);

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
    const bloqueado =
      modalProd !== null || sidebarActivo !== null || searchOpen || checkoutAbierto || guiaAbierta;
    document.body.style.overflow = bloqueado ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalProd, sidebarActivo, searchOpen, checkoutAbierto, guiaAbierta]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalProd(null);
        setSidebarActivo(null);
        setCheckoutAbierto(false);
        setGuiaAbierta(false);
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
    const item = carrito[idx];
    // Devolvemos la unidad al stock en memoria.
    if (item?.talle && item.producto.stock) {
      setStockMap((sm) => ({
        ...sm,
        [item.producto.id]: {
          ...sm[item.producto.id],
          [item.talle]: (sm[item.producto.id]?.[item.talle] ?? 0) + 1,
        },
      }));
    }
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
  }
  function stockDe(prod: Producto, talle: string) {
    return stockMap[prod.id]?.[talle] ?? (prod.stock ? 0 : 99);
  }
  function agregarDesdeModal() {
    if (!modalProd) return;
    if (!modalTalle) {
      mostrarToast('Seleccioná un talle');
      return;
    }
    if (stockDe(modalProd, modalTalle) <= 0) {
      mostrarToast(`Talle ${modalTalle} agotado`);
      return;
    }
    const colorLabel = modalColor ? modalColor.nombre : null;
    const imgSrc = modalImgs[modalImgIdx] || modalProd.imagenes[0];
    agregarAlCarrito(modalProd, modalTalle, colorLabel, imgSrc);
    // Decrementamos el stock en memoria.
    if (modalProd.stock) {
      const id = modalProd.id;
      const talle = modalTalle;
      setStockMap((sm) => ({
        ...sm,
        [id]: { ...sm[id], [talle]: (sm[id]?.[talle] ?? 1) - 1 },
      }));
    }
    cerrarModal();
    setSidebarActivo('carrito');
  }
  function setCampoComprador(campo: keyof typeof comprador, valor: string) {
    setComprador((prev) => ({ ...prev, [campo]: valor }));
  }
  // Habilita el pago sólo con nombre, email válido y dirección completa.
  const emailCompradorValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comprador.email.trim());
  const checkoutValido =
    comprador.nombre.trim() !== '' &&
    emailCompradorValido &&
    comprador.calle.trim() !== '' &&
    comprador.numero.trim() !== '' &&
    comprador.ciudad.trim() !== '' &&
    comprador.provincia.trim() !== '' &&
    comprador.cp.trim() !== '';

  function abrirCheckout() {
    if (carrito.length === 0) {
      mostrarToast('Tu carrito está vacío');
      return;
    }
    setSidebarActivo(null);
    setCheckoutAbierto(true);
  }

  async function checkout() {
    if (carrito.length === 0) {
      mostrarToast('Tu carrito está vacío');
      return;
    }
    if (!checkoutValido) {
      mostrarToast('Completá tus datos de envío para continuar');
      return;
    }
    setComprando(true);
    try {
      const items = carrito.map((it) => ({
        id: it.producto.id,
        title: it.color ? `${it.producto.nombre} (${it.color})` : it.producto.nombre,
        quantity: 1,
        unit_price: it.producto.precio,
        talle: it.talle,
      }));
      const res = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, comprador, pais, cupon: cuponAplicado?.codigo }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        throw new Error(data.error || 'Sin init_point');
      }
      // Redirige al checkout de MercadoPago
      window.location.href = data.init_point;
    } catch (err) {
      console.error('Error al iniciar el pago:', err);
      mostrarToast('No se pudo iniciar el pago. Revisá las credenciales de MercadoPago.');
      setComprando(false);
    }
  }
  const carritoTotal = carrito.reduce((acc, it) => acc + it.producto.precio, 0);

  // ────────────────────────────────────────────────
  // ENVÍO + CUPÓN + TOTAL
  // ────────────────────────────────────────────────
  const envioCosto = pais === 'argentina' ? 10000 : 20000;
  const descuentoMonto = cuponAplicado
    ? Math.round((carritoTotal * cuponAplicado.descuento) / 100)
    : 0;
  const totalFinal = carritoTotal - descuentoMonto + envioCosto;

  async function aplicarCupon() {
    const codigo = cuponInput.trim();
    if (!codigo) return;
    setAplicandoCupon(true);
    setCuponError('');
    try {
      const res = await fetch('/api/cupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (data.valido) {
        setCuponAplicado({ codigo: data.codigo, descuento: data.descuento });
        setCuponError('');
        mostrarToast(`Cupón ${data.codigo} aplicado (-${data.descuento}%)`);
      } else {
        setCuponAplicado(null);
        setCuponError(data.error || 'Código inválido.');
      }
    } catch {
      setCuponError('No se pudo validar el cupón.');
    } finally {
      setAplicandoCupon(false);
    }
  }
  function quitarCupon() {
    setCuponAplicado(null);
    setCuponInput('');
    setCuponError('');
  }

  // ────────────────────────────────────────────────
  // REFERIDOS
  // ────────────────────────────────────────────────
  const referidoCodigo =
    emailCompradorValido && refSuffix
      ? (comprador.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'fina') +
        refSuffix
      : '';

  async function copiarReferido() {
    if (!referidoCodigo) return;
    try {
      await navigator.clipboard.writeText(referidoCodigo);
      mostrarToast('Código de referido copiado');
    } catch {
      mostrarToast('No se pudo copiar el código');
    }
  }

  // ────────────────────────────────────────────────
  // RESEÑAS
  // ────────────────────────────────────────────────
  const ratingPromedio = resenas.length
    ? resenas.reduce((acc, r) => acc + r.estrellas, 0) / resenas.length
    : 0;

  async function publicarResena() {
    if (!modalProd) return;
    if (reseNombre.trim().length < 2) {
      mostrarToast('Ingresá tu nombre');
      return;
    }
    if (reseEstrellas < 1) {
      mostrarToast('Elegí una calificación');
      return;
    }
    if (reseComentario.trim().length < 10) {
      mostrarToast('El comentario debe tener al menos 10 caracteres');
      return;
    }
    setEnviandoResena(true);
    try {
      const res = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalProd.id,
          nombre: reseNombre.trim(),
          estrellas: reseEstrellas,
          comentario: reseComentario.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.resenas) {
        setResenas(data.resenas);
        setReseNombre('');
        setReseEstrellas(0);
        setReseHover(0);
        setReseComentario('');
        mostrarToast('¡Gracias por tu reseña!');
      } else {
        mostrarToast(data.error || 'No se pudo publicar la reseña');
      }
    } catch {
      mostrarToast('No se pudo publicar la reseña');
    } finally {
      setEnviandoResena(false);
    }
  }

  // ────────────────────────────────────────────────
  // PRODUCTOS RELACIONADOS
  // ────────────────────────────────────────────────
  const relacionados = useMemo(() => {
    if (!modalProd) return [] as Producto[];
    const mismaCat = productos.filter(
      (p) => p.categoria === modalProd.categoria && p.id !== modalProd.id,
    );
    const otros = productos.filter(
      (p) => p.categoria !== modalProd.categoria && p.id !== modalProd.id,
    );
    return [...mezclar(mismaCat), ...mezclar(otros)].slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalProd?.id, productos]);

  // Social proof: número aleatorio 2-8 que cambia cada 30s.
  useEffect(() => {
    if (!modalProd) return;
    const aleatorio = () => setViendoAhora(Math.floor(Math.random() * 7) + 2);
    aleatorio();
    const t = setInterval(aleatorio, 30000);
    return () => clearInterval(t);
  }, [modalProd]);

  // Cargar reseñas del producto al abrir el modal.
  useEffect(() => {
    if (!modalProd) return;
    setResenas([]);
    setReseNombre('');
    setReseEstrellas(0);
    setReseHover(0);
    setReseComentario('');
    const id = modalProd.id;
    fetch(`/api/resenas?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setResenas(d.resenas || []))
      .catch(() => {});
  }, [modalProd]);

  // Generar el sufijo aleatorio del código de referido cuando el email es válido.
  useEffect(() => {
    if (emailCompradorValido && !refSuffix) {
      setRefSuffix(String(Math.floor(1000 + Math.random() * 9000)));
    }
    if (!emailCompradorValido && refSuffix) {
      setRefSuffix('');
    }
  }, [emailCompradorValido, refSuffix]);

  // Persistir el código de referido generado.
  useEffect(() => {
    if (!referidoCodigo) return;
    fetch('/api/referidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: referidoCodigo, email: comprador.email.trim() }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referidoCodigo]);

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
            <a
              className="nav-icon-btn"
              href="https://instagram.com/finalook.studio"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de FINALOOK"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

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
                      <div className="img-fallback" aria-hidden="true" />

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
          <a
            className="footer-instagram"
            href="https://instagram.com/finalook.studio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Seguinos en Instagram"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <span>@finalook.studio</span>
          </a>
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
              <div className="img-fallback" aria-hidden="true" />
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

              <p className="modal-viendo" aria-live="polite" key={viendoAhora}>
                {viendoAhora} personas están viendo esto ahora
              </p>

              {resenas.length > 0 && (
                <div className="modal-rating-resumen">
                  <span className="estrellas-mostrar" aria-hidden="true">
                    {'★★★★★'.slice(0, Math.round(ratingPromedio))}
                    <span className="estrellas-vacias">{'★★★★★'.slice(Math.round(ratingPromedio))}</span>
                  </span>
                  <span className="modal-rating-num">
                    {ratingPromedio.toFixed(1)} · {resenas.length}{' '}
                    {resenas.length === 1 ? 'reseña' : 'reseñas'}
                  </span>
                </div>
              )}

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
                <div className="modal-talle-head">
                  <span className="modal-label">Talle</span>
                  <button type="button" className="guia-talles-link" onClick={() => setGuiaAbierta(true)}>
                    Guía de talles
                  </button>
                </div>
                <div className="modal-talles">
                  {modalProd.talles.map((t) => {
                    const st = stockDe(modalProd, t);
                    const agotado = st <= 0;
                    const ultimas = st > 0 && st <= 3;
                    return (
                      <div key={t} className="modal-talle-col">
                        <button
                          className={`modal-talle-btn${modalTalle === t ? ' seleccionado' : ''}${agotado ? ' agotado' : ''}`}
                          aria-label={`Talle ${t}${agotado ? ' (agotado)' : ''}`}
                          disabled={agotado}
                          onClick={() => setModalTalle(t)}
                        >
                          {t}
                        </button>
                        {ultimas && <span className="talle-ultimas">Últimas unidades</span>}
                      </div>
                    );
                  })}
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

              {/* ── Reseñas ── */}
              <div className="modal-resenas">
                <h3 className="modal-seccion-titulo">Reseñas</h3>
                {resenas.length === 0 ? (
                  <p className="modal-resenas-vacio">Todavía no hay reseñas. Sé la primera en opinar.</p>
                ) : (
                  <div className="resenas-lista">
                    {resenas.map((r, i) => (
                      <div className="resena-item" key={i}>
                        <div className="resena-top">
                          <span className="resena-nombre">{r.nombre}</span>
                          <span className="resena-fecha">{r.fecha}</span>
                        </div>
                        <span className="estrellas-mostrar resena-estrellas" aria-label={`${r.estrellas} de 5`}>
                          {'★★★★★'.slice(0, r.estrellas)}
                          <span className="estrellas-vacias">{'★★★★★'.slice(r.estrellas)}</span>
                        </span>
                        <p className="resena-comentario">{r.comentario}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="resena-form">
                  <span className="modal-label">Dejá tu reseña</span>
                  <input
                    className="checkout-input"
                    type="text"
                    placeholder="Tu nombre"
                    value={reseNombre}
                    onChange={(e) => setReseNombre(e.target.value)}
                  />
                  <div className="resena-estrellas-input" role="radiogroup" aria-label="Calificación">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={`estrella-btn${(reseHover || reseEstrellas) >= n ? ' activa' : ''}`}
                        aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                        onMouseEnter={() => setReseHover(n)}
                        onMouseLeave={() => setReseHover(0)}
                        onClick={() => setReseEstrellas(n)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="checkout-input resena-textarea"
                    rows={3}
                    placeholder="Contanos qué te pareció (mínimo 10 caracteres)"
                    value={reseComentario}
                    onChange={(e) => setReseComentario(e.target.value)}
                  />
                  <button className="btn-publicar-resena" onClick={publicarResena} disabled={enviandoResena}>
                    {enviandoResena ? 'Publicando…' : 'Publicar reseña'}
                  </button>
                </div>
              </div>

              {/* ── Productos relacionados ── */}
              {relacionados.length > 0 && (
                <div className="modal-relacionados">
                  <h3 className="modal-seccion-titulo">También te puede interesar</h3>
                  <div className="relacionados-grid">
                    {relacionados.map((rp) => (
                      <button className="relacionado-card" key={rp.id} onClick={() => abrirModal(rp)}>
                        <div className="relacionado-img">
                          <img
                            src={rp.imagenes[0]}
                            alt={rp.nombre}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                        <span className="relacionado-nombre">{rp.nombre}</span>
                        <span className="relacionado-precio">{formatearPrecio(rp.precio)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
          <button className="btn-checkout" onClick={abrirCheckout} disabled={comprando}>
            Continuar al pago
          </button>
        </div>
      </aside>

      {/* ═══ CHECKOUT: datos de envío ═══ */}
      <div
        className={`checkout-overlay${checkoutAbierto ? ' abierto' : ''}`}
        onClick={() => {
          if (!comprando) setCheckoutAbierto(false);
        }}
      />
      <aside
        className={`checkout-panel${checkoutAbierto ? ' abierto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Datos de envío"
      >
        <div className="sidebar-header">
          <h2 className="sidebar-titulo">Datos de envío</h2>
          <button className="sidebar-cerrar" onClick={() => setCheckoutAbierto(false)} aria-label="Cerrar checkout">
            <CloseIcon />
          </button>
        </div>
        <div className="checkout-body">
          <p className="checkout-intro">
            Completá tus datos para finalizar la compra de forma segura con MercadoPago.
          </p>

          <div className="checkout-field">
            <label className="checkout-label" htmlFor="co-nombre">Nombre completo *</label>
            <input
              id="co-nombre"
              className="checkout-input"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre y apellido"
              value={comprador.nombre}
              onChange={(e) => setCampoComprador('nombre', e.target.value)}
            />
          </div>

          <div className="checkout-field">
            <label className="checkout-label" htmlFor="co-email">Email *</label>
            <input
              id="co-email"
              className="checkout-input"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={comprador.email}
              onChange={(e) => setCampoComprador('email', e.target.value)}
            />
          </div>

          {referidoCodigo && (
            <div className="referido-box">
              <span className="referido-label">Tu código de referido</span>
              <div className="referido-codigo-row">
                <span className="referido-codigo">{referidoCodigo}</span>
                <button type="button" className="referido-copiar" onClick={copiarReferido}>
                  Copiar código
                </button>
              </div>
              <p className="referido-texto">
                Compartí tu código y tu amigo obtiene 10% off en su primera compra.
              </p>
            </div>
          )}

          <div className="checkout-field">
            <label className="checkout-label" htmlFor="co-tel">
              Teléfono <span className="checkout-opcional">(opcional)</span>
            </label>
            <input
              id="co-tel"
              className="checkout-input"
              type="tel"
              autoComplete="tel"
              placeholder="+54 9 11 0000 0000"
              value={comprador.telefono}
              onChange={(e) => setCampoComprador('telefono', e.target.value)}
            />
          </div>

          <div className="checkout-field">
            <label className="checkout-label" htmlFor="co-pais">País *</label>
            <select
              id="co-pais"
              className="checkout-input"
              value={pais}
              onChange={(e) => setPais(e.target.value === 'internacional' ? 'internacional' : 'argentina')}
            >
              <option value="argentina">Argentina — envío {formatearPrecio(10000)}</option>
              <option value="internacional">Internacional — envío {formatearPrecio(20000)}</option>
            </select>
          </div>

          <div className="checkout-sep">Dirección de envío</div>

          <div className="checkout-row">
            <div className="checkout-field" style={{ flex: 2 }}>
              <label className="checkout-label" htmlFor="co-calle">Calle *</label>
              <input
                id="co-calle"
                className="checkout-input"
                type="text"
                autoComplete="address-line1"
                value={comprador.calle}
                onChange={(e) => setCampoComprador('calle', e.target.value)}
              />
            </div>
            <div className="checkout-field" style={{ flex: 1 }}>
              <label className="checkout-label" htmlFor="co-numero">Número *</label>
              <input
                id="co-numero"
                className="checkout-input"
                type="text"
                value={comprador.numero}
                onChange={(e) => setCampoComprador('numero', e.target.value)}
              />
            </div>
          </div>

          <div className="checkout-field">
            <label className="checkout-label" htmlFor="co-ciudad">Ciudad *</label>
            <input
              id="co-ciudad"
              className="checkout-input"
              type="text"
              autoComplete="address-level2"
              value={comprador.ciudad}
              onChange={(e) => setCampoComprador('ciudad', e.target.value)}
            />
          </div>

          <div className="checkout-row">
            <div className="checkout-field" style={{ flex: 2 }}>
              <label className="checkout-label" htmlFor="co-prov">Provincia *</label>
              <input
                id="co-prov"
                className="checkout-input"
                type="text"
                autoComplete="address-level1"
                value={comprador.provincia}
                onChange={(e) => setCampoComprador('provincia', e.target.value)}
              />
            </div>
            <div className="checkout-field" style={{ flex: 1 }}>
              <label className="checkout-label" htmlFor="co-cp">Código postal *</label>
              <input
                id="co-cp"
                className="checkout-input"
                type="text"
                autoComplete="postal-code"
                value={comprador.cp}
                onChange={(e) => setCampoComprador('cp', e.target.value)}
              />
            </div>
          </div>

          <div className="checkout-sep">Cupón de descuento</div>
          <div className="cupon-row">
            <input
              className="checkout-input"
              type="text"
              placeholder="Ingresá tu código"
              value={cuponInput}
              onChange={(e) => {
                setCuponInput(e.target.value);
                setCuponError('');
              }}
              disabled={!!cuponAplicado}
            />
            {cuponAplicado ? (
              <button type="button" className="cupon-btn cupon-quitar" onClick={quitarCupon}>
                Quitar
              </button>
            ) : (
              <button
                type="button"
                className="cupon-btn"
                onClick={aplicarCupon}
                disabled={aplicandoCupon || !cuponInput.trim()}
              >
                {aplicandoCupon ? '…' : 'Aplicar'}
              </button>
            )}
          </div>
          {cuponAplicado && (
            <p className="cupon-ok">
              ✓ Cupón {cuponAplicado.codigo} aplicado: -{cuponAplicado.descuento}%
            </p>
          )}
          {cuponError && <p className="cupon-error">{cuponError}</p>}
        </div>
        <div className="sidebar-footer">
          <div className="checkout-desglose">
            <div className="desglose-fila">
              <span>Subtotal productos</span>
              <span>{formatearPrecio(carritoTotal)}</span>
            </div>
            {descuentoMonto > 0 && (
              <div className="desglose-fila desglose-descuento">
                <span>Descuento ({cuponAplicado?.descuento}%)</span>
                <span>-{formatearPrecio(descuentoMonto)}</span>
              </div>
            )}
            <div className="desglose-fila">
              <span>Envío ({pais === 'argentina' ? 'Argentina' : 'Internacional'})</span>
              <span>{formatearPrecio(envioCosto)}</span>
            </div>
          </div>
          <div className="sidebar-total">
            <span className="sidebar-total-label">Total</span>
            <span className="sidebar-total-precio">{formatearPrecio(totalFinal)}</span>
          </div>
          <button className="btn-checkout" onClick={checkout} disabled={comprando || !checkoutValido}>
            {comprando ? 'Redirigiendo…' : 'Pagar con MercadoPago'}
          </button>
          {!checkoutValido && (
            <p className="checkout-aviso">Completá nombre, email y dirección para habilitar el pago.</p>
          )}
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

      {/* ═══ GUÍA DE TALLES ═══ */}
      <div
        className={`guia-overlay${guiaAbierta ? ' abierto' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Guía de talles"
        onClick={() => setGuiaAbierta(false)}
      >
        {guiaAbierta && (
          <div className="guia-popup" onClick={(e) => e.stopPropagation()}>
            <div className="guia-header">
              <h2 className="guia-titulo">Guía de talles</h2>
              <button className="sidebar-cerrar" onClick={() => setGuiaAbierta(false)} aria-label="Cerrar guía de talles">
                <CloseIcon />
              </button>
            </div>
            <table className="guia-tabla">
              <thead>
                <tr>
                  <th>Talle</th>
                  <th>Cintura</th>
                  <th>Cadera</th>
                  <th>Largo</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>68-72cm</td><td>90-94cm</td><td>98cm</td></tr>
                <tr><td>M</td><td>73-77cm</td><td>95-99cm</td><td>99cm</td></tr>
                <tr><td>L</td><td>78-83cm</td><td>100-105cm</td><td>100cm</td></tr>
                <tr><td>XL</td><td>84-90cm</td><td>106-112cm</td><td>101cm</td></tr>
              </tbody>
            </table>
            <p className="guia-nota">Las medidas son aproximadas. Ante la duda, elegí el talle mayor.</p>
          </div>
        )}
      </div>

      {/* ═══ WHATSAPP FLOTANTE ═══ */}
      <a
        className="whatsapp-flotante"
        href="https://wa.me/5491130742105?text=Hola!%20Vi%20tu%20tienda%20FINALOOK%20y%20tengo%20una%20consulta"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.5 9.5 0 01-4.83-1.32l-.35-.21-3.59.94.96-3.5-.23-.36a9.46 9.46 0 01-1.45-5.05c0-5.24 4.27-9.5 9.52-9.5 2.54 0 4.93.99 6.73 2.79a9.45 9.45 0 012.79 6.72c-.01 5.24-4.28 9.5-9.52 9.5zm8.1-17.6A11.42 11.42 0 0012.04.5C5.74.5.61 5.62.6 11.92c0 2.1.55 4.15 1.6 5.96L.5 23.5l5.77-1.51a11.42 11.42 0 005.76 1.47h.01c6.3 0 11.43-5.12 11.43-11.42 0-3.05-1.19-5.92-3.35-8.08z" />
        </svg>
      </a>
    </div>
  );
}

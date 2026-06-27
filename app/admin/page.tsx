'use client';

import { useCallback, useEffect, useState } from 'react';

interface ProductoRow {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion: string | null;
  material: string | null;
  talles: string[] | null;
  stock: Record<string, number> | null;
  badge: string | null;
  activo: boolean;
  imagenes: string[] | null;
}

interface PedidoRow {
  id: string;
  estado: string | null;
  total: number | null;
  comprador_nombre: string | null;
  comprador_email: string | null;
  created_at: string;
}

interface CuponRow {
  id: string;
  codigo: string;
  descuento: number;
  usos: number;
  activo: boolean;
}

interface MensajeRow {
  id: string;
  nombre: string | null;
  email: string | null;
  mensaje: string | null;
  leido: boolean;
  created_at: string;
}

type Tab = 'productos' | 'pedidos' | 'mensajes' | 'cupones';

// Tamaño máximo por imagen al subir (5 MB).
const MAX_IMG_BYTES = 5 * 1024 * 1024;

interface FormProducto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: string;
  descripcion: string;
  material: string;
  tallesCsv: string;
  // Stock como string por talle: permite dejar el campo vacío mientras se edita
  // (se guarda como 0). Evita el "0" precargado que no se podía borrar.
  stock: Record<string, string>;
  badge: string;
  activo: boolean;
  imagenes: string[];
}

const FORM_VACIO: FormProducto = {
  nombre: '',
  categoria: '',
  precio: '',
  descripcion: '',
  material: '',
  tallesCsv: '',
  stock: {},
  badge: '',
  activo: true,
  imagenes: [],
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);

  const [tab, setTab] = useState<Tab>('productos');
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [pedidos, setPedidos] = useState<PedidoRow[]>([]);
  const [cupones, setCupones] = useState<CuponRow[]>([]);
  const [mensajes, setMensajes] = useState<MensajeRow[]>([]);
  // Aviso global: texto + si es de éxito (ok) o de error.
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const avisarOk = useCallback((texto: string) => setAviso({ texto, ok: true }), []);
  const avisarError = useCallback((texto: string) => setAviso({ texto, ok: false }), []);

  const [form, setForm] = useState<FormProducto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoImg, setSubiendoImg] = useState(false);

  const [cuponCodigo, setCuponCodigo] = useState('');
  const [cuponDescuento, setCuponDescuento] = useState('');

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-admin-password': password }),
    [password],
  );

  const cargarTodo = useCallback(async () => {
    try {
      const [rp, rpe, rc, rm] = await Promise.all([
        fetch('/api/admin/productos', { headers: headers() }),
        fetch('/api/admin/pedidos', { headers: headers() }),
        fetch('/api/admin/cupones', { headers: headers() }),
        fetch('/api/admin/mensajes', { headers: headers() }),
      ]);
      if (rp.ok) setProductos((await rp.json()).productos ?? []);
      if (rpe.ok) setPedidos((await rpe.json()).pedidos ?? []);
      if (rc.ok) setCupones((await rc.json()).cupones ?? []);
      if (rm.ok) setMensajes((await rm.json()).mensajes ?? []);
    } catch {
      avisarError('No se pudieron cargar los datos.');
    }
  }, [headers, avisarError]);

  useEffect(() => {
    if (unlocked) cargarTodo();
  }, [unlocked, cargarTodo]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setCargandoLogin(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setUnlocked(true);
      } else {
        setLoginError('Contraseña incorrecta.');
      }
    } catch {
      setLoginError('Error de conexión.');
    } finally {
      setCargandoLogin(false);
    }
  }

  function nuevoProducto() {
    setForm({ ...FORM_VACIO });
  }

  function editarProducto(p: ProductoRow) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: String(p.precio),
      descripcion: p.descripcion ?? '',
      material: p.material ?? '',
      tallesCsv: (p.talles ?? []).join(', '),
      stock: Object.fromEntries(
        Object.entries(p.stock ?? {}).map(([t, n]) => [t, String(n)]),
      ),
      badge: p.badge ?? '',
      activo: p.activo,
      imagenes: p.imagenes ?? [],
    });
  }

  // Mantiene `stock` sincronizado con los talles ingresados.
  function setTallesCsv(csv: string) {
    if (!form) return;
    const talles = csv.split(',').map((t) => t.trim()).filter(Boolean);
    const stock: Record<string, string> = {};
    // Talle nuevo arranca vacío (no con "0"); conservamos lo ya tipeado.
    for (const t of talles) stock[t] = form.stock[t] ?? '';
    setForm({ ...form, tallesCsv: csv, stock });
  }

  const tallesDelForm = form
    ? form.tallesCsv.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  // Sube las imágenes elegidas a Supabase Storage y guarda sus URLs en el form.
  async function subirImagenes(archivos: FileList | null) {
    if (!form || !archivos || archivos.length === 0) return;
    // Avisamos si alguna imagen supera el límite, sin intentar subirla.
    const pesada = Array.from(archivos).find((f) => f.size > MAX_IMG_BYTES);
    if (pesada) {
      avisarError(`"${pesada.name}" pesa más de 5 MB. Subí una imagen más liviana.`);
      return;
    }
    setSubiendoImg(true);
    setAviso(null);
    try {
      const fd = new FormData();
      Array.from(archivos).forEach((f) => fd.append('files', f));
      // No seteamos Content-Type: el browser arma el boundary del multipart.
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.urls) {
        avisarError(data.error ?? 'No se pudieron subir las imágenes.');
        return;
      }
      setForm((f) => (f ? { ...f, imagenes: [...f.imagenes, ...data.urls] } : f));
      avisarOk(`${data.urls.length} imagen/es subida/s.`);
    } catch {
      avisarError('Error al subir las imágenes.');
    } finally {
      setSubiendoImg(false);
    }
  }

  function quitarImagen(url: string) {
    setForm((f) => (f ? { ...f, imagenes: f.imagenes.filter((u) => u !== url) } : f));
  }

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    // Validación de campos obligatorios antes de pegarle al server.
    const precioNum = Number(form.precio);
    if (!form.nombre.trim()) return avisarError('El nombre es obligatorio.');
    if (!form.categoria.trim()) return avisarError('La categoría es obligatoria.');
    if (!form.precio.trim() || !Number.isFinite(precioNum) || precioNum <= 0) {
      return avisarError('El precio debe ser un número mayor a 0.');
    }
    const talles = tallesDelForm;
    // El stock de cada talle debe ser un entero >= 0. Vacío vale (se guarda 0).
    for (const t of talles) {
      const raw = (form.stock[t] ?? '').trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        return avisarError(`El stock del talle ${t} debe ser un número entero válido (0 o más).`);
      }
    }
    setGuardando(true);
    setAviso(null);
    const payload = {
      id: form.id,
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim(),
      precio: precioNum,
      descripcion: form.descripcion,
      material: form.material,
      talles,
      // Campo vacío → 0 al guardar.
      stock: Object.fromEntries(talles.map((t) => [t, Number(form.stock[t]) || 0])),
      badge: form.badge,
      activo: form.activo,
      imagenes: form.imagenes,
    };
    try {
      const editando = !!form.id;
      const res = await fetch('/api/admin/productos', {
        method: editando ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        avisarError(data.error ?? 'No se pudo guardar.');
      } else {
        setForm(null);
        await cargarTodo();
        avisarOk(editando ? 'Producto actualizado.' : 'Producto creado.');
      }
    } catch {
      avisarError('Error al guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(p: ProductoRow) {
    try {
      await fetch('/api/admin/productos', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ id: p.id, activo: !p.activo }),
      });
      await cargarTodo();
    } catch {
      avisarError('No se pudo cambiar el estado.');
    }
  }

  async function marcarLeido(m: MensajeRow) {
    try {
      const res = await fetch('/api/admin/mensajes', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ id: m.id, leido: true }),
      });
      if (!res.ok) {
        avisarError('No se pudo marcar como leído.');
        return;
      }
      setMensajes((prev) => prev.map((x) => (x.id === m.id ? { ...x, leido: true } : x)));
    } catch {
      avisarError('No se pudo marcar como leído.');
    }
  }

  async function eliminarProducto(p: ProductoRow) {
    if (!confirm(`¿Seguro que querés eliminar el producto "${p.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/admin/productos?id=${encodeURIComponent(p.id)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        avisarError(data.error ?? 'No se pudo eliminar el producto.');
        return;
      }
      await cargarTodo();
      avisarOk('Producto eliminado.');
    } catch {
      avisarError('Error al eliminar el producto.');
    }
  }

  async function toggleCupon(c: CuponRow) {
    try {
      const res = await fetch('/api/admin/cupones', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ id: c.id, activo: !c.activo }),
      });
      if (!res.ok) {
        avisarError('No se pudo cambiar el estado del cupón.');
        return;
      }
      await cargarTodo();
      avisarOk(c.activo ? 'Cupón desactivado.' : 'Cupón activado.');
    } catch {
      avisarError('No se pudo cambiar el estado del cupón.');
    }
  }

  async function eliminarCupon(c: CuponRow) {
    if (!confirm(`¿Seguro que querés eliminar el cupón "${c.codigo}"?`)) return;
    try {
      const res = await fetch(`/api/admin/cupones?id=${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        avisarError(data.error ?? 'No se pudo eliminar el cupón.');
        return;
      }
      await cargarTodo();
      avisarOk('Cupón eliminado.');
    } catch {
      avisarError('Error al eliminar el cupón.');
    }
  }

  async function crearCupon(e: React.FormEvent) {
    e.preventDefault();
    const codigo = cuponCodigo.trim().toUpperCase();
    const descNum = Number(cuponDescuento);
    if (!codigo) return avisarError('Ingresá un código de cupón.');
    if (!Number.isFinite(descNum) || descNum <= 0 || descNum > 100) {
      return avisarError('El descuento debe ser un número entre 1 y 100.');
    }
    // Evitamos duplicados ya conocidos antes de pegarle al server.
    if (cupones.some((c) => c.codigo.toUpperCase() === codigo)) {
      return avisarError(`El cupón "${codigo}" ya existe.`);
    }
    setAviso(null);
    try {
      const res = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ codigo: cuponCodigo, descuento: descNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        avisarError(data.error ?? 'No se pudo crear el cupón.');
      } else {
        setCuponCodigo('');
        setCuponDescuento('');
        await cargarTodo();
        avisarOk('Cupón creado.');
      }
    } catch {
      avisarError('Error al crear el cupón.');
    }
  }

  if (!unlocked) {
    return (
      <main className="admin admin-login">
        <form className="admin-login-card" onSubmit={login}>
          <h1 className="admin-titulo">FINALOOK · Admin</h1>
          <p className="admin-sub">Ingresá la contraseña para administrar la tienda.</p>
          <input
            type="password"
            className="admin-input"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {loginError && <p className="admin-error">{loginError}</p>}
          <button type="submit" className="admin-btn" disabled={cargandoLogin}>
            {cargandoLogin ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin-header">
        <h1 className="admin-titulo">FINALOOK · Panel</h1>
        <button className="admin-btn-ghost" onClick={() => setUnlocked(false)}>
          Salir
        </button>
      </header>

      <nav className="admin-tabs">
        {(['productos', 'pedidos', 'mensajes', 'cupones'] as Tab[]).map((t) => {
          const sinLeer = t === 'mensajes' ? mensajes.filter((m) => !m.leido).length : 0;
          return (
            <button
              key={t}
              className={`admin-tab${tab === t ? ' activo' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {sinLeer > 0 && <span className="admin-tab-badge">{sinLeer}</span>}
            </button>
          );
        })}
      </nav>

      {aviso && (
        <p className={`admin-mensaje${aviso.ok ? ' ok' : ' error'}`} role="status">
          {aviso.texto}
        </p>
      )}

      {/* ─── PRODUCTOS ─── */}
      {tab === 'productos' && (
        <section className="admin-seccion">
          <div className="admin-seccion-head">
            <h2 className="admin-h2">Productos</h2>
            <button className="admin-btn" onClick={nuevoProducto}>
              Agregar producto
            </button>
          </div>

          {form && (
            <form className="admin-form" onSubmit={guardarProducto}>
              <h3 className="admin-h3">{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
              <div className="admin-grid">
                <label className="admin-label">
                  Nombre
                  <input
                    className="admin-input"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </label>
                <label className="admin-label">
                  Categoría
                  <input
                    className="admin-input"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    required
                  />
                </label>
                <label className="admin-label">
                  Precio (ARS)
                  <input
                    type="number"
                    className="admin-input"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  />
                </label>
                <label className="admin-label">
                  Badge (opcional)
                  <input
                    className="admin-input"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  />
                </label>
                <label className="admin-label">
                  Material
                  <input
                    className="admin-input"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                  />
                </label>
                <label className="admin-label">
                  Talles (separados por coma)
                  <input
                    className="admin-input"
                    value={form.tallesCsv}
                    onChange={(e) => setTallesCsv(e.target.value)}
                    placeholder="S, M, L"
                  />
                </label>
              </div>

              <label className="admin-label">
                Descripción
                <textarea
                  className="admin-input admin-textarea"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </label>

              <div className="admin-imagenes">
                <span className="admin-label-text">Imágenes del producto</span>
                {form.imagenes.length > 0 && (
                  <div className="admin-img-grid">
                    {form.imagenes.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div key={url} className="admin-img-thumb">
                        <img src={url} alt="Imagen del producto" />
                        <button
                          type="button"
                          className="admin-img-quitar"
                          onClick={() => quitarImagen(url)}
                          aria-label="Quitar imagen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="admin-img-upload">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={subiendoImg}
                    onChange={(e) => {
                      subirImagenes(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {subiendoImg ? 'Subiendo…' : 'Subir imágenes'}
                </label>
              </div>

              {tallesDelForm.length > 0 && (
                <div className="admin-stock">
                  <span className="admin-label-text">Stock por talle</span>
                  <div className="admin-stock-grid">
                    {tallesDelForm.map((t) => (
                      <label key={t} className="admin-stock-item">
                        {t}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="admin-input"
                          placeholder="0"
                          value={form.stock[t] ?? ''}
                          onChange={(e) => {
                            // Sólo dígitos y sin ceros a la izquierda: así el "0"
                            // se borra al escribir y no se concatena (02, 0100).
                            const limpio = e.target.value
                              .replace(/[^\d]/g, '')
                              .replace(/^0+(?=\d)/, '');
                            setForm({ ...form, stock: { ...form.stock, [t]: limpio } });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                Activo
              </label>

              <div className="admin-form-acciones">
                <button type="submit" className="admin-btn" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" className="admin-btn-ghost" onClick={() => setForm(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Stock por talle</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className={p.activo ? '' : 'admin-inactivo'}>
                    <td data-label="Nombre">{p.nombre}</td>
                    <td data-label="Precio">${p.precio.toLocaleString('es-AR')}</td>
                    <td data-label="Stock">
                      {Object.entries(p.stock ?? {})
                        .map(([t, n]) => `${t}:${n}`)
                        .join('  ') || '—'}
                    </td>
                    <td data-label="Estado">
                      <span className={`admin-pill ${p.activo ? 'ok' : 'off'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="admin-acciones-col">
                      <button className="admin-link" onClick={() => editarProducto(p)}>
                        Editar
                      </button>
                      <button className="admin-link" onClick={() => toggleActivo(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="admin-link admin-link-peligro"
                        onClick={() => eliminarProducto(p)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-vacio">
                      No hay productos. (¿Corriste la migración y el seed en Supabase?)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── PEDIDOS ─── */}
      {tab === 'pedidos' && (
        <section className="admin-seccion">
          <h2 className="admin-h2">Pedidos</h2>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comprador</th>
                  <th>Email</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pe) => (
                  <tr key={pe.id}>
                    <td data-label="Fecha">{(pe.created_at ?? '').slice(0, 10)}</td>
                    <td data-label="Comprador">{pe.comprador_nombre ?? '—'}</td>
                    <td data-label="Email">{pe.comprador_email ?? '—'}</td>
                    <td data-label="Total">${(pe.total ?? 0).toLocaleString('es-AR')}</td>
                    <td data-label="Estado">
                      <span className={`admin-pill ${estadoClase(pe.estado)}`}>
                        {pe.estado ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-vacio">
                      Todavía no hay pedidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── MENSAJES ─── */}
      {tab === 'mensajes' && (
        <section className="admin-seccion">
          <h2 className="admin-h2">Mensajes</h2>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Mensaje</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mensajes.map((m) => (
                  <tr key={m.id} className={m.leido ? '' : 'admin-no-leido'}>
                    <td data-label="Fecha">{(m.created_at ?? '').slice(0, 10)}</td>
                    <td data-label="Nombre">{m.nombre ?? '—'}</td>
                    <td data-label="Email">{m.email ?? '—'}</td>
                    <td data-label="Mensaje" className="admin-msg-cel">{m.mensaje ?? '—'}</td>
                    <td data-label="Estado">
                      <span className={`admin-pill ${m.leido ? 'ok' : 'pend'}`}>
                        {m.leido ? 'Leído' : 'Nuevo'}
                      </span>
                    </td>
                    <td className="admin-acciones-col">
                      {!m.leido && (
                        <button className="admin-link" onClick={() => marcarLeido(m)}>
                          Marcar como leído
                        </button>
                      )}
                      {m.email && (
                        <a
                          className="admin-link"
                          href={`mailto:${m.email}?subject=${encodeURIComponent('Re: tu consulta en FINALOOK')}`}
                        >
                          Responder
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {mensajes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-vacio">
                      Todavía no hay mensajes. (¿Corriste la migración 004 en Supabase?)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── CUPONES ─── */}
      {tab === 'cupones' && (
        <section className="admin-seccion">
          <h2 className="admin-h2">Cupones</h2>
          <form className="admin-form admin-form-inline" onSubmit={crearCupon}>
            <input
              className="admin-input"
              placeholder="Código (ej: VERANO25)"
              value={cuponCodigo}
              onChange={(e) => setCuponCodigo(e.target.value)}
              required
            />
            <input
              type="number"
              className="admin-input"
              placeholder="Descuento %"
              value={cuponDescuento}
              onChange={(e) => setCuponDescuento(e.target.value)}
              required
            />
            <button type="submit" className="admin-btn">
              Agregar cupón
            </button>
          </form>

          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Usos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cupones.map((c) => (
                  <tr key={c.id} className={c.activo ? '' : 'admin-inactivo'}>
                    <td data-label="Código">{c.codigo}</td>
                    <td data-label="Descuento">{c.descuento}%</td>
                    <td data-label="Usos">{c.usos}</td>
                    <td data-label="Estado">
                      <span className={`admin-pill ${c.activo ? 'ok' : 'off'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="admin-acciones-col">
                      <button className="admin-link" onClick={() => toggleCupon(c)}>
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="admin-link admin-link-peligro"
                        onClick={() => eliminarCupon(c)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {cupones.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-vacio">
                      No hay cupones. (¿Corriste la migración 002 en Supabase?)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function estadoClase(estado: string | null): string {
  if (estado === 'approved') return 'ok';
  if (estado === 'pending') return 'pend';
  if (estado === 'rejected') return 'off';
  return '';
}

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

type Tab = 'productos' | 'pedidos' | 'cupones';

interface FormProducto {
  id?: string;
  nombre: string;
  categoria: string;
  precio: string;
  descripcion: string;
  material: string;
  tallesCsv: string;
  stock: Record<string, number>;
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
  const [mensaje, setMensaje] = useState('');

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
      const [rp, rpe, rc] = await Promise.all([
        fetch('/api/admin/productos', { headers: headers() }),
        fetch('/api/admin/pedidos', { headers: headers() }),
        fetch('/api/admin/cupones', { headers: headers() }),
      ]);
      if (rp.ok) setProductos((await rp.json()).productos ?? []);
      if (rpe.ok) setPedidos((await rpe.json()).pedidos ?? []);
      if (rc.ok) setCupones((await rc.json()).cupones ?? []);
    } catch {
      setMensaje('No se pudieron cargar los datos.');
    }
  }, [headers]);

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
      stock: p.stock ?? {},
      badge: p.badge ?? '',
      activo: p.activo,
      imagenes: p.imagenes ?? [],
    });
  }

  // Mantiene `stock` sincronizado con los talles ingresados.
  function setTallesCsv(csv: string) {
    if (!form) return;
    const talles = csv.split(',').map((t) => t.trim()).filter(Boolean);
    const stock: Record<string, number> = {};
    for (const t of talles) stock[t] = form.stock[t] ?? 0;
    setForm({ ...form, tallesCsv: csv, stock });
  }

  const tallesDelForm = form
    ? form.tallesCsv.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  // Sube las imágenes elegidas a Supabase Storage y guarda sus URLs en el form.
  async function subirImagenes(archivos: FileList | null) {
    if (!form || !archivos || archivos.length === 0) return;
    setSubiendoImg(true);
    setMensaje('');
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
        setMensaje(data.error ?? 'No se pudieron subir las imágenes.');
        return;
      }
      setForm((f) => (f ? { ...f, imagenes: [...f.imagenes, ...data.urls] } : f));
    } catch {
      setMensaje('Error al subir las imágenes.');
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
    setGuardando(true);
    setMensaje('');
    const talles = tallesDelForm;
    const payload = {
      id: form.id,
      nombre: form.nombre,
      categoria: form.categoria,
      precio: Number(form.precio) || 0,
      descripcion: form.descripcion,
      material: form.material,
      talles,
      stock: Object.fromEntries(talles.map((t) => [t, Number(form.stock[t]) || 0])),
      badge: form.badge,
      activo: form.activo,
      imagenes: form.imagenes,
    };
    try {
      const res = await fetch('/api/admin/productos', {
        method: form.id ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje(data.error ?? 'No se pudo guardar.');
      } else {
        setForm(null);
        await cargarTodo();
      }
    } catch {
      setMensaje('Error al guardar el producto.');
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
      setMensaje('No se pudo cambiar el estado.');
    }
  }

  async function crearCupon(e: React.FormEvent) {
    e.preventDefault();
    setMensaje('');
    try {
      const res = await fetch('/api/admin/cupones', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ codigo: cuponCodigo, descuento: Number(cuponDescuento) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje(data.error ?? 'No se pudo crear el cupón.');
      } else {
        setCuponCodigo('');
        setCuponDescuento('');
        await cargarTodo();
      }
    } catch {
      setMensaje('Error al crear el cupón.');
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
        {(['productos', 'pedidos', 'cupones'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`admin-tab${tab === t ? ' activo' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {mensaje && <p className="admin-mensaje">{mensaje}</p>}

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
                          type="number"
                          className="admin-input"
                          value={form.stock[t] ?? 0}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              stock: { ...form.stock, [t]: Number(e.target.value) || 0 },
                            })
                          }
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
                    <td>{p.nombre}</td>
                    <td>${p.precio.toLocaleString('es-AR')}</td>
                    <td>
                      {Object.entries(p.stock ?? {})
                        .map(([t, n]) => `${t}:${n}`)
                        .join('  ') || '—'}
                    </td>
                    <td>
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
                    <td>{(pe.created_at ?? '').slice(0, 10)}</td>
                    <td>{pe.comprador_nombre ?? '—'}</td>
                    <td>{pe.comprador_email ?? '—'}</td>
                    <td>${(pe.total ?? 0).toLocaleString('es-AR')}</td>
                    <td>
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
                </tr>
              </thead>
              <tbody>
                {cupones.map((c) => (
                  <tr key={c.id}>
                    <td>{c.codigo}</td>
                    <td>{c.descuento}%</td>
                    <td>{c.usos}</td>
                    <td>
                      <span className={`admin-pill ${c.activo ? 'ok' : 'off'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {cupones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-vacio">
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

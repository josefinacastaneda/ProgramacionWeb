# API — FINALOOK

Documentación de las rutas (Route Handlers de Next.js, en `app/api/**`).
Todas devuelven JSON. Las rutas de admin requieren el header
`x-admin-password` con el valor de `ADMIN_PASSWORD`.

---

## `POST /api/create-preference`

Crea una preferencia de pago en MercadoPago y devuelve el `init_point` para
redirigir al checkout.

**Recibe** (JSON):

```json
{
  "items": [
    { "id": "abc", "title": "Jean recto", "quantity": 2, "unit_price": 45000, "talle": "M" }
  ],
  "comprador": {
    "nombre": "Ana Pérez", "email": "ana@mail.com", "telefono": "11...",
    "calle": "Av. X", "numero": "123", "ciudad": "CABA",
    "provincia": "BsAs", "cp": "1000"
  },
  "pais": "argentina",        // "argentina" | "internacional"
  "entrega": "envio",          // "envio" | "retiro"
  "cupon": "FINALOOK10"        // opcional
}
```

**Hace:** arma los ítems (productos + envío + descuento por cupón como ítem
negativo), valida el cupón de nuevo en el server, guarda en `metadata` los
talles/cantidades comprados (para que el webhook descuente stock) y crea la
preferencia.

**Devuelve:**

- `200` → `{ "init_point": "https://www.mercadopago.com/..." }`
- `400` → `{ "error": "El carrito está vacío." }`
- `500` → `{ "error": "Falta MP_ACCESS_TOKEN..." }` o error del SDK.

---

## `POST /api/webhook`

Notificación de pago que dispara MercadoPago. **Idempotente.**

**Recibe:** el body/query que manda MercadoPago (el `payment_id` llega por
`data.id`, `id` o en el body).

**Hace:** lee el pago con `Payment.get(id)`, y si es un pago nuevo inserta el
pedido en `pedidos` (columna `mp_payment_id` con `UNIQUE`). Si el pago quedó
`approved`, descuenta el stock del talle comprado en `productos`. Si la misma
notificación llega dos veces, el segundo insert falla (código `23505`) y no se
reprocesa.

**Devuelve:**

- `200` → `{ "ok": true, "estado": "approved" }`, `{ "ok": true, "duplicado": true }` o `{ "ignored": true }` (evento que no es de pago).
- `500` → `{ "error": "..." }`.

---

## `POST /api/cupon`

Valida un cupón de descuento contra la tabla `cupones`.

**Recibe:** `{ "codigo": "FINALOOK10" }`

**Hace:** busca el código (case-insensitive), y si existe y está activo suma un
uso.

**Devuelve:**

- `200` → `{ "valido": true, "codigo": "FINALOOK10", "descuento": 10 }`
- `200` → `{ "valido": false, "error": "Código inválido." }`
- `400` → `{ "valido": false, "error": "Ingresá un código." }`

---

## `/api/resenas`

Reseñas por producto.

### `GET /api/resenas?id=<producto_id>`

**Devuelve:** `{ "resenas": [ { "nombre", "estrellas", "comentario", "fecha" } ] }`
ordenadas de más nueva a más vieja. Sin `id`, devuelve lista vacía.

### `POST /api/resenas`

**Recibe:** `{ "id": "<producto_id>", "nombre": "...", "estrellas": 5, "comentario": "..." }`

**Valida:** nombre ≥ 2 chars, estrellas 1–5, comentario ≥ 10 chars.

**Devuelve:**

- `200` → `{ "ok": true, "resenas": [...] }` (lista actualizada).
- `400` → `{ "error": "Datos de reseña inválidos." }`
- `500` → `{ "error": "No se pudo guardar la reseña." }`

---

## `/api/admin/productos` 🔒

CRUD de productos. Requiere `x-admin-password`.

| Método | Qué hace | Recibe | Devuelve |
| --- | --- | --- | --- |
| `GET` | Lista todos los productos | — | `{ "productos": [...] }` |
| `POST` | Crea un producto | `{ nombre, categoria, precio, descripcion, material, talles[], stock{}, badge, activo, imagenes[] }` | `{ "producto": {...} }` |
| `PUT` | Edita un producto | igual que POST + `id` | `{ "producto": {...} }` |
| `PATCH` | Activa/desactiva | `{ id, activo }` | `{ "producto": {...} }` |

`nombre` y `categoria` son obligatorios. Sin auth → `401`.

---

## `/api/admin/cupones` 🔒

Gestión de cupones. Requiere `x-admin-password`.

| Método | Qué hace | Recibe | Devuelve |
| --- | --- | --- | --- |
| `GET` | Lista los cupones | — | `{ "cupones": [...] }` |
| `POST` | Crea un cupón | `{ codigo, descuento }` (descuento 1–100) | `{ "cupon": {...} }` |

Código duplicado → `400` `{ "error": "Ese código ya existe." }`.

---

## `POST /api/admin/upload` 🔒

Sube imágenes a Supabase Storage (bucket `productos`, lo crea si no existe).
Requiere `x-admin-password`.

**Recibe:** `multipart/form-data` con uno o varios archivos en el campo `files`.

**Hace:** valida que cada archivo sea imagen, lo sube con un nombre único y
genera la URL pública.

**Devuelve:**

- `200` → `{ "urls": ["https://.../productos/...", ...] }`
- `400` → `{ "error": "No se recibió ningún archivo." }` / no es imagen / no es multipart.
- `500` → `{ "error": "..." }` (fallo de bucket o de subida).

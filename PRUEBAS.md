# Pruebas — FINALOOK

Casos de prueba del checkout y cómo reproducirlos. Para los pagos se usan las
[tarjetas de prueba de MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
con credenciales de **test**.

> Para que el webhook se ejecute en local hay que exponer el sitio con una URL
> pública (por ejemplo `ngrok http 3000`) y poner esa URL en `NEXT_PUBLIC_BASE_URL`,
> o probar el flujo del webhook directamente en el deploy de Vercel.

---

## 1. Pago aprobado

### 1.a — Con retiro en local

**Pasos:**
1. Agregar un producto al carrito (elegir talle).
2. Abrir el carrito → "Continuar al pago".
3. Elegir **Retiro en local**.
4. Completar nombre y email → "Pagar con MercadoPago".
5. En MercadoPago, pagar con una tarjeta de prueba **aprobada** (titular `APRO`).

**Esperado:**
- No se cobra envío (el total no suma costo de envío).
- Redirige a **`/gracias`** con `payment_id` y `status=approved` en la URL.
- La página muestra "¡Gracias por tu compra!" y el `Pago #<id>`.

### 1.b — Con envío

**Pasos:** igual que 1.a pero eligiendo **Envío** y completando la dirección
(calle, número, ciudad, provincia, CP).

**Esperado:**
- El total incluye el costo de envío (Argentina $10.000 / Internacional $20.000).
- Redirige a `/gracias`. Se crea un pedido en la tabla `pedidos` con
  `direccion_envio` cargada.

---

## 2. El stock se descuenta tras la compra

**Pasos:**
1. Anotar el stock de un talle (por ejemplo talle M = 3) en el admin o en la card.
2. Comprar **2 unidades** de ese talle y completar un pago **aprobado**.
3. Esperar a que llegue el webhook y recargar la home.

**Esperado:**
- El stock del talle M pasa de 3 a **1** (`stock[talle] - cantidad`, sin bajar de 0).
- El descuento ocurre **solo** cuando el pago queda `approved` (un pago
  `rejected`/`pending` no toca el stock).

> El descuento real lo hace el webhook (`descontarStock`). En el front el stock
> también baja "en vivo" al agregar al carrito, pero esa baja es solo en memoria.

---

## 3. Webhook idempotente (no duplica pedidos)

**Pasos:**
1. Completar una compra aprobada y verificar que se creó **1** fila en `pedidos`.
2. Reenviar la misma notificación: desde el panel de MercadoPago (Webhooks →
   reenviar), o simulando el `POST /api/webhook` con el mismo `data.id`.

**Esperado:**
- Sigue habiendo **una sola** fila en `pedidos` para ese `mp_payment_id`.
- El stock **no** se vuelve a descontar.
- La segunda llamada responde `{ "ok": true, "duplicado": true }`.

**Por qué:** la columna `mp_payment_id` tiene `UNIQUE` (migración 003). El
segundo insert falla con código `23505` y se ignora; además hay un fast-path que
detecta el pedido existente antes de intentar insertar.

---

## 4. Cupón válido e inválido

**Cupones válidos** (hardcodeados en `lib/cupones.ts`): `FINALOOK10` (10%),
`FINALOOK20` (20%), `DROP01` (15%). También se validan cupones cargados en la
tabla `cupones` desde el admin.

### 4.a — Cupón válido

**Pasos:** en el carrito, escribir `FINALOOK10` y aplicar.

**Esperado:**
- Toast "Cupón FINALOOK10 aplicado (-10%)".
- El total baja un 10%. Ese descuento viaja también a MercadoPago como ítem
  negativo (se re-valida en el server en `create-preference`).

### 4.b — Cupón inválido

**Pasos:** escribir un código que no existe (ej. `NOEXISTE`) y aplicar.

**Esperado:**
- Mensaje de error "Código inválido." y el total no cambia.

---

## 5. El carrito agrupa cantidades

**Pasos:**
1. Agregar un producto talle M al carrito.
2. Volver a agregar **el mismo** producto, **mismo talle** M.

**Esperado:**
- Aparece **un solo** renglón con "Cantidad: 2" (no dos renglones separados).
- Los botones **+ / −** suben y bajan la cantidad; en 0 el renglón se elimina.
- El **+** se deshabilita al llegar al stock disponible de ese talle.
- El subtotal del renglón y el total se calculan como `precio × cantidad`.
- Al pagar, MercadoPago recibe `quantity` con la cantidad correcta.

**Variante:** mismo producto pero **distinto talle** → se crean renglones
separados (es lo esperado, son ítems distintos).

---

## Estados de carga y error (verificación visual)

- **Catálogo cargando:** mientras la home espera los productos de Supabase se ve
  el spinner de `app/loading.tsx` ("Cargando la colección…").
- **Catálogo sin datos:** si no hay productos para mostrar, se ve "No pudimos
  cargar los productos / Recargá la página".
- **Pago procesando:** al tocar "Pagar con MercadoPago" el botón muestra
  "Procesando…" y queda deshabilitado.
- **Pago fallido:** si falla iniciar el pago, aparece un mensaje de error y el
  botón pasa a "Reintentar pago".

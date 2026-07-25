# Seguridad de pagos y rediseño — FINALOOK

Este documento explica, en castellano simple, qué se cambió y por qué.
Está dividido en dos partes: **seguridad de pagos** y **cambios visuales**.

---

# PARTE 1 — SEGURIDAD DE PAGOS

## Lo primero: los datos de la tarjeta nunca pasan por nuestro sitio

Usamos **MercadoPago Checkout Pro**. Eso significa que cuando alguien va a pagar,
MercadoPago lo lleva a *su* página para poner los datos de la tarjeta. Nosotros
nunca vemos, ni recibimos, ni guardamos números de tarjeta.

Por eso **no se creó ningún formulario de tarjeta propio** (y no hay que crearlo
nunca). Todo el trabajo de seguridad que hicimos es para blindar lo que pasa
*alrededor* del pago: que nadie pueda falsear precios, falsear avisos de pago, o
abusar de los formularios.

---

## 1. Recalcular el precio en el servidor (el agujero más grave que había)

### El problema

Cuando el cliente apretaba "Pagar", el navegador le mandaba al servidor la lista
de productos **y también el precio de cada uno**. El servidor le creía ese precio
y armaba la orden de pago en MercadoPago con ese número.

El problema es que cualquiera con conocimientos básicos puede modificar lo que su
navegador envía. Alguien podía mandar:

> "Quiero la Camisa Kala… y sale $1."

Y el sitio le generaba un link de pago de MercadoPago **por $1, real y válido**.
Pagaba $1, MercadoPago confirmaba el pago como aprobado, y el pedido entraba a la
base como pagado. La camisa salía de stock por un peso.

### La solución

Ahora el servidor **ignora completamente** el precio que manda el navegador. Antes
de crear la orden de pago, busca cada producto en la base de datos (Supabase) y
usa el precio real de la base.

También verifica que el producto exista y esté activo. Si alguien manda un
producto inventado o uno dado de baja, el pago no se crea y devuelve un error.

**Archivo:** `app/api/create-preference/route.ts`

**Verificado en la práctica:** se probó mandando a propósito un precio falso de $1
para la Camisa Kala. La orden de pago que se creó en MercadoPago quedó con el
precio real de **$35.000**. El intento de manipulación no tuvo efecto.

Nota: el costo de envío ya se calculaba bien (es una constante del servidor) y el
descuento por cupón ya se revalidaba contra la base. Eso no cambió.

---

## 2. Validar la firma del webhook (que el aviso de pago sea realmente de MercadoPago)

### El problema

Un "webhook" es un aviso automático que MercadoPago le manda a nuestro sitio para
decirle "che, se pagó tal cosa". Ese aviso llega a una dirección pública:
`/api/webhook`. Pública quiere decir que **cualquiera en internet puede mandarle
mensajes**, no sólo MercadoPago.

Antes no había forma de distinguir un aviso real de MercadoPago de uno inventado
por otra persona.

### La solución

MercadoPago firma cada aviso con una clave secreta que sólo conocemos nosotros y
ellos. Esa firma viaja en un encabezado llamado `x-signature`.

Ahora, cuando llega un aviso, el servidor recalcula la firma con la clave secreta
y la compara con la que vino. Si no coincide, **rechaza el aviso** (error 401) y
no procesa nada.

La comparación se hace de forma "timing-safe" (a tiempo constante), una técnica
que evita que alguien pueda ir adivinando la firma de a poco midiendo cuánto
tarda la respuesta.

**Archivos:** `lib/mp-signature.ts` (la lógica) y `app/api/webhook/route.ts` (lo usa)

### ⚠️ IMPORTANTE — falta un paso tuyo para que esto se active

Esta protección necesita una variable nueva llamada **`MP_WEBHOOK_SECRET`**.

**Mientras esa variable no esté cargada, la validación de firma NO se aplica.**
El webhook sigue funcionando y procesando pagos normalmente (para no cortar las
ventas de un día para el otro), pero deja un aviso en los logs diciendo que está
sin validar.

Esta decisión fue a propósito: prefería que el sitio siguiera vendiendo a que
dejara de procesar pagos por una variable sin cargar. **Pero conviene completarlo
pronto**, porque hasta que lo hagas esta protección específica no está activa.

**Cómo activarla:**

1. Entrá a MercadoPago → **Tus integraciones** → tu aplicación → **Webhooks**.
2. Copiá la **"Clave secreta"** que te muestra ahí.
3. En Vercel → tu proyecto → **Settings → Environment Variables**, creá
   `MP_WEBHOOK_SECRET` y pegá esa clave.
4. Hacé **Redeploy**.

(También quedó el espacio para esa variable en tu `.env.local` para desarrollo local.)

---

## 3. Verificar el pago contra MercadoPago antes de darlo por bueno

Esto **ya lo hacía bien el código anterior**, y se mantuvo igual.

Cuando llega un aviso, el sitio no le cree al contenido del aviso. Agarra sólo el
número de pago y le pregunta directamente a la API de MercadoPago: "¿este pago
existe? ¿en qué estado está? ¿por cuánto fue?". Recién con esa respuesta oficial
marca la orden como pagada, descuenta stock y manda el mail.

**Archivo:** `app/api/webhook/route.ts`

---

## 4. Idempotencia (que un aviso repetido no duplique nada)

Esto también **ya estaba bien resuelto** y se mantuvo.

MercadoPago a veces manda el mismo aviso más de una vez (por reintentos o
demoras). Si no se controla, un mismo pago podría generar dos pedidos, descontar
stock dos veces y mandar dos mails.

Hay dos barreras:

1. Antes de guardar, se fija si ese número de pago ya está registrado.
2. La barrera de verdad: la columna `mp_payment_id` en la base tiene una
   restricción **UNIQUE**. Si dos avisos del mismo pago llegan exactamente al
   mismo tiempo, la base deja pasar sólo uno y el otro recibe un error de
   duplicado que el código interpreta como "ya estaba procesado".

El descuento de stock, el conteo del cupón y el envío del mail sólo ocurren
cuando el pedido se insertó por primera vez **y** el pago quedó aprobado.

---

## 5. Rate limiting (frenar el abuso por volumen)

### El problema

Cualquiera podía mandarle miles de pedidos por minuto a los formularios y a la
pantalla de login del panel. Eso permite probar contraseñas por fuerza bruta,
llenar la base de mensajes basura, o simplemente hacer gastar recursos.

### La solución

Se agregó un limitador por dirección IP en los endpoints sensibles:

| Endpoint | Límite por minuto |
|---|---|
| `/api/admin/auth` (login del panel) | 10 |
| `/api/admin/*` (resto del panel) | 60 |
| `/api/create-preference` (crear pago) | 20 |
| `/api/webhook` | 60 |
| `/api/contacto` | 5 |
| `/api/cupon` | 20 |

Si alguien se pasa, recibe un error 429 ("Demasiadas solicitudes") y tiene que
esperar.

**Archivos:** `proxy.ts` y `lib/rate-limit.ts`

**Verificado en la práctica:** se mandaron 6 pedidos seguidos al formulario de
contacto. Los primeros 5 pasaron y el sexto fue rechazado con 429, como
corresponde.

**Detalle técnico:** este limitador guarda las cuentas en la memoria del servidor.
En Vercel, que levanta varias instancias, cada una lleva su propia cuenta, así que
el límite real puede ser algo más alto que el del cuadro. Alcanza de sobra para
frenar abuso obvio. Si algún día hace falta algo más estricto, habría que usar un
servicio externo tipo Redis.

**Nota sobre el nombre del archivo:** se llama `proxy.ts` y no `middleware.ts`
porque esta versión de Next.js (16) renombró esa función. Un `middleware.ts` acá
no funcionaría.

---

## 6. Contraseña del panel: comparación timing-safe

La contraseña del panel de administración se comparaba con un `===` común. Eso
permite, en teoría, ir descubriéndola de a un carácter midiendo cuánto tarda cada
respuesta (porque `===` corta apenas encuentra la primera diferencia).

Ahora se compara a tiempo constante, que siempre tarda lo mismo y no filtra esa
información.

**Archivos:** `lib/admin-auth.ts` y `app/api/admin/auth/route.ts`

---

## 7. HTTPS obligatorio y encabezados de seguridad

Se agregaron encabezados de seguridad a todas las respuestas del sitio:

- **Strict-Transport-Security**: le dice al navegador "con este sitio, siempre
  HTTPS, nunca HTTP". Aunque alguien escriba la dirección sin la "s", el navegador
  la corrige solo.
- **X-Frame-Options: DENY**: impide que otro sitio meta FINALOOK dentro de un
  marco invisible para engañar a la gente (clickjacking).
- **X-Content-Type-Options: nosniff**: impide que el navegador "adivine" tipos de
  archivo, algo que se puede usar para colar código.
- **Referrer-Policy**: limita la información del sitio que se le pasa a terceros
  al navegar hacia afuera.

**Archivo:** `next.config.ts`

---

## Sobre los secretos

Todos los datos sensibles siguen en variables de entorno, nunca escritos en el
código: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_PASSWORD`, `RESEND_API_KEY`.

Recordá la regla: las variables que empiezan con `NEXT_PUBLIC_` viajan al
navegador y las puede leer cualquiera. **Nunca** pongas un secreto ahí.

El listado completo está en `VERCEL_ENV.md`.

---

## Resumen: qué falta de tu lado

1. **Cargar `MP_WEBHOOK_SECRET` en Vercel** (ver el punto 2). Es lo único
   pendiente para que quede todo activo.

---

# PARTE 2 — CAMBIOS VISUALES

## Nueva paleta: cruda y terrosa

El sitio pasó de un tema **oscuro con acento azul denim** a uno **claro, crudo y
terroso**. No se usa blanco puro en ningún lado.

Los colores están definidos como variables en un solo lugar, arriba de
`app/globals.css`. Para cambiar cualquier color del sitio entero (y del panel
admin), se toca ahí y listo:

| Variable | Color | Para qué |
|---|---|---|
| `--crudo` | `#ECE4D6` | fondo base |
| `--tinta` | `#1B1611` | texto y piezas oscuras |
| `--camel` | `#C6AF8E` | neutro cálido: bordes, hover, foco |
| `--acento` | `#8C4A52` | borravino, con cuentagotas |

También quedaron definidos `--peligro`, `--exito` y `--alerta` para los mensajes
de error, éxito y advertencia, para que no haya colores sueltos escritos a mano
por ahí.

El único color que quedó fijo a propósito es el verde del botón de WhatsApp, que
es el color de la marca de WhatsApp.

## Tipografías

- **Cormorant Garamond** para el logo y los títulos (ya se usaba, se mantuvo).
- **Inter** para todo el texto y la interfaz — reemplaza a Jost.

Se cargan con `next/font`, así que no hay pedidos a Google desde el navegador de
quien visita.

**Archivo:** `app/layout.tsx`

## El panel admin quedó igual de coherente

El panel de administración usa exactamente las mismas variables de color y las
mismas tipografías que la tienda. Se revisó pantalla por pantalla (login, tabs,
tablas, formulario de producto) para que todo se lea bien sobre el fondo claro.

## Copy: se sacó la urgencia falsa

Se eliminó el cartel de **"X personas están viendo esto ahora"** que aparecía en
la ficha de cada producto.

Ese número era **inventado**: un número al azar entre 2 y 8 que cambiaba cada 30
segundos. No reflejaba ninguna visita real. Es exactamente el tipo de presión
falsa que pediste sacar, y además es la clase de cosa que, si un cliente la
descubre, le hace desconfiar de todo lo demás.

El resto de los textos ya eran sobrios y descriptivos, así que se dejaron como
estaban.

## Animaciones y accesibilidad

Se mantuvieron todas las animaciones que ya había (aparición al scrollear, brillo
del título, hover de las prendas, transiciones de los paneles).

Se agregó soporte para **`prefers-reduced-motion`**: si alguien tiene activada la
opción de "reducir movimiento" en su sistema (algo que usan personas con vértigo,
migrañas o sensibilidad al movimiento), las animaciones decorativas se apagan.

Importante: no se apaga la funcionalidad, sólo el movimiento. Los paneles, el
carrito y los textos siguen apareciendo y funcionando igual, simplemente sin
animación.

---

# Lo que NO se tocó

Se respetaron todas las reglas de negocio que ya funcionaban:

- **Sigue siendo obligatorio elegir talle antes de agregar al carrito.** Se probó
  en el navegador: al intentar agregar sin talle, los talles parpadean y aparece
  el aviso "Elegí un talle primero", y el carrito no suma nada.
- Carrito, favoritos, cupones, calculadora de envío, reseñas, formulario de
  contacto, buscador, guía de talles, botón de WhatsApp y el diseño responsive:
  todo igual.
- El CRUD del panel admin: igual.
- La integración con MercadoPago, Supabase, Resend, GitHub Actions y Vercel: sin
  cambios en su funcionamiento.

---

# Un tema aparte que apareció en el camino

La página de "gracias por tu compra" le dice al cliente:

> "Te enviamos los detalles del pedido por email."

**Eso hoy no es cierto.** Cuando se aprueba un pago, el sistema manda un mail de
aviso **sólo a la casilla del negocio** (`finalookstudio@gmail.com`). El comprador
no recibe nada.

No lo cambié acá porque es una función nueva, no un tema de seguridad ni de
diseño, y no quería mezclarlo con este trabajo. Pero conviene resolverlo: o se
agrega el mail de confirmación al comprador, o se saca esa frase de la página.
Quedó anotado como tarea aparte.

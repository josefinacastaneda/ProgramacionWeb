-- FINALOOK STUDIO — reservas de prendas sin stock
--
-- Flujo: si una prenda no tiene stock, el cliente puede pagar una seña de
-- $10.000 por MercadoPago para que se la guarden si vuelve a entrar.
-- El reembolso y el aviso de restock los maneja Josefina desde el panel; el
-- sitio sólo registra la reserva y captura el email.

create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete set null,
  -- Guardamos el nombre además del id: si el producto se borra, la reserva
  -- sigue siendo legible en el panel.
  producto_nombre text,
  email text not null,
  monto integer not null default 10000,
  -- pendiente → se creó el link de pago pero todavía no se pagó
  -- pagada     → MercadoPago confirmó el pago
  -- avisada    → ya se le avisó que volvió a entrar
  -- devuelta   → se le devolvió la seña
  estado text not null default 'pendiente',
  mp_payment_id text,
  mp_preference_id text,
  created_at timestamptz not null default now()
);

-- Idempotencia del webhook: un pago no puede generar dos reservas pagadas.
create unique index if not exists reservas_mp_payment_id_key
  on reservas (mp_payment_id) where mp_payment_id is not null;

create index if not exists idx_reservas_estado on reservas(estado);

-- RLS habilitado sin políticas: deniega todo a anon/authenticated. La app
-- entra con service_role, que saltea RLS. Estas filas tienen emails de
-- clientes, así que no pueden quedar expuestas (misma lección que 005).
alter table reservas enable row level security;
revoke all on table reservas from anon, authenticated;

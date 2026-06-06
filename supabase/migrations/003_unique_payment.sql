-- FINALOOK STUDIO — idempotencia del webhook de pagos
-- Evita pedidos duplicados cuando MercadoPago reenvía el webhook del mismo pago.

-- Por las dudas, eliminamos duplicados previos dejando el más antiguo de cada pago.
delete from pedidos p
using pedidos q
where p.mp_payment_id is not null
  and p.mp_payment_id = q.mp_payment_id
  and p.created_at > q.created_at;

create unique index if not exists pedidos_mp_payment_id_key
  on pedidos (mp_payment_id)
  where mp_payment_id is not null;

-- FINALOOK STUDIO — esquema inicial
-- Tablas: productos, pedidos, resenas

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  precio integer not null,
  descripcion text,
  material text,
  badge text,
  imagenes text[] not null default '{}',
  talles text[] not null default '{}',
  stock jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  mp_payment_id text,
  mp_preference_id text,
  estado text,
  total integer,
  comprador_nombre text,
  comprador_email text,
  comprador_telefono text,
  direccion_envio jsonb,
  items jsonb,
  created_at timestamptz not null default now()
);

create table if not exists resenas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete cascade,
  nombre text not null,
  estrellas integer not null check (estrellas between 1 and 5),
  comentario text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resenas_producto on resenas(producto_id);
create index if not exists idx_pedidos_payment on pedidos(mp_payment_id);

-- FINALOOK STUDIO — tabla de cupones de descuento

create table if not exists cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  descuento integer not null,
  usos integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into cupones (codigo, descuento) values
  ('FINALOOK10', 10),
  ('FINALOOK20', 20),
  ('DROP01', 15)
on conflict (codigo) do nothing;

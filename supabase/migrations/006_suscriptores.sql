-- FINALOOK STUDIO — suscriptores del newsletter
--
-- Los emails se cargan desde el popup del sitio (POST /api/suscribirse) y se
-- leen desde el panel admin. Todo pasa por el server con la service_role key.

create table if not exists suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  -- Baja: no borramos la fila, la marcamos. Así, si alguien se da de baja y
  -- vuelve a suscribirse, no perdemos el historial y podemos respetar la baja.
  activo boolean not null default true,
  -- Token para el link de "desuscribirme" de los emails. Es un secreto por
  -- persona: sin él no se puede dar de baja a otro.
  token_baja uuid not null default gen_random_uuid(),
  origen text default 'popup',
  created_at timestamptz not null default now()
);

create index if not exists idx_suscriptores_activo on suscriptores(activo);

-- RLS habilitado y SIN políticas: deniega todo a anon/authenticated. La app
-- entra con service_role, que saltea RLS por diseño. Mismo criterio que el
-- resto de las tablas (ver 005_rls_mensajes.sql).
alter table suscriptores enable row level security;
revoke all on table suscriptores from anon, authenticated;

-- Cupón de bienvenida que entrega el popup. Va acá para que exista sí o sí
-- junto con la tabla: si el popup promete 15% y el cupón no está cargado, el
-- checkout lo rechaza y queda como una promesa incumplida.
insert into cupones (codigo, descuento) values ('BIENVENIDA15', 15)
on conflict (codigo) do nothing;

-- FINALOOK STUDIO — mensajes del formulario de contacto

create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  email text,
  mensaje text,
  leido boolean default false,
  created_at timestamptz default now()
);

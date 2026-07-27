-- FINALOOK STUDIO — asignar cada producto a un drop
--
-- La colección pasa a organizarse por drop en vez de por categoría:
--   '01' → Night Out (mundo noche)
--   '02' → Cruddo    (mundo día)
--
-- La categoría (tops / vestidos / camisas) NO se toca: sigue existiendo como
-- filtro secundario dentro de cada drop, y el menú del nav depende de ella.

alter table productos
  add column if not exists "drop" text not null default '01';

-- Sólo dos drops por ahora. El check evita que un typo en el panel deje un
-- producto fuera de las dos vistas y por lo tanto invisible en la tienda.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'productos_drop_check'
  ) then
    alter table productos
      add constraint productos_drop_check check ("drop" in ('01', '02'));
  end if;
end $$;

create index if not exists idx_productos_drop on productos("drop");

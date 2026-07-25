-- FINALOOK STUDIO — RLS en la tabla `mensajes`
--
-- Problema: `mensajes` se creó en 004 sin habilitar RLS. Como la tabla vive en
-- el schema `public`, PostgREST la expone y el rol `anon` tenía permiso de
-- lectura, modificación y borrado. La anon key viaja en el bundle del navegador
-- (es NEXT_PUBLIC_), así que cualquiera podía leer los mensajes de contacto
-- —con nombre, email y texto— o borrarlos todos.
--
-- Solución: habilitar RLS SIN políticas. Eso deniega todo a `anon` y
-- `authenticated`. La app no se ve afectada porque el formulario de contacto y
-- el panel admin escriben/leen desde el server con la service_role key, que
-- por diseño saltea RLS.
--
-- Mismo criterio que ya tienen productos, pedidos, resenas y cupones.

alter table mensajes enable row level security;

-- Defensa en profundidad: aunque RLS ya alcanza, sacamos también los permisos
-- de tabla al rol público. Si algún día se agrega una política permisiva por
-- error, esto sigue frenando el acceso anónimo.
revoke all on table mensajes from anon, authenticated;

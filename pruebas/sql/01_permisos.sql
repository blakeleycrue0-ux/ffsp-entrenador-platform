-- Supabase concede acceso de tabla a `anon` y `authenticated` en todo
-- `public`, y deja que quien filtre de verdad sea RLS. Sin esto, el primer
-- SELECT de un tutor muere en «permission denied» y nunca se llega a probar
-- la política, que es lo que se quería probar.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

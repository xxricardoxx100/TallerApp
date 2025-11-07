-- =============================================================
-- RLS Policies for table: public.vehicles
-- Tabla esperada:
--   create table public.vehicles (
--     id text primary key,
--     data jsonb not null default '{}'::jsonb,
--     inserted_at timestamptz default now(),
--     updated_at timestamptz default now()
--   );
-- (Las columnas de timestamps son opcionales; ajusta según tu definición.)
-- =============================================================

-- 1. Activar Row Level Security en la tabla (solo se hace una vez)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
-- Opcional (obliga siempre RLS incluso a roles superuser en este contexto gestionado por la plataforma)
-- ALTER TABLE public.vehicles FORCE ROW LEVEL SECURITY;

-- 2. Políticas abiertas (para entorno de desarrollo). Permiten a role anon
--    hacer SELECT / INSERT / UPDATE / DELETE sobre cualquier fila.
--    No usar en producción sin autenticación.

-- Limpieza previa (ignora errores si no existían)
DROP POLICY IF EXISTS allow_select_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_insert_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_update_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_delete_anon ON public.vehicles;

-- SELECT: cualquier fila
CREATE POLICY allow_select_anon
	ON public.vehicles
	FOR SELECT
	TO anon
	USING ( true );

-- INSERT: permitir insertar cualquier fila
CREATE POLICY allow_insert_anon
	ON public.vehicles
	FOR INSERT
	TO anon
	WITH CHECK ( true );

-- UPDATE: permitir actualizar cualquier fila
CREATE POLICY allow_update_anon
	ON public.vehicles
	FOR UPDATE
	TO anon
	USING ( true )
	WITH CHECK ( true );

-- DELETE: permitir borrar cualquier fila
CREATE POLICY allow_delete_anon
	ON public.vehicles
	FOR DELETE
	TO anon
	USING ( true );

-- 3. Verificación rápida (ejecutar en el SQL editor de Supabase después de crear políticas)
--    Lista las políticas aplicadas
--    select policyname, roles, cmd, qual, with_check from pg_policies where tablename = 'vehicles';
--    Verifica RLS está activo
--    select relrowsecurity, relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname='vehicles' and n.nspname='public';

-- =============================================================
-- NOTAS PARA PRODUCCIÓN (no ejecutar ahora):
-- Reemplazar estas políticas abiertas por versiones que limiten acceso a usuarios autenticados:
--   1. Habilitar Auth (Supabase Auth) y relacionar cada fila con auth.uid().
--   2. Políticas ejemplo seguras:
--      CREATE POLICY sel_own ON public.vehicles FOR SELECT TO authenticated USING ( (data->>'user_id')::uuid = auth.uid() );
--      CREATE POLICY ins_own ON public.vehicles FOR INSERT TO authenticated WITH CHECK ( (data->>'user_id')::uuid = auth.uid() );
-- =============================================================

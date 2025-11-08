-- Script para verificar y corregir políticas RLS
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar estado actual de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'vehicles';

-- 2. Ver políticas actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'vehicles';

-- 3. Si no hay políticas o RLS no está activado, ejecutar lo siguiente:

-- Activar RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS allow_select_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_insert_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_update_anon ON public.vehicles;
DROP POLICY IF EXISTS allow_delete_anon ON public.vehicles;

-- Crear políticas permisivas para desarrollo
CREATE POLICY allow_select_anon ON public.vehicles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY allow_insert_anon ON public.vehicles
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY allow_update_anon ON public.vehicles
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY allow_delete_anon ON public.vehicles
  FOR DELETE TO anon, authenticated
  USING (true);

-- 4. Verificar que las políticas se crearon correctamente
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'vehicles';

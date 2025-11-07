-- =============================================================
-- RLS Policies for Supabase Storage (table: storage.objects)
-- Bucket objetivo: CaltimerApp
-- Permite a rol anon subir/actualizar/borrar sólo objetos dentro del prefijo vehicles/
-- y lectura para todos. Adecuado para desarrollo; ajusta en producción.
-- =============================================================

-- Nota: Asegúrate de que el bucket "CaltimerApp" existe y, si quieres URLs públicas,
-- márcalo como Public en el panel de Storage.

-- Limpieza previa
DROP POLICY IF EXISTS caltimer_read_public ON storage.objects;
DROP POLICY IF EXISTS caltimer_insert_anon ON storage.objects;
DROP POLICY IF EXISTS caltimer_update_anon ON storage.objects;
DROP POLICY IF EXISTS caltimer_delete_anon ON storage.objects;

-- Lectura pública de objetos del bucket CaltimerApp (cubre list/render)
CREATE POLICY caltimer_read_public
  ON storage.objects
  FOR SELECT
  TO public
  USING ( bucket_id = 'CaltimerApp' );

-- Insertar sólo dentro de vehicles/* en el bucket CaltimerApp
CREATE POLICY caltimer_insert_anon
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'CaltimerApp'
    AND (name LIKE 'vehicles/%')
  );

-- Actualizar (para upsert) sólo dentro de vehicles/* en el bucket CaltimerApp
CREATE POLICY caltimer_update_anon
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (
    bucket_id = 'CaltimerApp'
    AND (name LIKE 'vehicles/%')
  )
  WITH CHECK (
    bucket_id = 'CaltimerApp'
    AND (name LIKE 'vehicles/%')
  );

-- (Opcional) Borrar objetos dentro de vehicles/*
CREATE POLICY caltimer_delete_anon
  ON storage.objects
  FOR DELETE
  TO anon
  USING (
    bucket_id = 'CaltimerApp'
    AND (name LIKE 'vehicles/%')
  );

-- Verificación sugerida
-- select policyname, roles, cmd from pg_policies where schemaname='storage' and tablename='objects';
-- select count(*) from storage.objects where bucket_id='CaltimerApp';

-- =============================================================
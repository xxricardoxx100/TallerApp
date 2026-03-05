-- =============================================================
-- Migración: agregar ubicación a attendance_events
-- Ejecuta esto si la tabla ya existe.
-- =============================================================

ALTER TABLE IF EXISTS public.attendance_events
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_error TEXT;

-- Opcional: índice simple si luego filtras por ubicación/fecha
-- CREATE INDEX IF NOT EXISTS idx_attendance_location_date ON public.attendance_events(local_date);

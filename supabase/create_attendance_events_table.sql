-- =============================================================
-- Tabla: public.attendance_events
-- Registro de ingreso/salida de personal
-- NOTA: En este proyecto se usa key anon sin Supabase Auth;
-- las políticas aquí son permisivas para desarrollo.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.attendance_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('IN', 'OUT')),
  local_date DATE NOT NULL,
  event_time TIMESTAMPTZ NOT NULL,
  created_by TEXT,
  note TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  location_captured_at TIMESTAMPTZ,
  location_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_local_date ON public.attendance_events(local_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_events(user_id, local_date);

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

-- Limpieza previa
DROP POLICY IF EXISTS allow_select_anon_attendance ON public.attendance_events;
DROP POLICY IF EXISTS allow_insert_anon_attendance ON public.attendance_events;
DROP POLICY IF EXISTS allow_update_anon_attendance ON public.attendance_events;
DROP POLICY IF EXISTS allow_delete_anon_attendance ON public.attendance_events;

-- Políticas abiertas (DEV)
CREATE POLICY allow_select_anon_attendance
  ON public.attendance_events
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY allow_insert_anon_attendance
  ON public.attendance_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY allow_update_anon_attendance
  ON public.attendance_events
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY allow_delete_anon_attendance
  ON public.attendance_events
  FOR DELETE
  TO anon
  USING (true);

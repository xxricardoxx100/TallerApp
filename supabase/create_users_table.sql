-- Crear tabla de usuarios para mecánicos
-- El usuario admin se mantiene en el código por seguridad

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mechanic',
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo (ajustar en producción)
CREATE POLICY "allow_select_users" ON users FOR SELECT USING (true);
CREATE POLICY "allow_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_users" ON users FOR UPDATE USING (true);
CREATE POLICY "allow_delete_users" ON users FOR DELETE USING (true);

-- Índice para búsquedas rápidas por username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

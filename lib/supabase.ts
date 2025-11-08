/**
 * Cliente de Supabase singleton compartido
 * Esta es la ÚNICA instancia que debe usarse en toda la aplicación
 * para evitar el warning de múltiples GoTrueClient
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Obtiene o crea la instancia única del cliente de Supabase
 * IMPORTANTE: Usar SOLO esta función en toda la app
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Accept': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    });
  }

  return supabaseInstance;
}

/**
 * Verifica si Supabase está configurado
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey);
}

// Exportar la instancia singleton directamente también
export const supabase = getSupabaseClient();
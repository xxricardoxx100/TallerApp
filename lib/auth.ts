/**
 * Sistema de autenticación con Supabase
 * - Usuario admin: hardcodeado por seguridad
 * - Mecánicos: almacenados en Supabase, gestionables por admin
 */

import { supabase } from './supabase';

export type UserRole = 'admin' | 'mechanic';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  active?: boolean;
  created_at?: string;
  created_by?: string;
}

// Usuario admin hardcodeado (no puede ser modificado)
const ADMIN_USER: User = {
  id: 'admin-1',
  username: 'admin',
  password: 'admin2025',
  role: 'admin',
  name: 'Administrador',
  active: true
};

const SESSION_KEY = 'taller_session';

export interface Session {
  userId: string;
  username: string;
  role: UserRole;
  name: string;
  loginTime: string;
}

/**
 * Intenta autenticar un usuario con username y password
 */
export async function login(username: string, password: string): Promise<Session | null> {
  // Verificar si es el usuario admin
  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    const session: Session = {
      userId: ADMIN_USER.id,
      username: ADMIN_USER.username,
      role: ADMIN_USER.role,
      name: ADMIN_USER.name,
      loginTime: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return session;
  }

  // Buscar en Supabase para mecánicos
  if (!supabase) {
    console.error('Supabase no está configurado');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('active', true)
      .single();

    if (error || !data) {
      return null;
    }

    const session: Session = {
      userId: data.id,
      username: data.username,
      role: data.role as UserRole,
      name: data.name,
      loginTime: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return session;
  } catch (error) {
    console.error('Error en login:', error);
    return null;
  }
}

/**
 * Cierra la sesión actual
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Obtiene la sesión actual desde localStorage
 */
export function getCurrentSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) {
    return null;
  }

  try {
    return JSON.parse(sessionData) as Session;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Verifica si el usuario actual tiene rol de admin
 */
export function isAdmin(session: Session | null): boolean {
  return session?.role === 'admin';
}

/**
 * Verifica si el usuario actual tiene rol de mechanic
 */
export function isMechanic(session: Session | null): boolean {
  return session?.role === 'mechanic';
}

/**
 * Obtiene todos los usuarios activos (solo para admin)
 */
export async function getAllUsers(): Promise<User[]> {
  if (!supabase) {
    return [ADMIN_USER];
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo usuarios:', error);
      return [ADMIN_USER];
    }

    // Retornar admin + mecánicos, sin exponer passwords
    return [
      { ...ADMIN_USER, password: '***' },
      ...(data || []).map((u: User) => ({
        ...u,
        password: '***'
      }))
    ];
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [ADMIN_USER];
  }
}

/**
 * Crea un nuevo usuario mecánico (solo para admin)
 */
export async function createMechanic(
  username: string,
  password: string,
  name: string,
  createdBy: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }

  // Validaciones
  if (!username || username.length < 3) {
    return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  if (!name || name.length < 3) {
    return { success: false, error: 'El nombre debe tener al menos 3 caracteres' };
  }

  // Verificar que no sea el username del admin
  if (username.toLowerCase() === 'admin') {
    return { success: false, error: 'No se puede usar ese nombre de usuario' };
  }

  try {
    // Verificar si el username ya existe
    const { data: existing } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'El nombre de usuario ya existe' };
    }

    // Crear el usuario
    const newUser: Omit<User, 'id'> = {
      username: username.toLowerCase().trim(),
      password: password,
      name: name.trim(),
      role: 'mechanic',
      active: true,
      created_by: createdBy,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: `user-${Date.now()}`,
        ...newUser
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creando usuario:', error);
      return { success: false, error: 'Error al crear el usuario' };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('Error creando usuario:', error);
    return { success: false, error: 'Error al crear el usuario' };
  }
}

/**
 * Desactiva un usuario mecánico (solo para admin)
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }

  // No permitir desactivar al admin
  if (userId === ADMIN_USER.id) {
    return { success: false, error: 'No se puede desactivar al administrador' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ active: false })
      .eq('id', userId);

    if (error) {
      console.error('Error desactivando usuario:', error);
      return { success: false, error: 'Error al desactivar el usuario' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    return { success: false, error: 'Error al desactivar el usuario' };
  }
}

/**
 * Agrega un nuevo usuario (deprecated - usar createMechanic)
 * @deprecated Usar createMechanic en su lugar
 */
export function addUser(user: Omit<User, 'id'>): User {
  console.warn('addUser está deprecated, usar createMechanic');
  const newUser: User = {
    ...user,
    id: `user-${Date.now()}`
  };
  return newUser;
}

import { useState, useEffect } from 'react';
import { Session, getCurrentSession, login as authLogin, logout as authLogout } from '../lib/auth';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión al montar el componente
  useEffect(() => {
    const currentSession = getCurrentSession();
    setSession(currentSession);
    setLoading(false);
  }, []);

  /**
   * Intenta hacer login con username y password
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    const newSession = await authLogin(username, password);
    if (newSession) {
      setSession(newSession);
      return true;
    }
    return false;
  };

  /**
   * Cierra la sesión actual
   */
  const logout = () => {
    authLogout();
    setSession(null);
  };

  /**
   * Verifica si el usuario actual es admin
   */
  const isAdmin = session?.role === 'admin';

  /**
   * Verifica si el usuario actual es mecánico
   */
  const isMechanic = session?.role === 'mechanic';

  /**
   * Verifica si hay una sesión activa
   */
  const isAuthenticated = session !== null;

  return {
    session,
    loading,
    login,
    logout,
    isAdmin,
    isMechanic,
    isAuthenticated
  };
}

import { useState, useEffect } from 'react';

/**
 * Hook para detectar si hay conexión a internet
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Inicializar con el estado actual
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📡 Sin conexión');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

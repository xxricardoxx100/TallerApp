"use client";
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      // En desarrollo: desregistrar SWs previos y limpiar caches.
      // Esto evita errores por assets viejos cacheados (muy común en PWAs).
      if (process.env.NODE_ENV !== 'production') {
        void (async () => {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));

            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch (err) {
            console.warn('SW cleanup failed (dev)', err);
          }
        })();
        return;
      }

      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('SW registration failed', err));
    }
  }, []);
  return null;
}

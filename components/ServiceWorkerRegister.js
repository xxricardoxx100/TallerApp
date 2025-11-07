"use client";
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.warn('SW registration failed', err));
      }
    }
  }, []);
  return null;
}

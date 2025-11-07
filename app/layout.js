import { Inter } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegister from '../components/ServiceWorkerRegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Taller Mecánico',
  description: 'Aplicación para gestión de taller mecánico',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
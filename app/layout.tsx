import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CRM Chapultepec',
  description: 'Pipeline de ventas — Penthouse Parque Chapultepec',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ backgroundColor: '#f8fafc', color: '#1e293b', minHeight: '100vh', margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '18px' }}>
        {children}
      </body>
    </html>
  )
}

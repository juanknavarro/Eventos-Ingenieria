import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://eventos.ingenieriadigital.cloud'),
  title: {
    default: 'Gestión de Eventos | Facultad de Ingenierías',
    template: '%s | Eventos Facultad de Ingenierías',
  },
  description:
    'Plataforma oficial de gestión de eventos, inscripciones, bonificaciones académicas y control de asistencia de la Facultad de Ciencias e Ingenierías.',
  openGraph: {
    title: 'Gestión de Eventos | Facultad de Ingenierías',
    description:
      'Plataforma oficial de gestión de eventos, inscripciones, bonificaciones académicas y control de asistencia de la Facultad de Ciencias e Ingenierías.',
    url: 'https://eventos.ingenieriadigital.cloud',
    siteName: 'Eventos Facultad de Ingenierías',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Eventos Facultad de Ingenierías',
      },
    ],
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestión de Eventos | Facultad de Ingenierías',
    description:
      'Plataforma oficial de gestión de eventos, inscripciones, bonificaciones académicas y control de asistencia de la Facultad de Ciencias e Ingenierías.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col font-sans">
        {children}
      </body>
    </html>
  )
}

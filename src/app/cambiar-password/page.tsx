import React from 'react'
import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth/session'
import FormularioCambioPasswordCliente from '@/components/auth/FormularioCambioPasswordCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import Link from 'next/link'
import { ShieldCheck, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CambiarPasswordPage() {
  const session = await getAuthSession()

  // Protección: Si no hay sesión válida, al login
  if (!session) {
    redirect('/login?error=no_autenticado')
  }

  // Si ya no debe cambiar contraseña, redirigir a su panel correspondiente
  if (!session.debeCambiarPassword) {
    if (session.rol === 'SUPER_ADMIN' || session.rol === 'ADMIN') {
      redirect('/admin')
    } else if (session.rol === 'PROFESOR') {
      redirect('/profesor')
    } else if (session.rol === 'STAFF') {
      redirect('/staff/asistencia')
    } else {
      redirect('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/50 flex flex-col justify-between">
      {/* Barra de navegación superior institucional */}
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0B305B] text-white rounded-xl shadow-xs border-t-2 border-[#D2202E]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#D2202E] uppercase tracking-wider block">
                Universidad del Sinú &bull; Seccional Montería
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#0B305B]">
                Facultad de Ciencias e Ingenierías
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BotonCerrarSesion />
          </div>
        </div>
      </header>

      {/* Contenido principal centrado */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <FormularioCambioPasswordCliente
          nombreUsuario={session.nombre}
          emailUsuario={session.email}
          rolUsuario={session.rol}
        />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/60 backdrop-blur-xs">
        Plataforma Oficial de Gestión Académica &bull; Universidad del Sinú &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}


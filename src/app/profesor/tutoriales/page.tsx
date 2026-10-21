import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthSession } from '@/lib/auth/session'
import { RolUsuario } from '@prisma/client'
import { obtenerTutoriales } from '@/actions/tutoriales'
import VisorTutorialesCliente from '@/components/tutoriales/VisorTutorialesCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import { ArrowLeft, GraduationCap, Video } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfesorTutorialesPage() {
  const session = await getAuthSession()

  // Barrera Server-Side: Profesores, Admins o SuperAdmins
  if (
    !session ||
    (session.rol !== RolUsuario.PROFESOR &&
      session.rol !== RolUsuario.ADMIN &&
      session.rol !== RolUsuario.SUPER_ADMIN)
  ) {
    redirect('/login?error=acceso_denegado_profesor')
  }

  // Cargar tutoriales activos
  const res = await obtenerTutoriales()
  const tutoriales = res.success && res.data ? res.data : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/40 pb-16">
      {/* Header del Panel Docente Unisinú */}
      <header className="border-b-2 border-[#D2202E]/30 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/profesor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0B305B] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Panel Docente
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0B305B] text-white rounded-xl shadow-xs border-t-2 border-[#D2202E]">
                <Video className="w-5 h-5 text-[#D2202E]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    Universidad del Sinú
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#0B305B] leading-tight">
                  Centro de Ayuda, Guías y Tutoriales para Docentes
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {session && (
              <div className="flex items-center gap-2 bg-[#F0F4F9] pl-3 pr-1.5 py-1 rounded-xl border border-[#C2D3E7] text-xs">
                <div className="text-left">
                  <span className="font-bold text-[#0B305B] block truncate max-w-[120px]">
                    {session.nombre}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    {session.rol}
                  </span>
                </div>
                <BotonCerrarSesion />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VisorTutorialesCliente
          tutoriales={tutoriales}
          tituloModulo="Guías y Tutoriales para el Cuerpo Docente"
          descripcionModulo="Encuentra el paso a paso para validar comprobantes de transferencia, registrar recaudos en efectivo y gestionar a los inscritos en tus asignaturas."
          esDocente={true}
        />
      </main>
    </div>
  )
}


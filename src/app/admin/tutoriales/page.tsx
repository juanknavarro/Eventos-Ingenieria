import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthSession } from '@/lib/auth/session'
import { esAdminOSuperior, esSuperAdmin } from '@/lib/auth/multitenancy'
import { obtenerTutoriales } from '@/actions/tutoriales'
import GestionTutorialesCliente from '@/components/tutoriales/GestionTutorialesCliente'
import VisorTutorialesCliente from '@/components/tutoriales/VisorTutorialesCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import { ShieldCheck, ArrowLeft, GraduationCap, Video } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminTutorialesPage() {
  const session = await getAuthSession()

  // Barrera Server-Side Zero-Trust: Solo personal administrativo
  if (!session || !esAdminOSuperior(session)) {
    redirect('/login?error=acceso_denegado_admin')
  }

  // Cargar tutoriales según rol
  const res = await obtenerTutoriales()
  const tutoriales = res.success && res.data ? res.data : []

  const esSuper = esSuperAdmin(session)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Institucional Corporativo */}
      <header className="bg-[#0B305B] text-white border-b-4 border-[#D2202E] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Video className="w-5 h-5 text-[#D2202E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-[#D2202E] bg-white px-2 py-0.5 rounded">
                  UNISINÚ
                </span>
                <span className="text-[10px] tracking-wider text-slate-300 font-bold uppercase">
                  {esSuper ? 'Gestión Central de Tutoriales' : 'Centro de Ayuda y Guías'}
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {esSuper
                  ? 'Administración y Publicación de Tutoriales'
                  : 'Manuales y Videos Explicativos de la Plataforma'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Panel</span>
            </Link>

            <div className="flex items-center gap-2 bg-white/10 pl-3 pr-1.5 py-1 rounded-xl border border-white/15 text-xs text-white">
              <div className="text-left">
                <span className="font-bold text-white block truncate max-w-[120px]">
                  {session.nombre}
                </span>
                <span className="text-[9px] font-extrabold text-[#D2202E] uppercase">
                  {session.rol}
                </span>
              </div>
              <BotonCerrarSesion />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {esSuper ? (
          <GestionTutorialesCliente tutorialesIniciales={tutoriales} />
        ) : (
          <VisorTutorialesCliente
            tutoriales={tutoriales}
            tituloModulo="Centro de Guías para Administradores de Carrera"
            descripcionModulo="Consulta los instructivos para gestionar eventos, coordinar con profesores y supervisar los reportes de tu programa académico."
          />
        )}
      </main>
    </div>
  )
}


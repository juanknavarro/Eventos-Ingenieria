import prisma from '@/lib/prisma'
import PanelProfesorCliente from '@/components/profesor/PanelProfesorCliente'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, ShieldCheck, ScanBarcode } from 'lucide-react'
import { RolUsuario } from '@prisma/client'
import { getAuthSession } from '@/lib/auth/session'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'

import { redirect } from 'next/navigation'
import {
  esSuperAdmin,
  filtroEventosPorTenancy,
  filtroInscripcionesPorTenancy,
} from '@/lib/auth/multitenancy'

export const dynamic = 'force-dynamic'

export default async function ProfesorAdminPage() {
  const sesion = await getAuthSession()
  if (
    !sesion ||
    (sesion.rol !== RolUsuario.PROFESOR &&
      sesion.rol !== RolUsuario.ADMIN &&
      sesion.rol !== RolUsuario.SUPER_ADMIN)
  ) {
    redirect('/login?error=acceso_denegado_profesor')
  }

  const filtroEventos = filtroEventosPorTenancy(sesion)
  const filtroInscripciones = filtroInscripcionesPorTenancy(sesion)
  const filtroProfesores =
    sesion.rol === RolUsuario.SUPER_ADMIN || !sesion.carrera
      ? { rol: RolUsuario.PROFESOR }
      : {
          rol: RolUsuario.PROFESOR,
          carrera: { contains: sesion.carrera, mode: 'insensitive' as const },
        }

  const [profesores, eventos, inscripcionesRaw] = await Promise.all([
    // Consultar profesores del sistema filtrados por programa
    prisma.usuario.findMany({
      where: filtroProfesores,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        carrera: true,
      },
      orderBy: { nombre: 'asc' },
    }),
    // Consultar eventos filtrados por programa
    prisma.evento.findMany({
      where: filtroEventos,
      select: {
        id: true,
        titulo: true,
        precio: true,
        fechaInicio: true,
      },
      orderBy: { fechaInicio: 'asc' },
    }),
    // Consultar inscripciones con aislamiento Multi-Tenancy
    prisma.inscripcion.findMany({
      where: filtroInscripciones,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            codigoEstudiantil: true,
            carrera: true,
          },
        },
        evento: {
          select: {
            id: true,
            titulo: true,
            precio: true,
            fechaInicio: true,
          },
        },
      },
      orderBy: { fechaInscripcion: 'desc' },
    }),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200/40">
      {/* Header del Panel Docente Unisinú */}
      <header className="border-b-2 border-[#D2202E]/30 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0B305B] bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Portal
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0B305B] text-white rounded-xl shadow-sm border-t-2 border-[#D2202E]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    Universidad del Sinú
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-[#0B305B] leading-tight">
                  Panel Docente &bull; Gestión de Preinscripciones y Recaudo
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {sesion?.rol === 'ADMIN' && (
              <>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] shadow-sm transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Panel Maestro (/admin)
                </Link>

                <Link
                  href="/staff/asistencia"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] shadow-sm transition"
                >
                  <ScanBarcode className="w-3.5 h-3.5" />
                  Modo Staff
                </Link>
              </>
            )}

            {sesion && (
              <div className="flex items-center gap-2 bg-[#F0F4F9] pl-3 pr-1.5 py-1 rounded-xl border border-[#C2D3E7] text-xs">
                <div className="text-left">
                  <span className="font-bold text-[#0B305B] block truncate max-w-[120px]">
                    {sesion.nombre}
                  </span>
                  <span className="text-[10px] font-extrabold text-[#D2202E] uppercase">
                    {sesion.rol}
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
        <PanelProfesorCliente
          profesores={profesores}
          eventos={eventos}
          inscripcionesIniciales={inscripcionesRaw}
        />
      </main>
    </div>
  )
}


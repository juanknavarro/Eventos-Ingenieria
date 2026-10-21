import React from 'react'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import PanelAdminCliente from '@/components/admin/PanelAdminCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import Link from 'next/link'
import {
  ShieldCheck,
  GraduationCap,
  Award,
  ExternalLink,
  Building2,
  HelpCircle,
} from 'lucide-react'

import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'
import {
  esSuperAdmin,
  esAdminOSuperior,
  filtroEventosPorTenancy,
  filtroUsuariosPorTenancy,
  filtroInscripcionesPorTenancy,
} from '@/lib/auth/multitenancy'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getAuthSession()

  // Protección del lado del servidor: Estrictamente para SUPER_ADMIN o ADMIN de Programa
  if (!session || !esAdminOSuperior(session)) {
    redirect('/login?error=acceso_denegado_admin')
  }

  const filtroEventos = filtroEventosPorTenancy(session)
  const filtroUsuarios = filtroUsuariosPorTenancy(session)
  const filtroInscripciones = filtroInscripcionesPorTenancy(session)

  // Cargar datos del sistema con aislamiento Multi-Tenancy y Programas oficiales
  const [eventos, usuarios, inscripcionesRaw, pagosCompletados, configPlantillas, programas] = await Promise.all([
    prisma.evento.findMany({
      where: filtroEventos,
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: {
          select: { inscripciones: true },
        },
        programas: {
          select: { id: true, nombre: true },
        },
      },
    }),
    prisma.usuario.findMany({
      where: filtroUsuarios,
      orderBy: { nombre: 'asc' },
      include: {
        eventoAsignado: {
          select: {
            id: true,
            titulo: true,
            fechaFin: true,
          },
        },
      },
    }),
    prisma.inscripcion.findMany({
      where: filtroInscripciones,
      select: {
        id: true,
        eventoId: true,
        usuarioId: true,
        estado_pago: true,
        montoPagado: true,
        usuario: {
          select: {
            carrera: true,
            programaId: true,
          },
        },
        evento: {
          select: {
            programa_academico: true,
            programas: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    }),
    prisma.inscripcion.aggregate({
      where: {
        ...filtroInscripciones,
        estado_pago: 'PAGADO',
      },
      _sum: { montoPagado: true },
    }),
    obtenerConfiguracionPlantillas(),
    prisma.programa.findMany({
      where: { estado_activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    }),
  ])

  const totalInscripciones = inscripcionesRaw.length
  const totalRecaudado = pagosCompletados._sum.montoPagado || 0

  const inscripcionesMapeadas = inscripcionesRaw.map((i) => ({
    id: i.id,
    eventoId: i.eventoId,
    usuarioId: i.usuarioId,
    estado_pago: i.estado_pago,
    montoPagado: i.montoPagado,
    carreraUsuario: i.usuario?.carrera || null,
    programaEvento: i.evento?.programa_academico || null,
  }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Institucional Corporativo */}
      <header className="bg-[#0B305B] text-white border-b-4 border-[#D2202E] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col xl:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#D2202E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#D2202E] text-white uppercase tracking-wider">
                  Panel Maestro
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  Universidad del Sinú
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                Administración General &bull; Facultad de Ingenierías
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between xl:justify-end gap-2 w-full xl:w-auto overflow-x-auto py-0.5 flex-nowrap scrollbar-none">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
              {esSuperAdmin(session) && (
                <Link
                  href="/admin/programas"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#D2202E] hover:bg-[#B01824] text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Gestionar Programas</span>
                </Link>
              )}

              <Link
                href="/admin/tutoriales"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#D2202E]/80 hover:bg-[#D2202E] text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Tutoriales / Ayuda</span>
              </Link>

              <Link
                href="/profesor"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
                <span>Gestión Docente (Pagos)</span>
              </Link>

              <Link
                href="/staff/asistencia"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Award className="w-3.5 h-3.5 text-emerald-300" />
                <span>Control en Puerta</span>
              </Link>

              <Link
                href="/certificados"
                target="_blank"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Certificados</span>
              </Link>
            </div>

            <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/20 ml-1">
              <BotonCerrarSesion className="text-white/80 hover:text-white hover:bg-white/10 whitespace-nowrap shrink-0" />
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Panel Interactivo Cliente con Selector Global 'Vista de Programa', KPIs y Pestañas */}
        <PanelAdminCliente
          eventos={eventos}
          usuarios={usuarios}
          configPlantillas={configPlantillas}
          adminActual={{
            nombre: session.nombre,
            email: session.email,
            rol: session.rol,
            carrera: session.carrera,
          }}
          programas={programas}
          inscripciones={inscripcionesMapeadas}
          totalInscripcionesInicial={totalInscripciones}
          totalRecaudadoInicial={totalRecaudado}
        />
      </main>
    </div>
  )
}

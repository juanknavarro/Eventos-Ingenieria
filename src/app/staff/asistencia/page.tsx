import prisma from '@/lib/prisma'
import ControlAsistenciaCliente from '@/components/staff/ControlAsistenciaCliente'
import Link from 'next/link'
import { ArrowLeft, ScanBarcode, ShieldCheck } from 'lucide-react'
import { RolUsuario } from '@prisma/client'
import { getAuthSession } from '@/lib/auth/session'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'

import { redirect } from 'next/navigation'
import {
  esSuperAdmin,
  filtroEventosPorTenancy,
} from '@/lib/auth/multitenancy'

export const dynamic = 'force-dynamic'

export default async function ControlAsistenciaStaffPage() {
  const sesion = await getAuthSession()
  if (
    !sesion ||
    (sesion.rol !== RolUsuario.STAFF &&
      sesion.rol !== RolUsuario.ADMIN &&
      sesion.rol !== RolUsuario.SUPER_ADMIN &&
      sesion.rol !== RolUsuario.PROFESOR)
  ) {
    redirect('/login?error=acceso_denegado_staff')
  }

  const filtroEventos = filtroEventosPorTenancy(sesion)
  const filtroStaff =
    sesion.rol === RolUsuario.SUPER_ADMIN || !sesion.carrera
      ? {
          rol: {
            in: [RolUsuario.STAFF, RolUsuario.ADMIN, RolUsuario.PROFESOR],
          },
        }
      : {
          rol: {
            in: [RolUsuario.STAFF, RolUsuario.ADMIN, RolUsuario.PROFESOR],
          },
          carrera: { contains: sesion.carrera, mode: 'insensitive' as const },
        }

  const filtroAsistencias =
    sesion.rol === RolUsuario.SUPER_ADMIN || !sesion.carrera
      ? {}
      : {
          OR: [
            {
              inscripcion: {
                usuario: {
                  carrera: { contains: sesion.carrera, mode: 'insensitive' as const },
                },
              },
            },
            {
              inscripcion: {
                evento: { programa_academico: sesion.carrera },
              },
            },
          ],
        }

  const [staffList, eventos, asistenciasRaw] = await Promise.all([
    // Consultar usuarios con rol STAFF o ADMIN filtrados por programa
    prisma.usuario.findMany({
      where: filtroStaff,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        carrera: true,
      },
      orderBy: { nombre: 'asc' },
    }),
    // Consultar eventos activos filtrados por programa
    prisma.evento.findMany({
      where: filtroEventos,
      select: {
        id: true,
        titulo: true,
        precio: true,
        ubicacion: true,
        capacidadMaxima: true,
        _count: {
          select: { inscripciones: true },
        },
      },
      orderBy: { fechaInicio: 'asc' },
    }),
    // Consultar asistencias recientes con aislamiento
    prisma.asistencia.findMany({
      where: filtroAsistencias,
      include: {
        inscripcion: {
          include: {
            usuario: {
              select: {
                nombre: true,
                codigoEstudiantil: true,
                carrera: true,
              },
            },
            evento: {
              select: {
                titulo: true,
              },
            },
          },
        },
        registradoPor: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { fechaHoraRegistro: 'desc' },
      take: 50,
    }),
    getAuthSession(),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061930] via-[#0B305B] to-[#041121] text-slate-100">
      {/* Header del Módulo de Asistencia Unisinú */}
      <header className="border-b-2 border-[#D2202E]/40 bg-[#0B305B]/90 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/15"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Portal
            </Link>

            <div className="h-6 w-px bg-white/20 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#D2202E] text-white rounded-xl shadow-lg shadow-[#D2202E]/30">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-[#F6CDD1] uppercase">
                    Universidad del Sinú
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                  Control de Asistencia &bull; Puerta de Acceso (STAFF)
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {sesion?.rol === 'ADMIN' && (
              <Link
                href="/profesor"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] shadow-sm transition"
              >
                Panel Docente
              </Link>
            )}

            {sesion && (
              <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-700 text-xs">
                <div className="text-left">
                  <span className="font-bold text-white block truncate max-w-[120px]">
                    {sesion.nombre}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
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
        <ControlAsistenciaCliente
          eventos={eventos}
          staffList={staffList}
          historialInicial={asistenciasRaw}
        />
      </main>
    </div>
  )
}


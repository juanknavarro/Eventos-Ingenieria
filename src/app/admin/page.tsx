import React from 'react'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import PanelAdminCliente from '@/components/admin/PanelAdminCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import Link from 'next/link'
import {
  ShieldCheck,
  Calendar,
  Users,
  DollarSign,
  GraduationCap,
  Award,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react'

import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getAuthSession()

  // Protección del lado del servidor: Estrictamente para rol ADMIN
  if (!session || session.rol !== 'ADMIN') {
    redirect('/login?error=acceso_denegado_admin')
  }

  // Cargar datos del sistema
  const [eventos, usuarios, totalInscripciones, pagosCompletados, configPlantillas] = await Promise.all([
    prisma.evento.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        _count: {
          select: { inscripciones: true },
        },
      },
    }),
    prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
    }),
    prisma.inscripcion.count(),
    prisma.inscripcion.aggregate({
      where: { estado_pago: 'PAGADO' },
      _sum: { montoPagado: true },
    }),
    obtenerConfiguracionPlantillas(),
  ])

  const totalRecaudado = pagosCompletados._sum.montoPagado || 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header Institucional Corporativo */}
      <header className="bg-[#0B305B] text-white border-b-4 border-[#D2202E] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#D2202E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#D2202E] text-white uppercase tracking-wider">
                  Panel Maestro
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  Universidad del Sinú
                </span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-white">
                Administración General &bull; Facultad de Ingenierías
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/profesor"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
              Gestión Docente (Pagos)
            </Link>

            <Link
              href="/staff/asistencia"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5 text-emerald-300" />
              Control en Puerta
            </Link>

            <Link
              href="/certificados"
              target="_blank"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Certificados
            </Link>

            <div className="h-5 w-px bg-white/20 mx-1"></div>

            <BotonCerrarSesion />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner de Bienvenida y KPIs Globales */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#D2202E]">
                  SUPER ADMINISTRADOR
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500 font-medium">
                  {session.email}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-[#0B305B] tracking-tight mt-0.5">
                Bienvenido, {session.nombre}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Control centralizado de eventos, asignación de roles a docentes/staff y personalización de documentos oficiales.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Base de Datos Sincronizada (Supabase)
              </span>
            </div>
          </div>

          {/* Tarjetas de Métricas Globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase">Eventos Totales</span>
                <Calendar className="w-4 h-4 text-[#0B305B]" />
              </div>
              <div className="text-2xl font-black text-slate-900">{eventos.length}</div>
              <div className="text-[10px] text-slate-500">En catálogo académico</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase">Usuarios del Sistema</span>
                <Users className="w-4 h-4 text-[#0B305B]" />
              </div>
              <div className="text-2xl font-black text-slate-900">{usuarios.length}</div>
              <div className="text-[10px] text-slate-500">Alumnos, profesores y staff</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase">Inscripciones</span>
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalInscripciones}</div>
              <div className="text-[10px] text-slate-500">Registros en plataforma</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase">Total Recaudado</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">
                ${totalRecaudado.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">Pagos aprobados en efectivo</div>
            </div>
          </div>
        </div>

        {/* Panel Interactivo Cliente con Pestañas */}
        <PanelAdminCliente
          eventos={eventos}
          usuarios={usuarios}
          configPlantillas={configPlantillas}
          adminActual={{
            nombre: session.nombre,
            email: session.email,
          }}
        />
      </main>
    </div>
  )
}


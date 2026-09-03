import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import { RolUsuario } from '@prisma/client'
import GestionProgramasCliente from '@/components/admin/programas/GestionProgramasCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import { ShieldCheck, ArrowLeft, GraduationCap, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProgramasPage() {
  const session = await getAuthSession()

  // Validación estricta en el servidor: Exclusivo para SUPER_ADMIN
  if (!session || session.rol !== RolUsuario.SUPER_ADMIN) {
    redirect('/admin?error=acceso_denegado_superadmin')
  }

  // Consulta de todos los programas con conteo de entidades vinculadas
  const programas = await prisma.programa.findMany({
    include: {
      _count: {
        select: {
          usuarios: true,
          eventos: true,
          asignaturas: true,
        },
      },
    },
    orderBy: { nombre: 'asc' },
  })

  const programasMapeados = programas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    estado_activo: p.estado_activo,
    createdAt: p.createdAt.toISOString(),
    _count: {
      usuarios: p._count.usuarios,
      eventos: p._count.eventos,
      asignaturas: p._count.asignaturas,
    },
  }))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Institucional Corporativo */}
      <header className="bg-[#0B305B] text-white border-b-4 border-[#D2202E] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#D2202E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-[#D2202E] bg-white px-2 py-0.5 rounded">
                  UNISINÚ
                </span>
                <span className="text-[10px] tracking-wider text-slate-300 font-bold uppercase">
                  Gestión Departamental e Ingenierías
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Catálogo Oficial de Programas Académicos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{session.nombre}</div>
              <div className="text-[10px] text-amber-300 font-semibold uppercase">SUPER ADMINISTRADOR</div>
            </div>
            <BotonCerrarSesion />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Barra Superior con Botón Secundario 'Volver al Panel' y Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0B305B] font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#D2202E]" />
              Volver al Panel
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Link href="/admin" className="hover:text-[#0B305B] transition">
                  Panel Maestro
                </Link>
                <span>/</span>
                <span className="text-[#0B305B] font-bold">Programas Académicos</span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 mt-0.5">
                Administración y Configuración de Programas de la Facultad
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#0B305B] bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100">
            <Building2 className="w-4 h-4 text-[#D2202E]" />
            {programas.length} Programas Registrados
          </div>
        </div>

        {/* Componente CRUD Interactivo */}
        <GestionProgramasCliente programasIniciales={programasMapeados} />
      </main>
    </div>
  )
}

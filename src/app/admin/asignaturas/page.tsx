import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import GestionAsignaturasCliente from '@/components/admin/asignaturas/GestionAsignaturasCliente'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import { ShieldCheck, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AsignaturasPage() {
  const session = await getAuthSession()

  // Validación estricta en el servidor: Rol ADMIN requerido
  if (!session || session.rol !== 'ADMIN') {
    redirect('/login?error=acceso_denegado_admin')
  }

  // Consulta de todas las asignaturas
  const asignaturas = await prisma.asignatura.findMany({
    orderBy: [{ programa_academico: 'asc' }, { nombre: 'asc' }],
  })

  const asignaturasMapeadas = asignaturas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    programa_academico: a.programa_academico,
    activa: a.activa,
    createdAt: a.createdAt.toISOString(),
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
                  Gestión Académica de Ingenierías
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Catálogo de Asignaturas para Bonificaciones
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{session.nombre}</div>
              <div className="text-[10px] text-slate-300">{session.email}</div>
            </div>
            <BotonCerrarSesion />
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Barra de Navegación y Botón 'Volver al Panel' */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
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
                <span className="text-[#0B305B] font-bold">Asignaturas</span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 mt-0.5">
                Configuración de Materias por Programa Académico
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#0B305B] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <GraduationCap className="w-4 h-4 text-[#D2202E]" />
            Programas: Sistemas, Industrial, Civil, Eléctrica, Mecánica y Básicas
          </div>
        </div>

        {/* Módulo Cliente con Tabla, Botón '+ Agregar Asignatura', Modales y Toggle */}
        <GestionAsignaturasCliente asignaturasIniciales={asignaturasMapeadas} />
      </main>
    </div>
  )
}


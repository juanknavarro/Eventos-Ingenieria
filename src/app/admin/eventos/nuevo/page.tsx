import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import FormularioEventoCliente from '@/components/admin/FormularioEventoCliente'
import { ArrowLeft, Sparkles, Calendar, ShieldCheck } from 'lucide-react'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'

import { esAdminOSuperior, esSuperAdmin } from '@/lib/auth/multitenancy'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function NuevoEventoPage({ searchParams }: Props) {
  const session = await getAuthSession()

  // Protección del lado del servidor: Estrictamente para SUPER_ADMIN o ADMIN de Programa
  if (!session || !esAdminOSuperior(session)) {
    redirect('/login?error=acceso_denegado_admin')
  }

  const { id } = await searchParams

  const [eventoInicial, programas] = await Promise.all([
    id
      ? prisma.evento.findUnique({
          where: { id },
          include: { organizador: true },
        })
      : Promise.resolve(null),
    prisma.programa.findMany({
      where: { estado_activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    }),
  ])

  // Validar pertenencia si es ADMIN de programa
  if (eventoInicial && !esSuperAdmin(session) && session.carrera) {
    if (
      eventoInicial.programa_academico !== session.carrera &&
      !eventoInicial.organizador?.carrera?.toLowerCase().includes(session.carrera.toLowerCase())
    ) {
      redirect('/admin?error=acceso_denegado_evento')
    }
  }

  const esEdicion = !!eventoInicial

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
                  Panel de Administración
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {esEdicion ? 'Editar Evento Académico' : 'Crear Nuevo Evento'}
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
        {/* Barra Superior con Botón Secundario de Retorno y Títulos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 4) Botón secundario 'Volver al Panel' en la parte superior izquierda */}
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
                <span className="text-slate-600">Eventos</span>
                <span>/</span>
                <span className="text-[#0B305B] font-bold">
                  {esEdicion ? 'Editar Evento' : 'Nuevo Registro'}
                </span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 mt-0.5">
                {esEdicion
                  ? `Modificando: ${eventoInicial?.titulo}`
                  : 'Formulario de Alta y Configuración de Evento'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Calendar className="w-4 h-4 text-[#0B305B]" />
            Facultad de Ciencias e Ingenierías
          </div>
        </div>

        {/* 2 y 3) Formulario en página completa dividido en 2 columnas responsive */}
        <FormularioEventoCliente
          eventoInicial={eventoInicial}
          programaUsuario={session.carrera}
          esSuperAdmin={esSuperAdmin(session)}
          programas={programas}
        />
      </main>
    </div>
  )
}


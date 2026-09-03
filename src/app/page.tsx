import React from 'react'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import CatalogoEventosPublico from '@/components/publico/CatalogoEventosPublico'
import BotonCerrarSesion from '@/components/auth/BotonCerrarSesion'
import {
  GraduationCap,
  Award,
  ShieldCheck,
  HandCoins,
  ScanBarcode,
  LogIn,
  Sparkles,
  Calendar,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'

// Revalidar dinámicamente para reflejar de inmediato nuevos eventos y preinscripciones
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 1) Consulta exclusiva de eventos PUBLICADOS y asignaturas activas para bonificaciones
  const [eventosPublicados, asignaturasActivas, sesion] = await Promise.all([
    prisma.evento.findMany({
      where: {
        estado: 'PUBLICADO',
      },
      include: {
        _count: {
          select: { inscripciones: true },
        },
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    }),
    prisma.asignatura.findMany({
      where: {
        activa: true,
      },
      orderBy: [
        { programa_academico: 'asc' },
        { nombre: 'asc' },
      ],
    }),
    getAuthSession(),
  ])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* HEADER INSTITUCIONAL UNISINÚ */}
      {/* ========================================================================= */}
      <header className="bg-white border-b-2 border-[#D2202E]/20 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#0B305B] text-white rounded-2xl shadow-md border-t-2 border-[#D2202E]">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-[#D2202E] tracking-wider uppercase">
                  Universidad del Sinú
                </span>
                <span className="h-3 w-px bg-slate-300"></span>
                <span className="text-[11px] font-bold text-slate-500">Seccional Cartagena</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-[#0B305B] tracking-tight leading-tight">
                Facultad de Ciencias e Ingenierías &bull; Portal de Eventos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Acceso Directo al Portal de Certificados */}
            <Link
              href="/certificados"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-[#0B305B] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition shadow-2xs"
            >
              <Award className="w-4 h-4 text-[#D2202E]" />
              Descargar Certificados
            </Link>

            {/* Accesos rápidos según rol autenticado */}
            {sesion?.rol === 'ADMIN' && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition"
              >
                <ShieldCheck className="w-4 h-4" />
                Panel Maestro
              </Link>
            )}

            {sesion?.rol === 'PROFESOR' && (
              <Link
                href="/profesor"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-xs transition"
              >
                <HandCoins className="w-4 h-4" />
                Validar Pagos
              </Link>
            )}

            {sesion?.rol === 'STAFF' && (
              <Link
                href="/staff/asistencia"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl shadow-xs transition"
              >
                <ScanBarcode className="w-4 h-4" />
                Control de Acceso
              </Link>
            )}

            {/* Estado de Sesión / Botón Login */}
            {sesion ? (
              <div className="flex items-center gap-2 bg-slate-100 pl-3 pr-1.5 py-1 rounded-xl border border-slate-200 text-xs">
                <div className="text-left hidden sm:block">
                  <span className="font-bold text-[#0B305B] block truncate max-w-[120px]">
                    {sesion.nombre.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-extrabold text-[#D2202E] uppercase">
                    {sesion.rol}
                  </span>
                </div>
                <BotonCerrarSesion />
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0B305B] hover:bg-[#071F3B] rounded-xl transition shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Acceso Personal
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* HERO SECTION DE BIENVENIDA A LOS ESTUDIANTES */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        <section className="bg-gradient-to-r from-[#0B305B] via-[#082240] to-[#041224] text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden border-t-4 border-[#D2202E]">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-extrabold text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#D2202E]" />
              Convocatoria Académica Abierta 2026
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Preinscripción a Eventos, Congresos y Talleres de Ingenierías
            </h2>

            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Explora la oferta académica de la <strong className="text-white">Universidad del Sinú</strong>.
              Inscríbete con tu número de documento, asegura tu cupo y postula tu asistencia para{' '}
              <strong className="text-[#F6CDD1] font-bold">bonificaciones en tus asignaturas semestrales</strong>.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Carnetización Oficial
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                <BookOpen className="w-4 h-4 text-[#F6CDD1]" />
                Bonificación de Asignaturas
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                <Award className="w-4 h-4 text-amber-300" />
                Certificado Digital con QR
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <GraduationCap className="w-80 h-80 text-white" />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CATÁLOGO PÚBLICO EN CUADRÍCULA Y MODAL DE PREINSCRIPCIÓN */}
        {/* ========================================================================= */}
        <CatalogoEventosPublico
          eventos={eventosPublicados}
          asignaturas={asignaturasActivas}
        />
      </main>

      {/* ========================================================================= */}
      {/* FOOTER INSTITUCIONAL */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#0B305B]">
            Universidad del Sinú &bull; Seccional Cartagena &bull; Facultad de Ciencias e Ingenierías
          </p>
          <p className="text-[11px] text-slate-400">
            Plataforma Institucional para la Gestión de Eventos, Recaudos y Certificación Digital.
          </p>
        </div>
      </footer>
    </div>
  )
}

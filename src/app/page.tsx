import React from 'react'
import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import CatalogoEventosPublico from '@/components/publico/CatalogoEventosPublico'
import NavbarPublico from '@/components/publico/NavbarPublico'
import { obtenerConfiguracionPlantillas } from '@/lib/config/plantillas'
import {
  GraduationCap,
  Award,
  Sparkles,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'

// Revalidar dinámicamente para reflejar de inmediato nuevos eventos y preinscripciones
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // 1) Consulta exclusiva de eventos PUBLICADOS, asignaturas activas y configuración institucional
  const [eventosPublicados, asignaturasActivas, configPlantillas, sesion] = await Promise.all([
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
    obtenerConfiguracionPlantillas(),
    getAuthSession(),
  ])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* HEADER INSTITUCIONAL UNISINÚ (NAVBAR PÚBLICO) */}
      {/* ========================================================================= */}
      <NavbarPublico sesion={sesion} />

      {/* ========================================================================= */}
      {/* HERO SECTION DE BIENVENIDA A LOS ESTUDIANTES */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        <section className="bg-gradient-to-r from-[#0B305B] via-[#082240] to-[#041224] text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden border-t-4 border-[#D2202E]">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-extrabold text-white">
              <Sparkles className="w-3.5 h-3.5 text-[#D2202E]" />
              {configPlantillas.titulo_convocatoria || 'Convocatoria Académica Abierta'}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {configPlantillas.titulo_convocatoria || 'Preinscripción a Eventos, Congresos y Talleres de Ingenierías'}
            </h2>

            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              {configPlantillas.descripcion_convocatoria ||
                'Explora la oferta académica de la Universidad del Sinú. Inscríbete con tu número de documento, asegura tu cupo y expande tus conocimientos en nuestros espacios de formación continua.'}
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Carnetización Oficial
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
                <BookOpen className="w-4 h-4 text-[#F6CDD1]" />
                Formación Continua
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
        <section id="eventos" className="scroll-mt-24">
          <CatalogoEventosPublico
            eventos={eventosPublicados}
            asignaturas={asignaturasActivas}
          />
        </section>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER INSTITUCIONAL */}
      {/* ========================================================================= */}
      <footer id="contacto" className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#0B305B]">
            Universidad del Sinú &bull; Sede Montería &bull; Facultad de Ciencias e Ingenierías
          </p>
          <p className="text-[11px] text-slate-400">
            Plataforma Institucional para la Gestión de Eventos, Recaudos y Certificación Digital &bull; Contacto: <span className="font-medium text-slate-600">ingenierias@unisinu.edu.co</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

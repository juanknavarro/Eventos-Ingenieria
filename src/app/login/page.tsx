import React, { Suspense } from 'react'
import FormularioLoginCliente from '@/components/auth/FormularioLoginCliente'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Iniciar Sesión | Facultad de Ingenierías',
  description: 'Módulo de autenticación y control de acceso institucional por roles.',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061930] via-[#0B305B] to-[#041121] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#D2202E] rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#0B305B] rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 space-y-3 text-center px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white transition bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl backdrop-blur-sm border border-white/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Portal Público
        </Link>

        <div className="flex justify-center pt-2">
          <div className="p-3.5 bg-[#D2202E] text-white rounded-2xl shadow-xl shadow-[#D2202E]/30 border-2 border-white/20">
            <GraduationCap className="w-9 h-9" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-extrabold text-[#F6CDD1] uppercase tracking-wider block">
            Universidad del Sinú
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Facultad de Ciencias e Ingenierías
          </h2>
          <p className="text-xs text-slate-300">
            Autenticación Institucional &bull; Control de Acceso por Roles (RBAC)
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200">
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Cargando formulario de acceso...</span>
              </div>
            }
          >
            <FormularioLoginCliente />
          </Suspense>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Sistema protegido por políticas de autorización en Middleware de Next.js &bull; Supabase Auth
        </p>
      </div>
    </div>
  )
}


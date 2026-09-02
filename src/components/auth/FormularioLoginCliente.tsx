'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { iniciarSesionConCredenciales } from '@/actions/auth'

export default function FormularioLoginCliente() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectParam = searchParams.get('redirect') || ''
  const errorParam = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  // Mensaje contextual según el código de error recibido del middleware
  const getMensajeErrorMiddleware = () => {
    if (errorParam === 'no_autenticado') {
      return 'Debes iniciar sesión con tus credenciales institucionales para acceder a este módulo.'
    }
    if (errorParam === 'acceso_denegado_admin') {
      return 'Acceso Restringido: El Panel de Control Maestro (/admin) es de uso exclusivo para el Administrador General.'
    }
    if (errorParam === 'acceso_denegado_profesor') {
      return 'Acceso Denegado: La sección /profesor es exclusiva para docentes con rol PROFESOR o ADMIN. Tu rol actual no tiene permisos.'
    }
    if (errorParam === 'acceso_denegado_staff') {
      return 'Acceso Denegado: La sección /staff es exclusiva para personal con rol STAFF o ADMIN. Tu rol actual no tiene permisos.'
    }
    return null
  }

  const mensajeMiddleware = getMensajeErrorMiddleware()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return

    setCargando(true)
    setErrorLocal(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    if (redirectParam) formData.append('redirect', redirectParam)

    const res = await iniciarSesionConCredenciales(formData)

    if (res.success && res.redirectUrl) {
      router.push(res.redirectUrl)
      router.refresh()
    } else {
      setErrorLocal(res.error || 'Credenciales inválidas.')
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Error de Middleware o Autorización */}
      {(mensajeMiddleware || errorLocal) && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs animate-in shake">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Control de Seguridad Institucional</p>
            <p className="text-rose-700 leading-relaxed">
              {errorLocal || mensajeMiddleware}
            </p>
          </div>
        </div>
      )}

      {/* Formulario Principal de Inicio de Sesión */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Correo Institucional
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@unisinu.edu.co"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Contraseña
            </label>
            <span className="text-[10px] text-slate-400">
              Credencial institucional
            </span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={cargando || !email.trim()}
          className="w-full py-3 px-4 bg-[#0B305B] hover:bg-[#071F3B] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md shadow-[#0B305B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {cargando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Autenticando usuario...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Iniciar Sesión
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <p className="text-[11px] text-slate-400">
          ¿Problemas para acceder? Contacta a la coordinación de sistemas de la Facultad de Ingenierías.
        </p>
      </div>
    </div>
  )
}

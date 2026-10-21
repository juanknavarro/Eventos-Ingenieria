'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  KeyRound,
  ArrowRight,
} from 'lucide-react'
import { cambiarPasswordObligatorio } from '@/actions/auth'

interface Props {
  nombreUsuario?: string
  emailUsuario?: string
  rolUsuario?: string
}

export default function FormularioCambioPasswordCliente({
  nombreUsuario,
  emailUsuario,
  rolUsuario,
}: Props) {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [mostrarConfirm, setMostrarConfirm] = useState(false)

  const [cargando, setCargando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Criterios de seguridad en tiempo real
  const tieneLongitud = password.length >= 8
  const tieneMayuscula = /[A-Z]/.test(password)
  const tieneMinuscula = /[a-z]/.test(password)
  const tieneNumero = /[0-9]/.test(password)
  const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  const coinciden = password.length > 0 && password === confirmPassword

  const todosCumplidos =
    tieneLongitud &&
    tieneMayuscula &&
    tieneMinuscula &&
    tieneNumero &&
    tieneEspecial &&
    coinciden

  // Nivel de fortaleza (0 a 100%)
  const fortaleza = useMemo(() => {
    let puntos = 0
    if (tieneLongitud) puntos += 20
    if (tieneMayuscula) puntos += 20
    if (tieneMinuscula) puntos += 20
    if (tieneNumero) puntos += 20
    if (tieneEspecial) puntos += 20
    return puntos
  }, [tieneLongitud, tieneMayuscula, tieneMinuscula, tieneNumero, tieneEspecial])

  const infoFortaleza = useMemo(() => {
    if (fortaleza <= 20) return { texto: 'Muy Débil', colorBg: 'bg-rose-500', colorText: 'text-rose-600' }
    if (fortaleza <= 40) return { texto: 'Débil', colorBg: 'bg-amber-500', colorText: 'text-amber-600' }
    if (fortaleza <= 60) return { texto: 'Aceptable', colorBg: 'bg-yellow-500', colorText: 'text-yellow-700' }
    if (fortaleza <= 80) return { texto: 'Buena', colorBg: 'bg-blue-600', colorText: 'text-blue-700' }
    return { texto: 'Excelente y Segura', colorBg: 'bg-emerald-600', colorText: 'text-emerald-700' }
  }, [fortaleza])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!todosCumplidos || cargando) return

    setCargando(true)
    setErrorServidor(null)
    setExito(null)

    try {
      const formData = new FormData()
      formData.append('password', password)
      formData.append('confirmPassword', confirmPassword)

      const res = await cambiarPasswordObligatorio(formData)

      if (res.success) {
        setExito(res.message || 'Contraseña actualizada con éxito.')
        setTimeout(() => {
          router.push(res.redirectUrl || '/admin')
          router.refresh()
        }, 1200)
      } else {
        setErrorServidor(res.error || 'No se pudo actualizar la contraseña.')
      }
    } catch {
      setErrorServidor('Ocurrió un error inesperado al procesar la solicitud.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Cabecera institucional */}
      <div className="bg-[#0B305B] text-white p-6 sm:p-7 border-b-4 border-[#D2202E]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <KeyRound className="w-6 h-6 text-[#D2202E]" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-[#D2202E] bg-white px-2 py-0.5 rounded">
              PRIMER INICIO DE SESIÓN
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-tight">
              Actualización Obligatoria de Contraseña
            </h1>
          </div>
        </div>

        {nombreUsuario && (
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Usuario:</span>{' '}
              <strong className="text-white font-semibold">{nombreUsuario}</strong>
            </div>
            {rolUsuario && (
              <span className="text-[10px] font-extrabold text-[#D2202E] bg-white/10 px-2 py-0.5 rounded-md uppercase border border-white/10">
                {rolUsuario}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Banner explicativo */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-amber-950">Por tu seguridad y la de la Facultad:</p>
            <p className="mt-0.5 text-amber-800">
              Se ha detectado una clave temporal o asignada por defecto. Es obligatorio establecer una nueva contraseña personal antes de continuar al sistema.
            </p>
          </div>
        </div>

        {/* Mensajes de error / éxito del servidor */}
        {errorServidor && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
            <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorServidor}</span>
          </div>
        )}

        {exito && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{exito} Redirigiendo a tu panel...</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo: Nueva Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Nueva Contraseña *</span>
              {password && (
                <span className={`text-[11px] font-extrabold ${infoFortaleza.colorText}`}>
                  {infoFortaleza.texto}
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu nueva clave personal"
                disabled={cargando}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                tabIndex={-1}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Barra de fortaleza dinámica */}
            {password.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${infoFortaleza.colorBg} transition-all duration-300`}
                    style={{ width: `${fortaleza}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Campo: Confirmar Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={mostrarConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite exactamente tu nueva contraseña"
                disabled={cargando}
                className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 outline-none transition ${
                  confirmPassword.length > 0
                    ? coinciden
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-200 focus:border-[#0B305B] focus:bg-white'
                }`}
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setMostrarConfirm(!mostrarConfirm)}
                tabIndex={-1}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {mostrarConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checklist interactivo en tiempo real */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <span className="text-[11px] font-bold text-slate-600 block">
              Requisitos de seguridad indispensables:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <ItemCriterio
                cumplido={tieneLongitud}
                etiqueta="Mínimo 8 caracteres"
              />
              <ItemCriterio
                cumplido={tieneMayuscula}
                etiqueta="Al menos 1 mayúscula (A-Z)"
              />
              <ItemCriterio
                cumplido={tieneMinuscula}
                etiqueta="Al menos 1 minúscula (a-z)"
              />
              <ItemCriterio
                cumplido={tieneNumero}
                etiqueta="Al menos 1 número (0-9)"
              />
              <ItemCriterio
                cumplido={tieneEspecial}
                etiqueta="1 carácter especial (!@#$%&*)"
              />
              <ItemCriterio
                cumplido={coinciden}
                etiqueta="Las contraseñas coinciden"
              />
            </div>
          </div>

          {/* Botón de envío habilitado estrictamente cuando se cumplen todos los requisitos */}
          <button
            type="submit"
            disabled={!todosCumplidos || cargando}
            className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
              todosCumplidos && !cargando
                ? 'bg-[#0B305B] hover:bg-[#071F3B] text-white cursor-pointer hover:shadow-lg active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Guardando nueva contraseña...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#D2202E]" />
                <span>Guardar y Acceder al Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function ItemCriterio({ cumplido, etiqueta }: { cumplido: boolean; etiqueta: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${
        cumplido ? 'text-emerald-700 font-semibold' : 'text-slate-400'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all ${
          cumplido
            ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-300'
            : 'bg-slate-200 text-slate-400'
        }`}
      >
        {cumplido ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-2.5 h-2.5" />}
      </div>
      <span className="truncate">{etiqueta}</span>
    </div>
  )
}


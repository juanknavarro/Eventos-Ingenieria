'use client'

import React, { useState, useEffect } from 'react'
import { LogOut, Loader2, X, ShieldAlert } from 'lucide-react'
import { cerrarSesion } from '@/actions/auth'

interface BotonCerrarSesionProps {
  className?: string
  variante?: 'header' | 'boton'
}

export default function BotonCerrarSesion({
  className = '',
  variante = 'header',
}: BotonCerrarSesionProps) {
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)
  const [cargando, setCargando] = useState<boolean>(false)

  // Cerrar el modal con la tecla Escape si no se está procesando
  useEffect(() => {
    if (!modalAbierto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cargando) {
        setModalAbierto(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalAbierto, cargando])

  const handleConfirmarLogout = async () => {
    setCargando(true)
    try {
      await cerrarSesion()
    } catch {
      setCargando(false)
    }
  }

  return (
    <>
      {/* Botón Disparador (Header o Botón de vista) */}
      {variante === 'boton' ? (
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer ${className}`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          title="Cerrar sesión"
          className={`inline-flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${className}`}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      )}

      {/* Modal Corporativo de Confirmación de Cierre de Sesión */}
      {modalAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-cierre-sesion"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !cargando && setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95 duration-200 border-t-4 border-[#D2202E]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón Cerrar (X) */}
            <button
              type="button"
              disabled={cargando}
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer disabled:opacity-40"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Encabezado con Ícono */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-rose-50 text-[#D2202E] rounded-2xl border border-rose-100 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1 pr-6">
                <span className="text-[10px] font-extrabold text-[#D2202E] uppercase tracking-wider block">
                  Universidad del Sinú &bull; Seguridad
                </span>
                <h3
                  id="titulo-modal-cierre-sesion"
                  className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug"
                >
                  ¿Estás seguro que deseas cerrar tu sesión actual?
                </h3>
              </div>
            </div>

            {/* Mensaje descriptivo */}
            <p className="text-xs text-slate-500 leading-relaxed">
              Finalizarás tu sesión de trabajo en los paneles internos de la Facultad. Para volver a acceder a las funciones administrativas, docentes o de control de acceso, deberás ingresar tus credenciales nuevamente.
            </p>

            {/* Botones de Confirmación / Cancelación */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={cargando}
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={cargando}
                onClick={handleConfirmarLogout}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] disabled:bg-rose-300 rounded-xl shadow-md shadow-[#D2202E]/25 transition cursor-pointer"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cerrando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sí, cerrar sesión</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

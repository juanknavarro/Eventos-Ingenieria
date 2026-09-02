'use client'

import React, { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { cerrarSesion } from '@/actions/auth'

interface BotonCerrarSesionProps {
  className?: string
  variante?: 'header' | 'boton'
}

export default function BotonCerrarSesion({
  className = '',
  variante = 'header',
}: BotonCerrarSesionProps) {
  const [cargando, setCargando] = useState<boolean>(false)

  const handleLogout = async () => {
    setCargando(true)
    await cerrarSesion()
  }

  if (variante === 'boton') {
    return (
      <button
        onClick={handleLogout}
        disabled={cargando}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer ${className}`}
      >
        {cargando ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span>Cerrar Sesión</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={cargando}
      title="Cerrar sesión"
      className={`inline-flex items-center gap-1.5 p-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ${className}`}
    >
      {cargando ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Salir</span>
    </button>
  )
}


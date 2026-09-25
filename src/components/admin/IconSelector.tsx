'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  LISTA_ICONOS_CATALOGO,
  resolverIconoLucide,
  DICCIONARIO_ICONOS,
} from '@/lib/icons/catalogoIconos'
import { Search, ChevronDown, Check, X } from 'lucide-react'

interface IconSelectorProps {
  valorActual: string
  alSeleccionar: (idIcono: string) => void
  nombreCampoHidden: string
}

const CATEGORIAS = ['Todos', 'Academia', 'Tecnología', 'Eventos', 'General'] as const
type CategoriaFiltro = (typeof CATEGORIAS)[number]

export default function IconSelector({
  valorActual,
  alSeleccionar,
  nombreCampoHidden,
}: IconSelectorProps) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaFiltro>('Todos')

  const contenedorRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera)
    }
  }, [abierto])

  const IconoActual = resolverIconoLucide(valorActual)
  const infoActual = DICCIONARIO_ICONOS[valorActual]

  // Filtro reactivo en memoria
  const iconosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return LISTA_ICONOS_CATALOGO.filter((item) => {
      const matchCat =
        categoriaSeleccionada === 'Todos' || item.categoria === categoriaSeleccionada
      if (!matchCat) return false
      if (!q) return true
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
      )
    })
  }, [busqueda, categoriaSeleccionada])

  return (
    <div className="relative inline-block" ref={contenedorRef}>
      {/* Input oculto para persistencia en el FormData del formulario */}
      <input type="hidden" name={nombreCampoHidden} value={valorActual} />

      {/* Botón trigger visible */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        title={`Ícono actual: ${infoActual?.nombre || valorActual} (Haz clic para cambiar)`}
        className={`h-10 px-3 flex items-center justify-between gap-1.5 bg-white border rounded-xl shadow-xs text-xs font-semibold cursor-pointer transition shrink-0 ${
          abierto
            ? 'border-[#0B305B] ring-2 ring-[#0B305B]/15 text-[#0B305B]'
            : 'border-slate-300 hover:border-slate-400 text-slate-700 bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <IconoActual className="w-4 h-4 text-[#0B305B]" />
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            abierto ? 'rotate-180 text-[#0B305B]' : ''
          }`}
        />
      </button>

      {/* Menú desplegable */}
      {abierto && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 space-y-2 z-50">
          {/* Barra de Búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar ícono..."
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-lg text-xs outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtros por Categoría */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md whitespace-nowrap cursor-pointer transition ${
                  categoriaSeleccionada === cat
                    ? 'bg-[#0B305B] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de Íconos */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {iconosFiltrados.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No se encontraron íconos
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {iconosFiltrados.map((item) => {
                  const ItemIcon = item.componente
                  const esActivo = item.id === valorActual

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        alSeleccionar(item.id)
                        setAbierto(false)
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-lg text-left cursor-pointer transition border ${
                        esActivo
                          ? 'bg-[#0B305B]/10 border-[#0B305B] text-[#0B305B] font-bold'
                          : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div
                        className={`p-1 rounded-md shrink-0 ${
                          esActivo
                            ? 'bg-[#0B305B] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] block truncate leading-tight">
                          {item.nombre}
                        </span>
                      </div>
                      {esActivo && (
                        <Check className="w-3 h-3 text-[#0B305B] shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pie informativo */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>50 íconos</span>
            <span className="font-medium text-slate-600 truncate max-w-[150px]">
              {infoActual?.nombre || valorActual}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

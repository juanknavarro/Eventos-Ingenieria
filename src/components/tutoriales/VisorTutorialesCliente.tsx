'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Video,
  Search,
  BookOpen,
  FolderOpen,
  Calendar,
  ExternalLink,
  ChevronDown,
  Sparkles,
  HelpCircle,
  PlayCircle,
  X,
} from 'lucide-react'
import { TutorialItem } from '@/actions/tutoriales'

interface Props {
  tutoriales: TutorialItem[]
  tituloModulo?: string
  descripcionModulo?: string
  esDocente?: boolean
}

export function convertirYoutubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null
  const clean = url.trim()
  if (!clean) return null

  if (clean.includes('/embed/')) {
    return clean
  }

  const match = clean.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
  )

  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?rel=0`
  }

  return clean
}

export default function VisorTutorialesCliente({
  tutoriales,
  tituloModulo = 'Centro de Ayuda, Guías y Tutoriales',
  descripcionModulo = 'Aprende a utilizar la plataforma paso a paso con nuestros instructivos y videos explicativos oficiales.',
  esDocente = false,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('TODAS')
  const [tutorialModalGuia, setTutorialModalGuia] = useState<TutorialItem | null>(null)

  // Cerrar modal de guía con tecla Escape
  useEffect(() => {
    if (!tutorialModalGuia) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTutorialModalGuia(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tutorialModalGuia])

  // Obtener categorías únicas presentes en los tutoriales
  const categorias = useMemo(() => {
    const setCat = new Set<string>()
    tutoriales.forEach((t) => {
      if (t.categoria && t.categoria.trim()) {
        setCat.add(t.categoria.trim())
      }
    })
    return ['TODAS', ...Array.from(setCat)]
  }, [tutoriales])

  // Filtrado reactivo por texto y categoría
  const tutorialesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return tutoriales.filter((t) => {
      const coincideCat =
        categoriaSeleccionada === 'TODAS' ||
        t.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase()

      const coincideTexto =
        !q ||
        t.titulo.toLowerCase().includes(q) ||
        t.descripcion.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)

      return coincideCat && coincideTexto
    })
  }, [tutoriales, busqueda, categoriaSeleccionada])

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida e Instrucciones */}
      <div className="bg-gradient-to-r from-[#0B305B] via-[#092547] to-[#041224] text-white rounded-3xl p-6 sm:p-8 shadow-xl border-t-4 border-[#D2202E] relative overflow-hidden">
        <div className="max-w-3xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-[#D2202E]" />
            Universidad del Sinú &bull; Documentación Oficial
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {tituloModulo}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {descripcionModulo}
          </p>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Barra de Filtros: Categorías y Buscador */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por tema o palabra clave..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Contador de resultados */}
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 self-end sm:self-auto">
            <span>Mostrando {tutorialesFiltrados.length} de {tutoriales.length} instructivos</span>
          </div>
        </div>

        {/* Píldoras de Categorías */}
        {categorias.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                  categoriaSeleccionada === cat
                    ? 'bg-[#0B305B] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat === 'TODAS' ? 'Todas las Categorías' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listado de Tutoriales */}
      {tutorialesFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800">
            No se encontraron tutoriales
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No hay instructivos que coincidan con la búsqueda &quot;{busqueda}&quot; o la categoría seleccionada.
          </p>
          {(busqueda || categoriaSeleccionada !== 'TODAS') && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('')
                setCategoriaSeleccionada('TODAS')
              }}
              className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0B305B] rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tutorialesFiltrados.map((tut) => {
            const embedUrl = convertirYoutubeEmbed(tut.youtubeUrl)

            return (
              <div
                key={tut.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between transition hover:shadow-md hover:border-slate-300"
              >
                <div>
                  {/* Vista Previa de Video o Banner de Cabecera */}
                  {embedUrl ? (
                    <div className="relative w-full aspect-video bg-slate-900 border-b border-slate-200">
                      <iframe
                        src={embedUrl}
                        title={tut.titulo}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-[#0B305B] to-[#06182E] p-4 flex flex-col justify-between text-white relative">
                      <BookOpen className="w-6 h-6 text-[#D2202E]" />
                      <span className="text-[10px] font-bold text-slate-300">
                        Instructivo Textual
                      </span>
                    </div>
                  )}

                  {/* Cuerpo */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-[#D2202E] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase">
                        {tut.categoria}
                      </span>
                      {embedUrl && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Video className="w-3 h-3 text-[#D2202E]" />
                          Video
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                      {tut.titulo}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">
                      {tut.descripcion}
                    </p>
                  </div>
                </div>

                {/* Botón al final de la tarjeta */}
                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => setTutorialModalGuia(tut)}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-[#0B305B] hover:text-white text-[#0B305B] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Leer guía completa</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Visualización: Leer Guía Completa */}
      {tutorialModalGuia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setTutorialModalGuia(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 border-t-4 border-[#0B305B]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-[#D2202E] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase">
                    {tutorialModalGuia.categoria}
                  </span>
                  {tutorialModalGuia.youtubeUrl && (
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Video className="w-3 h-3 text-[#D2202E]" />
                      Video Disponible
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#0B305B] leading-snug">
                  {tutorialModalGuia.titulo}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setTutorialModalGuia(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer shrink-0"
                title="Cerrar guía"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Reproductor de Video si aplica */}
              {(() => {
                const embedModal = convertirYoutubeEmbed(tutorialModalGuia.youtubeUrl)
                if (!embedModal) return null
                return (
                  <div className="space-y-2">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200">
                      <iframe
                        src={embedModal}
                        title={tutorialModalGuia.titulo}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    {tutorialModalGuia.youtubeUrl && (
                      <div className="text-right">
                        <a
                          href={tutorialModalGuia.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B305B] hover:text-[#D2202E] transition"
                        >
                          Abrir video en YouTube
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Texto completo de la descripción */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Instrucciones y Guía Paso a Paso:
                </span>
                <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {tutorialModalGuia.descripcion}
                </div>
              </div>
            </div>

            {/* Pie del Modal con botón para cerrar */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setTutorialModalGuia(null)}
                className="px-4 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


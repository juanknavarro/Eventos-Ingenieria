'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Video,
  Search,
  BookOpen,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Eye,
  FolderOpen,
} from 'lucide-react'
import {
  TutorialItem,
  crearTutorial,
  actualizarTutorial,
  eliminarTutorial,
} from '@/actions/tutoriales'
import { convertirYoutubeEmbed } from './VisorTutorialesCliente'

interface Props {
  tutorialesIniciales: TutorialItem[]
}

const CATEGORIAS_SUGERIDAS = [
  'Gestión de Eventos',
  'Control de Asistencia y QR',
  'Recaudos y Pagos',
  'Certificados y Diplomas',
  'Escarapelas y Carnetización',
  'Gestión de Usuarios y Roles',
  'General',
]

export default function GestionTutorialesCliente({ tutorialesIniciales }: Props) {
  const [tutoriales, setTutoriales] = useState<TutorialItem[]>(tutorialesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS')

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tutorialEnEdicion, setTutorialEnEdicion] = useState<TutorialItem | null>(null)
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [tutorialAEliminar, setTutorialAEliminar] = useState<TutorialItem | null>(null)
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

  // Estados del Formulario
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('Gestión de Eventos')
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [orden, setOrden] = useState(0)
  const [activo, setActivo] = useState(true)

  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Vista previa de video
  const embedPreview = useMemo(() => convertirYoutubeEmbed(youtubeUrl), [youtubeUrl])

  // Categorías existentes para el filtro
  const categoriasExistentes = useMemo(() => {
    const setCat = new Set<string>()
    tutoriales.forEach((t) => {
      if (t.categoria) setCat.add(t.categoria.trim())
    })
    return ['TODAS', ...Array.from(setCat)]
  }, [tutoriales])

  // Filtrado reactivo
  const tutorialesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return tutoriales.filter((t) => {
      const matchCat =
        categoriaFiltro === 'TODAS' ||
        t.categoria.toLowerCase() === categoriaFiltro.toLowerCase()
      const matchText =
        !q ||
        t.titulo.toLowerCase().includes(q) ||
        t.descripcion.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      return matchCat && matchText
    })
  }, [tutoriales, busqueda, categoriaFiltro])

  const abrirModalCrear = () => {
    setTutorialEnEdicion(null)
    setTitulo('')
    setCategoria('Gestión de Eventos')
    setCategoriaPersonalizada('')
    setDescripcion('')
    setYoutubeUrl('')
    setOrden(tutoriales.length + 1)
    setActivo(true)
    setMensajeError(null)
    setModalAbierto(true)
  }

  const abrirModalEditar = (tut: TutorialItem) => {
    setTutorialEnEdicion(tut)
    setTitulo(tut.titulo)
    if (CATEGORIAS_SUGERIDAS.includes(tut.categoria)) {
      setCategoria(tut.categoria)
      setCategoriaPersonalizada('')
    } else {
      setCategoria('OTRA')
      setCategoriaPersonalizada(tut.categoria)
    }
    setDescripcion(tut.descripcion)
    setYoutubeUrl(tut.youtubeUrl || '')
    setOrden(tut.orden)
    setActivo(tut.activo)
    setMensajeError(null)
    setModalAbierto(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargando(true)
    setMensajeError(null)
    setMensajeExito(null)

    const catFinal =
      categoria === 'OTRA' ? categoriaPersonalizada.trim() || 'General' : categoria

    try {
      const formData = new FormData()
      if (tutorialEnEdicion) {
        formData.append('id', tutorialEnEdicion.id)
      }
      formData.append('titulo', titulo)
      formData.append('categoria', catFinal)
      formData.append('descripcion', descripcion)
      formData.append('youtubeUrl', youtubeUrl)
      formData.append('orden', orden.toString())
      formData.append('activo', activo ? 'true' : 'false')

      const res = tutorialEnEdicion
        ? await actualizarTutorial(formData)
        : await crearTutorial(formData)

      if (res.success) {
        setMensajeExito(res.message || 'Tutorial guardado correctamente.')
        // Actualizar lista local
        if (tutorialEnEdicion) {
          setTutoriales((prev) =>
            prev.map((t) =>
              t.id === tutorialEnEdicion.id
                ? {
                    ...t,
                    titulo,
                    categoria: catFinal,
                    descripcion,
                    youtubeUrl: youtubeUrl || null,
                    orden,
                    activo,
                  }
                : t
            )
          )
        } else if (res.data) {
          setTutoriales((prev) => [res.data as TutorialItem, ...prev])
        }
        setModalAbierto(false)
      } else {
        setMensajeError(res.error || 'Ocurrió un error al procesar el tutorial.')
      }
    } catch {
      setMensajeError('Error de conexión al guardar el tutorial.')
    } finally {
      setCargando(false)
    }
  }

  const confirmarEliminar = (tut: TutorialItem) => {
    setTutorialAEliminar(tut)
    setModalEliminarAbierto(true)
  }

  const handleEliminar = async () => {
    if (!tutorialAEliminar) return
    setCargando(true)
    try {
      const res = await eliminarTutorial(tutorialAEliminar.id)
      if (res.success) {
        setTutoriales((prev) => prev.filter((t) => t.id !== tutorialAEliminar.id))
        setModalEliminarAbierto(false)
        setTutorialAEliminar(null)
        setMensajeExito('Tutorial eliminado exitosamente.')
      } else {
        setMensajeError(res.error || 'No se pudo eliminar el tutorial.')
      }
    } catch {
      setMensajeError('Error de red al eliminar el tutorial.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Alertas globales */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Controles: Crear + Buscador + Categorías */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tutoriales..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {categoriasExistentes.length > 1 && (
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              {categoriasExistentes.map((c) => (
                <option key={c} value={c}>
                  {c === 'TODAS' ? 'Todas las Categorías' : c}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={abrirModalCrear}
          className="w-full sm:w-auto px-4 py-2.5 bg-[#D2202E] hover:bg-[#B01824] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Tutorial
        </button>
      </div>

      {/* Grid de Tutoriales */}
      {tutorialesFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-base text-slate-800">
            No hay tutoriales registrados
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crea el primer instructivo o tutorial con video de YouTube para que los docentes y administradores puedan consultarlo.
          </p>
          <button
            type="button"
            onClick={abrirModalCrear}
            className="mt-2 px-4 py-2 bg-[#0B305B] text-white rounded-xl text-xs font-bold hover:bg-[#071F3B] transition cursor-pointer"
          >
            Crear Tutorial Ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tutorialesFiltrados.map((tut) => {
            const embedUrl = convertirYoutubeEmbed(tut.youtubeUrl)

            return (
              <div
                key={tut.id}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition hover:shadow-md ${
                  tut.activo ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20 opacity-80'
                }`}
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
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-[#D2202E] bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase">
                        {tut.categoria}
                      </span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          tut.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tut.activo ? 'PUBLICADO' : 'BORRADOR'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                      {tut.titulo}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">
                      {tut.descripcion}
                    </p>

                    <button
                      type="button"
                      onClick={() => setTutorialModalGuia(tut)}
                      className="w-full mt-1 py-2 px-3 bg-slate-100 hover:bg-[#0B305B] hover:text-white text-[#0B305B] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Leer guía completa</span>
                    </button>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold text-slate-400">
                    Orden: #{tut.orden}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(tut)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-[#0B305B] rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Editar Tutorial"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmarEliminar(tut)}
                      className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Eliminar Tutorial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95">
            <div className="bg-[#0B305B] text-white p-5 border-b-2 border-[#D2202E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <HelpCircle className="w-6 h-6 text-[#D2202E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    {tutorialEnEdicion ? 'Editar Tutorial o Instructivo' : 'Publicar Nuevo Tutorial'}
                  </h3>
                  <p className="text-xs text-slate-300">Universidad del Sinú &bull; Módulo de Aprendizaje</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Título */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Título del Tutorial *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Cómo validar el recaudo de una preinscripción"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none"
                  required
                />
              </div>

              {/* Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Categoría *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {CATEGORIAS_SUGERIDAS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="OTRA">+ Otra categoría personalizada...</option>
                  </select>
                </div>

                {categoria === 'OTRA' ? (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Nombre de la Categoría *</label>
                    <input
                      type="text"
                      value={categoriaPersonalizada}
                      onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                      placeholder="Escribe la nueva categoría"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-semibold"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Orden de Visualización</label>
                    <input
                      type="number"
                      value={orden}
                      onChange={(e) => setOrden(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              {/* URL de YouTube */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Enlace de YouTube (Opcional)</span>
                  <span className="text-[10px] text-slate-400">Soporta enlaces directos o compartidos</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-semibold"
                  />
                  <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>

                {embedPreview && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Vista previa del video:
                    </span>
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                      <iframe
                        src={embedPreview}
                        title="Vista previa"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción / Instrucciones */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Descripción e Instrucciones Paso a Paso *
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={6}
                  placeholder="Escribe detalladamente las instrucciones que el docente o administrador debe seguir..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium leading-relaxed outline-none"
                  required
                />
              </div>

              {/* Estado Activo */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0B305B] focus:ring-[#0B305B]"
                />
                <span>Publicar tutorial inmediatamente (Visible para docentes y administradores)</span>
              </label>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={cargando}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2 bg-[#0B305B] hover:bg-[#071F3B] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{tutorialEnEdicion ? 'Actualizar Tutorial' : 'Publicar Tutorial'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {modalEliminarAbierto && tutorialAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900">
                ¿Eliminar este tutorial?
              </h3>
              <p className="text-xs text-slate-500">
                Se eliminará permanentemente <strong>&quot;{tutorialAEliminar.titulo}&quot;</strong> y dejará de estar disponible para todos los usuarios.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalEliminarAbierto(false)}
                disabled={cargando}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={cargando}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {cargando ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
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


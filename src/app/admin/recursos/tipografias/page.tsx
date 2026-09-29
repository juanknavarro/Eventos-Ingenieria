'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Type,
  Sparkles,
  UploadCloud,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderPlus,
  Sliders,
  X,
  Layers,
  FileCheck,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import {
  subirFuenteCatalogo,
  listarFuentesCatalogo,
  eliminarFuenteCatalogo,
  FuenteCatalogoItem,
} from '@/actions/tipografias'

export default function GestorTipografiasPage() {
  const router = useRouter()
  const [fuentes, setFuentes] = useState<FuenteCatalogoItem[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)

  // Estados del formulario de subida
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [nombreFuente, setNombreFuente] = useState<string>('')
  const [familiaFuente, setFamiliaFuente] = useState<string>('Sans-Serif')
  const [subiendo, setSubiendo] = useState<boolean>(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Estado de vista previa FontFace API en vivo
  const [previewFontFamily, setPreviewFontFamily] = useState<string | null>(null)
  const [textoMuestra, setTextoMuestra] = useState<string>('Universidad del Sinú - Certificado de Asistencia')
  const [tamanoMuestra, setTamanoMuestra] = useState<number>(24)

  // Estado de eliminación
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const inputFileRef = useRef<HTMLInputElement>(null)

  // Cargar fuentes del catálogo
  const cargarFuentes = async () => {
    try {
      const res = await listarFuentesCatalogo()
      if (res.success && res.fuentes) {
        setFuentes(res.fuentes as FuenteCatalogoItem[])
      }
    } catch (err) {
      console.error('Error al cargar tipografías:', err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarFuentes()
  }, [])

  // Registrar cada fuente remota en el navegador usando FontFace API para renderizar las tarjetas con su estilo real
  useEffect(() => {
    if (typeof window === 'undefined' || fuentes.length === 0) return

    fuentes.forEach((fuente) => {
      const fontKey = `catalog_font_${fuente.id}`
      try {
        if (!document.fonts.check(`12px "${fontKey}"`)) {
          const font = new FontFace(fontKey, `url(${fuente.url})`)
          font
            .load()
            .then((loadedFont) => {
              document.fonts.add(loadedFont)
            })
            .catch((e) => console.warn(`Error al cargar FontFace para ${fuente.nombre}:`, e))
        }
      } catch (err) {
        console.warn(err)
      }
    })
  }, [fuentes])

  // Manejar selección de archivo y vista previa client-side instantánea con FontFace API
  const handleArchivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setMensajeError(null)

    if (!file) {
      setArchivoSeleccionado(null)
      setPreviewFontFamily(null)
      return
    }

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (extension !== '.ttf' && extension !== '.otf') {
      setMensajeError('Formato no admitido. Sube un archivo con extensión .ttf o .otf.')
      setArchivoSeleccionado(null)
      setPreviewFontFamily(null)
      return
    }

    setArchivoSeleccionado(file)

    // Autocompletar nombre si está vacío
    if (!nombreFuente.trim()) {
      const sugerido = file.name
        .replace(extension, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
      setNombreFuente(sugerido)
    }

    // Instanciar FontFace en memoria sin necesidad de subir nada aún
    try {
      const buffer = await file.arrayBuffer()
      const fontKey = `preview_upload_${Date.now()}`
      const font = new FontFace(fontKey, buffer)
      await font.load()
      document.fonts.add(font)
      setPreviewFontFamily(fontKey)
    } catch (fontErr) {
      console.error('Error al registrar FontFace local:', fontErr)
      setMensajeError('No se pudo decodificar el archivo tipográfico para vista previa.')
    }
  }

  // Enviar formulario de subida
  const handleSubmitSubida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivoSeleccionado || subiendo) return

    setSubiendo(true)
    setMensajeError(null)
    setMensajeExito(null)

    try {
      const formData = new FormData()
      formData.append('archivo_fuente', archivoSeleccionado)
      formData.append('nombre', nombreFuente.trim())
      formData.append('familia', familiaFuente)

      const res = await subirFuenteCatalogo(formData)

      if (res.success) {
        setMensajeExito(res.mensaje || 'Tipografía agregada al catálogo exitosamente.')
        setArchivoSeleccionado(null)
        setNombreFuente('')
        setPreviewFontFamily(null)
        if (inputFileRef.current) inputFileRef.current.value = ''
        await cargarFuentes()
        setTimeout(() => {
          setModalAbierto(false)
          setMensajeExito(null)
        }, 1500)
      } else {
        setMensajeError(res.error || 'Ocurrió un error al guardar la fuente.')
      }
    } catch (err: any) {
      setMensajeError(err?.message || 'Error de red o comunicación con el servidor.')
    } finally {
      setSubiendo(false)
    }
  }

  // Eliminar fuente del catálogo
  const handleEliminarFuente = async (fuente: FuenteCatalogoItem) => {
    if (fuente._count && fuente._count.eventos > 0) {
      alert(
        `Esta tipografía está en uso por ${fuente._count.eventos} evento(s). Reasigna los eventos antes de eliminarla.`
      )
      return
    }

    const confirmar = confirm(`¿Estás seguro de que deseas eliminar permanentemente la fuente "${fuente.nombre}" del catálogo?`)
    if (!confirmar) return

    setEliminandoId(fuente.id)
    try {
      const res = await eliminarFuenteCatalogo(fuente.id)
      if (res.success) {
        await cargarFuentes()
      } else {
        alert(res.error || 'No se pudo eliminar la tipografía.')
      }
    } catch (err) {
      console.error('Error al eliminar fuente:', err)
      alert('Error de conexión al eliminar la fuente.')
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* 1. Header Institucional Corporativo */}
      <header className="bg-[#0B305B] text-white border-b-4 border-[#D2202E] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/15 cursor-pointer"
              title="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-white">
              <Type className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-200">
                  Recursos Gráficos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white">
                  {fuentes.length} {fuentes.length === 1 ? 'Fuente' : 'Fuentes'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Catálogo Global de Tipografías
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              setModalAbierto(true)
              setMensajeError(null)
              setMensajeExito(null)
            }}
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#D2202E]/30 active:scale-95 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Subir Nueva Tipografía</span>
          </button>
        </div>
      </header>

      {/* 2. Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Informativo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D2202E]" />
              Tipografías Institucionales Centralizadas
            </h2>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Las fuentes subidas a este catálogo quedan registradas permanentemente y estarán disponibles en el selector
              unificado de todos los eventos para diplomas, certificados y escarapelas físicas.
            </p>
          </div>
        </div>

        {/* 3. Listado de Tipografías (Grid de Tarjetas) */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B305B] mb-2" />
            <p className="text-xs font-bold">Cargando catálogo de fuentes...</p>
          </div>
        ) : fuentes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Type className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 mb-1">
              Catálogo de Tipografías Vacío
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Aún no has subido ninguna fuente personalizada (.ttf o .otf). Sube tu primera fuente institucional para
              utilizarla en los certificados y carnetización.
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-[#0B305B] hover:bg-[#07213e] text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              <UploadCloud className="w-4 h-4" />
              Subir Primera Fuente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fuentes.map((fuente) => {
              const estaEnUso = fuente._count && fuente._count.eventos > 0
              const fontKey = `catalog_font_${fuente.id}`

              return (
                <div
                  key={fuente.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="p-5 border-b border-slate-100 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0B305B]/10 text-[#0B305B]">
                            {fuente.formato}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {fuente.familia}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1 truncate">
                          {fuente.nombre}
                        </h3>
                      </div>

                      {/* Badge de Uso en Eventos */}
                      {estaEnUso ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
                          title={`Esta fuente está siendo utilizada por ${fuente._count?.eventos} evento(s)`}
                        >
                          <Layers className="w-3 h-3 text-amber-600" />
                          {fuente._count?.eventos} {fuente._count?.eventos === 1 ? 'evento' : 'eventos'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/80 shrink-0">
                          Sin uso
                        </span>
                      )}
                    </div>

                    {/* Muestra Tipográfica Renderizada en Vivo en su Fuente Real */}
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                      <p
                        className="text-xl sm:text-2xl text-slate-900 leading-tight transition-all truncate"
                        style={{ fontFamily: `"${fontKey}", serif, sans-serif` }}
                      >
                        Universidad del Sinú
                      </p>
                      <p
                        className="text-xs text-slate-500 leading-snug truncate"
                        style={{ fontFamily: `"${fontKey}", serif, sans-serif` }}
                      >
                        Certificado de Asistencia y Participación Académica
                      </p>
                    </div>

                    {/* Metadatos Técnicos */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="truncate max-w-[170px]" title={fuente.archivo_nombre}>
                        {fuente.archivo_nombre}
                      </span>
                      <span>
                        {fuente.peso_bytes
                          ? `${(fuente.peso_bytes / 1024).toFixed(0)} KB`
                          : 'Fuente Web'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={fuente.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0B305B]" />
                      <span>Descargar</span>
                    </a>

                    <button
                      onClick={() => handleEliminarFuente(fuente)}
                      disabled={estaEnUso || eliminandoId === fuente.id}
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                        estaEnUso
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-sm active:scale-95'
                      }`}
                      title={
                        estaEnUso
                          ? 'No se puede eliminar porque está asignada a eventos activos'
                          : 'Eliminar fuente del catálogo'
                      }
                    >
                      {eliminandoId === fuente.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{estaEnUso ? 'En Uso' : 'Eliminar'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 4. Modal de Subida con Vista Previa en Vivo (FontFace API) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header del Modal */}
            <div className="p-5 bg-[#0B305B] text-white flex items-center justify-between border-b-2 border-[#D2202E]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-white">
                  <FolderPlus className="w-5 h-5 text-red-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">
                    Subir Fuente al Catálogo Global
                  </h3>
                  <p className="text-[11px] text-slate-200">
                    Soporte para archivos OpenType y TrueType (.otf, .ttf)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                type="button"
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido y Formulario */}
            <form onSubmit={handleSubmitSubida} className="p-6 space-y-5">
              {/* Notificaciones */}
              {mensajeError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{mensajeError}</span>
                </div>
              )}

              {mensajeExito && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{mensajeExito}</span>
                </div>
              )}

              {/* Selector de Archivo (.ttf / .otf) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Archivo Tipográfico (.ttf o .otf) *</span>
                  <span className="text-[10px] text-slate-400">Máx. 10 MB</span>
                </label>
                <input
                  ref={inputFileRef}
                  type="file"
                  required
                  accept=".ttf,.otf,font/ttf,font/otf"
                  onChange={handleArchivoChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B305B] file:text-white hover:file:bg-[#07213e] file:cursor-pointer cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-2 focus:outline-none"
                />
              </div>

              {/* Nombre y Familia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Nombre para Mostrar *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreFuente}
                    onChange={(e) => setNombreFuente(e.target.value)}
                    placeholder="Ej. Great Vibes, Cinzel"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Familia / Estilo Visual
                  </label>
                  <select
                    value={familiaFuente}
                    onChange={(e) => setFamiliaFuente(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
                  >
                    <option value="Sans-Serif">Sans-Serif (Moderna / Geométrica)</option>
                    <option value="Serif">Serif (Clásica / Solemne / Académica)</option>
                    <option value="Script / Caligráfica">Script / Caligráfica (Manuscrita / Cursiva)</option>
                    <option value="Display / Decorativa">Display / Decorativa (Titulares / Fantasía)</option>
                  </select>
                </div>
              </div>

              {/* VISTA PREVIA EN VIVO CLIENT-SIDE (FontFace API) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0B305B] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D2202E]" />
                    Vista Previa en Vivo (Renderizada con FontFace API)
                  </label>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Tamaño: {tamanoMuestra}px</span>
                    <input
                      type="range"
                      min="14"
                      max="40"
                      value={tamanoMuestra}
                      onChange={(e) => setTamanoMuestra(Number(e.target.value))}
                      className="w-16 accent-[#0B305B] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[100px] flex items-center justify-center text-center">
                  {previewFontFamily ? (
                    <p
                      className="text-slate-900 leading-tight transition-all"
                      style={{
                        fontFamily: `"${previewFontFamily}", sans-serif`,
                        fontSize: `${tamanoMuestra}px`,
                      }}
                    >
                      {textoMuestra || 'Universidad del Sinú'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Selecciona un archivo .ttf o .otf para visualizar la tipografía en tiempo real antes de subirla.
                    </p>
                  )}
                </div>

                {previewFontFamily && (
                  <input
                    type="text"
                    value={textoMuestra}
                    onChange={(e) => setTextoMuestra(e.target.value)}
                    placeholder="Escribe un texto de prueba personalizado..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-[#0B305B]"
                  />
                )}
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={subiendo}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendo || !archivoSeleccionado}
                  className="px-5 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-[#D2202E]/20 disabled:opacity-50 cursor-pointer"
                >
                  {subiendo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en el catálogo...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Guardar en el Catálogo Global</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

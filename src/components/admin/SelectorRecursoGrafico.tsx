'use client'

import React, { useState, useRef } from 'react'
import {
  Link2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  CloudUpload,
} from 'lucide-react'

interface Props {
  etiqueta: string
  descripcion: string
  nombreCampoUrl: string
  nombreCampoArchivo: string
  valorInicialUrl?: string | null
  aspectoRecomendado?: string
}

export default function SelectorRecursoGrafico({
  etiqueta,
  descripcion,
  nombreCampoUrl,
  nombreCampoArchivo,
  valorInicialUrl = '',
  aspectoRecomendado,
}: Props) {
  const [modo, setModo] = useState<'url' | 'archivo'>('url')
  const [urlIngresada, setUrlIngresada] = useState(valorInicialUrl || '')
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [previewLocal, setPreviewLocal] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivoSeleccionado(file)
      const urlPreview = URL.createObjectURL(file)
      setPreviewLocal(urlPreview)
    }
  }

  const limpiarArchivo = () => {
    setArchivoSeleccionado(null)
    if (previewLocal) {
      URL.revokeObjectURL(previewLocal)
      setPreviewLocal(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 transition-all">
      {/* Cabecera del recurso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#0B305B]" />
            {etiqueta}
          </label>
          <p className="text-[10px] text-slate-500">{descripcion}</p>
        </div>

        {/* Sistema de Pestañas (Tabs): URL externa vs Subir Archivo */}
        <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[10px] font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setModo('url')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              modo === 'url'
                ? 'bg-white text-[#0B305B] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3 h-3" />
            Pegar URL externa
          </button>
          <button
            type="button"
            onClick={() => setModo('archivo')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              modo === 'archivo'
                ? 'bg-white text-[#D2202E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3 h-3" />
            Subir desde el equipo
          </button>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {modo === 'url' ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              name={nombreCampoUrl}
              value={urlIngresada}
              onChange={(e) => setUrlIngresada(e.target.value)}
              placeholder="https://images.unsplash.com/... o https://midominio.com/foto.jpg"
              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs outline-none transition"
            />
            {urlIngresada && (
              <button
                type="button"
                onClick={() => setUrlIngresada('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Previsualización de la URL externa */}
          {urlIngresada && urlIngresada.startsWith('http') && (
            <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlIngresada}
                alt="Vista previa URL"
                className="w-16 h-10 object-cover rounded-lg border border-slate-100 shrink-0"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
              <div className="min-w-0 text-[10px] text-slate-500">
                <span className="font-bold text-emerald-700 block">URL vinculada correctamente</span>
                <span className="truncate block font-mono">{urlIngresada}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Campo de Archivo Oculto / Dropzone estilizada */}
          <input
            ref={fileInputRef}
            type="file"
            name={nombreCampoArchivo}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            onChange={handleArchivoChange}
            className="hidden"
            id={`file-input-${nombreCampoArchivo}`}
          />

          {!archivoSeleccionado ? (
            <label
              htmlFor={`file-input-${nombreCampoArchivo}`}
              className="border-2 border-dashed border-slate-300 hover:border-[#0B305B] hover:bg-slate-100/50 bg-white rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center"
            >
              <div className="p-1.5 bg-blue-50 text-[#0B305B] rounded-lg">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700">
                  Haz clic para seleccionar una imagen de tu equipo
                </p>
                <p className="text-[10px] text-slate-400">
                  PNG, JPG o WEBP {aspectoRecomendado ? `• Recomendado: ${aspectoRecomendado}` : ''}
                </p>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Almacenamiento: Supabase Storage (recursos_eventos)
              </span>
            </label>
          ) : (
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {previewLocal && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewLocal}
                    alt="Preview"
                    className="w-14 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                )}
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-slate-900 truncate">
                    {archivoSeleccionado.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {(archivoSeleccionado.size / 1024).toFixed(1)} KB &bull; Listo para subir a Supabase Storage
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={limpiarArchivo}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


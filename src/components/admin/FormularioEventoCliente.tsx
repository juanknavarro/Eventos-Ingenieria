'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react'
import { EstadoEvento } from '@prisma/client'
import { crearEvento, actualizarEvento } from '@/actions/admin'
import SelectorRecursoGrafico from '@/components/admin/SelectorRecursoGrafico'

interface EventoInicial {
  id: string
  titulo: string
  descripcion: string
  fechaInicio: Date | string
  fechaFin: Date | string
  ubicacion: string
  capacidadMaxima: number | null
  precio: number
  estado: EstadoEvento
  imagenUrl: string | null
  logo_fondo_url: string | null
  imagen_central_url: string | null
  sponsors_url: string | null
}

interface Props {
  eventoInicial?: EventoInicial | null
}

export default function FormularioEventoCliente({ eventoInicial }: Props) {
  const router = useRouter()
  const esEdicion = !!eventoInicial

  const [cargando, setCargando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCargando(true)
    setMensajeError(null)
    setMensajeExito(null)

    try {
      const formData = new FormData(e.currentTarget)
      let res

      if (esEdicion && eventoInicial) {
        formData.append('eventoId', eventoInicial.id)
        res = await actualizarEvento(formData)
      } else {
        res = await crearEvento(formData)
      }

      if (res.success) {
        setMensajeExito(res.message || 'Evento guardado exitosamente.')
        setTimeout(() => {
          router.push('/admin')
          router.refresh()
        }, 1200)
      } else {
        setMensajeError(res.error || 'Error al procesar el evento.')
        setCargando(false)
      }
    } catch (err) {
      console.error('Error al guardar evento:', err)
      setMensajeError('Ocurrió un error inesperado al conectar con el servidor.')
      setCargando(false)
    }
  }

  // Formatear fechas iniciales si existen
  const fechaInicioDefault = eventoInicial?.fechaInicio
    ? new Date(eventoInicial.fechaInicio).toISOString().slice(0, 16)
    : ''
  const fechaFinDefault = eventoInicial?.fechaFin
    ? new Date(eventoInicial.fechaFin).toISOString().slice(0, 16)
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alertas de Notificación */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito} Redirigiendo al panel...</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-900 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* DISPOSICIÓN EN 2 COLUMNAS (ESCRITORIO) / FLEX-COL (MÓVILES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA: DATOS BÁSICOS DEL EVENTO (7 Columnas en LG) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-[#0B305B] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D2202E]" />
                Información General del Evento
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Define el título, fechas, ubicación y detalles académicos del evento para la comunidad universitaria.
              </p>
            </div>

            {/* Título del Evento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                Título del Evento <span className="text-[#D2202E]">*</span>
              </label>
              <input
                type="text"
                name="titulo"
                defaultValue={eventoInicial?.titulo || ''}
                required
                placeholder="Ej. Congreso Internacional de IA y Tecnologías Emergentes 2026"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                Descripción y Contenido Temático <span className="text-[#D2202E]">*</span>
              </label>
              <textarea
                name="descripcion"
                defaultValue={eventoInicial?.descripcion || ''}
                rows={4}
                required
                placeholder="Detalla los objetivos del evento, conferencistas magistrales, público objetivo y actividades a desarrollar..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition resize-none leading-relaxed"
              />
            </div>

            {/* Fechas: Inicio y Fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B305B]" />
                  Fecha y Hora de Inicio <span className="text-[#D2202E]">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="fechaInicio"
                  defaultValue={fechaInicioDefault}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B305B]" />
                  Fecha y Hora de Finalización
                </label>
                <input
                  type="datetime-local"
                  name="fechaFin"
                  defaultValue={fechaFinDefault}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
              </div>
            </div>

            {/* Ubicación / Auditorio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D2202E]" />
                Lugar o Auditorio del Evento <span className="text-[#D2202E]">*</span>
              </label>
              <input
                type="text"
                name="ubicacion"
                defaultValue={eventoInicial?.ubicacion || ''}
                required
                placeholder="Ej. Auditorio Benjamín Herrera, Campus Santillana, UniSinú"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
              />
            </div>

            {/* Precio y Capacidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Valor de Inscripción (COP)
                </label>
                <input
                  type="number"
                  name="precio"
                  defaultValue={eventoInicial?.precio ?? 0}
                  min={0}
                  step={1000}
                  placeholder="0 para evento gratuito"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
                <span className="text-[10px] text-slate-400">
                  Si es de pago, el profesor registrará el recaudo en efectivo.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0B305B]" />
                  Aforo / Capacidad Máxima
                </label>
                <input
                  type="number"
                  name="capacidadMaxima"
                  defaultValue={eventoInicial?.capacidadMaxima ?? ''}
                  min={1}
                  placeholder="Vacío = Sin límite de cupos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
                <span className="text-[10px] text-slate-400">
                  Límite de alumnos admitidos para preinscripción.
                </span>
              </div>
            </div>

            {/* Estado del Evento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">
                Estado Inicial de Publicación
              </label>
              <select
                name="estado"
                defaultValue={eventoInicial?.estado || 'PUBLICADO'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
              >
                <option value="PUBLICADO">PUBLICADO (Visible en la plataforma para preinscripción)</option>
                <option value="BORRADOR">BORRADOR (Oculto para el público)</option>
                <option value="EN_CURSO">EN CURSO (Activo en puertas)</option>
                <option value="FINALIZADO">FINALIZADO (Certificados disponibles)</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA: RECURSOS GRÁFICOS Y CARNETIZACIÓN (5 Columnas en LG) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-[#0B305B] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0B305B]" />
                Recursos Gráficos y Escarapela (90 x 130 mm)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Personaliza la identidad del carnet. Puedes subir archivos locales a Supabase Storage o vincular URLs externas.
              </p>
            </div>

            {/* 1. Imagen Central del Evento */}
            <SelectorRecursoGrafico
              etiqueta="Imagen Central Temática del Evento"
              descripcion="Ilustración o foto que se proyecta en el centro del carnet físico (sustituye la bonificación)."
              nombreCampoUrl="imagen_central_url"
              nombreCampoArchivo="archivo_imagen_central"
              valorInicialUrl={eventoInicial?.imagen_central_url}
              aspectoRecomendado="Horizontal (16:9 o 3:2)"
            />

            {/* 2. Imagen de Cabecera / Fondo */}
            <SelectorRecursoGrafico
              etiqueta="Imagen de Fondo o Cabecera Superior"
              descripcion="Fondo decorativo superior tras el membrete institucional y título del evento."
              nombreCampoUrl="logo_fondo_url"
              nombreCampoArchivo="archivo_logo_fondo"
              valorInicialUrl={eventoInicial?.logo_fondo_url}
              aspectoRecomendado="Panorámica (4:1 o 3:1)"
            />

            {/* 3. Franja de Patrocinadores (Sponsors) */}
            <SelectorRecursoGrafico
              etiqueta="Franja de Patrocinadores Oficiales (Sponsors)"
              descripcion="Banner o tira de marcas aliadas renderizada en el pie de página de la escarapela."
              nombreCampoUrl="sponsors_url"
              nombreCampoArchivo="archivo_sponsors"
              valorInicialUrl={eventoInicial?.sponsors_url}
              aspectoRecomendado="Franja Horizontal (5:1 o 6:1)"
            />

            {/* Guía informativa de estándares gráficos */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-4 h-4 text-[#0B305B]" />
                Estándares Oficiales de Impresión:
              </div>
              <ul className="space-y-1 list-disc list-inside text-slate-500">
                <li>Formato carnet vertical: <strong>90 mm x 130 mm</strong>.</li>
                <li>Almacenamiento: Bucket público <strong>recursos_eventos</strong> en Supabase.</li>
                <li>Se genera automáticamente el código de barras <strong>Code-128</strong> para escáner físico.</li>
              </ul>
            </div>
          </div>

          {/* Botones de Acción / Guardar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/admin"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition text-center"
            >
              Cancelar y Regresar
            </Link>

            <button
              type="submit"
              disabled={cargando}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#D2202E] hover:bg-[#B01824] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D2202E]/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo y Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {esEdicion ? 'Actualizar Evento' : 'Publicar Evento Académico'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}


'use client'

import React, { useState, useRef } from 'react'
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
  GraduationCap,
  Award,
  Eye,
  Palette,
  ChevronDown,
} from 'lucide-react'
import { EstadoEvento } from '@prisma/client'
import { crearEvento, actualizarEvento } from '@/actions/admin'
import SelectorRecursoGrafico from '@/components/admin/SelectorRecursoGrafico'
import { generarCertificadoPdf } from '@/lib/pdf/generador'
import { generarPdfEscarapela } from '@/lib/pdf/generadorEscarapela'

interface EventoInicial {
  id: string
  titulo: string
  descripcion: string
  fechaInicio: Date | string
  fechaFin: Date | string
  fecha_limite_inscripcion?: Date | string | null
  ubicacion: string
  capacidadMaxima: number | null
  precio: number
  estado: EstadoEvento
  imagenUrl: string | null
  logo_fondo_url: string | null
  imagen_central_url: string | null
  sponsors_url: string | null
  certificado_plantilla_url?: string | null
  escarapela_plantilla_url?: string | null
  horas_academicas?: number | null
  mensaje_participacion?: string | null
  intensidad_horaria?: string | null
  nombre_firmante_1?: string | null
  cargo_firmante_1?: string | null
  firma_organizador_url?: string | null
  firma_director_url?: string | null
  nombre_firmante_2?: string | null
  cargo_firmante_2?: string | null
  programa_academico?: string | null
  // Estilos visuales y tipografía dinámica (Diploma)
  fuente_certificado?: string | null
  color_nombre_alumno?: string | null
  color_texto_principal?: string | null
  tamano_nombre_alumno?: number | null
  tamano_participacion?: number | null
  color_firmantes?: string | null
  // Estilos visuales y tipografía dinámica (Escarapela)
  tamano_nombre_escarapela?: number | null
  color_nombre_escarapela?: string | null
  tamano_carrera_escarapela?: number | null
  color_carrera_escarapela?: string | null
  color_fondo_rol_escarapela?: string | null
  color_texto_rol_escarapela?: string | null
  estilo_etiqueta_rol?: string | null
}

interface Props {
  eventoInicial?: EventoInicial | null
  programaUsuario?: string | null
  esSuperAdmin?: boolean
  programas?: { id: string; nombre: string }[]
}

export default function FormularioEventoCliente({
  eventoInicial,
  programaUsuario,
  esSuperAdmin = false,
  programas = [],
}: Props) {
  const router = useRouter()
  const esEdicion = !!eventoInicial
  const formRef = useRef<HTMLFormElement>(null)

  const [cargando, setCargando] = useState(false)
  const [generandoEscarapela, setGenerandoEscarapela] = useState(false)
  const [generandoCertificado, setGenerandoCertificado] = useState(false)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Estados sincronizados para los controles de color (Diploma)
  const [estilosAbiertos, setEstilosAbiertos] = useState(true)
  const [colorNombre, setColorNombre] = useState(eventoInicial?.color_nombre_alumno || '#0B305B')
  const [colorTexto, setColorTexto] = useState(eventoInicial?.color_texto_principal || '#1E293B')
  const [colorFirmas, setColorFirmas] = useState(eventoInicial?.color_firmantes || '#0F172A')

  // Estados sincronizados para los controles de color (Escarapela)
  const [estilosEscarapelaAbiertos, setEstilosEscarapelaAbiertos] = useState(true)
  const [estiloRol, setEstiloRol] = useState(eventoInicial?.estilo_etiqueta_rol || 'SOLIDO')
  const [colorNombreEsc, setColorNombreEsc] = useState(eventoInicial?.color_nombre_escarapela || '#0B305B')
  const [colorCarreraEsc, setColorCarreraEsc] = useState(eventoInicial?.color_carrera_escarapela || '#526176')
  const [colorFondoRolEsc, setColorFondoRolEsc] = useState(eventoInicial?.color_fondo_rol_escarapela || '#D2202E')
  const [colorTextoRolEsc, setColorTextoRolEsc] = useState(eventoInicial?.color_texto_rol_escarapela || '#FFFFFF')

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
        setMensajeExito(res.message || (esEdicion ? 'Evento actualizado correctamente.' : 'Evento guardado exitosamente.'))
        setCargando(false)
        if (esEdicion) {
          router.refresh()
          setTimeout(() => {
            setMensajeExito(null)
          }, 4000)
        } else {
          setTimeout(() => {
            window.location.href = '/admin'
          }, 1000)
        }
      } else {
        setMensajeError(res.error || 'Error al procesar el evento.')
        setCargando(false)
      }
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT') {
        if (!esEdicion) {
          window.location.href = '/admin'
        }
        return
      }
      console.error('Error al guardar evento:', err)
      setMensajeError('Ocurrió un error inesperado al conectar con el servidor.')
      setCargando(false)
    } finally {
      setCargando(false)
    }
  }

  // Generador de Vista Previa en Vivo (Client-Side con datos de simulación)
  const handleVistaPrevia = async (tipo: 'certificado' | 'escarapela') => {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)

    // Función auxiliar para extraer URL o convertir archivo local seleccionado a blob URL en vivo
    const getUrlOArchivoLocal = (nombreUrl: string, nombreArchivo: string, fallback?: string | null) => {
      const archivo = formData.get(nombreArchivo) as File | null
      if (archivo && archivo.size > 0) {
        return URL.createObjectURL(archivo)
      }
      const url = (formData.get(nombreUrl) as string)?.trim()
      return url || fallback || null
    }

    const titulo = (formData.get('titulo') as string)?.trim() || eventoInicial?.titulo || 'Congreso Internacional de Ingeniería y Tecnologías Emergentes 2026'
    const fechaInicio = (formData.get('fechaInicio') as string) || eventoInicial?.fechaInicio || new Date().toISOString()
    const mensajeParticipacion = (formData.get('mensaje_participacion') as string)?.trim() || eventoInicial?.mensaje_participacion || 'Por su asistencia, cumplimiento y destacada participación académica en el evento:'
    const intensidadHoraria = (formData.get('intensidad_horaria') as string)?.trim() || eventoInicial?.intensidad_horaria || '4 horas'
    const horasAcademicasStr = formData.get('horas_academicas') as string
    const horasAcademicas = horasAcademicasStr ? parseInt(horasAcademicasStr, 10) : (eventoInicial?.horas_academicas || 4)

    // Estilos dinámicos y tipografía extraídos en vivo de la pantalla
    const fuenteCertificado = (formData.get('fuente_certificado') as string)?.trim() || eventoInicial?.fuente_certificado || 'Montserrat'
    const colorNombreAlumno = (formData.get('color_nombre_alumno') as string)?.trim() || eventoInicial?.color_nombre_alumno || '#0B305B'
    const colorTextoPrincipal = (formData.get('color_texto_principal') as string)?.trim() || eventoInicial?.color_texto_principal || '#1E293B'
    const tamanoNombreAlumnoStr = formData.get('tamano_nombre_alumno') as string
    const tamanoNombreAlumno = tamanoNombreAlumnoStr ? parseInt(tamanoNombreAlumnoStr, 10) : (eventoInicial?.tamano_nombre_alumno || 24)
    const tamanoParticipacionStr = formData.get('tamano_participacion') as string
    const tamanoParticipacion = tamanoParticipacionStr ? parseInt(tamanoParticipacionStr, 10) : (eventoInicial?.tamano_participacion || 12)
    const colorFirmantes = (formData.get('color_firmantes') as string)?.trim() || eventoInicial?.color_firmantes || '#0F172A'

    // Estilos dinámicos para la escarapela extraídos en vivo de la pantalla
    const tamanoNombreEscStr = formData.get('tamano_nombre_escarapela') as string
    const tamanoNombreEsc = tamanoNombreEscStr ? parseInt(tamanoNombreEscStr, 10) : (eventoInicial?.tamano_nombre_escarapela || 13)
    const colorNombreEscLive = (formData.get('color_nombre_escarapela') as string)?.trim() || eventoInicial?.color_nombre_escarapela || '#0B305B'
    const tamanoCarreraEscStr = formData.get('tamano_carrera_escarapela') as string
    const tamanoCarreraEsc = tamanoCarreraEscStr ? parseInt(tamanoCarreraEscStr, 10) : (eventoInicial?.tamano_carrera_escarapela || 7)
    const colorCarreraEscLive = (formData.get('color_carrera_escarapela') as string)?.trim() || eventoInicial?.color_carrera_escarapela || '#526176'
    const colorFondoRolEscLive = (formData.get('color_fondo_rol_escarapela') as string)?.trim() || eventoInicial?.color_fondo_rol_escarapela || '#D2202E'
    const colorTextoRolEscLive = (formData.get('color_texto_rol_escarapela') as string)?.trim() || eventoInicial?.color_texto_rol_escarapela || '#FFFFFF'
    const estiloRolLive = (formData.get('estilo_etiqueta_rol') as string)?.trim() || eventoInicial?.estilo_etiqueta_rol || 'SOLIDO'

    // Datos y firmas para certificados
    const nombreFirmante1 = (formData.get('nombre_firmante_1') as string)?.trim() || eventoInicial?.nombre_firmante_1 || 'Ing. Roberto Gómez'
    const cargoFirmante1 = (formData.get('cargo_firmante_1') as string)?.trim() || eventoInicial?.cargo_firmante_1 || 'Decano Facultad de Ciencias e Ingenierías'
    const firmaOrganizadorUrl = getUrlOArchivoLocal('firma_organizador_url', 'archivo_firma_organizador', eventoInicial?.firma_organizador_url)

    const nombreFirmante2 = (formData.get('nombre_firmante_2') as string)?.trim() || eventoInicial?.nombre_firmante_2 || null
    const cargoFirmante2 = (formData.get('cargo_firmante_2') as string)?.trim() || eventoInicial?.cargo_firmante_2 || null
    const firmaDirectorUrl = getUrlOArchivoLocal('firma_director_url', 'archivo_firma_director', eventoInicial?.firma_director_url)

    // Recursos gráficos para escarapela y certificado
    const certificadoPlantillaUrl = getUrlOArchivoLocal('certificado_plantilla_url', 'archivo_certificado_plantilla', eventoInicial?.certificado_plantilla_url)
    const escarapelaPlantillaUrl = getUrlOArchivoLocal('escarapela_plantilla_url', 'archivo_escarapela_plantilla', eventoInicial?.escarapela_plantilla_url)
    const imagenCentralUrl = getUrlOArchivoLocal('imagen_central_url', 'archivo_imagen_central', eventoInicial?.imagen_central_url)
    const logoFondoUrl = getUrlOArchivoLocal('logo_fondo_url', 'archivo_logo_fondo', eventoInicial?.logo_fondo_url)
    const sponsorsUrl = getUrlOArchivoLocal('sponsors_url', 'archivo_sponsors', eventoInicial?.sponsors_url)

    // Alumno simulado
    const ESTUDIANTE_MOCK = {
      alumnoNombre: 'JUAN PÉREZ DÍAZ',
      alumnoCedula: '1.047.891.234',
      alumnoDocumento: '1.047.891.234',
      alumnoCodigo: 'T00054321',
      alumnoCarrera: 'Ingeniería de Sistemas',
      alumnoSemestre: '8vo Semestre',
      rolAsistente: 'ESTUDIANTE',
    }

    if (tipo === 'certificado') {
      try {
        setGenerandoCertificado(true)
        const pdfBytes = await generarCertificadoPdf({
          alumnoNombre: ESTUDIANTE_MOCK.alumnoNombre,
          alumnoDocumento: ESTUDIANTE_MOCK.alumnoDocumento,
          alumnoCarrera: ESTUDIANTE_MOCK.alumnoCarrera,
          eventoTitulo: titulo,
          horasAcademicas: horasAcademicas,
          intensidadHoraria: intensidadHoraria,
          mensajeParticipacion: mensajeParticipacion,
          fechaEvento: fechaInicio,
          fondoUrl: certificadoPlantillaUrl || '/imagen_2.png',
          nombreFirmante1: nombreFirmante1,
          cargoFirmante1: cargoFirmante1,
          firmaOrganizadorUrl: firmaOrganizadorUrl,
          nombreFirmante2: nombreFirmante2,
          cargoFirmante2: cargoFirmante2,
          firmaDirectorUrl: firmaDirectorUrl,
          asistenciaId: 'PREVIEW-CERT-2026',
          // Estilos dinámicos
          fuenteCertificado,
          colorNombreAlumno,
          colorTextoPrincipal,
          tamanoNombreAlumno,
          tamanoParticipacion,
          colorFirmantes,
        })
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      } catch (err) {
        console.error('Error generando vista previa del certificado:', err)
        alert('Ocurrió un error al compilar la vista previa del certificado PDF. Revisa las imágenes vinculadas.')
      } finally {
        setGenerandoCertificado(false)
      }
    } else if (tipo === 'escarapela') {
      try {
        setGenerandoEscarapela(true)
        const pdfBytes = await generarPdfEscarapela({
          alumnoNombre: ESTUDIANTE_MOCK.alumnoNombre,
          alumnoCedula: ESTUDIANTE_MOCK.alumnoCedula,
          alumnoCodigo: ESTUDIANTE_MOCK.alumnoCodigo,
          alumnoCarrera: ESTUDIANTE_MOCK.alumnoCarrera,
          alumnoSemestre: ESTUDIANTE_MOCK.alumnoSemestre,
          rolAsistente: ESTUDIANTE_MOCK.rolAsistente,
          eventoTitulo: titulo,
          fondoUrl: escarapelaPlantillaUrl || logoFondoUrl,
          eventoImagenCentralUrl: imagenCentralUrl,
          eventoSponsorsUrl: sponsorsUrl,
          eventoLogoUniversidadUrl: '/imagen_2.png',
          colorPrimarioHex: '#0B305B',
          colorSecundarioHex: '#D2202E',
          qrPayload: `PREVIEW-ESCARAPELA-${ESTUDIANTE_MOCK.alumnoCodigo}`,
          inscripcionId: 'PREVIEW-ESCARAPELA-123',
          // Estilos dinámicos y colores personalizados
          tamanoNombre: tamanoNombreEsc,
          tamano_nombre_escarapela: tamanoNombreEsc,
          colorNombre: colorNombreEscLive,
          color_nombre_escarapela: colorNombreEscLive,
          tamanoCarrera: tamanoCarreraEsc,
          tamano_carrera_escarapela: tamanoCarreraEsc,
          colorCarrera: colorCarreraEscLive,
          color_carrera_escarapela: colorCarreraEscLive,
          colorFondoRol: colorFondoRolEscLive,
          color_fondo_rol_escarapela: colorFondoRolEscLive,
          colorTextoRol: colorTextoRolEscLive,
          color_texto_rol_escarapela: colorTextoRolEscLive,
          estiloRol: estiloRolLive,
          estilo_etiqueta_rol: estiloRolLive,
        })
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      } catch (err) {
        console.error('Error generando vista previa de la escarapela:', err)
        alert('Ocurrió un error al compilar la vista previa de la escarapela PDF. Revisa las imágenes vinculadas.')
      } finally {
        setGenerandoEscarapela(false)
      }
    }
  }

  // Formatear fechas iniciales si existen
  const fechaInicioDefault = eventoInicial?.fechaInicio
    ? new Date(eventoInicial.fechaInicio).toISOString().slice(0, 16)
    : ''
  const fechaFinDefault = eventoInicial?.fechaFin
    ? new Date(eventoInicial.fechaFin).toISOString().slice(0, 16)
    : ''
  const fechaLimiteDefault = eventoInicial?.fecha_limite_inscripcion
    ? new Date(eventoInicial.fecha_limite_inscripcion).toISOString().slice(0, 16)
    : ''

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
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

            {/* Fecha Límite de Preinscripción Desacoplada */}
            <div className="space-y-1.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D2202E]" />
                  Fecha Límite de Inscripción (Opcional)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Cierre de cupos anticipado
                </span>
              </label>
              <input
                type="datetime-local"
                name="fecha_limite_inscripcion"
                defaultValue={fechaLimiteDefault}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#0B305B] rounded-xl text-xs font-medium outline-none transition"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Establece el momento exacto en que se bloqueará el botón &quot;Preinscribirme&quot; en el portal. Si se deja en blanco, las inscripciones cerrarán automáticamente al iniciar el evento.
              </p>
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

            {/* Programa Académico (Multi-Tenancy) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#0B305B]" />
                Programa Académico Asignado *
              </label>
              {esSuperAdmin ? (
                <select
                  name="programa_academico"
                  defaultValue={eventoInicial?.programa_academico || 'Facultad de Ingenierías'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
                >
                  <option value="Facultad de Ingenierías">Facultad de Ingenierías (General / Todas)</option>
                  {programas && programas.length > 0 ? (
                    programas.map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                      <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                      <option value="Ingeniería Civil">Ingeniería Civil</option>
                      <option value="Ingeniería Electromecánica">Ingeniería Electromecánica</option>
                      <option value="Ingeniería de Software y Tecnologías Emergentes">Ingeniería de Software y Tecnologías Emergentes</option>
                    </>
                  )}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    name="programa_academico"
                    defaultValue={eventoInicial?.programa_academico || programaUsuario || 'Facultad de Ingenierías'}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">
                    Asignado a tu programa académico ({programaUsuario || 'Departamento'})
                  </span>
                </div>
              )}
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

            {/* Textos Oficiales de Certificación y Participación */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#D2202E]" />
                <h3 className="text-xs font-bold text-[#0B305B]">Textos Oficiales de Certificación (PDF)</h3>
              </div>

              {/* Intensidad Horaria */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0B305B]" />
                    Intensidad Horaria Certificada (Texto Libre)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">intensidad_horaria</span>
                </label>
                <input
                  type="text"
                  name="intensidad_horaria"
                  defaultValue={eventoInicial?.intensidad_horaria || '4 horas'}
                  placeholder="Ej. 4 horas, 40 horas académicas, 12 horas teórico-prácticas"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition"
                />
                <span className="text-[10px] text-slate-400">
                  Texto descriptivo que aparecerá en el diploma (ej. &quot;4 horas&quot;, &quot;20 horas académicas&quot;).
                </span>
              </div>

              {/* Mensaje de Participación */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Declaración / Mensaje de Participación</span>
                  <span className="text-[10px] text-slate-400 font-mono">mensaje_participacion</span>
                </label>
                <textarea
                  name="mensaje_participacion"
                  rows={2}
                  defaultValue={
                    eventoInicial?.mensaje_participacion ||
                    'Por su asistencia, cumplimiento y destacada participación académica en el evento:'
                  }
                  placeholder="Ej. Por su asistencia, cumplimiento y destacada participación académica en el evento:"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-medium outline-none transition resize-none leading-relaxed"
                />
                <span className="text-[10px] text-slate-400">
                  Frase de reconocimiento que precede el título del evento en el certificado oficial.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA: RECURSOS GRÁFICOS Y CARNETIZACIÓN (5 Columnas en LG) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0B305B] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#0B305B]" />
                  Recursos Gráficos y Escarapela (90 x 130 mm)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Personaliza la identidad del carnet. Puedes subir archivos locales a Supabase Storage o vincular URLs externas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleVistaPrevia('escarapela')}
                disabled={generandoEscarapela}
                className="shrink-0 px-3.5 py-2 bg-slate-100 hover:bg-[#0B305B] hover:text-white text-[#0B305B] font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                title="Generar vista previa en vivo de la escarapela en PDF"
              >
                {generandoEscarapela ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Previa (Escarapela)</span>
                  </>
                )}
              </button>
            </div>

            {/* Plantilla Base / Lienzo Vertical de la Escarapela */}
            <SelectorRecursoGrafico
              etiqueta="Lienzo / Imagen de Fondo de la Escarapela (Plantilla Vertical)"
              descripcion="Plantilla vertical oficial en alta resolución (PNG o JPG) sobre la cual se estamparán el nombre, documento, rol y código QR de acceso."
              nombreCampoUrl="escarapela_plantilla_url"
              nombreCampoArchivo="archivo_escarapela_plantilla"
              valorInicialUrl={eventoInicial?.escarapela_plantilla_url}
              aspectoRecomendado="Vertical Carnet (90 x 130 mm / 255 x 368 pt)"
            />

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

          {/* ========================================================================= */}
          {/* SECCIÓN: ESTILOS VISUALES Y COLORES DE LA ESCARAPELA (CARNET)              */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 border-t-4 border-[#0B305B]">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setEstilosEscarapelaAbiertos(!estilosEscarapelaAbiertos)}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#0B305B]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B305B]">
                    Estilos Visuales y Colores de la Escarapela (Carnet)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Personaliza tamaños de letra y colores de identificación para el carnet físico.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${
                    estilosEscarapelaAbiertos ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {estilosEscarapelaAbiertos && (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                {/* 1. Selector de Estilo de Etiqueta de Rol */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Estilo Visual de la Etiqueta de Rol</span>
                    <span className="text-[10px] text-slate-400 font-mono">estilo_etiqueta_rol</span>
                  </label>
                  <select
                    name="estilo_etiqueta_rol"
                    value={estiloRol}
                    onChange={(e) => setEstiloRol(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
                  >
                    <option value="SOLIDO">Fondo Sólido Pleno (Píldora Rellena)</option>
                    <option value="CONTORNO_CURVO">Contorno Curvo / Píldora Elegante (Borde Redondeado)</option>
                    <option value="TEXTO_LIBRE">Texto Libre Minimalista (Sin Recuadro)</option>
                  </select>
                </div>

                {/* 2. Tamaños de Fuente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tamaño Nombre Asistente</span>
                      <span className="text-[10px] text-slate-400 font-mono">tamano_nombre_escarapela</span>
                    </label>
                    <input
                      type="number"
                      name="tamano_nombre_escarapela"
                      min="9"
                      max="20"
                      defaultValue={eventoInicial?.tamano_nombre_escarapela || 13}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0B305B]"
                    />
                    <span className="text-[10px] text-slate-400">Rango: 9 a 20 pt (Default: 13)</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tamaño Carrera / Programa</span>
                      <span className="text-[10px] text-slate-400 font-mono">tamano_carrera_escarapela</span>
                    </label>
                    <input
                      type="number"
                      name="tamano_carrera_escarapela"
                      min="5"
                      max="14"
                      defaultValue={eventoInicial?.tamano_carrera_escarapela || 7}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0B305B]"
                    />
                    <span className="text-[10px] text-slate-400">Rango: 5 a 14 pt (Default: 7)</span>
                  </div>
                </div>

                {/* 3. Paleta Cromática */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block">
                    Paleta Cromática de la Escarapela
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Color Nombre */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Color del Nombre
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorNombreEsc}
                          onChange={(e) => setColorNombreEsc(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        <input
                          type="text"
                          name="color_nombre_escarapela"
                          value={colorNombreEsc}
                          onChange={(e) => setColorNombreEsc(e.target.value)}
                          placeholder="#0B305B"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                        />
                      </div>
                    </div>

                    {/* Color Carrera */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Color Carrera / Programa
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorCarreraEsc}
                          onChange={(e) => setColorCarreraEsc(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        <input
                          type="text"
                          name="color_carrera_escarapela"
                          value={colorCarreraEsc}
                          onChange={(e) => setColorCarreraEsc(e.target.value)}
                          placeholder="#526176"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                        />
                      </div>
                    </div>

                    {/* Color Fondo Rol (Píldora / Borde) */}
                    <div className={`space-y-1 transition-opacity ${estiloRol === 'TEXTO_LIBRE' ? 'opacity-40 pointer-events-none' : ''}`}>
                      <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>
                          {estiloRol === 'CONTORNO_CURVO'
                            ? 'Color Borde / Contorno Rol'
                            : estiloRol === 'TEXTO_LIBRE'
                            ? 'Color Fondo (No aplica)'
                            : 'Color Fondo Etiqueta Rol'}
                        </span>
                        {estiloRol === 'CONTORNO_CURVO' && (
                          <span className="text-[9px] text-[#0B305B] font-semibold">Borde Curvo</span>
                        )}
                        {estiloRol === 'TEXTO_LIBRE' && (
                          <span className="text-[9px] text-slate-400 font-normal">Sin Contenedor</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorFondoRolEsc}
                          onChange={(e) => setColorFondoRolEsc(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        <input
                          type="text"
                          name="color_fondo_rol_escarapela"
                          value={colorFondoRolEsc}
                          onChange={(e) => setColorFondoRolEsc(e.target.value)}
                          placeholder="#D2202E"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                        />
                      </div>
                    </div>

                    {/* Color Texto Rol */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>
                          {estiloRol === 'TEXTO_LIBRE'
                            ? 'Color del Texto del Rol'
                            : 'Color Texto Etiqueta Rol'}
                        </span>
                        {estiloRol === 'CONTORNO_CURVO' && (
                          <span className="text-[9px] text-slate-400 font-normal">Auto-contraste si es blanco</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorTextoRolEsc}
                          onChange={(e) => setColorTextoRolEsc(e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                        />
                        <input
                          type="text"
                          name="color_texto_rol_escarapela"
                          value={colorTextoRolEsc}
                          onChange={(e) => setColorTextoRolEsc(e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN: PLANTILLA DE CERTIFICADO DIGITAL Y METADATOS EN PDF              */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 border-t-4 border-[#D2202E]">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0B305B] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#D2202E]" />
                  Certificación Oficial en PDF (Diplomas)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configura la imagen de fondo institucional (A4 horizontal) e intensidad horaria para la generación dinámica con pdf-lib.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleVistaPrevia('certificado')}
                disabled={generandoCertificado}
                className="shrink-0 px-3.5 py-2 bg-rose-50 hover:bg-[#D2202E] hover:text-white text-[#D2202E] font-bold text-xs rounded-xl border border-rose-200 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                title="Generar vista previa en vivo del certificado en PDF"
              >
                {generandoCertificado ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Previa (Certificado)</span>
                  </>
                )}
              </button>
            </div>

            {/* Plantilla de Fondo del Certificado */}
            <SelectorRecursoGrafico
              etiqueta="Lienzo / Imagen de Fondo del Diploma"
              descripcion="Plantilla gráfica oficial en alta resolución (PNG o JPG) sobre la cual se estamparán el nombre del alumno, cédula y código QR."
              nombreCampoUrl="certificado_plantilla_url"
              nombreCampoArchivo="archivo_certificado_plantilla"
              valorInicialUrl={eventoInicial?.certificado_plantilla_url}
              aspectoRecomendado="Horizontal A4 (842 x 595 px / 1.41:1)"
            />

            {/* Intensidad Horaria */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B305B]" />
                  Intensidad Horaria Certificada (Horas Numéricas) *
                </span>
                <span className="text-[10px] text-slate-400 font-mono">horas_academicas</span>
              </label>
              <input
                type="number"
                name="horas_academicas"
                min="1"
                max="500"
                defaultValue={eventoInicial?.horas_academicas || 4}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition"
              />
              <span className="text-[10px] text-slate-400">
                Horas académicas que se imprimirán en el certificado (ej. 4, 8, 20 horas).
              </span>
            </div>

            {/* Primer Firmante (Principal - Decanatura o Docente Líder) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Primer Firmante Institucional (Principal - Decano o Docente Líder)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Nombre del Primer Firmante</label>
                  <input
                    type="text"
                    name="nombre_firmante_1"
                    defaultValue={eventoInicial?.nombre_firmante_1 || ''}
                    placeholder="Ej. Ing. Roberto Gómez (Dejar vacío para usar default)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B305B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Cargo del Primer Firmante</label>
                  <input
                    type="text"
                    name="cargo_firmante_1"
                    defaultValue={eventoInicial?.cargo_firmante_1 || ''}
                    placeholder="Ej. Decano Facultad de Ciencias e Ingenierías"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B305B]"
                  />
                </div>
              </div>

              <SelectorRecursoGrafico
                etiqueta="Firma Digital Escaneada (Primer Firmante)"
                descripcion="Firma con fondo transparente PNG del decano o docente líder (opcional, si se omite usará la firma global institucional)."
                nombreCampoUrl="firma_organizador_url"
                nombreCampoArchivo="archivo_firma_organizador"
                valorInicialUrl={eventoInicial?.firma_organizador_url}
                aspectoRecomendado="Firma Horizontal (3:1 o 4:1)"
              />
            </div>

            {/* Segundo Firmante (Opcional - Director de Programa o Coordinador) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Segundo Firmante Institucional (Opcional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Nombre del Firmante</label>
                  <input
                    type="text"
                    name="nombre_firmante_2"
                    defaultValue={eventoInicial?.nombre_firmante_2 || ''}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B305B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Cargo del Firmante</label>
                  <input
                    type="text"
                    name="cargo_firmante_2"
                    defaultValue={eventoInicial?.cargo_firmante_2 || ''}
                    placeholder="Ej. Director de Programa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0B305B]"
                  />
                </div>
              </div>

              <SelectorRecursoGrafico
                etiqueta="Firma Digital Escaneada (Segundo Firmante)"
                descripcion="Firma con fondo transparente PNG del docente u organizador (opcional)."
                nombreCampoUrl="firma_director_url"
                nombreCampoArchivo="archivo_firma_director"
                valorInicialUrl={eventoInicial?.firma_director_url}
                aspectoRecomendado="Firma Horizontal (3:1 o 4:1)"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN: ESTILOS VISUALES Y TIPOGRAFÍA DEL DIPLOMA (PDF)                  */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5 border-t-4 border-[#0B305B]">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setEstilosAbiertos(!estilosAbiertos)}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#0B305B]" />
                <div>
                  <h2 className="text-base font-bold text-[#0B305B]">
                    Estilos Visuales y Tipografía (Diploma)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Personaliza fuentes, tamaños de texto y paleta cromática del certificado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${
                    estilosAbiertos ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {estilosAbiertos && (
              <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                {/* 1. Selector de Tipografía */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Familia Tipográfica Oficial</span>
                    <span className="text-[10px] text-slate-400 font-mono">fuente_certificado</span>
                  </label>
                  <select
                    name="fuente_certificado"
                    defaultValue={eventoInicial?.fuente_certificado || 'Montserrat'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
                  >
                    <optgroup label="Sans-Serif Modernas (Recomendadas)">
                      <option value="Montserrat">Montserrat (Limpia y Moderna)</option>
                      <option value="Roboto">Roboto (Geométrica)</option>
                      <option value="Helvetica">Helvetica (Estándar Suizo)</option>
                    </optgroup>
                    <optgroup label="Serif Clásicas / Solemnes">
                      <option value="Times">Times New Roman (Solemne / Institucional)</option>
                      <option value="Playfair">Playfair / Académica</option>
                    </optgroup>
                  </select>
                </div>

                {/* 2. Tamaños Tipográficos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tamaño Nombre Alumno</span>
                      <span className="text-[10px] text-slate-400 font-mono">pt</span>
                    </label>
                    <input
                      type="number"
                      name="tamano_nombre_alumno"
                      min="16"
                      max="36"
                      defaultValue={eventoInicial?.tamano_nombre_alumno || 24}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0B305B]"
                    />
                    <span className="text-[10px] text-slate-400">Rango: 16 a 36 pt (Default: 24)</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Tamaño Participación</span>
                      <span className="text-[10px] text-slate-400 font-mono">pt</span>
                    </label>
                    <input
                      type="number"
                      name="tamano_participacion"
                      min="9"
                      max="18"
                      defaultValue={eventoInicial?.tamano_participacion || 12}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#0B305B]"
                    />
                    <span className="text-[10px] text-slate-400">Rango: 9 a 18 pt (Default: 12)</span>
                  </div>
                </div>

                {/* 3. Colores Dinámicos (Color Picker + Input HEX) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block">
                    Paleta Cromática de Textos
                  </span>

                  {/* Color Nombre Alumno */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Color del Nombre del Alumno
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorNombre}
                        onChange={(e) => setColorNombre(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        name="color_nombre_alumno"
                        value={colorNombre}
                        onChange={(e) => setColorNombre(e.target.value)}
                        placeholder="#0B305B"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                      />
                    </div>
                  </div>

                  {/* Color Texto Principal / Cuerpo */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Color de Declaración y Horas
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorTexto}
                        onChange={(e) => setColorTexto(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        name="color_texto_principal"
                        value={colorTexto}
                        onChange={(e) => setColorTexto(e.target.value)}
                        placeholder="#1E293B"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                      />
                    </div>
                  </div>

                  {/* Color Firmas */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Color Nombres y Cargos de Firmantes
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorFirmas}
                        onChange={(e) => setColorFirmas(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        name="color_firmantes"
                        value={colorFirmas}
                        onChange={(e) => setColorFirmas(e.target.value)}
                        placeholder="#0F172A"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-[#0B305B]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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

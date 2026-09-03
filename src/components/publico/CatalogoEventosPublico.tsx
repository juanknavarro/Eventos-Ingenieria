'use client'

import React, { useState } from 'react'
import {
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  BookOpen,
  User,
  CreditCard,
  ArrowRight,
  Search,
  Tag,
  ShieldCheck,
  GraduationCap,
  Phone,
} from 'lucide-react'
import { preinscribirAlumno, verificarCedulaInscrita } from '@/actions/preinscripcion'

export interface EventoPublico {
  id: string
  titulo: string
  descripcion: string
  fechaInicio: Date | string
  fechaFin: Date | string
  ubicacion: string
  capacidadMaxima: number | null
  precio: number
  estado: string
  imagenUrl: string | null
  logo_fondo_url: string | null
  imagen_central_url: string | null
  sponsors_url: string | null
  _count: {
    inscripciones: number
  }
}

export interface AsignaturaOpcion {
  id: string
  nombre: string
  programa_academico: string
}

interface Props {
  eventos: EventoPublico[]
  asignaturas?: AsignaturaOpcion[]
}

const PROGRAMAS_ACADEMICOS = [
  'Ingeniería de Sistemas',
  'Ingeniería Industrial',
  'Ingeniería Civil',
  'Ingeniería Electromecánica',
  'Ingeniería de Software y Tecnologías Emergentes',
  'Otra Carrera / Invitado Externo',
]

const SEMESTRES = [
  '1er Semestre',
  '2do Semestre',
  '3er Semestre',
  '4to Semestre',
  '5to Semestre',
  '6to Semestre',
  '7mo Semestre',
  '8vo Semestre',
  '9no Semestre',
  '10mo Semestre',
  'Egresado / Graduado',
]

const ASIGNATURAS_FALLBACK = [
  'Inteligencia Artificial y Machine Learning',
  'Algoritmos y Estructura de Datos',
  'Programación Orientada a Objetos',
  'Bases de Datos I / II',
  'Arquitectura de Software y Cloud',
  'Redes y Ciberseguridad',
  'Cálculo Diferencial e Integral',
  'Física Mecánica y Termodinámica',
  'Investigación de Operaciones',
  'Gestión y Evaluación de Proyectos de TI',
  'Electiva Profesional de Profundización',
  'No aplica / Formación General',
]

export default function CatalogoEventosPublico({ eventos, asignaturas = [] }: Props) {
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoPublico | null>(null)
  const [filtroBusqueda, setFiltroBusqueda] = useState('')

  // Estados del formulario del Modal/Slide-over
  const [cedulaInput, setCedulaInput] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const [celularInput, setCelularInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [carreraInput, setCarreraInput] = useState(PROGRAMAS_ACADEMICOS[0])
  const [semestreInput, setSemestreInput] = useState('6to Semestre')
  const [asignaturaInput, setAsignaturaInput] = useState(
    asignaturas.length > 0 ? asignaturas[0].nombre : ASIGNATURAS_FALLBACK[0]
  )

  // Agrupamiento dinámico de asignaturas por programa académico
  const asignaturasAgrupadas = React.useMemo(() => {
    if (!asignaturas || asignaturas.length === 0) return []
    const mapa = new Map<string, AsignaturaOpcion[]>()
    for (const asig of asignaturas) {
      const prog = asig.programa_academico || 'Ciencias Básicas / Otras'
      const lista = mapa.get(prog) || []
      lista.push(asig)
      mapa.set(prog, lista)
    }
    return Array.from(mapa.entries())
  }, [asignaturas])

  // Estados de control, carga y validación crítica
  const [verificandoCedula, setVerificandoCedula] = useState(false)
  const [cargandoEnvio, setCargandoEnvio] = useState(false)
  const [alertaCedulaDuplicada, setAlertaCedulaDuplicada] = useState<string | null>(null)
  const [mensajeErrorServidor, setMensajeErrorServidor] = useState<string | null>(null)
  const [preinscripcionExitosa, setPreinscripcionExitosa] = useState<{
    tituloEvento: string
    nombreAlumno: string
    cedulaAlumno: string
  } | null>(null)

  // Filtrado reactivo en catálogo
  const eventosFiltrados = eventos.filter((e) => {
    const q = filtroBusqueda.toLowerCase()
    return (
      e.titulo.toLowerCase().includes(q) ||
      e.descripcion.toLowerCase().includes(q) ||
      e.ubicacion.toLowerCase().includes(q)
    )
  })

  // Abrir Modal de Preinscripción
  const handleAbrirPreinscripcion = (evento: EventoPublico) => {
    setEventoSeleccionado(evento)
    setCedulaInput('')
    setNombreInput('')
    setCelularInput('')
    setEmailInput('')
    setCarreraInput(PROGRAMAS_ACADEMICOS[0])
    setSemestreInput('6to Semestre')
    setAsignaturaInput(
      asignaturas.length > 0 ? asignaturas[0].nombre : ASIGNATURAS_FALLBACK[0]
    )
    setAlertaCedulaDuplicada(null)
    setMensajeErrorServidor(null)
    setPreinscripcionExitosa(null)
  }

  // Cerrar Modal
  const handleCerrarModal = () => {
    setEventoSeleccionado(null)
    setPreinscripcionExitosa(null)
    setAlertaCedulaDuplicada(null)
    setMensajeErrorServidor(null)
  }

  // Verificación crítica en el cliente al perder el foco (onBlur) de la cédula
  const handleVerificarCedulaEnCliente = async (cedulaAComprobar: string) => {
    if (!eventoSeleccionado || !cedulaAComprobar.trim()) {
      setAlertaCedulaDuplicada(null)
      return
    }

    setVerificandoCedula(true)
    try {
      const res = await verificarCedulaInscrita(eventoSeleccionado.id, cedulaAComprobar)
      if (res.yaInscrito) {
        setAlertaCedulaDuplicada('Esta identificación ya se encuentra registrada para este evento')
      } else {
        setAlertaCedulaDuplicada(null)
      }
    } catch {
      // Si falla la verificación previa, el servidor hará la validación definitiva
    } finally {
      setVerificandoCedula(false)
    }
  }

  // Procesamiento del formulario de preinscripción
  const handleSubmitPreinscripcion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!eventoSeleccionado) return

    // 4) Bloqueo en cliente si la cédula ya fue detectada como duplicada
    if (alertaCedulaDuplicada) {
      return
    }

    setCargandoEnvio(true)
    setMensajeErrorServidor(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('eventoId', eventoSeleccionado.id)

      const res = await preinscribirAlumno(formData)

      if (res.success) {
        setPreinscripcionExitosa({
          tituloEvento: eventoSeleccionado.titulo,
          nombreAlumno: nombreInput,
          cedulaAlumno: cedulaInput,
        })
      } else {
        // Alerta roja clara requerida por la especificación
        setMensajeErrorServidor(res.error || 'Error al procesar la preinscripción.')
        if (res.error?.includes('ya se encuentra registrada')) {
          setAlertaCedulaDuplicada(res.error)
        }
      }
    } catch {
      setMensajeErrorServidor('Error de conexión con el servidor. Intenta nuevamente.')
    } finally {
      setCargandoEnvio(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Barra de Filtro y Estado del Catálogo */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 bg-[#0B305B] text-white rounded-2xl shadow-sm">
            <Calendar className="w-5 h-5 text-[#D2202E]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0B305B]">
              Eventos Académicos Disponibles ({eventosFiltrados.length})
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona tu evento y asegura tu cupo para participar
            </p>
          </div>
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título o auditorio..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-2xl text-xs outline-none transition"
          />
        </div>
      </div>

      {/* 1) CUADRÍCULA (GRID) DE TARJETAS MODERNAS */}
      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron eventos activos</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Actualmente no hay eventos en estado publicado que coincidan con tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {eventosFiltrados.map((evento) => {
            // Imagen de Cabecera del Evento
            const imagenCabecera =
              evento.logo_fondo_url || evento.imagenUrl || evento.imagen_central_url || '/imagen_2.png'

            const fechaFormat = new Date(evento.fechaInicio).toLocaleDateString('es-CO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const horaFormat = new Date(evento.fechaInicio).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })

            const cuposDisponibles = evento.capacidadMaxima
              ? Math.max(0, evento.capacidadMaxima - evento._count.inscripciones)
              : null

            return (
              <div
                key={evento.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* 2) Imagen de Cabecera con Overlay Institucional */}
                  <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenCabecera}
                      alt={evento.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Insignia de Precio */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs font-black px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md ${
                          evento.precio === 0
                            ? 'bg-emerald-600/90 text-white'
                            : 'bg-[#0B305B]/90 text-white border border-white/20'
                        }`}
                      >
                        {evento.precio === 0
                          ? 'Entrada Gratuita'
                          : `$${evento.precio.toLocaleString('es-CO')} COP`}
                      </span>
                    </div>

                    {/* Ubicación sobre la cabecera */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-white text-xs font-semibold drop-shadow-sm truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#D2202E] shrink-0" />
                      <span className="truncate">{evento.ubicacion}</span>
                    </div>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 sm:p-6 space-y-3">
                    {/* Fecha y Hora Destacada */}
                    <div className="flex items-center gap-2 text-xs font-bold text-[#D2202E]">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="capitalize">{fechaFormat} &bull; {horaFormat}</span>
                    </div>

                    {/* Título del Evento */}
                    <h3 className="text-base font-extrabold text-[#0B305B] group-hover:text-[#D2202E] transition-colors leading-snug line-clamp-2">
                      {evento.titulo}
                    </h3>

                    {/* Descripción */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {evento.descripcion}
                    </p>

                    {/* Metadatos: Cupos y Participantes */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>{evento._count.inscripciones} inscritos</span>
                      </div>

                      {cuposDisponibles !== null && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            cuposDisponibles <= 10
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cuposDisponibles === 0 ? 'Sin cupos' : `${cuposDisponibles} cupos restantes`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2) Botón Primario Destacado: 'Preinscribirme' */}
                <div className="p-5 sm:p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => handleAbrirPreinscripcion(evento)}
                    className="w-full py-3 px-4 bg-[#D2202E] hover:bg-[#B01824] text-white font-extrabold text-xs rounded-2xl shadow-md shadow-[#D2202E]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group/btn"
                  >
                    <Sparkles className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    Preinscribirme al Evento
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3) MODAL / SLIDE-OVER LATERAL DE PREINSCRIPCIÓN PÚBLICA */}
      {/* ========================================================================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="bg-[#0B305B] text-white p-5 border-b-2 border-[#D2202E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-[#D2202E]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Formulario de Preinscripción Oficial</h3>
                  <p className="text-xs text-slate-300">Universidad del Sinú &bull; Facultad de Ingenierías</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCerrarModal}
                className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* PANTALLA DE ÉXITO TRAS VALIDACIÓN Y REGISTRO */}
            {preinscripcionExitosa ? (
              <div className="p-6 sm:p-8 text-center space-y-5 animate-in fade-in">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Preinscripción Exitosa
                  </span>
                  <h3 className="text-lg font-black text-[#0B305B] pt-2">
                    ¡Cupo reservado con éxito!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Tu preinscripción para <strong>{preinscripcionExitosa.tituloEvento}</strong> ha sido
                    registrada en el sistema con estado{' '}
                    <strong className="text-amber-700">Pendiente de Pago</strong>.
                  </p>
                </div>

                {/* Resumen del Alumno */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estudiante:</span>
                    <span className="font-bold text-slate-900">{preinscripcionExitosa.nombreAlumno}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Documento (Cédula):</span>
                    <span className="font-mono font-bold text-[#0B305B]">
                      {preinscripcionExitosa.cedulaAlumno}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estado de Inscripción:</span>
                    <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      PENDIENTE DE PAGO
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left text-[11px] text-blue-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#0B305B]" />
                    Próximo Paso para Confirmar Entrada:
                  </div>
                  <p>
                    Preséntate con tu docente designado o en la ventanilla de recaudos de la Facultad con tu número de
                    cédula para registrar el pago en efectivo y activar tu escarapela con código de barras.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCerrarModal}
                  className="w-full py-3 bg-[#0B305B] hover:bg-[#071F3B] text-white font-extrabold text-xs rounded-2xl transition cursor-pointer"
                >
                  Entendido y Finalizar
                </button>
              </div>
            ) : (
              /* FORMULARIO DE CAPTURA */
              <form onSubmit={handleSubmitPreinscripcion} className="p-6 space-y-5 text-xs">
                {/* Resumen del Evento Seleccionado */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#D2202E] tracking-wider uppercase">
                      Evento a Preinscribir
                    </span>
                    <h4 className="font-bold text-[#0B305B] text-xs leading-snug line-clamp-1">
                      {eventoSeleccionado.titulo}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {eventoSeleccionado.precio === 0
                        ? 'Evento Gratuito'
                        : `Valor: $${eventoSeleccionado.precio.toLocaleString('es-CO')} COP`}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 shrink-0 font-bold text-xs">
                    {eventoSeleccionado.ubicacion.split(',')[0]}
                  </div>
                </div>

                {/* 4) ALERTA ROJA CLARA POR IDENTIFICACIÓN YA REGISTRADA */}
                {(alertaCedulaDuplicada || mensajeErrorServidor) && (
                  <div className="p-4 bg-rose-50 border-2 border-[#D2202E] text-rose-900 rounded-2xl flex items-start gap-3 text-xs font-bold animate-in fade-in shadow-xs">
                    <AlertCircle className="w-5 h-5 text-[#D2202E] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#D2202E] font-black">Registro Bloqueado:</p>
                      <p className="mt-0.5">
                        {alertaCedulaDuplicada || mensajeErrorServidor}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Cédula de Ciudadanía con Validación en Vivo */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        Cédula de Ciudadanía / Documento <span className="text-[#D2202E]">*</span>
                      </label>
                      {verificandoCedula && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-[#0B305B]" />
                          Verificando inscripción...
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      name="cedula"
                      value={cedulaInput}
                      onChange={(e) => {
                        setCedulaInput(e.target.value)
                        setAlertaCedulaDuplicada(null)
                        setMensajeErrorServidor(null)
                      }}
                      onBlur={(e) => handleVerificarCedulaEnCliente(e.target.value)}
                      required
                      placeholder="Ej. 1047891234 (Sin puntos ni comas)"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl outline-none font-mono text-xs transition ${
                        alertaCedulaDuplicada
                          ? 'border-[#D2202E] bg-rose-50/50 text-rose-900 font-bold'
                          : 'border-slate-200 focus:border-[#0B305B] focus:bg-white text-slate-900'
                      }`}
                    />
                    <p className="text-[10px] text-slate-400">
                      Identificador único utilizado para validar tu cupo y generar tu escarapela oficial.
                    </p>
                  </div>

                  {/* Nombre Completo */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      Nombre Completo del Estudiante <span className="text-[#D2202E]">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={nombreInput}
                      onChange={(e) => setNombreInput(e.target.value)}
                      required
                      placeholder="Ej. Mateo Morales Silva"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs transition capitalize"
                    />
                  </div>

                  {/* Teléfono Celular (Obligatorio) y Correo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#0B305B]" />
                        Teléfono Celular <span className="text-[#D2202E]">*</span>
                      </label>
                      <input
                        type="tel"
                        name="celular"
                        value={celularInput}
                        onChange={(e) => setCelularInput(e.target.value)}
                        required
                        placeholder="Ej. 3001234567"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none font-mono text-xs transition"
                      />
                      <p className="text-[10px] text-slate-400">
                        Número de contacto obligatorio para notificaciones.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800">Correo Institucional</label>
                        <span className="text-[10px] text-slate-400">Opcional</span>
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="ejemplo@unisinu.edu.co"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs transition"
                      />
                      <p className="text-[10px] text-slate-400">Para confirmación digital.</p>
                    </div>
                  </div>

                  {/* Programa Académico y Semestre */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        Programa Académico <span className="text-[#D2202E]">*</span>
                      </label>
                      <select
                        name="carrera"
                        value={carreraInput}
                        onChange={(e) => setCarreraInput(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        {PROGRAMAS_ACADEMICOS.map((prog) => (
                          <option key={prog} value={prog}>
                            {prog}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1">
                        Semestre Actual <span className="text-[#D2202E]">*</span>
                      </label>
                      <select
                        name="semestre"
                        value={semestreInput}
                        onChange={(e) => setSemestreInput(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        {SEMESTRES.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3) Asignatura de interés consumiendo la tabla Asignaturas agrupada */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0B305B]" />
                      Asignatura de Interés Académico <span className="text-[#D2202E]">*</span>
                    </label>
                    <select
                      name="asignatura_bonificacion"
                      value={asignaturaInput}
                      onChange={(e) => setAsignaturaInput(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl outline-none text-xs font-bold text-[#0B305B] cursor-pointer"
                    >
                      <option value="">-- Selecciona una Asignatura Activa --</option>
                      {asignaturasAgrupadas.length > 0 ? (
                        asignaturasAgrupadas.map(([programa, lista]) => (
                          <optgroup key={programa} label={programa}>
                            {lista.map((asig) => (
                              <option key={asig.id} value={asig.nombre}>
                                {asig.nombre}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      ) : (
                        ASIGNATURAS_FALLBACK.map((asig) => (
                          <option key={asig} value={asig}>
                            {asig}
                          </option>
                        ))
                      )}
                      <optgroup label="Opciones Generales">
                        <option value="No aplica / Formación General">
                          No aplica / Formación General
                        </option>
                      </optgroup>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Materia o área académica vinculada a tu participación en el evento.
                    </p>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCerrarModal}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={cargandoEnvio || verificandoCedula || !!alertaCedulaDuplicada}
                    className={`px-6 py-2.5 font-extrabold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer ${
                      alertaCedulaDuplicada
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-[#D2202E] hover:bg-[#B01824] text-white shadow-[#D2202E]/20'
                    }`}
                  >
                    {cargandoEnvio ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando y Reservando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Confirmar Preinscripción
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


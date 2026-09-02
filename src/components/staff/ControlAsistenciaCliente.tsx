'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ScanBarcode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Calendar,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  Clock,
  User,
  ShieldCheck,
  Zap,
  RotateCcw,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react'
import {
  registrarAsistenciaPorDocumento,
  ResultadoAsistencia,
} from '@/actions/asistencia'

export interface EventoOption {
  id: string
  titulo: string
  precio: number
  ubicacion: string
  capacidadMaxima: number | null
  _count?: {
    inscripciones: number
  }
}

export interface StaffUsuario {
  id: string
  nombre: string
  email: string
  rol: string
  carrera: string | null
}

export interface AsistenciaHistorial {
  id: string
  fechaHoraRegistro: Date | string
  metodo: string
  inscripcion: {
    asignatura_bonificacion: string | null
    usuario: {
      nombre: string
      codigoEstudiantil: string | null
      carrera: string | null
    }
    evento: {
      titulo: string
    }
  }
  registradoPor?: {
    nombre: string
  } | null
}

interface ControlAsistenciaClienteProps {
  eventos: EventoOption[]
  staffList: StaffUsuario[]
  historialInicial: AsistenciaHistorial[]
}

export default function ControlAsistenciaCliente({
  eventos,
  staffList,
  historialInicial,
}: ControlAsistenciaClienteProps) {
  // Evento activo
  const [eventoId, setEventoId] = useState<string>(eventos[0]?.id || '')
  // Staff activo en puerta
  const [staffId, setStaffId] = useState<string>(staffList[0]?.id || '')

  // Documento / Cédula / Código escaneado
  const [documentoInput, setDocumentoInput] = useState<string>('')
  const [procesando, setProcesando] = useState<boolean>(false)

  // Último resultado de escaneo
  const [ultimoResultado, setUltimoResultado] =
    useState<ResultadoAsistencia | null>(null)

  // Historial local en vivo
  const [historial, setHistorial] =
    useState<AsistenciaHistorial[]>(historialInicial)

  // Sonido activado
  const [sonidoHabilitado, setSonidoHabilitado] = useState<boolean>(true)

  // Referencia para mantener el autofoco permanente
  const inputRef = useRef<HTMLInputElement>(null)

  // Función para emitir tonos de audio con Web Audio API
  const emitirSonido = useCallback(
    (tipo: 'EXITO' | 'ERROR' | 'ALERTA') => {
      if (!sonidoHabilitado || typeof window === 'undefined') return

      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
            .webkitAudioContext
        if (!AudioCtxClass) return

        const ctx = new AudioCtxClass()

        if (tipo === 'EXITO') {
          // Tono agudo y melodioso de confirmación
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gain = ctx.createGain()

          osc1.type = 'sine'
          osc2.type = 'triangle'
          osc1.frequency.setValueAtTime(880, ctx.currentTime) // A5
          osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15) // E6

          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

          osc1.connect(gain)
          osc2.connect(gain)
          gain.connect(ctx.destination)

          osc1.start()
          osc1.stop(ctx.currentTime + 0.3)
        } else {
          // Tono grave de error / alerta
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(220, ctx.currentTime)
          osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.35)

          gain.gain.setValueAtTime(0.4, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start()
          osc.stop(ctx.currentTime + 0.35)
        }
      } catch {
        // Ignorar si el navegador bloquea audio sin interacción previa
      }
    },
    [sonidoHabilitado]
  )

  // Asegurar autofoco al montar y mantener el foco continuo
  useEffect(() => {
    inputRef.current?.focus()

    const handleClickGlobal = (e: MouseEvent) => {
      // Si el clic no fue dentro de un selector <select> o botón, re-enfocar el lector
      const target = e.target as HTMLElement
      if (
        target.tagName !== 'SELECT' &&
        target.tagName !== 'BUTTON' &&
        target.tagName !== 'A' &&
        target.tagName !== 'INPUT'
      ) {
        inputRef.current?.focus()
      }
    }

    window.addEventListener('click', handleClickGlobal)
    return () => window.removeEventListener('click', handleClickGlobal)
  }, [])

  // Evento activo actual
  const eventoSeleccionado = eventos.find((e) => e.id === eventoId)
  const staffSeleccionado = staffList.find((s) => s.id === staffId)

  // Asistencias registradas para el evento actual
  const asistenciasDelEvento = historial.filter(
    (h) => h.inscripcion.evento.titulo === eventoSeleccionado?.titulo
  )

  // Manejar el submit del escaneo (Lector de código de barras emula teclado + Enter)
  const handleEscaneo = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = documentoInput.trim()
    if (!valor || procesando) return

    setProcesando(true)
    setDocumentoInput('') // Limpiar inmediatamente para el próximo escaneo

    try {
      const resultado = await registrarAsistenciaPorDocumento({
        documento: valor,
        eventoId,
        staffId,
        metodo: 'QR',
      })

      setUltimoResultado(resultado)

      if (resultado.success) {
        emitirSonido('EXITO')
        // Agregar al historial local
        if (resultado.usuario && resultado.asistencia) {
          const nuevoRegistro: AsistenciaHistorial = {
            id: resultado.asistencia.id,
            fechaHoraRegistro: new Date(),
            metodo: resultado.asistencia.metodo,
            inscripcion: {
              asignatura_bonificacion:
                resultado.inscripcion?.asignatura_bonificacion || null,
              usuario: {
                nombre: resultado.usuario.nombre,
                codigoEstudiantil: resultado.usuario.codigoEstudiantil,
                carrera: resultado.usuario.carrera,
              },
              evento: {
                titulo: eventoSeleccionado?.titulo || 'Evento',
              },
            },
            registradoPor: {
              nombre: staffSeleccionado?.nombre || 'Staff',
            },
          }
          setHistorial((prev) => [nuevoRegistro, ...prev])
        }
      } else {
        emitirSonido(resultado.tipo === 'YA_REGISTRADO' ? 'ALERTA' : 'ERROR')
      }
    } catch (err) {
      console.error(err)
      emitirSonido('ERROR')
      setUltimoResultado({
        success: false,
        tipo: 'ERROR_SERVIDOR',
        mensaje: 'Error de conexión con el servidor de validación.',
      })
    } finally {
      setProcesando(false)
      // Re-enfocar el campo de escaneo inmediatamente
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }

  // Atajos rápidos para pruebas manuales con clics
  const escanearCodigoPrueba = (codigo: string) => {
    setDocumentoInput(codigo)
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent
      setDocumentoInput(codigo)
      inputRef.current?.focus()
    }, 10)
  }

  return (
    <div className="space-y-6">
      {/* Barra de Control de Puerta y Evento */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Selector de Evento */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Control de Puerta para el Evento
            </span>
            <div className="mt-0.5">
              <select
                value={eventoId}
                onChange={(e) => {
                  setEventoId(e.target.value)
                  setUltimoResultado(null)
                  inputRef.current?.focus()
                }}
                className="text-sm font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                {eventos.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.titulo} &bull; ({ev.ubicacion})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Controles de Operador Staff y Audio */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de Staff */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Operador:</span>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value)
                inputRef.current?.focus()
              }}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} (Staff)
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Sonido */}
          <button
            type="button"
            onClick={() => {
              setSonidoHabilitado(!sonidoHabilitado)
              inputRef.current?.focus()
            }}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
              sonidoHabilitado
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={sonidoHabilitado ? 'Sonido Activado' : 'Sonido Silenciado'}
          >
            {sonidoHabilitado ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {sonidoHabilitado ? 'Audio On' : 'Silencio'}
            </span>
          </button>
        </div>
      </div>

      {/* Tarjeta Gigante de Entrada del Lector de Código de Barras (Autofocus Permanente) */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            LECTOR ACTIVO &bull; LISTO PARA ESCANEAR
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Escaneo de Cédula o Código Estudiantil
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
            Apunta la pistola lectora de código de barras al carnet o documento del estudiante. El lector enviará la cédula y ejecutará la validación automáticamente.
          </p>

          {/* Formulario de Escaneo con Autofoco Blindado */}
          <form onSubmit={handleEscaneo} className="max-w-xl mx-auto pt-2">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={documentoInput}
                onChange={(e) => setDocumentoInput(e.target.value)}
                onBlur={() => {
                  // Re-enfocar automáticamente tras un pequeño delay
                  setTimeout(() => inputRef.current?.focus(), 150)
                }}
                autoFocus
                autoComplete="off"
                placeholder="Esperando código de barras o cédula..."
                className="w-full pl-13 pr-28 py-4 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 text-lg sm:text-xl font-mono font-bold rounded-2xl border-2 border-indigo-400/40 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
              <button
                type="submit"
                disabled={procesando || !documentoInput.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                {procesando ? 'Validando...' : 'Validar'}
              </button>
            </div>
          </form>

          {/* Acceso Rápido / Pruebas sin escáner físico */}
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Pruebas rápidas:</span>
            <button
              type="button"
              onClick={() => {
                setDocumentoInput('20221015001')
                setTimeout(() => inputRef.current?.focus(), 50)
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
            >
              20221015001 (Mateo - Pagado)
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentoInput('20231015042')
                setTimeout(() => inputRef.current?.focus(), 50)
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-rose-300 border border-rose-500/30 transition cursor-pointer"
            >
              20231015042 (Sofía - Pendiente)
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentoInput('20212015099')
                setTimeout(() => inputRef.current?.focus(), 50)
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-blue-300 border border-blue-500/30 transition cursor-pointer"
            >
              20212015099 (Lucas - Exento)
            </button>
            <button
              type="button"
              onClick={() => {
                setDocumentoInput('999999999')
                setTimeout(() => inputRef.current?.focus(), 50)
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 border border-slate-600 transition cursor-pointer"
            >
              999999999 (Inexistente)
            </button>
          </div>
        </div>
      </section>

      {/* ALERTA VISUAL GIGANTE DE ESTADO (VERDE / ROJO / AMARILLO) */}
      {ultimoResultado && (
        <section
          className={`rounded-3xl p-6 sm:p-8 text-white shadow-2xl transition-all animate-in zoom-in-95 duration-300 border-4 ${
            ultimoResultado.success
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border-emerald-400 shadow-emerald-900/30'
              : ultimoResultado.tipo === 'YA_REGISTRADO'
              ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 border-amber-400 shadow-amber-900/30'
              : 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-900 border-rose-400 shadow-rose-900/30'
          }`}
        >
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Ícono Gigante de Estado */}
            <div className="shrink-0 p-4 bg-white/20 rounded-3xl backdrop-blur-md shadow-inner">
              {ultimoResultado.success ? (
                <CheckCircle2 className="w-20 h-20 text-white animate-bounce" />
              ) : ultimoResultado.tipo === 'YA_REGISTRADO' ? (
                <AlertTriangle className="w-20 h-20 text-white" />
              ) : (
                <XCircle className="w-20 h-20 text-white" />
              )}
            </div>

            {/* Contenido Principal de la Alerta */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                {ultimoResultado.success
                  ? '✓ ACCESO PERMITIDO - ASISTENCIA REGISTRADA'
                  : ultimoResultado.tipo === 'YA_REGISTRADO'
                  ? '⚠ ASISTENCIA PREVIAMENTE REGISTRADA'
                  : '✕ ACCESO DENEGADO'}
              </div>

              <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {ultimoResultado.mensaje}
              </h3>

              {/* Tarjeta de Información del Estudiante Identificado */}
              {ultimoResultado.usuario && (
                <div className="bg-black/25 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 space-y-3 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Estudiante
                      </span>
                      <p className="font-extrabold text-white text-sm">
                        {ultimoResultado.usuario.nombre}
                      </p>
                      <p className="text-white/80 font-mono">
                        Cód: {ultimoResultado.usuario.codigoEstudiantil ?? 'Sin código'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Carrera / Facultad
                      </span>
                      <p className="font-bold text-white">
                        {ultimoResultado.usuario.carrera ?? 'Ingeniería'}
                      </p>
                      <p className="text-white/80 truncate">
                        {ultimoResultado.usuario.email}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Bonificación Académica
                      </span>
                      <p className="font-bold text-amber-200 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        {ultimoResultado.inscripcion?.asignatura_bonificacion || 'Sin bonificación'}
                      </p>
                    </div>
                  </div>

                  {/* Detalles de Pago o Asistencia Previa */}
                  <div className="pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">Estado de Pago:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          ultimoResultado.inscripcion?.estado_pago === 'PAGADO'
                            ? 'bg-emerald-400 text-emerald-950'
                            : ultimoResultado.inscripcion?.estado_pago === 'EXENTO'
                            ? 'bg-blue-300 text-blue-950'
                            : 'bg-rose-400 text-rose-950'
                        }`}
                      >
                        {ultimoResultado.inscripcion?.estado_pago || 'NO REGISTRADO'}
                      </span>
                    </div>

                    {ultimoResultado.asistencia && (
                      <div className="flex items-center gap-1.5 text-white/90">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Hora de Check-in:{' '}
                          {new Date(
                            ultimoResultado.asistencia.fechaHoraRegistro
                          ).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Métricas y Aforo en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Asistencias Confirmadas
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {asistenciasDelEvento.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Estudiantes en el auditorio</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Capacidad Máxima
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {eventoSeleccionado?.capacidadMaxima ?? 'Ilimitada'}
          </p>
          <p className="text-xs text-indigo-600 font-semibold mt-1">
            Ubicación: {eventoSeleccionado?.ubicacion}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Porcentaje de Asistencia
            </span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-teal-600 mt-2">
            {eventoSeleccionado?.capacidadMaxima
              ? `${Math.round(
                  (asistenciasDelEvento.length /
                    eventoSeleccionado.capacidadMaxima) *
                    100
                )}%`
              : 'N/A'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Aforo en tiempo real</p>
        </div>
      </div>

      {/* Historial en Vivo de Accesos Validados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Historial de Check-in en Puerta (En Vivo)
            </h3>
            <p className="text-xs text-slate-500">
              Registro cronológico de entradas validadas por el equipo de Staff
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-sm">
            {historial.length} ingresos registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#0B305B] text-white font-bold border-b-2 border-[#D2202E] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Hora de Ingreso</th>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Evento</th>
                <th className="px-5 py-3.5">Asignatura Bonificación</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5">Validado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Aún no hay asistencias registradas en esta sesión
                    </p>
                    <p className="text-xs mt-1">
                      Comienza a escanear documentos con el lector de código de barras.
                    </p>
                  </td>
                </tr>
              ) : (
                historial.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-emerald-50/30 ${
                      idx === 0 ? 'bg-emerald-50/20 font-medium' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-900 font-bold">
                      {new Date(item.fechaHoraRegistro).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {item.inscripcion.usuario.nombre}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cód: {item.inscripcion.usuario.codigoEstudiantil ?? 'N/A'} &bull;{' '}
                        {item.inscripcion.usuario.carrera ?? 'Ingeniería'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 max-w-xs truncate text-slate-800 font-medium">
                      {item.inscripcion.evento.titulo}
                    </td>

                    <td className="px-5 py-3.5">
                      {item.inscripcion.asignatura_bonificacion ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                          <BookOpen className="w-3 h-3 text-amber-600" />
                          {item.inscripcion.asignatura_bonificacion}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">No aplica</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {item.metodo}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {item.registradoPor?.nombre || 'Staff de Turno'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

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
  Loader2,
  Camera,
  X,
} from 'lucide-react'
import {
  registrarAsistenciaPorDocumento,
  obtenerHistorialEnVivo,
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
  bloque?: string
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
  staffList?: StaffUsuario[]
  historialInicial?: AsistenciaHistorial[]
  staffActual?: {
    id: string
    nombre: string
    email: string
    rol: string
  }
}

export default function ControlAsistenciaCliente({
  eventos,
  staffList = [],
  historialInicial = [],
  staffActual,
}: ControlAsistenciaClienteProps) {
  // Evento activo
  const [eventoId, setEventoId] = useState<string>(eventos[0]?.id || '')
  
  // Operador de turno autenticado
  const operador = staffActual || staffList[0]
  const staffId = operador?.id || ''

  // Documento / Cédula / Código escaneado
  const [documentoInput, setDocumentoInput] = useState<string>('')
  const [procesando, setProcesando] = useState<boolean>(false)

  // Último resultado de escaneo
  const [ultimoResultado, setUltimoResultado] =
    useState<ResultadoAsistencia | null>(null)

  // Historial local en vivo
  const [historial, setHistorial] =
    useState<AsistenciaHistorial[]>(historialInicial)
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false)

  // Sonido activado
  const [sonidoHabilitado, setSonidoHabilitado] = useState<boolean>(true)

  // Bloque de jornada (AM / PM / Noche)
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<'MANANA' | 'TARDE' | 'NOCHE'>('MANANA')

  // Auto-selección inteligente por reloj del sistema (<13h -> MANANA, 13h-18h -> TARDE, >18h -> NOCHE)
  useEffect(() => {
    const hora = new Date().getHours()
    if (hora < 13) {
      setBloqueSeleccionado('MANANA')
    } else if (hora < 18) {
      setBloqueSeleccionado('TARDE')
    } else {
      setBloqueSeleccionado('NOCHE')
    }
  }, [])

  // Referencia para mantener el autofoco permanente
  const inputRef = useRef<HTMLInputElement>(null)

  // Trazabilidad de entrada por velocidad de pulsaciones (Lector hardware < 50ms vs Digitación humana >= 50ms)
  const ultimoTiempoTeclaRef = useRef<number>(0)
  const intervalosTeclasRef = useRef<number[]>([])
  const envioPorBotonRef = useRef<boolean>(false)

  // Escáner con Cámara QR (html5-qrcode)
  const [camaraAbierta, setCamaraAbierta] = useState<boolean>(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const ultimoQrCamaraRef = useRef<{ texto: string; tiempo: number }>({ texto: '', tiempo: 0 })

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

  // Asegurar autofoco en el campo de escaneo al cargar el módulo
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Evento activo actual
  const eventoSeleccionado = eventos.find((e) => e.id === eventoId)
  const staffSeleccionado = operador

  // Cargar historial en vivo de hoy cada vez que cambie el evento seleccionado
  useEffect(() => {
    let activo = true
    if (!eventoSeleccionado?.id) {
      setHistorial([])
      return
    }

    const cargarHistorial = async () => {
      setCargandoHistorial(true)
      try {
        const res = await obtenerHistorialEnVivo(eventoSeleccionado.id)
        if (activo && res.success && res.historial) {
          setHistorial(res.historial as AsistenciaHistorial[])
        }
      } catch (err) {
        console.error('Error al cargar historial en vivo:', err)
      } finally {
        if (activo) {
          setCargandoHistorial(false)
        }
      }
    }

    cargarHistorial()

    return () => {
      activo = false
    }
  }, [eventoSeleccionado?.id])

  // Detectar método de entrada según velocidad de pulsación (< 50ms = hardware) y formato
  const detectarMetodoEntrada = (valor: string): 'QR' | 'MANUAL' | 'CODIGO_BARRAS' => {
    if (envioPorBotonRef.current) return 'MANUAL'

    const intervalos = intervalosTeclasRef.current
    if (intervalos.length >= 3) {
      const promedioMs = intervalos.reduce((acc, ms) => acc + ms, 0) / intervalos.length
      if (promedioMs < 50) {
        const esFormatoQr =
          /^https?:\/\//i.test(valor) ||
          valor.includes('escarapela') ||
          valor.includes('/api/') ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor) ||
          /^c[a-z0-9]{20,30}$/i.test(valor) ||
          /[:{}=]/.test(valor)

        return esFormatoQr ? 'QR' : 'CODIGO_BARRAS'
      }
    }

    return 'MANUAL'
  }

  // Función unificada de validación de asistencia
  const procesarValidacion = useCallback(
    async (valorBruto: string, metodoDetectado: 'QR' | 'MANUAL' | 'CODIGO_BARRAS') => {
      const valor = valorBruto.trim()
      if (!valor || procesando || !eventoId) return

      setProcesando(true)
      setDocumentoInput('')
      ultimoTiempoTeclaRef.current = 0
      intervalosTeclasRef.current = []
      envioPorBotonRef.current = false

      try {
        const resultado = await registrarAsistenciaPorDocumento({
          documento: valor,
          eventoId,
          staffId,
          metodo: metodoDetectado,
          bloque: bloqueSeleccionado,
        })

        setUltimoResultado(resultado)

        if (resultado.success) {
          emitirSonido('EXITO')
          if (resultado.usuario && resultado.asistencia) {
            const nuevoRegistro: AsistenciaHistorial = {
              id: resultado.asistencia.id,
              fechaHoraRegistro: new Date(),
              metodo: resultado.asistencia.metodo,
              bloque: resultado.asistencia.bloque,
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
        setTimeout(() => {
          inputRef.current?.focus()
        }, 50)
      }
    },
    [
      procesando,
      eventoId,
      staffId,
      bloqueSeleccionado,
      emitirSonido,
      eventoSeleccionado?.titulo,
      staffSeleccionado?.nombre,
    ]
  )

  // Ciclo de vida de la cámara QR (html5-qrcode)
  useEffect(() => {
    if (!camaraAbierta) return

    let scanner: any = null
    let cancelado = false

    const iniciarCamara = async () => {
      setErrorCamara(null)
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelado) return

        scanner = new Html5Qrcode('lector-qr-camara')
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            const ahora = Date.now()
            if (
              ultimoQrCamaraRef.current.texto === decodedText &&
              ahora - ultimoQrCamaraRef.current.tiempo < 2500
            ) {
              return
            }
            ultimoQrCamaraRef.current = { texto: decodedText, tiempo: ahora }
            setCamaraAbierta(false)
            procesarValidacion(decodedText, 'QR')
          },
          () => {}
        )
      } catch (err) {
        console.warn('Error iniciando cámara QR:', err)
        if (!cancelado) {
          setErrorCamara(
            'No se pudo acceder a la cámara. Verifica los permisos del navegador o usa el lector USB/manual.'
          )
        }
      }
    }

    iniciarCamara()

    return () => {
      cancelado = true
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
  }, [camaraAbierta, procesarValidacion])

  // Manejar el submit del escaneo / digitación manual
  const handleEscaneo = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = documentoInput.trim()
    if (!valor || procesando) return

    const metodoDetectado = detectarMetodoEntrada(valor)
    await procesarValidacion(valor, metodoDetectado)
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
              {eventos.length === 0 ? (
                <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No hay eventos activos en curso en este momento.</span>
                </div>
              ) : (
                <select
                  id="select-evento-asistencia"
                  value={eventoId}
                  onChange={(e) => {
                    setEventoId(e.target.value)
                    setUltimoResultado(null)
                  }}
                  className="text-sm font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition cursor-pointer"
                >
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.titulo} &bull; ({ev.ubicacion})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Controles de Operador Staff y Audio */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Indicador de Operador Autenticado */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
            <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-slate-500 font-semibold">Operador:</span>
            <span className="font-extrabold text-slate-900">{operador?.nombre || 'Staff de Turno'}</span>
          </div>

          {/* Toggle Sonido */}
          <button
            type="button"
            onClick={() => setSonidoHabilitado(!sonidoHabilitado)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
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

      {/* Tarjeta Gigante de Entrada del Lector de Código de Barras */}
      <section
        onClick={() => inputRef.current?.focus()}
        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden cursor-pointer"
      >
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

          {/* Selector de Sesión / Jornada con Botones Pill */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-2 pt-1 pb-1 flex-wrap"
          >
            <span className="text-xs font-semibold text-slate-300 mr-1">
              Sesión / Jornada:
            </span>
            <button
              type="button"
              onClick={() => {
                setBloqueSeleccionado('MANANA')
                inputRef.current?.focus()
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                bloqueSeleccionado === 'MANANA'
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 font-extrabold scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
              }`}
            >
              ☀️ Mañana (AM)
            </button>
            <button
              type="button"
              onClick={() => {
                setBloqueSeleccionado('TARDE')
                inputRef.current?.focus()
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                bloqueSeleccionado === 'TARDE'
                  ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-300 font-extrabold scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
              }`}
            >
              ⛅ Tarde (PM)
            </button>
            <button
              type="button"
              onClick={() => {
                setBloqueSeleccionado('NOCHE')
                inputRef.current?.focus()
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                bloqueSeleccionado === 'NOCHE'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 font-extrabold scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
              }`}
            >
              🌙 Noche
            </button>
          </div>

          {/* Formulario de Escaneo con Autofoco Blindado */}
          <form onSubmit={handleEscaneo} className="max-w-xl mx-auto pt-2 space-y-3">
            {eventos.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Escaneo deshabilitado: no hay eventos publicados activos o vigentes en curso.
                </span>
              </div>
            )}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                <ScanBarcode className="w-6 h-6" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={documentoInput}
                disabled={eventos.length === 0 || procesando}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const ahora = performance.now()
                    if (ultimoTiempoTeclaRef.current > 0) {
                      intervalosTeclasRef.current.push(ahora - ultimoTiempoTeclaRef.current)
                    }
                    ultimoTiempoTeclaRef.current = ahora
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value
                  setDocumentoInput(val)
                  if (!val) {
                    ultimoTiempoTeclaRef.current = 0
                    intervalosTeclasRef.current = []
                  }
                }}
                autoFocus
                autoComplete="off"
                placeholder={
                  eventos.length === 0
                    ? 'Sin eventos activos disponibles...'
                    : 'Esperando código de barras, QR o cédula...'
                }
                className="w-full pl-13 pr-28 py-4 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 text-lg sm:text-xl font-mono font-bold rounded-2xl border-2 border-indigo-400/40 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                onClick={() => {
                  envioPorBotonRef.current = true
                }}
                disabled={eventos.length === 0 || procesando || !documentoInput.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:cursor-not-allowed"
              >
                {procesando ? 'Validando...' : 'Validar'}
              </button>
            </div>

            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={eventos.length === 0}
                onClick={() => setCamaraAbierta((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/20 text-xs font-bold text-white transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-300" />
                <span>{camaraAbierta ? 'Cerrar Cámara QR' : 'Escanear con Cámara'}</span>
              </button>
            </div>
          </form>

          {/* Visor Opcional de Cámara QR */}
          {camaraAbierta && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm mx-auto mt-3 bg-slate-950/90 border border-emerald-400/40 rounded-2xl p-4 space-y-3 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  Escáner QR por Cámara
                </span>
                <button
                  type="button"
                  onClick={() => setCamaraAbierta(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div id="lector-qr-camara" className="w-full rounded-xl overflow-hidden bg-black min-h-[220px]" />
              {errorCamara && (
                <p className="text-[11px] text-rose-300 font-medium">{errorCamara}</p>
              )}
            </div>
          )}

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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Estudiante
                      </span>
                      <p className="font-extrabold text-white text-sm">
                        {ultimoResultado.usuario.nombre}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Documento / Código
                      </span>
                      <p className="font-bold text-white font-mono text-sm">
                        {ultimoResultado.usuario.codigoEstudiantil ?? 'Sin código'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-white/70 uppercase">
                        Carrera / Programa
                      </span>
                      <p className="font-bold text-white text-sm">
                        {ultimoResultado.usuario.carrera ?? 'Facultad de Ingenierías'}
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
            {historial.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Estudiantes en el auditorio (hoy)</p>
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
                  (historial.length /
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
          <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-sm flex items-center gap-1.5">
            {cargandoHistorial && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
            {historial.length} ingresos registrados (hoy)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#0B305B] text-white font-bold border-b-2 border-[#D2202E] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Hora de Ingreso</th>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Evento</th>
                <th className="px-5 py-3.5">Jornada</th>
                <th className="px-5 py-3.5">Asignatura Bonificación</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5">Validado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.bloque === 'MANANA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.bloque === 'TARDE'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : item.bloque === 'NOCHE'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.bloque === 'MANANA'
                          ? '☀️ Mañana (AM)'
                          : item.bloque === 'TARDE'
                          ? '⛅ Tarde (PM)'
                          : item.bloque === 'NOCHE'
                          ? '🌙 Noche'
                          : 'Única'}
                      </span>
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
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                          item.metodo === 'MANUAL'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : item.metodo === 'CODIGO_BARRAS'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : item.metodo === 'BIOMETRICO'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {item.metodo === 'CODIGO_BARRAS'
                          ? 'CÓDIGO BARRAS'
                          : item.metodo === 'BIOMETRICO'
                          ? 'BIOMÉTRICO'
                          : item.metodo}
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

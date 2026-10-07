'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Zap,
  ZapOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Camera,
  RotateCcw,
  Sparkles,
  Search,
  X,
  Keyboard,
} from 'lucide-react'
import {
  registrarAsistenciaPorDocumento,
  obtenerInfoEventoEscaner,
  ResultadoAsistencia,
} from '@/actions/asistencia'

export default function EscanerQRPage() {
  const params = useParams()
  const router = useRouter()
  const eventoId = (params?.id as string) || ''

  // Información del evento
  const [eventoInfo, setEventoInfo] = useState<{
    id: string
    titulo: string
    ubicacion: string
    capacidadMaxima: number | null
    _count?: { inscripciones: number }
  } | null>(null)
  const [totalAsistencias, setTotalAsistencias] = useState<number>(0)
  const [cargandoEvento, setCargandoEvento] = useState<boolean>(true)

  // Estados de cámara y hardware
  const [cargandoCamara, setCargandoCamara] = useState<boolean>(true)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const [linternaDisponible, setLinternaDisponible] = useState<boolean>(false)
  const [linternaActiva, setLinternaActiva] = useState<boolean>(false)
  const [escaneandoActivo, setEscaneandoActivo] = useState<boolean>(true)

  // Estados de resultado y cooldown
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoAsistencia | null>(null)
  const [estadoVisor, setEstadoVisor] = useState<'IDLE' | 'EXITO' | 'ALERTA' | 'ERROR'>('IDLE')

  // Selector de bloque / jornada (AM / PM / Noche)
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

  // Entrada manual opcional
  const [mostrarManual, setMostrarManual] = useState<boolean>(false)
  const [inputManual, setInputManual] = useState<string>('')
  const [procesandoManual, setProcesandoManual] = useState<boolean>(false)

  // Referencias para escáner y cooldown
  const scannerRef = useRef<any>(null)
  const cooldownRef = useRef<boolean>(false)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Función para reproducir tonos audibles mediante Web Audio API
  const emitirBeep = useCallback((tipo: 'EXITO' | 'ERROR' | 'ALERTA') => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof window.AudioContext })
          .webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()

      if (tipo === 'EXITO') {
        // Tono ascendente de confirmación (880Hz -> 1320Hz)
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc2.type = 'triangle'
        osc1.frequency.setValueAtTime(880, ctx.currentTime)
        osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15)

        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start()
        osc1.stop(ctx.currentTime + 0.25)
      } else {
        // Tono grave disonante de advertencia/error (220Hz -> 140Hz)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.35)

        gain.gain.setValueAtTime(0.35, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      }
    } catch {
      // Ignorar restricciones de autoplay en navegadores
    }
  }, [])

  // Función para activar vibración táctil nativa
  const ejecutarVibracion = useCallback((tipo: 'EXITO' | 'ERROR' | 'ALERTA') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (tipo === 'EXITO') {
          navigator.vibrate(100)
        } else if (tipo === 'ALERTA') {
          navigator.vibrate([80, 50, 80])
        } else {
          navigator.vibrate([150, 80, 150])
        }
      } catch {
        // Ignorar si el dispositivo bloquea la vibración
      }
    }
  }, [])

  // Cargar datos iniciales del evento
  useEffect(() => {
    if (!eventoId) return

    let activo = true
    obtenerInfoEventoEscaner(eventoId).then((res) => {
      if (!activo) return
      if (res.success && res.evento) {
        setEventoInfo(res.evento)
        setTotalAsistencias(res.totalAsistencias ?? 0)
      }
      setCargandoEvento(false)
    })

    return () => {
      activo = false
    }
  }, [eventoId])

  // Procesamiento unificado de documento escaneado o ingresado
  const procesarCodigo = useCallback(
    async (codigo: string) => {
      const docLimpio = codigo.trim()
      if (!docLimpio || !eventoId) return

      try {
        const resultado = await registrarAsistenciaPorDocumento({
          documento: docLimpio,
          eventoId,
          metodo: 'QR',
          bloque: bloqueSeleccionado,
        })

        setUltimoResultado(resultado)

        if (resultado.success) {
          setEstadoVisor('EXITO')
          emitirBeep('EXITO')
          ejecutarVibracion('EXITO')
          setTotalAsistencias((prev) => prev + 1)
        } else if (resultado.tipo === 'YA_REGISTRADO') {
          setEstadoVisor('ALERTA')
          emitirBeep('ALERTA')
          ejecutarVibracion('ALERTA')
        } else {
          setEstadoVisor('ERROR')
          emitirBeep('ERROR')
          ejecutarVibracion('ERROR')
        }

        // Programar cierre visual del toast/bottom-sheet tras 4 segundos
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => {
          setUltimoResultado(null)
          setEstadoVisor('IDLE')
        }, 4000)
      } catch (err) {
        console.error('Error al registrar asistencia:', err)
        setEstadoVisor('ERROR')
        emitirBeep('ERROR')
        ejecutarVibracion('ERROR')
        setUltimoResultado({
          success: false,
          tipo: 'ERROR_SERVIDOR',
          mensaje: 'Fallo de red o comunicación con el servidor.',
        })
      }
    },
    [eventoId, emitirBeep, ejecutarVibracion, bloqueSeleccionado]
  )

  // Manejo de lectura QR por la cámara con cooldown estricto de 2.5s
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (cooldownRef.current) return

      // Activar cooldown inmediatamente
      cooldownRef.current = true
      setEscaneandoActivo(false)

      procesarCodigo(decodedText)

      // Liberar escáner tras 2.5 segundos
      setTimeout(() => {
        cooldownRef.current = false
        setEscaneandoActivo(true)
      }, 2500)
    },
    [procesarCodigo]
  )

  // Inicialización dinámica de Html5Qrcode en cliente (sin SSR)
  useEffect(() => {
    let cancelado = false
    let html5QrCode: any = null

    const iniciarCamara = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeScannerState } = await import('html5-qrcode')

        if (cancelado) return

        const contenedor = document.getElementById('lector-qr-container')
        if (!contenedor) return

        html5QrCode = new Html5Qrcode('lector-qr-container')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minSize = Math.min(viewfinderWidth, viewfinderHeight)
              const dim = Math.floor(minSize * 0.72)
              return { width: dim, height: dim }
            },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            handleScanSuccess(decodedText)
          },
          () => {
            // Ignorar frames sin código QR
          }
        )

        if (cancelado) {
          try {
            if (html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
              await html5QrCode.stop()
            }
            html5QrCode.clear()
          } catch {}
          return
        }

        setCargandoCamara(false)
        setErrorCamara(null)

        // Verificar si la linterna (torch) está soportada en el hardware
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities()
          if (capabilities && 'torch' in capabilities) {
            setLinternaDisponible(true)
          }
        } catch {
          // Algunos dispositivos móviles permiten aplicar la linterna aunque capabilities no lo exponga
          setLinternaDisponible(true)
        }
      } catch (err: any) {
        if (!cancelado) {
          console.error('Error al inicializar la cámara:', err)
          setCargandoCamara(false)
          setErrorCamara(
            err?.message ||
              'No se pudo acceder a la cámara trasera. Asegúrate de conceder permisos de cámara en tu navegador.'
          )
        }
      }
    }

    // Pequeño retardo para asegurar montaje completo del elemento en el DOM
    const timer = setTimeout(iniciarCamara, 100)

    return () => {
      cancelado = true
      clearTimeout(timer)
      if (scannerRef.current) {
        try {
          if (scannerRef.current.getState() === 2 /* SCANNING */) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear()
            }).catch(() => {})
          } else {
            scannerRef.current.clear()
          }
        } catch {}
      }
    }
  }, [handleScanSuccess])

  // Alternar linterna (Flashlight / Torch)
  const toggleLinterna = async () => {
    if (!scannerRef.current) return
    try {
      const nuevoEstado = !linternaActiva
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nuevoEstado }] as any,
      })
      setLinternaActiva(nuevoEstado)
    } catch (err) {
      console.warn('Linterna no soportada o no accesible en este lente:', err)
    }
  }

  // Manejo de envío manual
  const handleEnvioManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputManual.trim() || procesandoManual) return
    setProcesandoManual(true)
    await procesarCodigo(inputManual.trim())
    setInputManual('')
    setProcesandoManual(false)
    setMostrarManual(false)
  }

  // Colores dinámicos del visor según el resultado
  const obtenerClaseVisor = () => {
    if (estadoVisor === 'EXITO') return 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.8)]'
    if (estadoVisor === 'ALERTA') return 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.8)]'
    if (estadoVisor === 'ERROR') return 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.8)]'
    return escaneandoActivo
      ? 'border-white/70 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
      : 'border-white/30 opacity-70'
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      {/* Estilos CSS embebidos para normalizar el video inyectado por html5-qrcode */}
      <style jsx global>{`
        #lector-qr-container {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
        #lector-qr-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #lector-qr-container img[alt="Info icon"],
        #lector-qr-container div[style*="text-align: center;"] {
          display: none !important;
        }
      `}</style>

      {/* 1. Header Superior Mobile */}
      <header className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between">
        <Link
          href={`/admin`}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold text-white transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Panel</span>
        </Link>

        {/* Título y Contador del Evento */}
        <div className="text-center px-2 flex-1 max-w-[240px] sm:max-w-md mx-auto">
          <h1 className="text-xs sm:text-sm font-extrabold text-white truncate drop-shadow">
            {cargandoEvento ? 'Cargando evento...' : eventoInfo?.titulo || 'Control de Asistencia'}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
              <Users className="w-3 h-3" />
              {totalAsistencias} Registrados
            </span>
          </div>
        </div>

        {/* Controles de Hardware: Linterna y Teclado Manual */}
        <div className="flex items-center gap-2">
          {linternaDisponible && (
            <button
              onClick={toggleLinterna}
              type="button"
              aria-label="Alternar Linterna"
              className={`p-2.5 rounded-xl backdrop-blur-md border transition active:scale-95 ${
                linternaActiva
                  ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
            >
              {linternaActiva ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setMostrarManual(true)}
            type="button"
            aria-label="Entrada Manual"
            className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white transition active:scale-95"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Selector Flotante de Sesión / Jornada (Pills) */}
      <div className="absolute top-[70px] inset-x-0 z-30 flex items-center justify-center px-4 pointer-events-auto">
        <div className="bg-black/80 backdrop-blur-md p-1 rounded-2xl border border-white/20 flex items-center gap-1 shadow-2xl">
          <button
            type="button"
            onClick={() => setBloqueSeleccionado('MANANA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              bloqueSeleccionado === 'MANANA'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md scale-105 ring-1 ring-amber-300'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            ☀️ Mañana (AM)
          </button>
          <button
            type="button"
            onClick={() => setBloqueSeleccionado('TARDE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              bloqueSeleccionado === 'TARDE'
                ? 'bg-orange-500 text-white font-black shadow-md scale-105 ring-1 ring-orange-300'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            ⛅ Tarde (PM)
          </button>
          <button
            type="button"
            onClick={() => setBloqueSeleccionado('NOCHE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              bloqueSeleccionado === 'NOCHE'
                ? 'bg-indigo-600 text-white font-black shadow-md scale-105 ring-1 ring-indigo-400'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🌙 Noche
          </button>
        </div>
      </div>

      {/* 2. Área Central de Video del Escáner */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Contenedor DOM para la librería Html5Qrcode */}
        <div id="lector-qr-container" className="absolute inset-0 w-full h-full" />

        {/* Máscara y Visor Oscuro con Ventana Transparente Centrada */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div
            className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-2 transition-all duration-300 ${obtenerClaseVisor()}`}
            style={{
              // Sombra hiper-extendida que oscurece el resto de la pantalla dejando el centro transparente
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
            }}
          >
            {/* 4 Esquinas estilizadas de escáner de alta tecnología */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#D2202E] rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#D2202E] rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#D2202E] rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#D2202E] rounded-br-xl" />

            {/* Láser de escaneo animado en movimiento continuo */}
            {escaneandoActivo && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#D2202E] to-transparent animate-pulse shadow-[0_0_12px_#D2202E] top-1/2 -translate-y-1/2" />
            )}

            {/* Mensaje de guía contextual dentro del visor */}
            <div className="absolute -bottom-12 inset-x-0 text-center">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-slate-300 tracking-wide">
                {cooldownRef.current ? 'Procesando lectura...' : 'Apunta al código QR de la escarapela'}
              </span>
            </div>
          </div>
        </div>

        {/* Loader de inicio de la cámara */}
        {cargandoCamara && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0B305B] border border-white/20 flex items-center justify-center animate-pulse mb-4 shadow-xl">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-base font-extrabold text-white mb-1">Iniciando Cámara Trasera</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Concediendo acceso al sensor óptico para el control de asistencia...
            </p>
          </div>
        )}

        {/* Error o falta de permisos en la cámara */}
        {errorCamara && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
              <XCircle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-extrabold text-white mb-2">Acceso a Cámara Bloqueado</h2>
            <p className="text-xs text-slate-300 max-w-sm mb-6 leading-relaxed">
              {errorCamara}
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => window.location.reload()}
                type="button"
                className="w-full py-2.5 rounded-xl bg-[#0B305B] hover:bg-[#07213e] text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reintentar Acceso
              </button>
              <button
                onClick={() => setMostrarManual(true)}
                type="button"
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/15"
              >
                Ingresar Cédula Manualmente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Sheet / Toast Notificación de Resultado */}
      {ultimoResultado && (
        <div className="absolute inset-x-0 bottom-0 z-40 p-4 transition-transform duration-300 animate-in slide-in-from-bottom">
          <div
            className={`max-w-md mx-auto rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl border flex flex-col gap-3 relative overflow-hidden ${
              ultimoResultado.success
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50'
                : ultimoResultado.tipo === 'YA_REGISTRADO'
                ? 'bg-amber-950/90 border-amber-500/60 text-amber-100 shadow-amber-950/50'
                : 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/50'
            }`}
          >
            {/* Botón rápido de descarte */}
            <button
              onClick={() => {
                setUltimoResultado(null)
                setEstadoVisor('IDLE')
              }}
              type="button"
              className="absolute top-3.5 right-3.5 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <div
                className={`p-2.5 rounded-2xl flex-shrink-0 ${
                  ultimoResultado.success
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                    : ultimoResultado.tipo === 'YA_REGISTRADO'
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                }`}
              >
                {ultimoResultado.success ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : ultimoResultado.tipo === 'YA_REGISTRADO' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                  {ultimoResultado.success
                    ? '✓ Ingreso Autorizado'
                    : ultimoResultado.tipo === 'YA_REGISTRADO'
                    ? '⚠ Atención: Doble Marcación'
                    : '✕ Acceso Denegado'}
                </span>

                <h3 className="text-base sm:text-lg font-black text-white truncate leading-tight mt-0.5">
                  {ultimoResultado.usuario?.nombre || 'Asistente no identificado'}
                </h3>

                <p className="text-xs text-white/80 mt-1 leading-snug">
                  {ultimoResultado.mensaje}
                </p>

                {/* Metadatos adicionales del asistente */}
                {ultimoResultado.usuario && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/15 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/90">
                    {ultimoResultado.usuario.codigoEstudiantil && (
                      <span>
                        <strong className="text-white/60">ID:</strong>{' '}
                        {ultimoResultado.usuario.codigoEstudiantil}
                      </span>
                    )}
                    {ultimoResultado.usuario.carrera && (
                      <span className="truncate max-w-[200px]">
                        <strong className="text-white/60">Prog:</strong>{' '}
                        {ultimoResultado.usuario.carrera}
                      </span>
                    )}
                    {ultimoResultado.asistencia && (
                      <span>
                        <strong className="text-white/60">Hora:</strong>{' '}
                        {new Date(ultimoResultado.asistencia.fechaHoraRegistro).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal / Drawer para Entrada Manual de Documento */}
      {mostrarManual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0B305B] text-white">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Búsqueda Manual</h3>
                  <p className="text-[11px] text-slate-400">Ingresa la cédula o código estudiantil</p>
                </div>
              </div>
              <button
                onClick={() => setMostrarManual(false)}
                type="button"
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnvioManual} className="space-y-4">
              {/* Selector de Jornada dentro del Modal Manual */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold text-[11px]">Sesión activa:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBloqueSeleccionado('MANANA')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      bloqueSeleccionado === 'MANANA'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ☀️ AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setBloqueSeleccionado('TARDE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      bloqueSeleccionado === 'TARDE'
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⛅ PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setBloqueSeleccionado('NOCHE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      bloqueSeleccionado === 'NOCHE'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌙 Noche
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  autoFocus
                  value={inputManual}
                  onChange={(e) => setInputManual(e.target.value)}
                  placeholder="Ej. 1067890123"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-base font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D2202E]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarManual(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoManual || !inputManual.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[#D2202E] hover:bg-[#B01824] text-xs font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {procesandoManual ? 'Verificando...' : 'Validar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

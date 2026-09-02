'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  User,
  Calendar,
  ShieldAlert,
  Loader2,
  HandCoins,
} from 'lucide-react'
import { registrarPagoEfectivo } from '@/actions/pagos'

export interface InscripcionData {
  id: string
  asignatura_bonificacion: string | null
  profesor_responsable_dinero: string | null
  estado_pago: string
  montoPagado: number
  evento: {
    id: string
    titulo: string
    precio: number
    fechaInicio: Date | string
  }
  usuario: {
    id: string
    nombre: string
    email: string
    codigoEstudiantil: string | null
    carrera: string | null
  }
}

interface ModalRegistrarPagoProps {
  isOpen: boolean
  onClose: () => void
  inscripcion: InscripcionData | null
  profesorActivoNombre: string
  onPagoCompletado?: (mensaje: string) => void
}

export default function ModalRegistrarPago({
  isOpen,
  onClose,
  inscripcion,
  profesorActivoNombre,
  onPagoCompletado,
}: ModalRegistrarPagoProps) {
  const [monto, setMonto] = useState<number>(0)
  const [observaciones, setObservaciones] = useState<string>('')
  const [confirmado, setConfirmado] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (inscripcion) {
      setMonto(inscripcion.evento.precio)
      setObservaciones('')
      setConfirmado(false)
      setErrorMsg(null)
    }
  }, [inscripcion])

  // Manejar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen || !inscripcion) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmado) {
      setErrorMsg('Debes marcar la casilla confirmando que recibiste el dinero en efectivo.')
      return
    }

    if (monto < 0) {
      setErrorMsg('El monto no puede ser negativo.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const result = await registrarPagoEfectivo({
        inscripcionId: inscripcion.id,
        montoRecibido: Number(monto),
        profesorNombre: profesorActivoNombre,
        observaciones: observaciones.trim() || undefined,
      })

      if (result.success) {
        onPagoCompletado?.(result.message || 'Pago registrado exitosamente.')
        onClose()
      } else {
        setErrorMsg(result.error || 'No se pudo registrar el pago.')
      }
    } catch {
      setErrorMsg('Error de conexión al procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Contenedor del Modal */}
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header del Modal Unisinú */}
        <div className="bg-[#0B305B] px-6 py-4 text-white flex items-center justify-between border-b-2 border-[#D2202E]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
              <HandCoins className="w-5 h-5 text-[#F6CDD1]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Registrar Pago en Efectivo</h3>
              <p className="text-xs text-slate-300">
                Universidad del Sinú &bull; Control Docente de Recaudo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resumen del Alumno e Inscripción */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between border-b border-slate-200/60 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Estudiante
                </span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  {inscripcion.usuario.nombre}
                </p>
                <p className="text-xs text-slate-500">
                  Código: <span className="font-mono text-slate-700 font-semibold">{inscripcion.usuario.codigoEstudiantil ?? 'N/A'}</span> &bull; {inscripcion.usuario.carrera ?? 'Ingeniería'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                {inscripcion.estado_pago}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Evento</span>
                <p className="font-semibold text-slate-800 truncate flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {inscripcion.evento.titulo}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bonificación En</span>
                <p className="font-semibold text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200/60 inline-flex items-center gap-1 mt-0.5">
                  <BookOpen className="w-3 h-3 text-amber-700" />
                  {inscripcion.asignatura_bonificacion || 'Sin asignatura'}
                </p>
              </div>
            </div>
          </div>

          {/* Campo de Monto Recibido */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Monto en Efectivo Recibido (COP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none font-bold text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Valor estándar del evento: ${inscripcion.evento.precio.toLocaleString('es-CO')} COP
            </p>
          </div>

          {/* Nota o Folio Opcional */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nota / Referencia de Recibo (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Recibido en oficina 402 - Recibo # 045"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Casilla de Confirmación Jurada */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-amber-950 font-medium leading-tight">
                Confirmo bajo mi rol docente (<strong>{profesorActivoNombre}</strong>) que he recibido física y efectivamente el valor de <strong>${monto.toLocaleString('es-CO')} COP</strong> por parte del estudiante.
              </span>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !confirmado}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-md shadow-[#D2202E]/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar y Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


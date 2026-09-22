'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Award,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Loader2,
  ScanBarcode,
} from 'lucide-react'
import {
  consultarCertificadosEstudiante,
  ConsultaEstudianteResultado,
  EventoAsistidoItem,
} from '@/actions/certificados'
import { descargarCertificadoPdf } from '@/lib/pdf/generador'

export default function ConsultaCertificadosCliente() {
  const [documento, setDocumento] = useState<string>('')
  const [cargando, setCargando] = useState<boolean>(false)
  const [descargandoId, setDescargandoId] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ConsultaEstudianteResultado | null>(null)
  const [autoDescargaIniciada, setAutoDescargaIniciada] = useState<boolean>(false)

  const handleDescargarCertificado = async (
    item: EventoAsistidoItem,
    usuario?: ConsultaEstudianteResultado['usuario'],
    configGlobal?: ConsultaEstudianteResultado['configuracionGlobal']
  ) => {
    try {
      setDescargandoId(item.asistenciaId)
      await descargarCertificadoPdf({
        alumnoNombre: usuario?.nombre || 'Estudiante',
        alumnoDocumento: usuario?.codigoEstudiantil || usuario?.id || 'N/A',
        alumnoCarrera: usuario?.carrera,
        eventoTitulo: item.eventoTitulo,
        horasAcademicas: item.horasAcademicas || configGlobal?.horasAcademicasDefault || 4,
        fechaEvento: item.eventoFecha,
        fondoUrl: item.certificadoPlantillaUrl || configGlobal?.plantillaFondoDefaultUrl || '/imagen_2.png',
        firmaDecanoUrl: configGlobal?.firmaDecanoUrl || null,
        nombreDecano: configGlobal?.nombreDecano || 'Ing. Roberto Gómez',
        cargoDecano: configGlobal?.cargoFirmante || 'Decano Facultad de Ciencias e Ingenierías',
        firmaDirectorUrl: item.firmaDirectorUrl || null,
        nombreFirmante2: item.nombreFirmante2 || null,
        cargoFirmante2: item.cargoFirmante2 || null,
        asistenciaId: item.asistenciaId,
      })
    } catch (err) {
      console.error('Error generando certificado PDF:', err)
      alert('Ocurrió un error al generar el certificado PDF en tu navegador.')
    } finally {
      setDescargandoId(null)
    }
  }

  const handleBuscar = async (docConsultar?: string) => {
    const valor = (docConsultar ?? documento).trim()
    if (!valor) return

    setCargando(true)
    setResultado(null)
    setAutoDescargaIniciada(false)

    try {
      const res = await consultarCertificadosEstudiante(valor)
      setResultado(res)

      // Si existe al menos un certificado con asistencia, iniciar descarga automática
      if (res.success && res.eventosAsistidos.length > 0) {
        setAutoDescargaIniciada(true)
        const primerCertificado = res.eventosAsistidos[0]
        await handleDescargarCertificado(primerCertificado, res.usuario, res.configuracionGlobal)
      }
    } catch {
      setResultado({
        success: false,
        mensaje: 'Error de conexión al consultar el portal de certificados.',
        eventosAsistidos: [],
        eventosPendientes: [],
      })
    } finally {
      setCargando(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleBuscar()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tarjeta de Búsqueda de Certificados */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-[#0B305B]/5 space-y-6 border-t-4 border-[#D2202E]">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0F4F9] text-[#0B305B] text-xs font-bold border border-[#C2D3E7]">
            <Award className="w-3.5 h-3.5 text-[#D2202E]" />
            Universidad del Sinú &bull; Acreditación de Eventos
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B305B] tracking-tight">
            Descarga de Certificados y Escarapelas
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Ingresa tu cédula o código de estudiante para consultar tus eventos asistidos y descargar tus certificados oficiales en PDF con firma y validación digital.
          </p>
        </div>

        {/* Formulario de Consulta */}
        <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ingresa tu cédula o código estudiantil..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-2xl text-sm font-semibold text-slate-900 outline-none transition shadow-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={cargando || !documento.trim()}
              className="px-6 py-3.5 bg-[#0B305B] hover:bg-[#071F3B] disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#0B305B]/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {cargando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  Consultar
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Resultados de la Consulta */}
      {resultado && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Banner de Identificación del Estudiante */}
          {resultado.usuario ? (
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <GraduationCap className="w-8 h-8 text-indigo-200" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">
                    Estudiante Identificado
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {resultado.usuario.nombre}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Cód: <span className="font-mono text-white font-semibold">{resultado.usuario.codigoEstudiantil}</span> &bull; {resultado.usuario.carrera}
                  </p>
                </div>
              </div>

              {autoDescargaIniciada && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Descarga automática iniciada
                </div>
              )}
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h4 className="font-bold text-rose-900 text-base">Documento no encontrado</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                {resultado.mensaje}
              </p>
            </div>
          )}

          {/* Sección de Certificados Disponibles (Asistencia Confirmada) */}
          {resultado.eventosAsistidos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Certificados Oficiales Disponibles ({resultado.eventosAsistidos.length})
                </h3>
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  Asistencia Validada en Puerta
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resultado.eventosAsistidos.map((item) => (
                  <div
                    key={item.asistenciaId}
                    className="bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ASISTENCIA CONFIRMADA
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(item.eventoFecha).toLocaleDateString('es-CO')}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base leading-snug">
                        {item.eventoTitulo}
                      </h4>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Lugar: {item.eventoUbicacion}
                      </p>

                      {item.asignaturaBonificacion && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="text-xs">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">
                              Bonificación Académica Asignada:
                            </span>
                            <span className="font-bold text-amber-950">
                              {item.asignaturaBonificacion}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botones de Descarga PDF */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDescargarCertificado(
                            item,
                            resultado.usuario,
                            resultado.configuracionGlobal
                          )
                        }
                        disabled={descargandoId === item.asistenciaId}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D2202E] hover:bg-[#B01824] disabled:bg-rose-300 text-white font-bold text-xs rounded-xl shadow-md shadow-[#D2202E]/20 transition cursor-pointer"
                      >
                        {descargandoId === item.asistenciaId ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generando PDF...</span>
                          </>
                        ) : (
                          <>
                            <Award className="w-4 h-4" />
                            <span>Descargar Certificado (PDF)</span>
                          </>
                        )}
                      </button>
                      <a
                        href={`/api/escarapela/${item.inscripcionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-300"
                        title="Descargar Escarapela de 85x54mm con código de barras"
                      >
                        <ScanBarcode className="w-4 h-4 text-[#0B305B]" />
                        Escarapela
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección de Otras Inscripciones sin Certificado */}
          {resultado.eventosPendientes.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Otras Inscripciones Registradas (Sin Certificado Disponible)
              </h4>

              <div className="space-y-2">
                {resultado.eventosPendientes.map((pend) => (
                  <div
                    key={pend.inscripcionId}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{pend.eventoTitulo}</p>
                      <p className="text-[11px] text-slate-500">
                        Fecha: {new Date(pend.eventoFecha).toLocaleDateString('es-CO')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                          pend.motivo === 'PAGO_PENDIENTE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {pend.motivo === 'PAGO_PENDIENTE'
                          ? '⚠ Pago Pendiente (Legalizar con Docente)'
                          : 'Asistencia No Marcada en Puerta'}
                      </span>
                      <a
                        href={`/api/escarapela/${pend.inscripcionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold px-2 py-1 bg-indigo-50 rounded-lg transition"
                      >
                        Ver Escarapela
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


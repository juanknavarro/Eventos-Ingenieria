'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  BookOpen,
  Search,
  Filter,
  ArrowLeft,
  Calendar,
  Sparkles,
  HandCoins,
  AlertCircle,
  GraduationCap,
  RotateCcw,
  Check,
} from 'lucide-react'
import ModalRegistrarPago, { InscripcionData } from './ModalRegistrarPago'
import { revertirPago } from '@/actions/pagos'

export interface ProfesorUsuario {
  id: string
  nombre: string
  email: string
  rol: string
  carrera: string | null
}

export interface EventoOption {
  id: string
  titulo: string
  precio: number
  fechaInicio: Date | string
}

interface PanelProfesorClienteProps {
  profesores: ProfesorUsuario[]
  eventos: EventoOption[]
  inscripcionesIniciales: InscripcionData[]
}

export default function PanelProfesorCliente({
  profesores,
  eventos,
  inscripcionesIniciales,
}: PanelProfesorClienteProps) {
  // Estado para el profesor activo (por defecto el primer docente)
  const [profesorId, setProfesorId] = useState<string>(
    profesores[0]?.id || ''
  )
  const profesorActivo = useMemo(
    () => profesores.find((p) => p.id === profesorId) || profesores[0],
    [profesores, profesorId]
  )

  // Filtros
  const [eventoFiltro, setEventoFiltro] = useState<string>('TODOS')
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS')
  const [busqueda, setBusqueda] = useState<string>('')

  // Estado del Modal
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)
  const [inscripcionSeleccionada, setInscripcionSeleccionada] =
    useState<InscripcionData | null>(null)

  // Mensaje Toast / Notificación
  const [toastMensaje, setToastMensaje] = useState<string | null>(null)
  const [loadingRevertir, setLoadingRevertir] = useState<string | null>(null)

  // Filtrar inscripciones
  const inscripcionesFiltradas = useMemo(() => {
    return inscripcionesIniciales.filter((ins) => {
      // Filtro por evento
      if (eventoFiltro !== 'TODOS' && ins.evento.id !== eventoFiltro) {
        return false
      }

      // Filtro por estado
      if (estadoFiltro !== 'TODOS' && ins.estado_pago !== estadoFiltro) {
        return false
      }

      // Búsqueda por texto (nombre, código o correo)
      if (busqueda.trim() !== '') {
        const query = busqueda.toLowerCase()
        const matchNombre = ins.usuario.nombre.toLowerCase().includes(query)
        const matchCodigo = ins.usuario.codigoEstudiantil?.toLowerCase().includes(query) ?? false
        const matchEmail = ins.usuario.email.toLowerCase().includes(query)
        const matchAsignatura = ins.asignatura_bonificacion?.toLowerCase().includes(query) ?? false
        if (!matchNombre && !matchCodigo && !matchEmail && !matchAsignatura) {
          return false
        }
      }

      return true
    })
  }, [inscripcionesIniciales, eventoFiltro, estadoFiltro, busqueda])

  // Cálculos y Métricas del contexto
  const metricas = useMemo(() => {
    const total = inscripcionesFiltradas.length
    const pendientes = inscripcionesFiltradas.filter((i) => i.estado_pago === 'PENDIENTE')
    const pagadas = inscripcionesFiltradas.filter((i) => i.estado_pago === 'PAGADO')

    const dineroPendiente = pendientes.reduce((acc, curr) => acc + curr.evento.precio, 0)
    const dineroRecaudado = pagadas.reduce((acc, curr) => acc + curr.montoPagado, 0)

    return {
      total,
      pendientesCount: pendientes.length,
      pagadasCount: pagadas.length,
      dineroPendiente,
      dineroRecaudado,
    }
  }, [inscripcionesFiltradas])

  const abrirModalPago = (ins: InscripcionData) => {
    setInscripcionSeleccionada(ins)
    setModalAbierto(true)
  }

  const handlePagoCompletado = (mensaje: string) => {
    setToastMensaje(mensaje)
    setTimeout(() => {
      setToastMensaje(null)
    }, 6000)
  }

  const handleRevertirPago = async (insId: string) => {
    if (!confirm('¿Estás seguro de revertir este pago a estado PENDIENTE?')) return
    setLoadingRevertir(insId)
    try {
      const res = await revertirPago(insId)
      if (res.success) {
        setToastMensaje(res.message || 'Pago revertido con éxito.')
        setTimeout(() => setToastMensaje(null), 5000)
      } else {
        alert(res.error)
      }
    } finally {
      setLoadingRevertir(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Toast de Notificación */}
      {toastMensaje && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-slate-100">Transacción Exitosa</p>
            <p className="text-slate-300 mt-0.5">{toastMensaje}</p>
          </div>
          <button
            onClick={() => setToastMensaje(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra Superior de Control de Sesión Docente */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100/80 text-indigo-700 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sesión Activa - Rol Docente
            </span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base">
                {profesorActivo?.nombre || 'Docente'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                PROFESOR
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {profesorActivo?.carrera || 'Facultad de Ingenierías'} &bull; {profesorActivo?.email}
            </p>
          </div>
        </div>

        {/* Selector de Profesor para Pruebas Multiusuario */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Simular Docente:
          </span>
          <select
            value={profesorId}
            onChange={(e) => setProfesorId(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {profesores.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.nombre} ({prof.carrera || 'Docente'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Métricas del Panel Docente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Preinscritos</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metricas.total}</p>
          <p className="text-xs text-slate-500 mt-1">Estudiantes en vista actual</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pagos Pendientes</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{metricas.pendientesCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            Por recaudar: ${metricas.dineroPendiente.toLocaleString('es-CO')} COP
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pagos Completados</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{metricas.pagadasCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            Recaudado: ${metricas.dineroRecaudado.toLocaleString('es-CO')} COP
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Recaudo Efectivo</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            ${metricas.dineroRecaudado.toLocaleString('es-CO')} COP
          </p>
          <p className="text-xs text-slate-500 mt-1">Total en caja física</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Buscador de estudiante */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por estudiante, código o materia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Selector de Evento */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Evento:</span>
            <select
              value={eventoFiltro}
              onChange={(e) => setEventoFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="TODOS">Todos los Eventos ({eventos.length})</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} (${ev.precio.toLocaleString('es-CO')})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Estado de Pago */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Estado:</span>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE">Solo Pendientes</option>
              <option value="PAGADO">Solo Pagados</option>
              <option value="EXENTO">Solo Exentos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Alumnos Preinscritos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Alumnos Preinscritos y Control de Recaudación
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haga clic en <strong className="text-indigo-600 font-semibold">&apos;Registrar Pago&apos;</strong> para confirmar la recepción física del dinero en efectivo y completar la inscripción.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg self-start sm:self-auto shadow-sm">
            {inscripcionesFiltradas.length} alumno(s) listado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#0B305B] text-white font-bold border-b-2 border-[#D2202E] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Evento & Tarifa</th>
                <th className="px-5 py-3.5">Asignatura Bonificación</th>
                <th className="px-5 py-3.5">Responsable Recaudo</th>
                <th className="px-5 py-3.5">Estado Pago</th>
                <th className="px-5 py-3.5 text-right">Acción Administrativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inscripcionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">
                      No se encontraron alumnos preinscritos con los filtros actuales
                    </p>
                    <p className="text-xs mt-1">
                      Intenta cambiar los filtros de búsqueda o seleccionar otro evento.
                    </p>
                  </td>
                </tr>
              ) : (
                inscripcionesFiltradas.map((ins) => {
                  const esPendiente = ins.estado_pago === 'PENDIENTE'
                  const esPagado = ins.estado_pago === 'PAGADO'

                  return (
                    <tr
                      key={ins.id}
                      className={`transition-colors hover:bg-slate-50 ${
                        esPendiente ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Alumno */}
                      <td className="px-5 py-4 font-medium text-slate-900">
                        <div className="font-bold text-[#0B305B]">{ins.usuario.nombre}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Cód: <span className="font-mono text-slate-700 font-semibold">{ins.usuario.codigoEstudiantil ?? 'N/A'}</span> &bull; {ins.usuario.carrera ?? 'Ingeniería'}
                        </div>
                        <div className="text-[10px] text-slate-400">{ins.usuario.email}</div>
                      </td>

                      {/* Evento */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {ins.evento.titulo}
                        </div>
                        <div className="text-[11px] font-bold text-[#0B305B] mt-0.5">
                          {ins.evento.precio === 0
                            ? 'Gratuito'
                            : `$${ins.evento.precio.toLocaleString('es-CO')} COP`}
                        </div>
                      </td>

                      {/* Asignatura Bonificación */}
                      <td className="px-5 py-4">
                        {ins.asignatura_bonificacion ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold text-[11px]">
                            <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            {ins.asignatura_bonificacion}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin bonificación</span>
                        )}
                      </td>

                      {/* Responsable Dinero */}
                      <td className="px-5 py-4">
                        <div className="text-slate-800 font-medium">
                          {ins.profesor_responsable_dinero || 'Sin asignar'}
                        </div>
                        {ins.montoPagado > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Monto recibido: ${ins.montoPagado.toLocaleString('es-CO')} COP
                          </div>
                        )}
                      </td>

                      {/* Estado Pago Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                            esPagado
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ins.estado_pago === 'EXENTO'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {esPagado ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : ins.estado_pago === 'EXENTO' ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {ins.estado_pago}
                        </span>
                      </td>

                      {/* Botón Acción Registrar Pago / Revertir */}
                      <td className="px-5 py-4 text-right">
                        {esPendiente ? (
                          <button
                            onClick={() => abrirModalPago(ins)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] rounded-xl shadow-md shadow-[#D2202E]/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
                          >
                            <HandCoins className="w-3.5 h-3.5" />
                            Registrar Pago
                          </button>
                        ) : esPagado ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                              Recaudado
                            </span>
                            <button
                              onClick={() => handleRevertirPago(ins.id)}
                              disabled={loadingRevertir === ins.id}
                              title="Revertir a pendiente en caso de error"
                              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            No requiere recaudo
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Pago en Efectivo */}
      <ModalRegistrarPago
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        inscripcion={inscripcionSeleccionada}
        profesorActivoNombre={profesorActivo?.nombre || 'Docente'}
        onPagoCompletado={handlePagoCompletado}
      />
    </div>
  )
}


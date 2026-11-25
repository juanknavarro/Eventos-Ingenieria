'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Banknote,
  Landmark,
  Loader2,
} from 'lucide-react'
import ModalRegistrarPago, { InscripcionData } from './ModalRegistrarPago'
import {
  revertirPago,
  registrarPago,
  confirmarCuposGratuitosMasivo,
} from '@/actions/pagos'

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
  programas?: Array<{ id: string; nombre: string }>
}

interface PanelProfesorClienteProps {
  docenteActual?: ProfesorUsuario
  profesores?: ProfesorUsuario[]
  eventos: EventoOption[]
  inscripcionesIniciales: InscripcionData[]
}

export default function PanelProfesorCliente({
  docenteActual,
  profesores = [],
  eventos,
  inscripcionesIniciales,
}: PanelProfesorClienteProps) {
  // Datos del docente autenticado leídos exclusivamente de la sesión
  const router = useRouter()
  const profesorActivo = docenteActual || profesores[0]

  // Filtros
  const [eventoFiltro, setEventoFiltro] = useState<string>('TODOS')
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS')
  const [metodoFiltro, setMetodoFiltro] = useState<string>('TODOS')
  const [busqueda, setBusqueda] = useState<string>('')

  // Estado del Modal
  const [modalAbierto, setModalAbierto] = useState<boolean>(false)
  const [inscripcionSeleccionada, setInscripcionSeleccionada] =
    useState<InscripcionData | null>(null)

  // Mensaje Toast / Notificación y estados de carga
  const [toastMensaje, setToastMensaje] = useState<string | null>(null)
  const [loadingRevertir, setLoadingRevertir] = useState<string | null>(null)
  const [confirmandoGratuitoId, setConfirmandoGratuitoId] = useState<string | null>(null)
  const [confirmandoMasivo, setConfirmandoMasivo] = useState<boolean>(false)
  const [seleccionadosGratuitos, setSeleccionadosGratuitos] = useState<string[]>([])

  // Filtrar inscripciones
  const inscripcionesFiltradas = useMemo(() => {
    return inscripcionesIniciales.filter((ins) => {
      // Filtro por evento
      if (eventoFiltro !== 'TODOS' && ins.evento.id !== eventoFiltro) {
        return false
      }

      // Filtro por estado de pago
      if (estadoFiltro !== 'TODOS' && ins.estado_pago !== estadoFiltro) {
        return false
      }

      // Filtro por método de pago con retrocompatibilidad
      if (metodoFiltro !== 'TODOS') {
        const esEfectivo = ins.metodo_pago === 'EFECTIVO' || (!ins.metodo_pago && ins.estado_pago === 'PAGADO')
        if (metodoFiltro === 'EFECTIVO' && !esEfectivo) return false
        if (metodoFiltro === 'TRANSFERENCIA' && ins.metodo_pago !== 'TRANSFERENCIA') return false
      }

      // Búsqueda por texto (nombre, código, correo o materia)
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
  }, [inscripcionesIniciales, eventoFiltro, estadoFiltro, metodoFiltro, busqueda])

  // Cálculos y Métricas desglosadas (Físico vs Bancos)
  const metricas = useMemo(() => {
    const total = inscripcionesFiltradas.length
    const pendientes = inscripcionesFiltradas.filter((i) => i.estado_pago === 'PENDIENTE')
    const pagadas = inscripcionesFiltradas.filter((i) => i.estado_pago === 'PAGADO')

    const dineroPendiente = pendientes.reduce((acc, curr) => acc + curr.evento.precio, 0)
    const dineroRecaudado = pagadas.reduce((acc, curr) => acc + curr.montoPagado, 0)

    // Recaudo Físico (Efectivo o registros anteriores nulos pagados)
    const recaudoFisico = pagadas
      .filter((i) => i.metodo_pago === 'EFECTIVO' || (!i.metodo_pago && i.estado_pago === 'PAGADO'))
      .reduce((acc, curr) => acc + curr.montoPagado, 0)

    // Recaudo en Bancos (Transferencias verificadas)
    const recaudoBancos = pagadas
      .filter((i) => i.metodo_pago === 'TRANSFERENCIA')
      .reduce((acc, curr) => acc + curr.montoPagado, 0)

    const efectivoCount = pagadas.filter(
      (i) => i.metodo_pago === 'EFECTIVO' || (!i.metodo_pago && i.estado_pago === 'PAGADO')
    ).length

    const transferenciasCount = pagadas.filter((i) => i.metodo_pago === 'TRANSFERENCIA').length

    return {
      total,
      pendientesCount: pendientes.length,
      pagadasCount: pagadas.length,
      dineroPendiente,
      dineroRecaudado,
      recaudoFisico,
      recaudoBancos,
      efectivoCount,
      transferenciasCount,
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
        router.refresh()
      } else {
        alert(res.error)
      }
    } finally {
      setLoadingRevertir(null)
    }
  }

  // Inscripciones elegibles para habilitación gratuita masiva (PENDIENTE y evento.precio === 0)
  const pendientesGratuitosVisibles = useMemo(
    () =>
      inscripcionesFiltradas.filter(
        (i) => i.estado_pago === 'PENDIENTE' && i.evento.precio === 0
      ),
    [inscripcionesFiltradas]
  )

  const todosGratuitosSeleccionados =
    pendientesGratuitosVisibles.length > 0 &&
    pendientesGratuitosVisibles.every((i) => seleccionadosGratuitos.includes(i.id))

  const toggleSeleccionarTodosGratuitos = () => {
    if (todosGratuitosSeleccionados) {
      const idsVisibles = new Set(pendientesGratuitosVisibles.map((i) => i.id))
      setSeleccionadosGratuitos((prev) => prev.filter((id) => !idsVisibles.has(id)))
    } else {
      const nuevosIds = new Set([
        ...seleccionadosGratuitos,
        ...pendientesGratuitosVisibles.map((i) => i.id),
      ])
      setSeleccionadosGratuitos(Array.from(nuevosIds))
    }
  }

  const toggleSeleccionarGratuito = (id: string) => {
    setSeleccionadosGratuitos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleConfirmarCupoGratuito = async (ins: InscripcionData) => {
    setConfirmandoGratuitoId(ins.id)
    try {
      const res = await registrarPago({
        inscripcionId: ins.id,
        montoRecibido: 0,
        profesorNombre: profesorActivo?.nombre,
      })
      if (res.success) {
        setSeleccionadosGratuitos((prev) => prev.filter((id) => id !== ins.id))
        handlePagoCompletado(
          res.message || `Cupo gratuito confirmado (EXENTO) para ${ins.usuario.nombre}.`
        )
        router.refresh()
      } else {
        alert(res.error || 'No se pudo confirmar el cupo gratuito.')
      }
    } finally {
      setConfirmandoGratuitoId(null)
    }
  }

  const handleConfirmarMasivoGratuitos = async () => {
    if (seleccionadosGratuitos.length === 0 || confirmandoMasivo) return
    setConfirmandoMasivo(true)
    try {
      const res = await confirmarCuposGratuitosMasivo(seleccionadosGratuitos)
      if (res.success) {
        setSeleccionadosGratuitos([])
        handlePagoCompletado(
          res.message || 'Cupos gratuitos habilitados como EXENTO con éxito.'
        )
        router.refresh()
      } else {
        alert(res.error || 'Ocurrió un error al habilitar los cupos seleccionados.')
      }
    } finally {
      setConfirmandoMasivo(false)
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
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra Superior de Identificación del Docente Autenticado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#0B305B] text-white rounded-2xl shadow-sm border-t-2 border-[#D2202E]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#D2202E] uppercase tracking-wider">
                Docente Titular Autenticado
              </span>
              <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 uppercase">
                {profesorActivo?.rol || 'PROFESOR'}
              </span>
            </div>
            <h2 className="font-extrabold text-slate-900 text-lg leading-tight">
              {profesorActivo?.nombre || 'Docente de la Facultad'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {profesorActivo?.carrera || 'Facultad de Ciencias e Ingenierías'} &bull; <span className="text-slate-400">{profesorActivo?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Habilitado para validación de efectivo y transferencias</span>
        </div>
      </div>

      {/* Métricas Financieras Desglosadas del Panel Docente (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Preinscritos */}
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

        {/* Por Recaudar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Por Recaudar</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            ${metricas.dineroPendiente.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {metricas.pendientesCount} pago(s) pendiente(s)
          </p>
        </div>

        {/* Recaudo Físico (Efectivo) */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Recaudo Físico</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">
            ${metricas.recaudoFisico.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {metricas.efectivoCount} pago(s) en efectivo
          </p>
        </div>

        {/* Recaudo en Bancos (Transferencias) */}
        <div className="bg-white p-5 rounded-xl border border-indigo-200/80 shadow-sm bg-gradient-to-br from-white to-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase">Recaudo en Bancos</span>
            <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-800 mt-2">
            ${metricas.recaudoBancos.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-indigo-600 font-medium mt-1">
            {metricas.transferenciasCount} transferencia(s) CUS
          </p>
        </div>

        {/* Total Consolidado */}
        <div className="bg-white p-5 rounded-xl border border-[#0B305B]/30 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0B305B] uppercase">Total Recaudado</span>
            <div className="p-2 bg-[#0B305B] text-white rounded-lg">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#0B305B] mt-2">
            ${metricas.dineroRecaudado.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Físico + Bancos ({metricas.pagadasCount} total)
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Filtro de Método de Pago */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Método:</span>
            <select
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="TODOS">Todos los Métodos</option>
              <option value="EFECTIVO">Solo Efectivo</option>
              <option value="TRANSFERENCIA">Solo Transferencia</option>
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
              Haga clic en <strong className="text-[#0B305B] font-semibold">&apos;Registrar Pago&apos;</strong> para eventos de pago o en <strong className="text-blue-700 font-semibold">&apos;Confirmar Cupo&apos;</strong> para eventos gratuitos.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {pendientesGratuitosVisibles.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmarMasivoGratuitos}
                disabled={seleccionadosGratuitos.length === 0 || confirmandoMasivo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
              >
                {confirmandoMasivo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  Habilitar seleccionados (Gratuito)
                  {seleccionadosGratuitos.length > 0 ? ` (${seleccionadosGratuitos.length})` : ''}
                </span>
              </button>
            )}
            <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm">
              {inscripcionesFiltradas.length} alumno(s) listado(s)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#0B305B] text-white font-bold border-b-2 border-[#D2202E] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="pl-5 pr-2 py-3.5 w-10">
                  {pendientesGratuitosVisibles.length > 0 && (
                    <input
                      type="checkbox"
                      checked={todosGratuitosSeleccionados}
                      onChange={toggleSeleccionarTodosGratuitos}
                      title="Seleccionar todos los cupos gratuitos pendientes visibles"
                      className="w-4 h-4 rounded border-white/40 accent-blue-500 cursor-pointer"
                    />
                  )}
                </th>
                <th className="px-5 py-3.5">Estudiante</th>
                <th className="px-5 py-3.5">Evento & Tarifa</th>
                <th className="px-5 py-3.5">Asignatura Bonificación</th>
                <th className="px-5 py-3.5">Responsable & Método</th>
                <th className="px-5 py-3.5">Estado Pago</th>
                <th className="px-5 py-3.5 text-right">Acción Administrativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inscripcionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">
                      No se encontraron alumnos preinscritos con los filtros actuales
                    </p>
                    <p className="text-xs mt-1">
                      Intenta cambiar los filtros de búsqueda o seleccionar otro evento o método de pago.
                    </p>
                  </td>
                </tr>
              ) : (
                inscripcionesFiltradas.map((ins) => {
                  const esPendiente = ins.estado_pago === 'PENDIENTE'
                  const esPagado = ins.estado_pago === 'PAGADO'
                  const esGratuito = ins.evento.precio === 0
                  const esTransferencia = ins.metodo_pago === 'TRANSFERENCIA'
                  const estaSeleccionado = seleccionadosGratuitos.includes(ins.id)

                  return (
                    <tr
                      key={ins.id}
                      className={`transition-colors hover:bg-slate-50 ${
                        estaSeleccionado
                          ? 'bg-blue-50/40'
                          : esPendiente
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* Checkbox para habilitación masiva en eventos gratuitos */}
                      <td className="pl-5 pr-2 py-4">
                        {esPendiente && esGratuito ? (
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
                            onChange={() => toggleSeleccionarGratuito(ins.id)}
                            aria-label={`Seleccionar a ${ins.usuario.nombre}`}
                            className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 select-none">&mdash;</span>
                        )}
                      </td>

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

                      {/* Responsable Dinero & Método de Pago (Badge con referencia) */}
                      <td className="px-5 py-4">
                        <div className="text-slate-800 font-medium">
                          {ins.profesor_responsable_dinero || 'Sin asignar'}
                        </div>
                        {ins.montoPagado > 0 && (
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Monto: ${ins.montoPagado.toLocaleString('es-CO')} COP
                          </div>
                        )}

                        {/* Insignia visual del Método de Pago */}
                        {esPagado && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {esTransferencia ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                                title={ins.comprobanteUrl || 'Transferencia bancaria'}
                              >
                                <Landmark className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>Transferencia</span>
                                {ins.comprobanteUrl && (
                                  <span className="font-mono text-[9px] text-indigo-900 font-semibold max-w-[120px] truncate">
                                    {ins.comprobanteUrl.replace('TRANSFERENCIA [', '').replace(']', '')}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <Banknote className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Efectivo</span>
                              </span>
                            )}
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

                      {/* Botón Acción Registrar Pago / Confirmar Cupo / Revertir */}
                      <td className="px-5 py-4 text-right">
                        {esPendiente ? (
                          esGratuito ? (
                            <button
                              type="button"
                              onClick={() => handleConfirmarCupoGratuito(ins)}
                              disabled={confirmandoGratuitoId === ins.id}
                              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
                            >
                              {confirmandoGratuitoId === ins.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              Confirmar Cupo
                            </button>
                          ) : (
                            <button
                              onClick={() => abrirModalPago(ins)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#D2202E] hover:bg-[#B01824] rounded-xl shadow-md shadow-[#D2202E]/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              Registrar Pago
                            </button>
                          )
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
                              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Exento de pago</span>
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

      {/* Modal para Registrar Pago */}
      <ModalRegistrarPago
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false)
          setInscripcionSeleccionada(null)
        }}
        inscripcion={inscripcionSeleccionada}
        profesorActivoNombre={profesorActivo?.nombre || 'Docente'}
        onPagoCompletado={handlePagoCompletado}
      />
    </div>
  )
}

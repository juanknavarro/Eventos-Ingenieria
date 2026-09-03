'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  DollarSign,
  Users,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  ArrowLeft,
  GraduationCap,
  Award,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react'

export interface EventoOpcion {
  id: string
  titulo: string
  fechaInicio: Date | string
  ubicacion: string
  precio: number
  estado: string
}

export interface InscripcionReporte {
  id: string
  eventoId: string
  eventoTitulo: string
  eventoPrecio: number
  usuarioId: string
  usuarioNombre: string
  usuarioEmail: string
  usuarioCedula: string | null
  usuarioCarrera: string | null
  usuarioSemestre: string | null
  asignaturaBonificacion: string | null
  profesorNombre: string
  estadoPago: string
  montoPagado: number
  fechaInscripcion: Date | string
  asistencia: {
    id: string
    fechaHoraRegistro: Date | string
    metodo: string
    registradoPorNombre: string
    observaciones: string | null
  } | null
}

interface Props {
  eventos: EventoOpcion[]
  inscripciones: InscripcionReporte[]
}

const PALETA_COLORES = [
  '#0B305B', // Azul Marino Unisinú
  '#D2202E', // Rojo Institucional
  '#10B981', // Verde Esmeralda
  '#F59E0B', // Ámbar
  '#8B5CF6', // Púrpura
  '#06B6D4', // Cian
  '#EC4899', // Rosa
  '#64748B', // Pizarra
]

export default function DashboardReportesCliente({ eventos, inscripciones }: Props) {
  const [mounted, setMounted] = useState(false)
  const [eventoFiltro, setEventoFiltro] = useState<string>('todos')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filtrado de inscripciones según el evento seleccionado
  const inscripcionesFiltradas = useMemo(() => {
    if (eventoFiltro === 'todos') {
      return inscripciones
    }
    return inscripciones.filter((ins) => ins.eventoId === eventoFiltro)
  }, [eventoFiltro, inscripciones])

  // Cálculo dinámico de KPIs
  const kpis = useMemo(() => {
    const totalInscritos = inscripcionesFiltradas.length
    const totalRecaudado = inscripcionesFiltradas.reduce(
      (acc, curr) => acc + (curr.estadoPago === 'PAGADO' ? curr.montoPagado : 0),
      0
    )
    const pagadosCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'PAGADO').length
    const pendientesCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'PENDIENTE').length
    const exentosCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'EXENTO').length

    const asistentesReales = inscripcionesFiltradas.filter((i) => i.asistencia !== null).length
    const tasaAsistencia = totalInscritos > 0 ? (asistentesReales / totalInscritos) * 100 : 0

    // Dinero estimado pendiente de cobro
    const montoPendiente = inscripcionesFiltradas.reduce((acc, curr) => {
      if (curr.estadoPago === 'PENDIENTE') {
        return acc + curr.eventoPrecio
      }
      return acc
    }, 0)

    return {
      totalRecaudado,
      totalInscritos,
      pagadosCount,
      pendientesCount,
      exentosCount,
      asistentesReales,
      tasaAsistencia,
      montoPendiente,
    }
  }, [inscripcionesFiltradas])

  // Datos para Gráfico de Barras: Recaudo por cada Profesor
  const datosRecaudoPorProfesor = useMemo(() => {
    const map = new Map<string, { profesor: string; recaudado: number; alumnos: number }>()

    for (const ins of inscripcionesFiltradas) {
      const nombreProf = ins.profesorNombre || 'Sin Docente Asignado'
      const actual = map.get(nombreProf) || { profesor: nombreProf, recaudado: 0, alumnos: 0 }
      actual.alumnos += 1
      if (ins.estadoPago === 'PAGADO') {
        actual.recaudado += ins.montoPagado
      }
      map.set(nombreProf, actual)
    }

    return Array.from(map.values()).sort((a, b) => b.recaudado - a.recaudado)
  }, [inscripcionesFiltradas])

  // Datos para Gráfico Circular: Inscritos por Programa Académico
  const datosInscritosPorCarrera = useMemo(() => {
    const map = new Map<string, number>()

    for (const ins of inscripcionesFiltradas) {
      const carrera = ins.usuarioCarrera || 'Facultad de Ingenierías'
      map.set(carrera, (map.get(carrera) || 0) + 1)
    }

    return Array.from(map.entries()).map(([carrera, cantidad]) => ({
      name: carrera,
      value: cantidad,
    }))
  }, [inscripcionesFiltradas])

  // 2) Exportar archivo estructurado Excel con tres hojas:
  // 'Resumen Financiero', 'Listado General' y 'Auditoría de Asistencia'
  const handleExportarExcel = () => {
    const wb = XLSX.utils.book_new()

    // HOJA 1: Resumen Financiero
    const eventoInfo =
      eventoFiltro === 'todos'
        ? 'Consolidado General — Todos los Eventos'
        : eventos.find((e) => e.id === eventoFiltro)?.titulo || 'Evento Seleccionado'

    const hoja1Datos = [
      ['REPORTE FINANCIERO Y AUDITORÍA DE EVENTOS — UNIVERSIDAD DEL SINÚ'],
      ['Facultad de Ciencias e Ingenierías'],
      ['Fecha de Generación:', new Date().toLocaleString('es-CO')],
      ['Evento Consultado:', eventoInfo],
      [],
      ['INDICADOR / MÉTRICA', 'VALOR'],
      ['Total Recaudado (Efectivo)', `$${kpis.totalRecaudado.toLocaleString('es-CO')} COP`],
      ['Monto Pendiente por Cobrar', `$${kpis.montoPendiente.toLocaleString('es-CO')} COP`],
      ['Total de Estudiantes Preinscritos', kpis.totalInscritos],
      ['Inscripciones Pagadas (Confirmadas)', kpis.pagadosCount],
      ['Inscripciones Pendientes de Pago', kpis.pendientesCount],
      ['Inscripciones Exentas / Becadas', kpis.exentosCount],
      ['Asistentes Reales en Puerta (Check-in)', kpis.asistentesReales],
      ['Tasa de Efectividad de Asistencia', `${kpis.tasaAsistencia.toFixed(1)}%`],
      [],
      ['DESGLOSE DE RECAUDO POR DOCENTE RESPONSABLE'],
      ['Docente / Profesor', 'Alumnos Asignados', 'Total Recaudado (COP)'],
      ...datosRecaudoPorProfesor.map((d) => [
        d.profesor,
        d.alumnos,
        d.recaudado,
      ]),
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(hoja1Datos)
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Financiero')

    // HOJA 2: Listado General de Inscritos
    const hoja2Datos = [
      [
        'Cédula / ID',
        'Nombre del Estudiante',
        'Correo Institucional',
        'Programa Académico',
        'Semestre',
        'Evento Académico',
        'Asignatura Bonificación',
        'Docente Recaudador',
        'Estado de Pago',
        'Monto Pagado (COP)',
        'Fecha de Inscripción',
      ],
      ...inscripcionesFiltradas.map((ins) => [
        ins.usuarioCedula || 'N/A',
        ins.usuarioNombre,
        ins.usuarioEmail,
        ins.usuarioCarrera || 'Facultad de Ingenierías',
        ins.usuarioSemestre || 'N/A',
        ins.eventoTitulo,
        ins.asignaturaBonificacion || 'No aplica',
        ins.profesorNombre,
        ins.estadoPago,
        ins.montoPagado,
        new Date(ins.fechaInscripcion).toLocaleString('es-CO'),
      ]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(hoja2Datos)
    XLSX.utils.book_append_sheet(wb, ws2, 'Listado General')

    // HOJA 3: Auditoría de Asistencia (Check-in en Puerta)
    const asistenciasFiltradas = inscripcionesFiltradas.filter((ins) => ins.asistencia !== null)
    const hoja3Datos = [
      [
        'Cédula / ID',
        'Nombre del Asistente',
        'Programa Académico',
        'Evento Validado',
        'Fecha y Hora Check-in',
        'Método de Escaneo',
        'Validado Por (Staff / Docente)',
        'Observaciones de Entrada',
      ],
      ...asistenciasFiltradas.map((ins) => [
        ins.usuarioCedula || 'N/A',
        ins.usuarioNombre,
        ins.usuarioCarrera || 'Facultad de Ingenierías',
        ins.eventoTitulo,
        ins.asistencia ? new Date(ins.asistencia.fechaHoraRegistro).toLocaleString('es-CO') : '',
        ins.asistencia?.metodo || 'QR',
        ins.asistencia?.registradoPorNombre || 'Staff Oficial',
        ins.asistencia?.observaciones || 'Sin novedades',
      ]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(hoja3Datos)
    XLSX.utils.book_append_sheet(wb, ws3, 'Auditoría de Asistencia')

    // Descargar libro Excel
    const nombreArchivo = `Reporte_Auditoria_Unisinu_${Date.now()}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* BARRA DE CONTROL: FILTRO DE EVENTO Y BOTONES DE EXPORTACIÓN */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Selector de Evento */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B305B] shrink-0">
            <Filter className="w-4 h-4 text-[#D2202E]" />
            Filtrar por Evento:
          </div>

          <select
            value={eventoFiltro}
            onChange={(e) => setEventoFiltro(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
          >
            <option value="todos">Todos los Eventos Académicos ({eventos.length})</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.titulo} ({ev.estado})
              </option>
            ))}
          </select>
        </div>

        {/* 2 y 3) Botones de Exportación: Excel y PDF */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto self-end lg:self-auto flex-wrap">
          {/* Botón Exportar Excel */}
          <button
            type="button"
            onClick={handleExportarExcel}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Exportar Excel (.xlsx)
          </button>

          {/* Botón Generar Informe PDF */}
          <a
            href={`/api/reportes/pdf?eventoId=${eventoFiltro}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#D2202E] hover:bg-[#B01824] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D2202E]/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-200" />
            Generar Informe PDF
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1) TARJETAS DE KPIS PRINCIPALES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Recaudado */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Recaudado
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-[#0B305B] tracking-tight">
              ${kpis.totalRecaudado.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">{kpis.pagadosCount} pagos</span> validados en efectivo
            </p>
          </div>
        </div>

        {/* KPI 2: Total Inscritos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inscritos
            </span>
            <div className="p-2.5 bg-blue-50 text-[#0B305B] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {kpis.totalInscritos}{' '}
              <span className="text-xs font-semibold text-slate-500">Alumnos</span>
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {kpis.pagadosCount} Pagados
              </span>
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                {kpis.pendientesCount} Pendientes
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Asistentes Reales (Check-in en Puerta) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Asistentes Reales
            </span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {kpis.asistentesReales}{' '}
              <span className="text-xs font-semibold text-slate-500">en puerta</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Validados mediante escaneo QR y código de barras
            </p>
          </div>
        </div>

        {/* KPI 4: Tasa de Asistencia / Efectividad */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tasa de Asistencia
            </span>
            <div className="p-2.5 bg-rose-50 text-[#D2202E] rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-black text-[#D2202E] tracking-tight">
              {kpis.tasaAsistencia.toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Efectividad de asistencia sobre total preinscritos
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1) GRÁFICOS INTERACTIVOS (BARRAS Y CIRCULAR) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gráfico 1: Barras — Dinero Recaudado por Cada Profesor (7 Columnas en LG) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D2202E]" />
                Dinero Recaudado por Cada Profesor
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Volumen financiero en efectivo gestionado por los docentes asignados
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              COP ($)
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {mounted && datosRecaudoPorProfesor.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosRecaudoPorProfesor}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="profesor"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      `$${Number(value || 0).toLocaleString('es-CO')} COP`,
                      'Recaudado',
                    ]}
                    labelStyle={{ fontWeight: 'bold', color: '#0B305B', fontSize: '11px' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="recaudado" radius={[8, 8, 0, 0]}>
                    {datosRecaudoPorProfesor.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#0B305B' : index === 1 ? '#D2202E' : '#2563EB'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No hay registros de recaudo para el evento seleccionado.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Circular — Inscritos por Programa Académico (5 Columnas en LG) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#0B305B]" />
              Inscritos por Programa Académico
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Participación estudiantil segmentada por carrera
            </p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {mounted && datosInscritosPorCarrera.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosInscritosPorCarrera}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {datosInscritosPorCarrera.map((_, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={PALETA_COLORES[index % PALETA_COLORES.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} estudiantes (${(
                        (Number(value) / (kpis.totalInscritos || 1)) *
                        100
                      ).toFixed(1)}%)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={45}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">
                No hay inscripciones registradas para graficar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETALLE TABULAR DE AUDITORÍA RÁPIDA */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0B305B]">
              Resumen de Recaudadores Docentes y Rendición de Cuentas
            </h3>
            <p className="text-xs text-slate-500">
              Desglose detallado por cada profesor con alumnos a cargo
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
            {datosRecaudoPorProfesor.length} Docentes Activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B305B] text-white border-b-2 border-[#D2202E]">
              <tr>
                <th className="py-3 px-4 font-bold">Docente Responsable</th>
                <th className="py-3 px-4 font-bold text-center">Alumnos Gestionados</th>
                <th className="py-3 px-4 font-bold text-right">Total Recaudado (COP)</th>
                <th className="py-3 px-4 font-bold text-right">% Aporte al Recaudo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datosRecaudoPorProfesor.map((item, idx) => {
                const porcentaje =
                  kpis.totalRecaudado > 0 ? (item.recaudado / kpis.totalRecaudado) * 100 : 0

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.profesor}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {item.alumnos} estudiantes
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ${item.recaudado.toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0B305B]">
                      {porcentaje.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


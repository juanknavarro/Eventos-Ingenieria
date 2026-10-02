'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  FunnelChart,
  Funnel,
  LabelList,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import {
  DollarSign,
  Users,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  PieChart as PieIcon,
  BarChart3,
  ExternalLink,
  BookOpen,
  Gauge,
  Activity,
  UserCheck,
  Flame,
  ArrowRight,
} from 'lucide-react'

export interface EventoOpcion {
  id: string
  titulo: string
  fechaInicio: Date | string
  ubicacion: string
  precio: number
  estado: string
  capacidadMaxima?: number | null
  asistenciasMinimas?: number | null
  programa_academico?: string | null
}

export interface AsistenciaItemReporte {
  id: string
  fechaHoraRegistro: Date | string
  fechaJornada?: Date | string | null
  metodo: string
  registradoPorNombre: string
  observaciones: string | null
}

export interface InscripcionReporte {
  id: string
  eventoId: string
  eventoTitulo: string
  eventoPrecio: number
  asistenciasMinimas?: number
  totalAsistencias?: number
  cumpleMeta?: boolean
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
  asistencias?: AsistenciaItemReporte[]
  asistencia: AsistenciaItemReporte | null
}

interface Props {
  eventos: EventoOpcion[]
  inscripciones: InscripcionReporte[]
  programas?: { id: string; nombre: string }[]
  esSuperAdmin?: boolean
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

export default function DashboardReportesCliente({
  eventos,
  inscripciones,
  programas = [],
  esSuperAdmin = false,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [eventoFiltro, setEventoFiltro] = useState<string>('todos')
  const [programaFiltro, setProgramaFiltro] = useState<string>('todos')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filtrado de inscripciones según programa y evento seleccionado
  const inscripcionesFiltradas = useMemo(() => {
    let list = inscripciones
    if (programaFiltro !== 'todos') {
      list = list.filter((ins) =>
        ins.usuarioCarrera?.toLowerCase().includes(programaFiltro.toLowerCase()) ||
        ins.eventoTitulo?.toLowerCase().includes(programaFiltro.toLowerCase())
      )
    }
    if (eventoFiltro !== 'todos') {
      list = list.filter((ins) => ins.eventoId === eventoFiltro)
    }
    return list
  }, [eventoFiltro, programaFiltro, inscripciones])

  // Filtrar eventos disponibles según programa
  const eventosDisponibles = useMemo(() => {
    if (programaFiltro === 'todos') return eventos
    const idsConInscripciones = new Set(
      inscripciones
        .filter((i) => i.usuarioCarrera?.toLowerCase().includes(programaFiltro.toLowerCase()))
        .map((i) => i.eventoId)
    )
    return eventos.filter(
      (e) =>
        e.titulo.toLowerCase().includes(programaFiltro.toLowerCase()) ||
        idsConInscripciones.has(e.id)
    )
  }, [eventos, inscripciones, programaFiltro])

  const [jornadaFiltro, setJornadaFiltro] = useState<string>('todas')

  // Obtener lista única de jornadas disponibles para el evento / filtro actual
  const jornadasDisponibles = useMemo(() => {
    const fechas = new Set<string>()
    for (const ins of inscripcionesFiltradas) {
      const lista = ins.asistencias && ins.asistencias.length > 0 ? ins.asistencias : (ins.asistencia ? [ins.asistencia] : [])
      for (const a of lista) {
        if (a.fechaJornada) {
          fechas.add(new Date(a.fechaJornada).toISOString().slice(0, 10))
        } else if (a.fechaHoraRegistro) {
          fechas.add(new Date(a.fechaHoraRegistro).toISOString().slice(0, 10))
        }
      }
    }
    return Array.from(fechas).sort()
  }, [inscripcionesFiltradas])

  // Cálculo dinámico de KPIs principales
  const kpis = useMemo(() => {
    const totalInscritos = inscripcionesFiltradas.length
    const totalRecaudado = inscripcionesFiltradas.reduce(
      (acc, curr) => acc + (curr.estadoPago === 'PAGADO' ? curr.montoPagado : 0),
      0
    )
    const pagadosCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'PAGADO').length
    const pendientesCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'PENDIENTE').length
    const exentosCount = inscripcionesFiltradas.filter((i) => i.estadoPago === 'EXENTO').length

    // Alumnos con al menos un ingreso en puerta (alcance)
    const asistentesReales = inscripcionesFiltradas.filter((i) => {
      const cant = i.totalAsistencias ?? i.asistencias?.length ?? (i.asistencia !== null ? 1 : 0)
      return cant > 0
    }).length

    // Alumnos que completaron la meta requerida para certificar
    const asistentesCertificables = inscripcionesFiltradas.filter((i) => {
      const cant = i.totalAsistencias ?? i.asistencias?.length ?? (i.asistencia !== null ? 1 : 0)
      const meta = i.asistenciasMinimas ?? 1
      return cant >= meta
    }).length

    const tasaAsistencia = totalInscritos > 0 ? (asistentesReales / totalInscritos) * 100 : 0
    const tasaCertificables = totalInscritos > 0 ? (asistentesCertificables / totalInscritos) * 100 : 0

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
      asistentesCertificables,
      tasaAsistencia,
      tasaCertificables,
      montoPendiente,
    }
  }, [inscripcionesFiltradas])

  // 1. Gráfica de Embudo de Conversión (Funnel Multidía)
  const datosEmbudo = useMemo(() => {
    const total = kpis.totalInscritos
    const confirmados = kpis.pagadosCount + kpis.exentosCount
    const parciales = kpis.asistentesReales
    const certificables = kpis.asistentesCertificables

    const pctConfirmados = total > 0 ? Math.round((confirmados / total) * 100) : 0
    const pctParciales = total > 0 ? Math.round((parciales / total) * 100) : 0
    const pctCertificables = total > 0 ? Math.round((certificables / total) * 100) : 0
    const pctConversionAsistencia = confirmados > 0 ? Math.round((certificables / confirmados) * 100) : 0

    return {
      chartData: [
        {
          name: '1. Preinscritos',
          value: total,
          fill: '#0B305B',
          formattedValue: `${total} alumnos`,
        },
        {
          name: '2. Pagados / Confirmados',
          value: confirmados,
          fill: '#2563EB',
          formattedValue: `${confirmados} (${pctConfirmados}%)`,
        },
        {
          name: '3. Asistencia en Puerta (>=1 día)',
          value: parciales,
          fill: '#F59E0B',
          formattedValue: `${parciales} (${pctParciales}%)`,
        },
        {
          name: '4. Meta Cumplida / Certificables',
          value: certificables,
          fill: '#D2202E',
          formattedValue: `${certificables} (${pctCertificables}%)`,
        },
      ],
      total,
      confirmados,
      parciales,
      certificables,
      pctConfirmados,
      pctParciales,
      pctCertificables,
      pctConversionAsistencia,
    }
  }, [kpis])

  // 2. Gráfica de Área: Picos de Asistencia por Franjas Horarias y Jornadas (Time Series)
  const { datosHorariosCheckin, picoMaximo, totalCheckinsJornada } = useMemo(() => {
    const todasAsistencias = inscripcionesFiltradas.flatMap((ins) => {
      if (ins.asistencias && ins.asistencias.length > 0) return ins.asistencias
      if (ins.asistencia) return [ins.asistencia]
      return []
    })

    const asistenciasValidadas = todasAsistencias.filter((a) => {
      if (!a.fechaHoraRegistro) return false
      if (jornadaFiltro === 'todas') return true
      const fStr = (a.fechaJornada ? new Date(a.fechaJornada) : new Date(a.fechaHoraRegistro))
        .toISOString()
        .slice(0, 10)
      return fStr === jornadaFiltro
    })

    const horasMap = new Map<string, number>()
    // Rango habitual para eventos universitarios: 07:00 a 20:00
    for (let h = 7; h <= 20; h++) {
      const horaStr = `${h.toString().padStart(2, '0')}:00`
      horasMap.set(horaStr, 0)
    }

    for (const a of asistenciasValidadas) {
      const fecha = new Date(a.fechaHoraRegistro)
      const h = fecha.getHours()
      const horaStr = `${h.toString().padStart(2, '0')}:00`
      horasMap.set(horaStr, (horasMap.get(horaStr) || 0) + 1)
    }

    const items = Array.from(horasMap.entries()).map(([hora, checkins]) => ({
      hora,
      checkins,
    }))

    let max = { hora: '08:00', checkins: 0 }
    for (const item of items) {
      if (item.checkins > max.checkins) {
        max = item
      }
    }

    return {
      datosHorariosCheckin: items,
      picoMaximo: max,
      totalCheckinsJornada: asistenciasValidadas.length,
    }
  }, [inscripcionesFiltradas, jornadaFiltro])

  // 3. Gráfica de Barras Horizontales: Top de Asignaturas con Bonificación Académica
  const datosTopAsignaturas = useMemo(() => {
    const map = new Map<string, number>()
    for (const ins of inscripcionesFiltradas) {
      const nombre = ins.asignaturaBonificacion?.trim()
      if (
        nombre &&
        nombre.toLowerCase() !== 'no aplica' &&
        nombre.toLowerCase() !== 'ninguna' &&
        nombre.toLowerCase() !== 'sin asignatura'
      ) {
        map.set(nombre, (map.get(nombre) || 0) + 1)
      }
    }

    return Array.from(map.entries())
      .map(([asignatura, cantidad]) => ({
        asignatura: asignatura.length > 20 ? `${asignatura.substring(0, 18)}...` : asignatura,
        nombreCompleto: asignatura,
        cantidad,
        porcentaje: kpis.totalInscritos > 0 ? Math.round((cantidad / kpis.totalInscritos) * 100) : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)
  }, [inscripcionesFiltradas, kpis.totalInscritos])

  // 4. Termómetro y Medidor Radial: Aforo y Capacidad del Recinto
  const datosAforo = useMemo(() => {
    let capacidad = 0
    if (eventoFiltro !== 'todos') {
      const ev = eventos.find((e) => e.id === eventoFiltro)
      capacidad = ev?.capacidadMaxima || 0
    } else {
      capacidad = eventosDisponibles.reduce((acc, curr) => acc + (curr.capacidadMaxima || 0), 0)
    }

    const ocupados = kpis.asistentesReales
    const porcentaje = capacidad > 0 ? Math.min(100, Math.round((ocupados / capacidad) * 100)) : 0
    const disponibles = Math.max(0, capacidad - ocupados)

    const color =
      porcentaje >= 90 ? '#D2202E' : porcentaje >= 75 ? '#F59E0B' : '#10B981'

    return {
      capacidad,
      ocupados,
      porcentaje,
      disponibles,
      color,
      radialData: [
        {
          name: 'Ocupación',
          value: porcentaje,
          fill: color,
        },
      ],
    }
  }, [eventoFiltro, eventos, eventosDisponibles, kpis.asistentesReales])

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

  // Exportar archivo estructurado Excel con tres hojas
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
      ['Capacidad Máxima Registrada', datosAforo.capacidad > 0 ? `${datosAforo.capacidad} cupos` : 'No definida'],
      ['Porcentaje de Aforo Cubierto', `${datosAforo.porcentaje}%`],
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

    // HOJA 3: Auditoría de Asistencia (Check-in en Puerta - Multidía)
    const filasAuditoria: (string | number)[][] = []
    for (const ins of inscripcionesFiltradas) {
      const lista = ins.asistencias && ins.asistencias.length > 0 ? ins.asistencias : (ins.asistencia ? [ins.asistencia] : [])
      for (const asis of lista) {
        filasAuditoria.push([
          ins.usuarioCedula || 'N/A',
          ins.usuarioNombre,
          ins.usuarioCarrera || 'Facultad de Ingenierías',
          ins.eventoTitulo,
          asis.fechaJornada
            ? new Date(asis.fechaJornada).toLocaleDateString('es-CO')
            : (asis.fechaHoraRegistro ? new Date(asis.fechaHoraRegistro).toLocaleDateString('es-CO') : 'Día Único'),
          asis.fechaHoraRegistro ? new Date(asis.fechaHoraRegistro).toLocaleString('es-CO') : '',
          asis.metodo || 'QR',
          asis.registradoPorNombre || 'Staff Oficial',
          asis.observaciones || 'Sin novedades',
          `${ins.totalAsistencias ?? lista.length} de ${ins.asistenciasMinimas ?? 1}`,
          (ins.cumpleMeta ?? (lista.length >= (ins.asistenciasMinimas ?? 1))) ? 'COMPLETA / CERTIFICABLE' : 'PARCIAL (EN CURSO)',
        ])
      }
    }

    const hoja3Datos = [
      [
        'Cédula / ID',
        'Nombre del Asistente',
        'Programa Académico',
        'Evento Validado',
        'Jornada / Fecha',
        'Fecha y Hora Check-in',
        'Método de Escaneo',
        'Validado Por (Staff / Docente)',
        'Observaciones de Entrada',
        'Progreso Asistencias',
        'Estado Diploma',
      ],
      ...filasAuditoria,
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(hoja3Datos)
    XLSX.utils.book_append_sheet(wb, ws3, 'Auditoría de Asistencia')

    const nombreArchivo = `Reporte_Auditoria_Unisinu_${Date.now()}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* BARRA DE CONTROL: FILTRO DE EVENTO Y BOTONES DE EXPORTACIÓN */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Selectores de Filtro: Programa (SUPER_ADMIN) y Evento */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full lg:w-auto">
          {esSuperAdmin && programas && programas.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 hover:border-[#0B305B] focus-within:border-[#0B305B] rounded-2xl px-3 py-1.5 shadow-xs transition">
              <GraduationCap className="w-4 h-4 text-[#0B305B] shrink-0" />
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">
                Vista de Programa:
              </span>
              <select
                value={programaFiltro}
                onChange={(e) => {
                  setProgramaFiltro(e.target.value)
                  setEventoFiltro('todos')
                }}
                className="bg-transparent text-slate-900 text-xs font-black outline-none cursor-pointer pr-1"
              >
                <option value="todos">🏛️ Consolidado de Facultad</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    📘 {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Evento */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B305B] shrink-0">
              <Filter className="w-4 h-4 text-[#D2202E]" />
              Filtrar por Evento:
            </div>

            <select
              value={eventoFiltro}
              onChange={(e) => setEventoFiltro(e.target.value)}
              className="w-full sm:w-72 px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#0B305B] focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
            >
              <option value="todos">Todos los Eventos ({eventosDisponibles.length})</option>
              {eventosDisponibles.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} ({ev.estado})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de Exportación: Excel y PDF */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto self-end lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportarExcel}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Exportar Excel (.xlsx)
          </button>

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
      {/* TARJETAS DE KPIS PRINCIPALES */}
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
              Efectividad Multidía
            </span>
            <div className="p-2.5 bg-rose-50 text-[#D2202E] rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#D2202E] tracking-tight">
                {kpis.tasaCertificables.toFixed(1)}%
              </p>
              <span className="text-xs text-slate-500 font-bold">
                ({kpis.asistentesCertificables} certificados)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Alcance en puerta: {kpis.asistentesReales} ({kpis.tasaAsistencia.toFixed(1)}% de inscritos)
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO-BOX GRID: DASHBOARD ANALÍTICO EJECUTIVO */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* ======================================================================= */}
        {/* CAJA 1: EMBUDO DE CONVERSIÓN OPERATIVA (FUNNEL CHART) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#D2202E]" />
                Embudo de Conversión Multidía
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Preinscritos ➔ Pagados ➔ En Puerta (≥1 día) ➔ Certificables (Meta)
              </p>
            </div>
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl whitespace-nowrap">
              {datosEmbudo.pctCertificables}% Concluyeron Meta
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {mounted && datosEmbudo.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} estudiantes`, name]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Funnel
                    dataKey="value"
                    data={datosEmbudo.chartData}
                    isAnimationActive
                  >
                    <LabelList
                      position="right"
                      fill="#0B305B"
                      stroke="none"
                      dataKey="formattedValue"
                      style={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No hay inscripciones para trazar el embudo.</div>
            )}
          </div>

          {/* Tarjetas resumen de fases del embudo con tasa de fuga */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200/60">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Preinscritos</span>
              <span className="text-sm sm:text-base font-black text-[#0B305B]">{datosEmbudo.total}</span>
              <span className="text-[9px] text-slate-400 block font-semibold">100% Base</span>
            </div>
            <div className="p-2 bg-blue-50/60 rounded-2xl border border-blue-200/60">
              <span className="text-[9px] text-blue-700 font-bold uppercase block">Confirmados</span>
              <span className="text-sm sm:text-base font-black text-blue-900">{datosEmbudo.confirmados}</span>
              <span className="text-[9px] text-blue-600 block font-semibold">{datosEmbudo.pctConfirmados}%</span>
            </div>
            <div className="p-2 bg-amber-50/60 rounded-2xl border border-amber-200/60">
              <span className="text-[9px] text-amber-700 font-bold uppercase block">En Puerta</span>
              <span className="text-sm sm:text-base font-black text-amber-900">{datosEmbudo.parciales}</span>
              <span className="text-[9px] text-amber-600 block font-semibold">{datosEmbudo.pctParciales}%</span>
            </div>
            <div className="p-2 bg-rose-50/60 rounded-2xl border border-rose-200/60">
              <span className="text-[9px] text-rose-700 font-bold uppercase block">Certificables</span>
              <span className="text-sm sm:text-base font-black text-[#D2202E]">{datosEmbudo.certificables}</span>
              <span className="text-[9px] text-rose-600 block font-semibold">{datosEmbudo.pctConversionAsistencia}% pagados</span>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CAJA 2: ÁREA DE HORARIOS DE CHECK-IN (PICOS DE AFLUENCIA) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D2202E]" />
                Curva de Afluencia y Horarios de Check-in
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribución temporal de accesos en portería
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {jornadasDisponibles.length > 1 && (
                <select
                  value={jornadaFiltro}
                  onChange={(e) => setJornadaFiltro(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl outline-none cursor-pointer transition"
                >
                  <option value="todas">Todas las jornadas ({jornadasDisponibles.length} días)</option>
                  {jornadasDisponibles.map((j, idx) => (
                    <option key={j} value={j}>
                      Día {idx + 1} ({new Date(j + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })})
                    </option>
                  ))}
                </select>
              )}
              {picoMaximo.checkins > 0 && (
                <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 whitespace-nowrap">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  Pico: {picoMaximo.hora} ({picoMaximo.checkins} check-ins)
                </span>
              )}
            </div>
          </div>

          <div className="h-64 w-full pt-1">
            {mounted && totalCheckinsJornada > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={datosHorariosCheckin}
                  margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="degradeCheckin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B305B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0B305B" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    interval={1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} asistencias`, 'Check-ins QR']}
                    labelStyle={{ fontWeight: 'bold', color: '#0B305B', fontSize: '11px' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="checkins"
                    stroke="#0B305B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#degradeCheckin)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Aún no hay registros de check-in en puerta para este corte de evento.
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Check-ins Registrados: <strong className="text-[#0B305B]">{totalCheckinsJornada}</strong>
            </span>
            <span className="text-[11px] text-slate-500">
              En puerta: <strong className="text-slate-800">{kpis.asistentesReales}</strong> • Certificables: <strong className="text-emerald-700">{kpis.asistentesCertificables}</strong>
            </span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CAJA 3: TOP DE ASIGNATURAS CON BONIFICACIÓN ACADÉMICA (BARRAS) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0B305B]" />
                Top de Asignaturas con Bonificación Académica
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cátedras universitarias con mayor atracción de incentivo académico
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
              {datosTopAsignaturas.length} Materias Líderes
            </span>
          </div>

          <div className="h-68 w-full">
            {mounted && datosTopAsignaturas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosTopAsignaturas}
                  layout="vertical"
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="asignatura"
                    width={130}
                    tick={{ fontSize: 10, fill: '#1E293B', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} estudiantes bonificados`,
                      item?.payload?.nombreCompleto || 'Materia',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
                    {datosTopAsignaturas.map((_, index) => (
                      <Cell
                        key={`bar-asig-${index}`}
                        fill={index === 0 ? '#0B305B' : index === 1 ? '#D2202E' : index === 2 ? '#2563EB' : '#10B981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No se registraron postulaciones de asignaturas para este filtro.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Las bonificaciones son acreditadas tras validar la asistencia física.</span>
            <span className="font-bold text-[#0B305B]">Auditoría Académica</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CAJA 4: TERMÓMETRO Y MEDIDOR RADIAL DE AFORO / CAPACIDAD */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#D2202E]" />
                Ocupación y Aforo del Recinto
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoreo de aforo máximo vs. concurrencia real
              </p>
            </div>
            <span
              className={`text-[11px] font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
                datosAforo.porcentaje >= 90
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : datosAforo.porcentaje >= 75
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {datosAforo.capacidad === 0
                ? 'Aforo Ilimitado'
                : datosAforo.porcentaje >= 100
                ? 'Capacidad Completa'
                : `${datosAforo.porcentaje}% Ocupado`}
            </span>
          </div>

          {/* Gráfico Radial / Tacómetro semicircular */}
          <div className="relative h-44 w-full flex items-center justify-center">
            {mounted && datosAforo.capacidad > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="80%"
                    innerRadius="80%"
                    outerRadius="110%"
                    barSize={18}
                    data={datosAforo.radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      angleAxisId={0}
                      tick={false}
                    />
                    <RadialBar
                      background={{ fill: '#F1F5F9' }}
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                {/* Texto Central en el Medidor */}
                <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {datosAforo.porcentaje}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block -mt-1">
                    Aforo Utilizado
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <span className="text-3xl font-black text-[#0B305B]">
                  {kpis.asistentesReales}
                </span>
                <span className="text-xs text-slate-500 block font-medium mt-1">
                  Asistentes sin tope de capacidad fijado
                </span>
              </div>
            )}
          </div>

          {/* Barra tipo Termómetro de Ocupación */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Termómetro de Aforo:</span>
              <span className="font-bold text-slate-900">
                {datosAforo.ocupados} / {datosAforo.capacidad || 'Ilimitada'} personas
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, datosAforo.porcentaje)}%`,
                  backgroundColor: datosAforo.color,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>0% Inicio</span>
              <span>Cupos disponibles: {datosAforo.disponibles}</span>
              <span>100% Máx</span>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CAJA 5: DINERO RECAUDADO POR CADA PROFESOR (BARRAS) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0B305B] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D2202E]" />
                Dinero Recaudado por Cada Docente
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
                        key={`cell-prof-${index}`}
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

        {/* ======================================================================= */}
        {/* CAJA 6: INSCRITOS POR PROGRAMA ACADÉMICO (CIRCULAR / DONUT) */}
        {/* ======================================================================= */}
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
                        key={`pie-cell-prog-${index}`}
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
      {/* DETALLE TABULAR DE AUDITORÍA RÁPIDA: RENDICIÓN DE CUENTAS */}
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

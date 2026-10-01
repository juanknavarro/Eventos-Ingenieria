'use server'

import prisma from '@/lib/prisma'
import { getAuthSession } from '@/lib/auth/session'
import {
  esAdminOSuperior,
  esSuperAdmin,
  filtroEventosPorTenancy,
  filtroInscripcionesPorTenancy,
} from '@/lib/auth/multitenancy'

export interface MetricasAnaliticasReportes {
  embudo: {
    etapa: string
    cantidad: number
    porcentaje: number
    fill: string
  }[]
  picosAsistencia: {
    hora: string
    checkins: number
  }[]
  topAsignaturas: {
    asignatura: string
    total: number
    porcentaje: number
  }[]
  aforo: {
    capacidadMaxima: number
    asistentesReales: number
    porcentajeOcupacion: number
    cuposDisponibles: number
  }
}

/**
 * Consulta y pre-calcula los datos analíticos del módulo de Reportes y Auditorías
 * garantizando el aislamiento Multi-Tenancy (Zero-Trust).
 */
export async function obtenerAnaliticasReportes(eventoIdFiltro?: string) {
  const session = await getAuthSession()
  if (!session || !esAdminOSuperior(session)) {
    throw new Error('Acceso no autorizado: Se requieren credenciales de Administrador.')
  }

  const filtroEventos = filtroEventosPorTenancy(session)
  const filtroInscripciones = filtroInscripcionesPorTenancy(session)

  // Filtro adicional si se selecciona un evento en particular
  const whereEventos = eventoIdFiltro && eventoIdFiltro !== 'todos'
    ? { AND: [{ id: eventoIdFiltro }, filtroEventos] }
    : filtroEventos

  const whereInscripciones = eventoIdFiltro && eventoIdFiltro !== 'todos'
    ? { AND: [{ eventoId: eventoIdFiltro }, filtroInscripciones] }
    : filtroInscripciones

  const [eventos, inscripciones] = await Promise.all([
    prisma.evento.findMany({
      where: whereEventos,
      select: {
        id: true,
        titulo: true,
        capacidadMaxima: true,
      },
    }),
    prisma.inscripcion.findMany({
      where: whereInscripciones,
      select: {
        id: true,
        estado_pago: true,
        asignatura_bonificacion: true,
        asistencias: {
          select: {
            id: true,
            fechaHoraRegistro: true,
          },
        },
      },
    }),
  ])

  const totalInscritos = inscripciones.length
  const pagados = inscripciones.filter((i) => i.estado_pago === 'PAGADO' || i.estado_pago === 'EXENTO').length
  const conAsistencia = inscripciones.filter((i) => i.asistencias.length > 0)
  const totalAsistentes = conAsistencia.length

  // 1. Embudo de conversión
  const embudo = [
    {
      etapa: '1. Preinscritos',
      cantidad: totalInscritos,
      porcentaje: 100,
      fill: '#0B305B',
    },
    {
      etapa: '2. Pagados / Confirmados',
      cantidad: pagados,
      porcentaje: totalInscritos > 0 ? Math.round((pagados / totalInscritos) * 100) : 0,
      fill: '#2563EB',
    },
    {
      etapa: '3. Asistentes en Puerta',
      cantidad: totalAsistentes,
      porcentaje: totalInscritos > 0 ? Math.round((totalAsistentes / totalInscritos) * 100) : 0,
      fill: '#D2202E',
    },
  ]

  // 2. Picos de Asistencia por Franja Horaria (Horas del día)
  const contadorHoras: { [hora: string]: number } = {}
  // Rango estándar de actividades académicas: 07:00 a 20:00
  for (let h = 7; h <= 20; h++) {
    const horaFormateada = `${h.toString().padStart(2, '0')}:00`
    contadorHoras[horaFormateada] = 0
  }

  for (const ins of conAsistencia) {
    for (const asis of ins.asistencias) {
      if (asis?.fechaHoraRegistro) {
        const fecha = new Date(asis.fechaHoraRegistro)
        const horaStr = `${fecha.getHours().toString().padStart(2, '0')}:00`
        if (contadorHoras[horaStr] !== undefined) {
          contadorHoras[horaStr]++
        } else {
          contadorHoras[horaStr] = 1
        }
      }
    }
  }

  const picosAsistencia = Object.entries(contadorHoras)
    .map(([hora, checkins]) => ({ hora, checkins }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  // 3. Top de Asignaturas para Bonificación Académica
  const contadorAsignaturas: { [nombre: string]: number } = {}
  for (const ins of inscripciones) {
    const asig = ins.asignatura_bonificacion?.trim() || 'Sin Asignatura'
    contadorAsignaturas[asig] = (contadorAsignaturas[asig] || 0) + 1
  }

  const topAsignaturas = Object.entries(contadorAsignaturas)
    .filter(([nombre]) => nombre !== 'Sin Asignatura' && nombre !== 'No aplica')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([asignatura, total]) => ({
      asignatura: asignatura.length > 22 ? `${asignatura.substring(0, 20)}...` : asignatura,
      total,
      porcentaje: totalInscritos > 0 ? Math.round((total / totalInscritos) * 100) : 0,
    }))

  // 4. Aforo y Capacidad de Eventos
  const capacidadMaxima = eventos.reduce((acc, curr) => acc + (curr.capacidadMaxima || 0), 0)
  const porcentajeOcupacion = capacidadMaxima > 0
    ? Math.min(100, Math.round((totalAsistentes / capacidadMaxima) * 100))
    : 0
  const cuposDisponibles = Math.max(0, capacidadMaxima - totalAsistentes)

  return {
    embudo,
    picosAsistencia,
    topAsignaturas,
    aforo: {
      capacidadMaxima,
      asistentesReales: totalAsistentes,
      porcentajeOcupacion,
      cuposDisponibles,
    },
  }
}

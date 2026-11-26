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
    asistentesCertificables?: number
    porcentajeOcupacion: number
    cuposDisponibles: number
  }
}

/**
 * Consulta y pre-calcula los datos analíticos del módulo de Reportes y Auditorías
 * garantizando el aislamiento Multi-Tenancy (Zero-Trust).
 */
export async function obtenerAnaliticasReportes(
  eventoIdFiltro?: string,
  anioFiltro?: string,
  semestreFiltro?: string
) {
  const session = await getAuthSession()
  if (!session || !esAdminOSuperior(session)) {
    throw new Error('Acceso no autorizado: Se requieren credenciales de Administrador.')
  }

  const filtroEventos = filtroEventosPorTenancy(session)
  const filtroInscripciones = filtroInscripcionesPorTenancy(session)

  // Filtro temporal por Año y Semestre (Vigencia en UTC)
  let filtroFechaEvento: any = {}
  let filtroFechaInscripcion: any = {}

  if (anioFiltro && anioFiltro !== 'todos') {
    const anioNum = parseInt(anioFiltro, 10)
    if (!isNaN(anioNum)) {
      let inicioAnio = new Date(Date.UTC(anioNum, 0, 1, 0, 0, 0, 0))
      let finAnio = new Date(Date.UTC(anioNum, 11, 31, 23, 59, 59, 999))

      if (semestreFiltro === '1') {
        finAnio = new Date(Date.UTC(anioNum, 5, 30, 23, 59, 59, 999))
      } else if (semestreFiltro === '2') {
        inicioAnio = new Date(Date.UTC(anioNum, 6, 1, 0, 0, 0, 0))
      }

      filtroFechaEvento = {
        fechaInicio: {
          gte: inicioAnio,
          lte: finAnio,
        },
      }

      filtroFechaInscripcion = {
        evento: {
          fechaInicio: {
            gte: inicioAnio,
            lte: finAnio,
          },
        },
      }
    }
  }

  // Filtro adicional si se selecciona un evento en particular
  const whereEventos: any = {
    AND: [
      filtroEventos,
      filtroFechaEvento,
      ...(eventoIdFiltro && eventoIdFiltro !== 'todos' ? [{ id: eventoIdFiltro }] : []),
    ],
  }

  const whereInscripciones: any = {
    AND: [
      filtroInscripciones,
      filtroFechaInscripcion,
      ...(eventoIdFiltro && eventoIdFiltro !== 'todos' ? [{ eventoId: eventoIdFiltro }] : []),
    ],
  }

  const [eventos, inscripciones] = await Promise.all([
    prisma.evento.findMany({
      where: whereEventos,
      select: {
        id: true,
        titulo: true,
        capacidadMaxima: true,
        asistenciasMinimas: true,
      },
    }),
    prisma.inscripcion.findMany({
      where: whereInscripciones,
      select: {
        id: true,
        estado_pago: true,
        asignatura_bonificacion: true,
        evento: {
          select: {
            asistenciasMinimas: true,
          },
        },
        asistencias: {
          select: {
            id: true,
            fechaHoraRegistro: true,
            fechaJornada: true,
            metodo: true,
          },
        },
      },
    }),
  ])

  const totalInscritos = inscripciones.length
  const pagados = inscripciones.filter((i) => i.estado_pago === 'PAGADO' || i.estado_pago === 'EXENTO').length
  const asistentesAlcance = inscripciones.filter((i) => i.asistencias.length > 0)
  const asistentesCertificables = inscripciones.filter(
    (i) => i.asistencias.length >= (i.evento?.asistenciasMinimas ?? 1)
  )
  const totalAsistentes = asistentesAlcance.length
  const totalCertificables = asistentesCertificables.length

  // 1. Embudo de conversión (Multidía)
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
      etapa: '3. Asistieron en Puerta (>= 1 día)',
      cantidad: totalAsistentes,
      porcentaje: totalInscritos > 0 ? Math.round((totalAsistentes / totalInscritos) * 100) : 0,
      fill: '#F59E0B',
    },
    {
      etapa: '4. Meta Cumplida / Certificables',
      cantidad: totalCertificables,
      porcentaje: totalInscritos > 0 ? Math.round((totalCertificables / totalInscritos) * 100) : 0,
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

  for (const ins of asistentesAlcance) {
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
      asistentesCertificables: totalCertificables,
      porcentajeOcupacion,
      cuposDisponibles,
    },
  }
}

export interface FilaAsistenteExcel {
  consecutivo: number
  cedula: string
  codigoEstudiantil: string
  nombreCompleto: string
  email: string
  celular: string
  tipoVinculacion: string
  carrera: string
  semestre: string
  asignaturaBonificacion: string
  empresa: string
  pais: string
  departamento: string
  ciudad: string
  fechaInscripcion: string
  estadoPago: string
  metodoPago: string
  montoPagado: number
  comprobanteUrl: string
  docenteResponsable: string
  asistenciasRegistradas: number
  asistenciasMinimas: number
  detalleIngresos: string
  estadoCertificacion: 'Apto' | 'Pendiente'
}

/**
 * Exporta la sábana completa de asistentes e inscripciones de un evento específico.
 * Exclusivo para roles ADMIN y SUPER_ADMIN respetando aislamiento Multi-Tenancy.
 */
export async function exportarAsistentesEventoExcel(eventoId: string): Promise<
  | {
      success: true
      evento: {
        id: string
        titulo: string
        fechaInicio: string
        ubicacion: string
        precio: number
        asistenciasMinimas: number
      }
      filas: FilaAsistenteExcel[]
    }
  | {
      success: false
      error: string
    }
> {
  try {
    const sesion = await getAuthSession()
    if (!sesion || (sesion.rol !== 'ADMIN' && sesion.rol !== 'SUPER_ADMIN')) {
      return { success: false, error: 'No autorizado' }
    }

    if (!eventoId || !eventoId.trim()) {
      return { success: false, error: 'Identificador de evento inválido.' }
    }

    const filtroTenancy = filtroEventosPorTenancy(sesion)

    const evento = await prisma.evento.findFirst({
      where: {
        AND: [filtroTenancy, { id: eventoId.trim() }],
      },
      include: {
        inscripciones: {
          include: {
            usuario: true,
            profesorResponsable: {
              select: { nombre: true },
            },
            asistencias: {
              orderBy: { fechaHoraRegistro: 'asc' },
            },
          },
          orderBy: {
            usuario: { nombre: 'asc' },
          },
        },
      },
    })

    if (!evento) {
      return {
        success: false,
        error: 'Evento no encontrado o sin permisos para consultarlo.',
      }
    }

    const asistenciasMinimas = evento.asistenciasMinimas ?? 1

    const filas: FilaAsistenteExcel[] = evento.inscripciones.map((ins, idx) => {
      const totalAsistencias = ins.asistencias.length
      const estaSolvente =
        evento.precio === 0 ||
        ins.estado_pago === 'PAGADO' ||
        ins.estado_pago === 'EXENTO'
      const esApto = totalAsistencias >= asistenciasMinimas && estaSolvente

      const detalleIngresos =
        ins.asistencias.length > 0
          ? ins.asistencias
              .map((a) => {
                const hora = new Date(a.fechaHoraRegistro).toLocaleString('es-CO', {
                  timeZone: 'America/Bogota',
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
                return `${a.bloque} / ${a.metodo} / ${hora}`
              })
              .join(' | ')
          : 'Sin registros'

      return {
        consecutivo: idx + 1,
        cedula: ins.usuario.cedula || ins.usuario.codigoEstudiantil || 'N/A',
        codigoEstudiantil: ins.usuario.codigoEstudiantil || 'N/A',
        nombreCompleto: ins.usuario.nombre,
        email: ins.usuario.email,
        celular: ins.celular || ins.usuario.telefono || 'N/A',
        tipoVinculacion: ins.tipo_vinculacion || ins.usuario.tipo_vinculacion || 'ESTUDIANTE_ACTIVO',
        carrera: ins.usuario.carrera || 'N/A',
        semestre: ins.usuario.semestre || 'N/A',
        asignaturaBonificacion: ins.asignatura_bonificacion || 'N/A',
        empresa: ins.empresa || ins.usuario.empresa || 'N/A',
        pais: ins.pais || ins.usuario.pais || 'Colombia',
        departamento: ins.departamento || ins.usuario.departamento || 'N/A',
        ciudad: ins.ciudad || ins.usuario.ciudad || 'N/A',
        fechaInscripcion: new Date(ins.fechaInscripcion).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        estadoPago: ins.estado_pago,
        metodoPago: ins.metodo_pago || (evento.precio === 0 ? 'GRATUITO' : 'N/A'),
        montoPagado: ins.montoPagado,
        comprobanteUrl: ins.comprobanteUrl || 'N/A',
        docenteResponsable:
          ins.profesorResponsable?.nombre ||
          ins.profesor_responsable_dinero ||
          'Sin asignar',
        asistenciasRegistradas: totalAsistencias,
        asistenciasMinimas,
        detalleIngresos,
        estadoCertificacion: esApto ? 'Apto' : 'Pendiente',
      }
    })

    return {
      success: true,
      evento: {
        id: evento.id,
        titulo: evento.titulo,
        fechaInicio: evento.fechaInicio.toISOString(),
        ubicacion: evento.ubicacion,
        precio: evento.precio,
        asistenciasMinimas,
      },
      filas,
    }
  } catch (error) {
    console.error('Error al exportar asistentes a Excel:', error)
    return {
      success: false,
      error: 'Ocurrió un error en el servidor al generar la exportación.',
    }
  }
}

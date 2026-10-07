'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { MetodoAsistencia, EstadoPago, RolUsuario, BloqueJornada } from '@prisma/client'
import { getAuthSession } from '@/lib/auth/session'

export interface ValidarAsistenciaInput {
  documento: string // Código estudiantil, cédula o email
  eventoId: string
  staffId?: string
  metodo?: 'QR' | 'MANUAL' | 'BIOMETRICO'
  bloque?: 'MANANA' | 'TARDE' | 'NOCHE' | 'UNICA' | string
}

export type TipoResultadoAsistencia =
  | 'EXITO'
  | 'ACCESO_CONCEDIDO'
  | 'NO_ENCONTRADO'
  | 'NO_INSCRITO'
  | 'PAGO_PENDIENTE'
  | 'PAGO_RECHAZADO'
  | 'YA_REGISTRADO'
  | 'ERROR_SERVIDOR'

export interface ResultadoAsistencia {
  success: boolean
  tipo: TipoResultadoAsistencia
  mensaje: string
  usuario?: {
    id: string
    nombre: string
    codigoEstudiantil: string | null
    email: string
    carrera: string | null
  }
  evento?: {
    id: string
    titulo: string
    precio: number
    ubicacion: string
  }
  inscripcion?: {
    id: string
    asignatura_bonificacion: string | null
    profesor_responsable_dinero: string | null
    estado_pago: string
    montoPagado: number
  }
  asistencia?: {
    id: string
    fechaHoraRegistro: Date
    metodo: string
    registradoPorNombre?: string
    bloque?: string
  }
}

export async function registrarAsistenciaPorDocumento({
  documento,
  eventoId,
  staffId,
  metodo = 'QR',
  bloque = 'UNICA',
}: ValidarAsistenciaInput): Promise<ResultadoAsistencia> {
  const docLimpio = documento.trim()

  if (!docLimpio) {
    return {
      success: false,
      tipo: 'NO_ENCONTRADO',
      mensaje: 'Por favor ingresa o escanea un número de documento/cédula válido.',
    }
  }

  if (!eventoId || eventoId === 'TODOS') {
    return {
      success: false,
      tipo: 'ERROR_SERVIDOR',
      mensaje: 'Debes seleccionar un evento específico para controlar la asistencia en puerta.',
    }
  }

  try {
    const session = await getAuthSession()
    if (
      !session ||
      (session.rol !== RolUsuario.STAFF &&
        session.rol !== RolUsuario.ADMIN &&
        session.rol !== RolUsuario.PROFESOR &&
        session.rol !== RolUsuario.SUPER_ADMIN)
    ) {
      return {
        success: false,
        tipo: 'ERROR_SERVIDOR',
        mensaje: 'Acceso no autorizado: Se requieren privilegios de Staff, Docente o Administrador.',
      }
    }

    // 1. Buscar al usuario por cédula, código estudiantil, email o ID
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedula: docLimpio },
          { codigoEstudiantil: docLimpio },
          { email: docLimpio },
          { id: docLimpio },
        ],
      },
    })

    // Fallback: Si el QR trajo directamente el ID de la inscripción
    if (!usuario) {
      const inscripcionDirecta = await prisma.inscripcion.findUnique({
        where: { id: docLimpio },
        include: { usuario: true },
      })
      if (inscripcionDirecta) {
        usuario = inscripcionDirecta.usuario
      }
    }

    if (!usuario) {
      return {
        success: false,
        tipo: 'NO_ENCONTRADO',
        mensaje: `Documento o Cédula "${docLimpio}" no encontrada en la base de datos universitaria.`,
      }
    }

    // 2. Buscar la inscripción en el evento seleccionado
    const inscripcion = await prisma.inscripcion.findUnique({
      where: {
        eventoId_usuarioId: {
          eventoId: eventoId,
          usuarioId: usuario.id,
        },
      },
      include: {
        evento: true,
        asistencias: {
          include: {
            registradoPor: true,
          },
          orderBy: {
            fechaHoraRegistro: 'desc',
          },
        },
      },
    })

    const eventoInfo = inscripcion?.evento || (await prisma.evento.findUnique({ where: { id: eventoId } }))

    if (!inscripcion) {
      return {
        success: false,
        tipo: 'NO_INSCRITO',
        mensaje: `El estudiante ${usuario.nombre} no se encuentra inscrito en "${eventoInfo?.titulo ?? 'este evento'}".`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: eventoInfo
          ? {
              id: eventoInfo.id,
              titulo: eventoInfo.titulo,
              precio: eventoInfo.precio,
              ubicacion: eventoInfo.ubicacion,
            }
          : undefined,
      }
    }

    // 3. Validar estado de pago
    if (inscripcion.estado_pago === EstadoPago.PENDIENTE) {
      return {
        success: false,
        tipo: 'PAGO_PENDIENTE',
        mensaje: `Acceso denegado: El pago de la inscripción se encuentra PENDIENTE ($${inscripcion.evento.precio.toLocaleString('es-CO')} COP). Debe legalizar con el docente responsable (${inscripcion.profesor_responsable_dinero ?? 'Docente'}).`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
      }
    }

    if (inscripcion.estado_pago === EstadoPago.RECHAZADO) {
      return {
        success: false,
        tipo: 'PAGO_RECHAZADO',
        mensaje: `Acceso denegado: La inscripción de ${usuario.nombre} fue RECHAZADA.`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
      }
    }

    // 4. Validar si ya tiene asistencia registrada hoy en el mismo bloque/jornada
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0)
    const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999)

    const bloqueValido: BloqueJornada =
      bloque === 'MANANA' || bloque === 'TARDE' || bloque === 'NOCHE' || bloque === 'UNICA'
        ? (bloque as BloqueJornada)
        : BloqueJornada.UNICA

    const etiquetaBloque =
      bloqueValido === 'MANANA'
        ? 'MAÑANA (AM)'
        : bloqueValido === 'TARDE'
        ? 'TARDE (PM)'
        : bloqueValido === 'NOCHE'
        ? 'NOCHE'
        : 'JORNADA'

    const asistenciaHoy = inscripcion.asistencias.find((a) => {
      const bloqueRegistro = a.bloque || BloqueJornada.UNICA
      if (bloqueRegistro !== bloqueValido) return false

      if (a.fechaJornada) {
        const fj = new Date(a.fechaJornada)
        if (
          fj.getUTCFullYear() === hoy.getUTCFullYear() &&
          fj.getUTCMonth() === hoy.getUTCMonth() &&
          fj.getUTCDate() === hoy.getUTCDate()
        ) {
          return true
        }
      }
      const fr = new Date(a.fechaHoraRegistro)
      return fr >= inicioHoy && fr <= finHoy
    })

    if (asistenciaHoy) {
      const horaStr = new Date(asistenciaHoy.fechaHoraRegistro).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      const asistenciasTotales = inscripcion.asistencias.length
      const asistenciasMinimas = inscripcion.evento.asistenciasMinimas || 1

      return {
        success: false,
        tipo: 'YA_REGISTRADO',
        mensaje: `Atención: Ya registrado en la sesión ${etiquetaBloque} de hoy a las ${horaStr}. Lleva ${asistenciasTotales} de ${asistenciasMinimas} asistencias requeridas.`,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          codigoEstudiantil: usuario.codigoEstudiantil,
          email: usuario.email,
          carrera: usuario.carrera,
        },
        evento: {
          id: inscripcion.evento.id,
          titulo: inscripcion.evento.titulo,
          precio: inscripcion.evento.precio,
          ubicacion: inscripcion.evento.ubicacion,
        },
        inscripcion: {
          id: inscripcion.id,
          asignatura_bonificacion: inscripcion.asignatura_bonificacion,
          profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
          estado_pago: inscripcion.estado_pago,
          montoPagado: inscripcion.montoPagado,
        },
        asistencia: {
          id: asistenciaHoy.id,
          fechaHoraRegistro: asistenciaHoy.fechaHoraRegistro,
          metodo: asistenciaHoy.metodo,
          registradoPorNombre: asistenciaHoy.registradoPor?.nombre,
          bloque: asistenciaHoy.bloque,
        },
      }
    }

    // 5. Registrar asistencia exitosa en la base de datos
    const fechaActual = new Date()
    const nuevaAsistencia = await prisma.asistencia.create({
      data: {
        inscripcionId: inscripcion.id,
        registradoPorId: staffId || session.id,
        metodo: (metodo as MetodoAsistencia) || MetodoAsistencia.QR,
        observaciones: `Ingreso validado en puerta (${etiquetaBloque}) con lector de código de barras/cédula`,
        fechaHoraRegistro: fechaActual,
        fechaJornada: fechaActual,
        bloque: bloqueValido,
      },
      include: {
        registradoPor: true,
      },
    })

    try {
      revalidatePath('/')
      revalidatePath('/profesor')
      revalidatePath('/staff/asistencia')
    } catch {
      // Manejar llamadas fuera del ciclo de petición HTTP
    }

    const conteoActual = inscripcion.asistencias.length + 1
    const metaAsistencias = inscripcion.evento.asistenciasMinimas || 1

    return {
      success: true,
      tipo: 'EXITO',
      mensaje: `¡Check-in exitoso en sesión ${etiquetaBloque}! Lleva ${conteoActual} de ${metaAsistencias} asistencias requeridas (${usuario.nombre}).`,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        codigoEstudiantil: usuario.codigoEstudiantil,
        email: usuario.email,
        carrera: usuario.carrera,
      },
      evento: {
        id: inscripcion.evento.id,
        titulo: inscripcion.evento.titulo,
        precio: inscripcion.evento.precio,
        ubicacion: inscripcion.evento.ubicacion,
      },
      inscripcion: {
        id: inscripcion.id,
        asignatura_bonificacion: inscripcion.asignatura_bonificacion,
        profesor_responsable_dinero: inscripcion.profesor_responsable_dinero,
        estado_pago: inscripcion.estado_pago,
        montoPagado: inscripcion.montoPagado,
      },
      asistencia: {
        id: nuevaAsistencia.id,
        fechaHoraRegistro: nuevaAsistencia.fechaHoraRegistro,
        metodo: nuevaAsistencia.metodo,
        registradoPorNombre: nuevaAsistencia.registradoPor?.nombre,
        bloque: nuevaAsistencia.bloque,
      },
    }
  } catch (error) {
    console.error('Error al procesar asistencia:', error)
    return {
      success: false,
      tipo: 'ERROR_SERVIDOR',
      mensaje: 'Ocurrió un error inesperado en el servidor al verificar la asistencia.',
    }
  }
}

export async function obtenerInfoEventoEscaner(eventoId: string) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return { success: false, error: 'No autenticado' }
    }

    const evento = await prisma.evento.findUnique({
      where: { id: eventoId },
      select: {
        id: true,
        titulo: true,
        ubicacion: true,
        capacidadMaxima: true,
        _count: {
          select: { inscripciones: true },
        },
      },
    })

    if (!evento) {
      return { success: false, error: 'Evento no encontrado' }
    }

    const totalAsistencias = await prisma.asistencia.count({
      where: {
        inscripcion: {
          eventoId: eventoId,
        },
      },
    })

    return {
      success: true,
      evento,
      totalAsistencias,
    }
  } catch (error) {
    console.error('Error al obtener info de evento para escáner:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

/**
 * Obtiene el historial reciente en vivo para un evento específico filtrado por el día actual
 */
export async function obtenerHistorialEnVivo(eventoId: string) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return { success: false, error: 'No autenticado', historial: [] }
    }

    if (!eventoId || eventoId === 'TODOS') {
      return { success: true, historial: [] }
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const registros = await prisma.asistencia.findMany({
      where: {
        inscripcion: {
          eventoId: eventoId,
        },
        fechaHoraRegistro: {
          gte: hoy,
        },
      },
      include: {
        inscripcion: {
          include: {
            usuario: {
              select: {
                nombre: true,
                codigoEstudiantil: true,
                carrera: true,
              },
            },
            evento: {
              select: {
                titulo: true,
              },
            },
          },
        },
        registradoPor: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaHoraRegistro: 'desc',
      },
      take: 20,
    })

    return {
      success: true,
      historial: registros,
    }
  } catch (error) {
    console.error('Error al obtener historial en vivo:', error)
    return {
      success: false,
      error: 'Error al consultar historial de asistencia.',
      historial: [],
    }
  }
}



